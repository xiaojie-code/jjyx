import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { UserCurrency } from '../entities/user-currency.entity';
import { CurrencyLog } from '../entities/currency-log.entity';
import { GameTurnoverRecord } from '../entities/game-turnover-record.entity';
import { DirectGameRewardRecord } from '../entities/direct-game-reward-record.entity';
import { PointSynthesis } from '../entities/point-synthesis.entity';
import { Withdrawal } from '../entities/withdrawal.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { DailyDeduction } from '../entities/daily-deduction.entity';
import { generateSn } from '../common/utils/sn-generator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ServiceNotificationService } from '../notification/service-notification.service';
import * as bcrypt from 'bcryptjs';

type CurrencyType = 'points' | 'gold' | 'silver' | 'special' | 'reward' | 'invite';

const WEEKLY_POINT_RETURN_SWITCH_KEY = 'weekly_point_return';
const WEEKLY_POINT_RETURN_MULTIPLIER_KEY = 'weekly_point_return_multiplier';
const WEEKLY_POINT_RETURN_DAILY_RATE_KEY = 'weekly_point_return_daily_rate';
const WEEKLY_POINT_RETURN_STARTED_AT_KEY = 'weekly_point_return_started_at';
const WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES = [
  'group_create',
  'group_create_cost',
  'meeting_start',
];
const WEEKLY_POINT_RETURN_BATCH_SIZE = 100;
const DIRECT_GAME_REWARD_SWITCH_KEY = 'direct_game_reward';
const DIRECT_GAME_REWARD_RATE_KEY = 'direct_game_reward_rate';
const DIRECT_GAME_REWARD_DEFAULT_RATE = 0.0015;
const DIRECT_GAME_REWARD_MAX_GENERATION = 20;

type GameTurnoverInput = {
  userId: number;
  gameId?: number | null;
  sourceType: 'bet' | 'revive' | 'fish_sell' | string;
  amount: number;
  currencyLogId?: number | null;
  bizId?: string | number | null;
  description?: string;
  manager?: EntityManager;
};

type LegacyRewardBackfillOptions = {
  dryRun?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  game?: boolean;
  weekly?: boolean;
};

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(UserCurrency)
    private readonly currencyRepo: Repository<UserCurrency>,
    @InjectRepository(CurrencyLog)
    private readonly logRepo: Repository<CurrencyLog>,
    @InjectRepository(GameTurnoverRecord)
    private readonly turnoverRepo: Repository<GameTurnoverRecord>,
    @InjectRepository(DirectGameRewardRecord)
    private readonly directRewardRepo: Repository<DirectGameRewardRecord>,
    @InjectRepository(PointSynthesis)
    private readonly synthesisRepo: Repository<PointSynthesis>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepo: Repository<Withdrawal>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(DailyDeduction)
    private readonly deductionRepo: Repository<DailyDeduction>,
    private readonly dataSource: DataSource,
    private readonly serviceNotificationService: ServiceNotificationService,
  ) {}

  private toFiniteNumber(value: any, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private roundPoints(value: number) {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }

  private startOfLocalDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private pad2(value: number) {
    return String(value).padStart(2, '0');
  }

  private formatLocalDate(date: Date) {
    return `${date.getFullYear()}-${this.pad2(date.getMonth() + 1)}-${this.pad2(date.getDate())}`;
  }

  private formatLocalDateTime(date: Date) {
    return `${this.formatLocalDate(date)} ${this.pad2(date.getHours())}:${this.pad2(date.getMinutes())}:${this.pad2(date.getSeconds())}`;
  }

  private parseLocalDate(value: any) {
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
    }
    const text = String(value || '').slice(0, 10);
    const [year, month, day] = text.split('-').map((part) => Number(part));
    if (!year || !month || !day) return this.startOfLocalDay(new Date());
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private parseLocalDateTime(value: any) {
    const match = String(value || '').match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/,
    );
    if (!match) return null;
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
      0,
    );
  }

  private parseBackfillDateTime(value: any, fallback?: Date | null) {
    if (value instanceof Date) return value;
    const text = String(value || '').trim();
    if (!text) return fallback ?? null;
    const exact = this.parseLocalDateTime(text);
    if (exact) return exact;
    const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      return new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
        0,
        0,
        0,
        0,
      );
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? (fallback ?? null) : parsed;
  }

  private parseBackfillEndDateTime(value: any, fallback?: Date | null) {
    const parsed = this.parseBackfillDateTime(value, fallback);
    if (!parsed) return parsed;
    if (String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)) {
      return this.endOfLocalDay(parsed);
    }
    return parsed;
  }

  private endOfLocalDay(date: Date) {
    const value = new Date(date);
    value.setHours(23, 59, 59, 0);
    return value;
  }

  private maxDate(a: Date, b: Date) {
    return a.getTime() >= b.getTime() ? a : b;
  }

  private getLastCompletedWeekEndAt(date: Date) {
    const currentWeekSunday = this.addDays(this.getMondayOfWeek(date), 6);
    currentWeekSunday.setHours(23, 59, 59, 0);
    if (date.getDay() === 0 && date.getTime() >= currentWeekSunday.getTime()) {
      return currentWeekSunday;
    }
    const previousSunday = this.addDays(this.getMondayOfWeek(date), -1);
    previousSunday.setHours(23, 59, 59, 0);
    return previousSunday;
  }

  private getMondayOfWeek(date: Date) {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return this.addDays(this.startOfLocalDay(date), diff);
  }

  private getSettlementWeek(now = new Date()) {
    let monday = this.getMondayOfWeek(now);
    if (now.getDay() !== 0) {
      monday = this.addDays(monday, -7);
    }
    const sunday = this.addDays(monday, 6);
    const weekStartAt = new Date(monday);
    weekStartAt.setHours(0, 0, 1, 0);
    const weekEndAt = new Date(sunday);
    weekEndAt.setHours(23, 59, 59, 0);

    return {
      weekStartDate: this.formatLocalDate(monday),
      weekEndDate: this.formatLocalDate(sunday),
      weekStartAt,
      weekEndAt,
    };
  }

  private async ensureCurrencyPrecisionForWeeklyReturn() {
    const statements = [
      `ALTER TABLE user_currencies MODIFY COLUMN points DECIMAL(18, 6) NOT NULL DEFAULT 0 COMMENT '普通积分余额，支持每周返还的小数积分'`,
      `ALTER TABLE currency_logs MODIFY COLUMN amount DECIMAL(18, 6) NOT NULL COMMENT '变动数量（正为收入，负为支出）'`,
      `ALTER TABLE currency_logs MODIFY COLUMN before_balance DECIMAL(18, 6) NOT NULL COMMENT '变动前余额'`,
      `ALTER TABLE currency_logs MODIFY COLUMN after_balance DECIMAL(18, 6) NOT NULL COMMENT '变动后余额'`,
    ];
    for (const sql of statements) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {
        // 兼容已调整过的库或不同 MySQL 版本。
      }
    }
  }

  private async ensureSystemSwitchTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS system_switches (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        feature_key VARCHAR(50) NOT NULL,
        feature_name VARCHAR(50) NOT NULL,
        status TINYINT NOT NULL DEFAULT 1 COMMENT '1正常 0禁用',
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_system_switch_feature_key (feature_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='后台功能开关表';
    `);
  }

  private async ensureCurrencyAccountsForExistingUsers() {
    const result = await this.dataSource.query(`
      INSERT IGNORE INTO user_currencies (user_id)
      SELECT u.id
      FROM users u
      LEFT JOIN user_currencies c ON c.user_id = u.id
      WHERE c.user_id IS NULL
    `);
    return Number(result?.affectedRows ?? result?.[0]?.affectedRows ?? 0);
  }

  private async ensureDefaultSwitches() {
    await this.ensureSystemSwitchTable();
    const switches = [
      [WEEKLY_POINT_RETURN_SWITCH_KEY, '积分返还'],
      [DIRECT_GAME_REWARD_SWITCH_KEY, '直推流水奖励'],
    ];
    for (const item of switches) {
      await this.dataSource.query(
        `INSERT INTO system_switches (feature_key, feature_name, status)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE feature_name = VALUES(feature_name)`,
        item,
      );
    }
  }

  private async isWeeklyPointReturnEnabled() {
    await this.ensureDefaultSwitches();
    const rows = await this.dataSource.query(
      `SELECT status FROM system_switches WHERE feature_key = ? LIMIT 1`,
      [WEEKLY_POINT_RETURN_SWITCH_KEY],
    );
    return rows.length === 0 || Number(rows[0].status) === 1;
  }

  private async isDirectGameRewardEnabled(manager?: EntityManager) {
    await this.ensureDefaultSwitches();
    const rows = await (manager || this.dataSource.manager).query(
      `SELECT status FROM system_switches WHERE feature_key = ? LIMIT 1`,
      [DIRECT_GAME_REWARD_SWITCH_KEY],
    );
    return rows.length === 0 || Number(rows[0].status) === 1;
  }

  private async ensureWeeklyPointReturnTables() {
    await this.ensureCurrencyPrecisionForWeeklyReturn();
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS weekly_point_return_periods (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        week_start_date DATE NOT NULL COMMENT '消费统计周开始日期，周一，统计从当天00:00:01开始',
        week_end_date DATE NOT NULL COMMENT '消费统计周结束日期，周日，统计到当天23:59:59结束',
        week_start_at DATETIME NOT NULL COMMENT '本周实际可返还消费统计开始时间，首个上线周可能为功能上线时间',
        week_end_at DATETIME NOT NULL COMMENT '本周可返还消费统计截止时间，周日23:59:59',
        settlement_started_at DATETIME NOT NULL COMMENT '周结算生成时间，正常为周日23:59:59',
        multiplier DECIMAL(10, 6) NOT NULL COMMENT '返还倍率，来自system_configs.weekly_point_return_multiplier，默认1.5',
        daily_rate DECIMAL(10, 6) NOT NULL DEFAULT 0.010000 COMMENT '每日返还比例，0.01表示1%',
        excluded_log_types VARCHAR(255) NOT NULL COMMENT '排除的消费流水类型，逗号分隔，如group_create,meeting_start',
        status TINYINT NOT NULL DEFAULT 0 COMMENT '0返还中 1已完成 2已跳过',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_weekly_return_period_week_start (week_start_date),
        INDEX idx_weekly_return_period_status (status),
        INDEX idx_weekly_return_period_week_end (week_end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每周积分返还结算周期表';
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS weekly_point_return_accounts (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        period_id BIGINT NOT NULL COMMENT '关联weekly_point_return_periods.id',
        user_id INT NOT NULL COMMENT '用户ID，每个用户单独统计和返还',
        eligible_consumed_points DECIMAL(18, 6) NOT NULL DEFAULT 0 COMMENT '本用户本周可返还的消费积分总额：普通积分负数流水取绝对值，排除指定log_type',
        excluded_consumed_points DECIMAL(18, 6) NOT NULL DEFAULT 0 COMMENT '本用户本周被排除的消费积分总额：普通建群、普通群员发起视频会议等',
        remaining_base_points DECIMAL(18, 6) NOT NULL DEFAULT 0 COMMENT '每日递减后的剩余返还基数，发一天就减去当天已返还积分',
        total_returned_points DECIMAL(18, 6) NOT NULL DEFAULT 0 COMMENT '本周期已实际返还积分总额',
        paid_days TINYINT NOT NULL DEFAULT 0 COMMENT '已发放天数，最多7天',
        multiplier DECIMAL(10, 6) NOT NULL COMMENT '本用户本周期使用的返还倍率快照',
        daily_rate DECIMAL(10, 6) NOT NULL COMMENT '本用户本周期使用的每日返还比例快照',
        status TINYINT NOT NULL DEFAULT 0 COMMENT '0返还中 1已返还7天 2无可返还消费/跳过',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_weekly_return_account_user (period_id, user_id),
        INDEX idx_weekly_return_account_user (user_id),
        INDEX idx_weekly_return_account_status (period_id, status, paid_days)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每周积分返还用户汇总表';
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS weekly_point_return_daily_records (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        period_id BIGINT NOT NULL COMMENT '关联weekly_point_return_periods.id',
        account_id BIGINT NOT NULL COMMENT '关联weekly_point_return_accounts.id',
        user_id INT NOT NULL COMMENT '用户ID',
        return_date DATE NOT NULL COMMENT '实际返还日期，周一到周日，每用户每天一条',
        day_index TINYINT NOT NULL COMMENT '返还第几天，1周一，7周日',
        base_before_return DECIMAL(18, 6) NOT NULL COMMENT '当天返还前的剩余基数',
        multiplier DECIMAL(10, 6) NOT NULL COMMENT '当天使用的返还倍率',
        daily_rate DECIMAL(10, 6) NOT NULL COMMENT '当天使用的每日返还比例',
        return_amount DECIMAL(18, 6) NOT NULL COMMENT '当天返还积分=返还前剩余基数*返还倍率*每日返还比例',
        base_after_return DECIMAL(18, 6) NOT NULL COMMENT '当天返还后的剩余基数',
        currency_log_id BIGINT NULL COMMENT '对应currency_logs.id，便于追流水',
        status TINYINT NOT NULL DEFAULT 1 COMMENT '1发放成功 2跳过',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_weekly_return_daily_account_date (account_id, return_date),
        INDEX idx_weekly_return_daily_user (user_id, return_date),
        INDEX idx_weekly_return_daily_period (period_id, day_index)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每周积分返还每日发放明细表';
    `);

    const commentStatements = [
      `ALTER TABLE weekly_point_return_periods MODIFY COLUMN week_start_at DATETIME NOT NULL COMMENT '本周实际可返还消费统计开始时间，首个上线周可能为功能上线时间'`,
      `ALTER TABLE weekly_point_return_periods MODIFY COLUMN multiplier DECIMAL(10, 6) NOT NULL COMMENT '返还倍率，来自system_configs.weekly_point_return_multiplier，默认1.5'`,
      `ALTER TABLE weekly_point_return_accounts MODIFY COLUMN multiplier DECIMAL(10, 6) NOT NULL COMMENT '本用户本周期使用的独立积分返还倍率快照'`,
      `ALTER TABLE weekly_point_return_daily_records MODIFY COLUMN multiplier DECIMAL(10, 6) NOT NULL COMMENT '当天使用的独立积分返还倍率'`,
    ];
    for (const sql of commentStatements) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {
        // 表已按目标结构创建时无需重复处理。
      }
    }
  }

  /** 直推流水奖励表：有效流水与每笔上级收益都单独落表，方便追账。 */
  private async ensureDirectGameRewardTables() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS game_turnover_records (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '产生有效游戏流水的用户ID',
        game_id INT NULL COMMENT '游戏ID，可为空，如赛马旧接口未带gameId时为空',
        source_type VARCHAR(50) NOT NULL COMMENT '有效流水类型：bet下注/revive复活/fish_sell卖鱼等',
        turnover_amount DECIMAL(18, 6) NOT NULL COMMENT '有效游戏流水金额，按正数记录',
        currency_log_id BIGINT NULL COMMENT '对应用户本人的积分变动日志ID，便于追账',
        biz_id VARCHAR(100) NULL COMMENT '业务ID，如房间ID、对局ID、请求ID',
        description VARCHAR(200) NULL COMMENT '流水说明',
        reward_status TINYINT NOT NULL DEFAULT 0 COMMENT '直推流水奖励处理状态：0未处理 1已处理 2开关关闭跳过',
        reward_rate DECIMAL(10, 6) NULL COMMENT '本笔流水使用的返利比例快照，如0.0015',
        reward_count INT NOT NULL DEFAULT 0 COMMENT '本笔流水实际获得返利的上级人数',
        total_reward_amount DECIMAL(18, 6) NOT NULL DEFAULT 0 COMMENT '本笔流水合计发放的普通积分返利',
        reward_processed_at DATETIME NULL COMMENT '直推流水奖励处理完成时间',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_game_turnover_user_time (user_id, created_at),
        INDEX idx_game_turnover_game_time (game_id, created_at),
        INDEX idx_game_turnover_source (source_type),
        INDEX idx_game_turnover_reward_status (reward_status),
        INDEX idx_game_turnover_currency_log (currency_log_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='有效游戏流水表：只记录下注、复活、卖鱼等可参与直推收益的流水';
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS direct_game_reward_records (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        turnover_id BIGINT NOT NULL COMMENT '关联game_turnover_records.id',
        source_user_id INT NOT NULL COMMENT '产生游戏流水的下级用户ID',
        ancestor_user_id INT NOT NULL COMMENT '获得收益的上级/顶点用户ID',
        generation TINYINT NOT NULL COMMENT 'source_user在ancestor_user树里的代数，ancestor为1代，直推为2代',
        valid_direct_count INT NOT NULL COMMENT 'ancestor_user当时已激活直推人数快照',
        max_generation TINYINT NOT NULL COMMENT '按有效直推人数计算出的最大可拿代数，最高20代',
        turnover_amount DECIMAL(18, 6) NOT NULL COMMENT '原始有效游戏流水金额',
        reward_rate DECIMAL(10, 6) NOT NULL COMMENT '收益比例，默认0.0015，即千分之1.5',
        reward_amount DECIMAL(18, 6) NOT NULL COMMENT '实际发放到普通积分points的收益',
        currency_log_id BIGINT NULL COMMENT '收益发放对应currency_logs.id',
        status TINYINT NOT NULL DEFAULT 1 COMMENT '1发放成功 2跳过 3失败',
        remark VARCHAR(200) NULL COMMENT '发放说明或失败原因',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_direct_reward_turnover_ancestor (turnover_id, ancestor_user_id),
        INDEX idx_direct_reward_ancestor_time (ancestor_user_id, created_at),
        INDEX idx_direct_reward_source_time (source_user_id, created_at),
        INDEX idx_direct_reward_currency_log (currency_log_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='直推/间推游戏流水收益明细表';
    `);

    const turnoverColumnStatements = [
      `ALTER TABLE game_turnover_records ADD COLUMN reward_status TINYINT NOT NULL DEFAULT 0 COMMENT '直推流水奖励处理状态：0未处理 1已处理 2开关关闭跳过' AFTER description`,
      `ALTER TABLE game_turnover_records ADD COLUMN reward_rate DECIMAL(10, 6) NULL COMMENT '本笔流水使用的返利比例快照，如0.0015' AFTER reward_status`,
      `ALTER TABLE game_turnover_records ADD COLUMN reward_count INT NOT NULL DEFAULT 0 COMMENT '本笔流水实际获得返利的上级人数' AFTER reward_rate`,
      `ALTER TABLE game_turnover_records ADD COLUMN total_reward_amount DECIMAL(18, 6) NOT NULL DEFAULT 0 COMMENT '本笔流水合计发放的普通积分返利' AFTER reward_count`,
      `ALTER TABLE game_turnover_records ADD COLUMN reward_processed_at DATETIME NULL COMMENT '直推流水奖励处理完成时间' AFTER total_reward_amount`,
      `ALTER TABLE game_turnover_records ADD INDEX idx_game_turnover_reward_status (reward_status)`,
    ];
    for (const sql of turnoverColumnStatements) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {
        // 兼容已创建过字段/索引的数据库。
      }
    }
  }

  /** 获取用户货币余额 */
  async getBalance(userId: number) {
    const c = await this.currencyRepo.findOne({ where: { userId } });
    if (!c) throw new NotFoundException('货币账户不存在');
    return {
      points: Number(c.points),
      gold: Number(c.gold),
      silver: Number(c.silver),
      specialPointsTier1: Number(c.specialPointsTier1),
      specialPointsTier2: Number(c.specialPointsTier2),
      specialPointsTier3: Number(c.specialPointsTier3),
      rewardPoints: Number(c.rewardPoints),
      invitePoints: Number(c.invitePoints),
    };
  }

  /** 统一货币变动（事务内） */
  async changeCurrency(
    userId: number,
    type: CurrencyType,
    amount: number,
    logType: string,
    description: string,
    manager?: EntityManager,
  ) {
    const mgr = manager || this.dataSource.manager;

    const currency = await mgr.findOne(UserCurrency, { where: { userId } });
    if (!currency) throw new NotFoundException('货币账户不存在');

    let fieldName: keyof UserCurrency;
    switch (type) {
      case 'points': fieldName = 'points'; break;
      case 'gold': fieldName = 'gold'; break;
      case 'silver': fieldName = 'silver'; break;
      case 'reward': fieldName = 'rewardPoints'; break;
      case 'invite': fieldName = 'invitePoints'; break;
      default: throw new BadRequestException('不支持的货币类型');
    }

    const before = Number(currency[fieldName]);
    const after = before + amount;
    if (after < 0) throw new BadRequestException('余额不足');

    (currency as any)[fieldName] = after;
    await mgr.save(UserCurrency, currency);

    // 记录流水
    const log = mgr.create(CurrencyLog, {
      userId,
      sn: generateSn('CL'),
      currencyType: type,
      amount,
      beforeBalance: before,
      afterBalance: after,
      logType,
      description,
    });
    const savedLog = await mgr.save(CurrencyLog, log);

    return { before, after, amount, logId: Number(savedLog.id) };
  }

  /** 货币明细查询 */
  async getLogs(userId: number, currencyType: string | undefined, pagination: PaginationDto) {
    const qb = this.logRepo.createQueryBuilder('log')
      .where('log.user_id = :userId', { userId })
      .orderBy('log.created_at', 'DESC');

    if (currencyType) {
      qb.andWhere('log.currency_type = :currencyType', { currencyType });
    }

    const total = await qb.getCount();
    const list = await qb
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .getMany();

    return { list, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  private maxDirectRewardGeneration(validDirectCount: number) {
    if (validDirectCount >= 6) return 20;
    if (validDirectCount >= 5) return 15;
    if (validDirectCount >= 4) return 12;
    if (validDirectCount >= 3) return 9;
    if (validDirectCount >= 2) return 6;
    if (validDirectCount >= 1) return 3;
    return 0;
  }

  private async getDirectRewardRate(manager: EntityManager) {
    const rows = await manager.query(
      `SELECT config_value AS value
       FROM system_configs
       WHERE config_key = ?
       LIMIT 1`,
      [DIRECT_GAME_REWARD_RATE_KEY],
    );
    const value = rows?.[0]?.value ?? String(DIRECT_GAME_REWARD_DEFAULT_RATE);
    const rate = this.toFiniteNumber(value, DIRECT_GAME_REWARD_DEFAULT_RATE);
    return rate > 0 ? rate : DIRECT_GAME_REWARD_DEFAULT_RATE;
  }

  private async getActiveAncestorChain(userId: number, manager: EntityManager) {
    const chain: Array<{ userId: number; generation: number }> = [];
    let currentUserId = Number(userId);
    const visited = new Set<number>([currentUserId]);

    for (let generation = 2; generation <= DIRECT_GAME_REWARD_MAX_GENERATION; generation += 1) {
      const rows = await manager.query(
        `SELECT invited_by FROM users WHERE id = ? LIMIT 1`,
        [currentUserId],
      );
      const parentId = Number(rows?.[0]?.invited_by || 0);
      if (!parentId || visited.has(parentId)) break;
      visited.add(parentId);

      const parentRows = await manager.query(
        `SELECT id, is_activated, status FROM users WHERE id = ? LIMIT 1`,
        [parentId],
      );
      const parent = parentRows?.[0];
      if (parent && Number(parent.status) === 1 && (parent.is_activated === true || Number(parent.is_activated) === 1)) {
        chain.push({ userId: parentId, generation });
      }
      currentUserId = parentId;
    }

    return chain;
  }

  private async getValidDirectCount(userId: number, manager: EntityManager) {
    const rows = await manager.query(
      `SELECT COUNT(*) AS total
       FROM users
       WHERE invited_by = ? AND status = 1 AND is_activated = 1`,
      [userId],
    );
    return Number(rows?.[0]?.total || 0);
  }

  private async issueDirectGameRewardsForTurnover(
    turnover: Pick<GameTurnoverRecord, 'id' | 'userId' | 'turnoverAmount'>,
    manager: EntityManager,
  ) {
    const turnoverId = Number(turnover.id);
    const sourceUserId = Number(turnover.userId);
    const amount = this.roundPoints(Math.abs(this.toFiniteNumber(turnover.turnoverAmount)));

    if (!turnoverId || !sourceUserId || amount <= 0) {
      await manager.update(GameTurnoverRecord, turnoverId, {
        rewardStatus: 1,
        rewardCount: 0,
        totalRewardAmount: 0,
        rewardProcessedAt: new Date(),
      });
      return { turnoverId, rewardCount: 0, rewardAmount: 0, skipped: true };
    }

    if (!(await this.isDirectGameRewardEnabled(manager))) {
      await manager.update(GameTurnoverRecord, turnoverId, {
        rewardStatus: 2,
        rewardCount: 0,
        totalRewardAmount: 0,
        rewardProcessedAt: new Date(),
      });
      return { turnoverId, rewardCount: 0, rewardAmount: 0, skipped: true };
    }

    const rate = await this.getDirectRewardRate(manager);
    const ancestors = await this.getActiveAncestorChain(sourceUserId, manager);
    let rewardCount = 0;
    let rewardAmount = 0;
    const rewardEntries: Array<{
      ancestorUserId: number;
      generation: number;
      validDirectCount: number;
      maxGeneration: number;
      turnoverAmount: number;
      rewardRate: number;
      rewardAmount: number;
    }> = [];

    for (const ancestor of ancestors) {
      const validDirectCount = await this.getValidDirectCount(ancestor.userId, manager);
      const maxGeneration = this.maxDirectRewardGeneration(validDirectCount);
      if (maxGeneration <= 0 || ancestor.generation > maxGeneration) continue;

      const existing = await manager.findOne(DirectGameRewardRecord, {
        where: {
          turnoverId,
          ancestorUserId: ancestor.userId,
        },
      });
      if (existing) {
        if (Number(existing.status) === 1) {
          rewardCount += 1;
          const existingAmount = this.toFiniteNumber(existing.rewardAmount);
          rewardAmount = this.roundPoints(rewardAmount + existingAmount);
          rewardEntries.push({
            ancestorUserId: ancestor.userId,
            generation: ancestor.generation,
            validDirectCount: Number(existing.validDirectCount || validDirectCount),
            maxGeneration: Number(existing.maxGeneration || maxGeneration),
            turnoverAmount: amount,
            rewardRate: this.toFiniteNumber(existing.rewardRate, rate),
            rewardAmount: existingAmount,
          });
        }
        continue;
      }

      const amountToPay = this.roundPoints(amount * rate);
      if (amountToPay <= 0) continue;

      const changed = await this.changeCurrency(
        ancestor.userId,
        'points',
        amountToPay,
        'direct_game_reward',
        `下级游戏流水收益：${amount}×${rate}`,
        manager,
      );

      await manager.save(
        DirectGameRewardRecord,
        manager.create(DirectGameRewardRecord, {
          turnoverId,
          sourceUserId,
          ancestorUserId: ancestor.userId,
          generation: ancestor.generation,
          validDirectCount,
          maxGeneration,
          turnoverAmount: amount,
          rewardRate: rate,
          rewardAmount: amountToPay,
          currencyLogId: changed.logId,
          status: 1,
          remark: '已发放到普通积分',
        }),
      );

      rewardCount += 1;
      rewardAmount = this.roundPoints(rewardAmount + amountToPay);
      rewardEntries.push({
        ancestorUserId: ancestor.userId,
        generation: ancestor.generation,
        validDirectCount,
        maxGeneration,
        turnoverAmount: amount,
        rewardRate: rate,
        rewardAmount: amountToPay,
      });
    }

    await manager.update(GameTurnoverRecord, turnoverId, {
      rewardStatus: 1,
      rewardRate: rate,
      rewardCount,
      totalRewardAmount: rewardAmount,
      rewardProcessedAt: new Date(),
    });

    return { turnoverId, rewardCount, rewardAmount, rewardEntries, skipped: false };
  }

  async processPendingDirectGameRewards(limit = 200) {
    await this.ensureDirectGameRewardTables();
    const safeLimit = Math.min(1000, Math.max(1, Math.floor(Number(limit) || 200)));
    if (!(await this.isDirectGameRewardEnabled())) {
      return { processed: 0, rewardCount: 0, rewardAmount: 0, skipped: true, reason: 'switch_disabled' };
    }

    const rows = await this.dataSource.query(
      `SELECT id
       FROM game_turnover_records
       WHERE reward_status = 0
       ORDER BY id ASC
       LIMIT ${safeLimit}`,
    );

    let processed = 0;
    let rewardCount = 0;
    let rewardAmount = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const result = await this.dataSource.transaction(async (mgr) => {
          const lockedRows = await mgr.query(
            `SELECT id, user_id AS userId, turnover_amount AS turnoverAmount, reward_status AS rewardStatus
             FROM game_turnover_records
             WHERE id = ?
             FOR UPDATE`,
            [Number(row.id)],
          );
          const locked = lockedRows[0];
          if (!locked || Number(locked.rewardStatus) !== 0) {
            return { turnoverId: Number(row.id), rewardCount: 0, rewardAmount: 0, skipped: true };
          }
          return this.issueDirectGameRewardsForTurnover(
            {
              id: Number(locked.id),
              userId: Number(locked.userId),
              turnoverAmount: this.toFiniteNumber(locked.turnoverAmount),
            },
            mgr,
          );
        });
        processed += result.skipped ? 0 : 1;
        rewardCount += Number(result.rewardCount || 0);
        rewardAmount = this.roundPoints(rewardAmount + this.toFiniteNumber(result.rewardAmount));
      } catch (_) {
        failed += 1;
      }
    }

    return { processed, rewardCount, rewardAmount, failed };
  }

  private async previewDirectGameRewardEntries(
    sourceUserId: number,
    amount: number,
    manager: EntityManager,
  ) {
    if (!(await this.isDirectGameRewardEnabled(manager))) return [];

    const rate = await this.getDirectRewardRate(manager);
    const ancestors = await this.getActiveAncestorChain(sourceUserId, manager);
    const entries: Array<{
      ancestorUserId: number;
      generation: number;
      validDirectCount: number;
      maxGeneration: number;
      turnoverAmount: number;
      rewardRate: number;
      rewardAmount: number;
    }> = [];

    for (const ancestor of ancestors) {
      const validDirectCount = await this.getValidDirectCount(ancestor.userId, manager);
      const maxGeneration = this.maxDirectRewardGeneration(validDirectCount);
      if (maxGeneration <= 0 || ancestor.generation > maxGeneration) continue;

      const amountToPay = this.roundPoints(amount * rate);
      if (amountToPay <= 0) continue;
      entries.push({
        ancestorUserId: ancestor.userId,
        generation: ancestor.generation,
        validDirectCount,
        maxGeneration,
        turnoverAmount: amount,
        rewardRate: rate,
        rewardAmount: amountToPay,
      });
    }

    return entries;
  }

  async recordGameTurnover(input: GameTurnoverInput) {
    const amount = this.roundPoints(Math.abs(this.toFiniteNumber(input.amount)));
    const sourceUserId = Number(input.userId);
    if (!sourceUserId || amount <= 0) {
      return { turnoverId: 0, rewardCount: 0, rewardAmount: 0, skipped: true };
    }

    const manager = input.manager || this.dataSource.manager;
    const shouldOwnTransaction = !input.manager;
    const runner = async (mgr: EntityManager) => this.recordGameTurnoverInTransaction(input, amount, mgr);

    if (shouldOwnTransaction) {
      return this.dataSource.transaction(runner);
    }
    return runner(manager);
  }

  private async recordGameTurnoverInTransaction(
    input: GameTurnoverInput,
    amount: number,
    manager: EntityManager,
  ) {
    const sourceUserId = Number(input.userId);
    const turnover = await manager.save(
      GameTurnoverRecord,
      manager.create(GameTurnoverRecord, {
        userId: sourceUserId,
        gameId: input.gameId ? Number(input.gameId) : null,
        sourceType: String(input.sourceType || 'game_turnover').slice(0, 50),
        turnoverAmount: amount,
        currencyLogId: input.currencyLogId ? Number(input.currencyLogId) : null,
        bizId: input.bizId === undefined || input.bizId === null ? null : String(input.bizId).slice(0, 100),
        description: String(input.description || '').slice(0, 200),
        rewardStatus: 0,
        rewardCount: 0,
        totalRewardAmount: 0,
      }),
    );

    return this.issueDirectGameRewardsForTurnover(turnover, manager);
  }

  /** 特殊积分三档位发放（后台调用） */
  async addSpecialPoints(userId: number, amount: number, manager?: EntityManager) {
    const mgr = manager || this.dataSource.manager;
    const currency = await mgr.findOne(UserCurrency, { where: { userId } });
    if (!currency) throw new NotFoundException('货币账户不存在');

    if (currency.specialPointsCount >= 3) {
      throw new BadRequestException('特殊积分已满3个档位，无法继续发放');
    }

    const count = currency.specialPointsCount + 1;
    if (count === 1) currency.specialPointsTier1 = amount;
    else if (count === 2) currency.specialPointsTier2 = amount;
    else if (count === 3) currency.specialPointsTier3 = amount;
    currency.specialPointsCount = count;

    await mgr.save(UserCurrency, currency);

    // 记录流水
    const log = mgr.create(CurrencyLog, {
      userId,
      sn: generateSn('SP'),
      currencyType: 'special',
      amount,
      beforeBalance: 0,
      afterBalance: amount,
      logType: 'admin_add',
      description: `特殊积分第${count}档发放`,
    });
    await mgr.save(CurrencyLog, log);

    return { tier: count, amount };
  }

  /** 奖励积分每日产出（定时任务调用） */
  async dailyRewardProduction() {
    const currencies = await this.currencyRepo.find();
    for (const c of currencies) {
      const t1 = Number(c.specialPointsTier1);
      const t2 = Number(c.specialPointsTier2);
      const t3 = Number(c.specialPointsTier3);
      const daily = ((t1 * 0.3) / 365) + ((t2 * 0.3) / 365) + ((t3 * 0.3) / 365);

      if (daily > 0) {
        await this.dataSource.transaction(async (mgr) => {
          await this.changeCurrency(c.userId, 'reward', daily, 'daily_reward', '每日奖励积分产出', mgr);
        });
      }
    }
  }

  /** 每周积分返还每日发放入口（兼容旧调用名） */
  async dailyPointReturn() {
    return this.processWeeklyPointReturnPayouts();
  }

  /** 积分合成 */
  async synthesize(userId: number, configId: number) {
    const config = await this.synthesisRepo.findOne({ where: { id: configId, status: 1 } });
    if (!config) throw new BadRequestException('合成配置不存在或已禁用');

    await this.dataSource.transaction(async (mgr) => {
      await this.changeCurrency(userId, 'points', -Number(config.consumePoints), 'synthesize', '积分合成消耗', mgr);
      await this.changeCurrency(userId, config.targetCurrency as CurrencyType, Number(config.targetAmount), 'synthesize', '积分合成获得', mgr);
    });

    return { message: '合成成功' };
  }

  /** 获取合成配置列表 */
  async getSynthesisConfigs() {
    return this.synthesisRepo.find({ where: { status: 1 } });
  }

  private async ensureWithdrawSecurityTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS withdraw_securities (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_withdraw_security_user_id (user_id),
        INDEX idx_withdraw_security_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  private normalizeWithdrawPassword(password?: string) {
    const value = String(password || '').trim();
    if (!/^\d{6}$/.test(value)) {
      throw new BadRequestException('提现密码必须是6位数字');
    }
    return value;
  }

  private normalizeWithdrawPhone(phone?: string) {
    const value = String(phone || '').trim();
    if (!/^1\d{10}$/.test(value)) {
      throw new BadRequestException('请输入正确的预留手机号');
    }
    return value;
  }

  async getWithdrawSecurity(userId: number) {
    await this.ensureWithdrawSecurityTable();
    const rows = await this.dataSource.query(
      `SELECT phone FROM withdraw_securities WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    const phone = rows?.[0]?.phone || '';
    return {
      hasPassword: rows.length > 0,
      phoneMasked: phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '',
    };
  }

  async setWithdrawPassword(
    userId: number,
    data: { phone?: string; password?: string; confirmPassword?: string },
  ) {
    await this.ensureWithdrawSecurityTable();
    const existing = await this.dataSource.query(
      `SELECT id FROM withdraw_securities WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    if (existing.length > 0) {
      return { message: '提现密码已设置', hasPassword: true };
    }
    const phone = this.normalizeWithdrawPhone(data.phone);
    const password = this.normalizeWithdrawPassword(data.password);
    const confirmPassword = this.normalizeWithdrawPassword(data.confirmPassword);
    if (password !== confirmPassword) {
      throw new BadRequestException('两次输入的提现密码不一致');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.dataSource.query(
      `INSERT INTO withdraw_securities (user_id, phone, password_hash)
       VALUES (?, ?, ?)`,
      [userId, phone, passwordHash],
    );
    return { message: '提现密码设置成功' };
  }

  async resetWithdrawPassword(
    userId: number,
    data: { phone?: string; password?: string; confirmPassword?: string },
  ) {
    await this.ensureWithdrawSecurityTable();
    const rows = await this.dataSource.query(
      `SELECT id, phone FROM withdraw_securities WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) {
      throw new BadRequestException('请先设置提现密码');
    }
    const phone = this.normalizeWithdrawPhone(data.phone);
    if (phone !== rows[0].phone) {
      throw new BadRequestException('预留手机号验证失败');
    }
    const password = this.normalizeWithdrawPassword(data.password);
    const confirmPassword = this.normalizeWithdrawPassword(data.confirmPassword);
    if (password !== confirmPassword) {
      throw new BadRequestException('两次输入的提现密码不一致');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.dataSource.query(
      `UPDATE withdraw_securities SET password_hash = ?, updated_at = NOW() WHERE user_id = ?`,
      [passwordHash, userId],
    );
    return { message: '提现密码重置成功' };
  }

  private async verifyWithdrawPassword(userId: number, withdrawPassword?: string) {
    await this.ensureWithdrawSecurityTable();
    const rows = await this.dataSource.query(
      `SELECT password_hash FROM withdraw_securities WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) {
      throw new BadRequestException('请先设置提现密码');
    }
    const password = this.normalizeWithdrawPassword(withdrawPassword);
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) {
      throw new BadRequestException('提现密码错误');
    }
  }

  /** 提现申请 */
  async withdraw(userId: number, data: { amount: number; paymentMethod: string; accountName: string; accountNumber: string; content?: string; withdrawPassword?: string }) {
    const { amount, paymentMethod, accountName, accountNumber, content, withdrawPassword } = data;
    if (!amount || amount < 100) throw new BadRequestException('提现最低100元');
    if (amount % 100 !== 0) throw new BadRequestException('提现金额必须是100的整数倍');
    if (!paymentMethod || !['alipay', 'bank'].includes(paymentMethod)) {
      throw new BadRequestException('请选择提现方式（支付宝或银行卡）');
    }
    if (!accountName || !accountName.trim()) throw new BadRequestException('请填写收款人姓名');
    if (!accountNumber || !accountNumber.trim()) throw new BadRequestException('请填写收款账号');
    await this.verifyWithdrawPassword(userId, withdrawPassword);

    // 校验可提现余额 = 实时可提现推广收益 - 待审核/已通过提现总额。
    const { totalEarned, totalWithdrawn } = await this.getWithdrawableBalance(userId);
    const available = totalEarned - totalWithdrawn;
    if (amount > available) {
      throw new BadRequestException(`可提现余额不足，当前可提现 ${available.toFixed(0)} 元`);
    }

    // 创建提现记录（不扣积分，直接记录）
    const fee = Math.floor(amount * 0.2);
    const actualAmount = amount - fee;
    const withdrawal = this.withdrawalRepo.create({
      userId,
      amount,
      paymentMethod,
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      content: `提现${amount}元，手续费${fee}元（20%），实际到账${actualAmount}元` + (content?.trim() ? `；备注：${content.trim()}` : ''),
      status: 0,
    });
    await this.withdrawalRepo.save(withdrawal);

    // 给管理员发送服务通知
    await this.serviceNotificationService.notifyAdmin({
      type: 'withdrawal',
      title: '新的提现申请',
      content: `${accountName.trim()} 申请提现 ${amount} 元（实际到账 ${actualAmount} 元），收款方式：${paymentMethod}`,
      fromUserId: userId,
      payload: { withdrawalId: withdrawal.id, amount, actualAmount },
    });

    return { message: '提现申请已提交，请等待审核' };
  }

  /** 获取用户可提现余额 */
  async getWithdrawableBalance(userId: number) {
    // 1-4号位与特殊奖励产生后即可提现，不等待矩阵完成。
    const earnedResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(i.amount), 0) as total FROM matrix_incomes i
       INNER JOIN matrices m ON i.matrix_id = m.id
       WHERE i.owner_id = ?
         AND (i.slot_number BETWEEN 1 AND 4 OR i.slot_number = 0)
         AND m.owner_id = ?`,
      [userId, userId],
    );
    const totalEarned = Number(earnedResult?.[0]?.total || 0);

    // 已提现总额（待审核 + 已通过）
    const withdrawnResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = ? AND status IN (0, 1)`,
      [userId],
    );
    const totalWithdrawn = Number(withdrawnResult?.[0]?.total || 0);

    return { totalEarned, totalWithdrawn };
  }

  /** 获取用户交易记录：推广收益入账 + 提现申请。 */
  async getWithdrawRecords(userId: number) {
    const withdrawals = await this.withdrawalRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const incomes = await this.dataSource.query(
      `SELECT i.id, i.amount, i.slot_number, i.description, i.created_at,
              u.account AS source_account, u.nickname AS source_nickname
       FROM matrix_incomes i
       LEFT JOIN users u ON u.id = i.from_user_id
       WHERE i.owner_id = ?
         AND (i.slot_number BETWEEN 1 AND 4 OR i.slot_number = 0)
       ORDER BY i.created_at DESC`,
      [userId],
    );

    const incomeRecords = incomes.map((r: any) => ({
      id: `income-${r.id}`,
      transactionType: 'income',
      amount: Number(r.amount),
      isSpecialReward: Number(r.slot_number) === 0,
      title: Number(r.slot_number) === 0 ? '特殊奖励' : '推广收益',
      description: r.description,
      sourceAccount: r.source_account || '',
      sourceNickname: r.source_nickname || '',
      createdAt: r.created_at,
    }));
    const withdrawalRecords = withdrawals.map(r => ({
      id: `withdrawal-${r.id}`,
      transactionType: 'withdrawal',
      amount: Number(r.amount),
      fee: Math.floor(Number(r.amount) * 0.2),
      actualAmount: Number(r.amount) - Math.floor(Number(r.amount) * 0.2),
      paymentMethod: r.paymentMethod,
      accountName: r.accountName,
      accountNumber: r.accountNumber,
      status: r.status, // 0待审核 1已打款 2驳回
      statusText: r.status === 0 ? '审核中' : r.status === 1 ? '已打款' : '已驳回',
      createdAt: r.createdAt,
      reviewTime: r.reviewTime,
    }));

    return [...incomeRecords, ...withdrawalRecords].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /** 提现审核（管理端） */
  async reviewWithdrawal(id: number, approve: boolean) {
    const w = await this.withdrawalRepo.findOne({ where: { id } });
    if (!w) throw new NotFoundException('提现记录不存在');
    if (w.status !== 0) throw new BadRequestException('该申请已处理');

    if (approve) {
      await this.withdrawalRepo.update(id, { status: 1, reviewTime: new Date() });
    } else {
      // 驳回：直接更新状态（不需要返还，因为提现不扣积分）
      await this.withdrawalRepo.update(id, { status: 2, reviewTime: new Date() });
    }

    return { message: approve ? '已通过' : '已驳回' };
  }

  // ==================== 系统配置 ====================

  /** 获取配置值 */
  async getConfigValue(key: string, defaultValue: string): Promise<string> {
    const config = await this.configRepo.findOne({ where: { configKey: key } });
    return config ? config.configValue : defaultValue;
  }

  /** 获取所有配置 */
  async getAllConfigs() {
    return this.configRepo.find();
  }

  /** 更新配置 */
  async updateConfig(key: string, value: string) {
    await this.configRepo.update({ configKey: key }, { configValue: value });
    return { message: '配置已更新' };
  }

  /** 初始化默认配置（首次启动时） */
  async ensureDefaultConfigs() {
    await this.ensureWeeklyPointReturnTables();
    await this.ensureDirectGameRewardTables();
    await this.ensureDefaultSwitches();
    await this.ensureCurrencyAccountsForExistingUsers();
    const defaults = [
      { configKey: 'daily_deduction_rate', configName: '每日积分扣除比例', configValue: '0.01', description: '每天扣除用户积分的百分比，0.01表示1%' },
      { configKey: 'weekly_return_multiplier', configName: '每周返还倍率', configValue: '1.5', description: '旧版每周返还逻辑使用的倍率，与新的积分返还功能无关' },
      { configKey: WEEKLY_POINT_RETURN_MULTIPLIER_KEY, configName: '积分返还倍率', configValue: '1.5', description: '新的积分返还功能独立倍率：剩余返还基数×该倍率×每日比例' },
      { configKey: WEEKLY_POINT_RETURN_DAILY_RATE_KEY, configName: '积分返还每日比例', configValue: '0.01', description: '每周积分返还每天使用的比例，0.01表示1%' },
      { configKey: WEEKLY_POINT_RETURN_STARTED_AT_KEY, configName: '积分返还开始时间', configValue: this.formatLocalDateTime(new Date()), description: '功能首次初始化时间；只结算结束时间不早于该时间的消费周，避免上线时追溯发放历史周' },
      { configKey: DIRECT_GAME_REWARD_RATE_KEY, configName: '直推流水奖励比例', configValue: String(DIRECT_GAME_REWARD_DEFAULT_RATE), description: '下级有效游戏流水给符合条件上级的普通积分收益比例，0.0015表示千分之1.5' },
      { configKey: 'meeting_start_cost', configName: '普通成员发起会议消耗', configValue: '10000', description: '普通群成员发起群会议需要扣除的积分，群主和管理员免费' },
      { configKey: 'data_retention_days', configName: '聊天/会议数据保留天数', configValue: '7', description: '后台清理聊天记录和已结束会议时使用的保留天数' },
      { configKey: 'meeting_media_mode', configName: '会议媒体模式', configValue: 'p2p', description: 'p2p 或 sfu；SFU 服务接入稳定后可切换为 sfu' },
      { configKey: 'meeting_sfu_endpoint', configName: '会议SFU地址', configValue: '', description: 'mediasoup/Janus 信令或控制服务地址，未配置时客户端继续使用 P2P' },
      { configKey: 'meeting_turn_urls', configName: '会议TURN地址', configValue: '', description: 'TURN/STUN 地址，多个地址用英文逗号或换行分隔' },
      { configKey: 'meeting_turn_username', configName: '会议TURN用户名', configValue: '', description: 'TURN 服务用户名' },
      { configKey: 'meeting_turn_credential', configName: '会议TURN密码', configValue: '', description: 'TURN 服务密码或凭据' },
      { configKey: 'meeting_recording_enabled', configName: '会议录制开关', configValue: 'false', description: '是否启用服务端录制能力' },
      { configKey: 'meeting_recording_auto', configName: '会议自动录制', configValue: 'false', description: '启用录制后是否自动开始录制' },
      { configKey: 'ai_api_key', configName: '云AI API Key', configValue: '', description: '云AI服务密钥，例如 SiliconFlow / DeepSeek 的 API Key' },
      { configKey: 'ai_base_url', configName: '云AI接口地址', configValue: 'https://api.siliconflow.cn/v1', description: '兼容 OpenAI Chat Completions 的接口地址' },
      { configKey: 'ai_model', configName: '云AI模型', configValue: 'deepseek-ai/DeepSeek-V3', description: '云AI使用的模型名称' },
      { configKey: 'recharge_qrcode', configName: '充值收款码', configValue: '', description: '充值页展示的收款二维码图片地址（后台上传）' },
      { configKey: 'recharge_payee_name', configName: '充值收款人', configValue: '', description: '充值页展示的收款人姓名' },
      { configKey: 'recharge_notice', configName: '充值说明', configValue: '请先扫码付款，再填写姓名和手机号提交，管理员核实后会通过短信发送激活码。', description: '充值页展示的操作说明' },
      { configKey: 'recharge_packages', configName: '充值套餐', configValue: '', description: '充值套餐档位，多个用英文逗号分隔，如 100,200,500' },
    ];
    for (const d of defaults) {
      const exists = await this.configRepo.findOne({ where: { configKey: d.configKey } });
      if (!exists) {
        await this.configRepo.save(this.configRepo.create(d));
      }
    }
  }

  // ==================== 每日积分扣除 ====================

  /** 每日积分扣除（定时任务调用） */
  async dailyPointDeduction() {
    const rateStr = await this.getConfigValue('daily_deduction_rate', '0.01');
    const rate = parseFloat(rateStr);
    if (rate <= 0 || rate >= 1) return;

    const today = new Date().toISOString().slice(0, 10);
    const currencies = await this.currencyRepo.find();

    for (const c of currencies) {
      const balance = Number(c.points);
      if (balance <= 0) continue;

      const deductAmount = Math.round(balance * rate * 100) / 100;
      if (deductAmount <= 0) continue;

      await this.dataSource.transaction(async (mgr) => {
        await this.changeCurrency(c.userId, 'points', -deductAmount, 'daily_deduction', `每日积分扣除(${(rate * 100).toFixed(2)}%)`, mgr);

        const record = mgr.create(DailyDeduction, {
          userId: c.userId,
          deductionDate: today,
          beforeBalance: balance,
          deductedAmount: deductAmount,
          deductionRate: rate,
        });
        await mgr.save(DailyDeduction, record);
      });
    }
  }

  // ==================== 每周积分返还 ====================

  /** 周结算入口（兼容旧调用名） */
  async weeklyReturnSetup() {
    return this.setupWeeklyPointReturnPeriod();
  }

  private async getWeeklyPointReturnConsumeRows(startAt: Date, endAt: Date) {
    const excludedPlaceholders = WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES
      .map(() => '?')
      .join(', ');
    return this.dataSource.query(
      `SELECT
         user_id AS userId,
         ROUND(SUM(CASE
           WHEN log_type IN (${excludedPlaceholders}) THEN ABS(amount)
           ELSE 0
         END), 6) AS excludedConsumed,
         ROUND(SUM(CASE
           WHEN log_type NOT IN (${excludedPlaceholders}) THEN ABS(amount)
           ELSE 0
         END), 6) AS eligibleConsumed
       FROM currency_logs
       WHERE currency_type = 'points'
         AND amount < 0
         AND created_at >= ?
         AND created_at <= ?
       GROUP BY user_id`,
      [
        ...WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES,
        ...WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES,
        this.formatLocalDateTime(startAt),
        this.formatLocalDateTime(endAt),
      ],
    );
  }

  /** 统计刚结束的一周消费，并按用户创建独立返还账户。 */
  async setupWeeklyPointReturnPeriod(
    now = new Date(),
    options: { allowBeforeFeatureStart?: boolean; forceWeekStartAt?: Date } = {},
  ) {
    await this.ensureWeeklyPointReturnTables();
    if (!(await this.isWeeklyPointReturnEnabled())) {
      return { created: false, periodId: 0, reason: 'switch_disabled' };
    }

    const multiplierStr = await this.getConfigValue(
      WEEKLY_POINT_RETURN_MULTIPLIER_KEY,
      '1.5',
    );
    const dailyRateStr = await this.getConfigValue(WEEKLY_POINT_RETURN_DAILY_RATE_KEY, '0.01');
    const multiplier = this.toFiniteNumber(multiplierStr);
    const dailyRate = this.toFiniteNumber(dailyRateStr);
    if (multiplier <= 0 || dailyRate <= 0) {
      return { created: false, periodId: 0, reason: 'invalid_rate' };
    }

    const week = this.getSettlementWeek(now);
    const startedAtText = await this.getConfigValue(
      WEEKLY_POINT_RETURN_STARTED_AT_KEY,
      '',
    );
    const startedAt = this.parseLocalDateTime(startedAtText);
    if (!options.allowBeforeFeatureStart && startedAt && week.weekEndAt.getTime() < startedAt.getTime()) {
      return {
        created: false,
        periodId: 0,
        reason: 'before_feature_start',
      };
    }
    const configuredStartAt = options.forceWeekStartAt || startedAt;
    const effectiveWeekStartAt =
      configuredStartAt &&
      configuredStartAt.getTime() > week.weekStartAt.getTime() &&
      configuredStartAt.getTime() <= week.weekEndAt.getTime()
        ? configuredStartAt
        : week.weekStartAt;
    const existing = await this.dataSource.query(
      `SELECT id FROM weekly_point_return_periods WHERE week_start_date = ? LIMIT 1`,
      [week.weekStartDate],
    );
    if (existing.length > 0) {
      return {
        created: false,
        periodId: Number(existing[0].id),
        reason: 'already_exists',
      };
    }

    const users = await this.getWeeklyPointReturnConsumeRows(
      effectiveWeekStartAt,
      week.weekEndAt,
    );

    return this.dataSource.transaction(async (mgr) => {
      const insertResult = await mgr.query(
        `INSERT IGNORE INTO weekly_point_return_periods
          (week_start_date, week_end_date, week_start_at, week_end_at,
           settlement_started_at, multiplier, daily_rate, excluded_log_types, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          week.weekStartDate,
          week.weekEndDate,
          this.formatLocalDateTime(effectiveWeekStartAt),
          this.formatLocalDateTime(week.weekEndAt),
          this.formatLocalDateTime(now),
          this.roundPoints(multiplier),
          this.roundPoints(dailyRate),
          WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES.join(','),
        ],
      );
      const affectedRows = Number(
        insertResult?.affectedRows ?? insertResult?.[0]?.affectedRows ?? 0,
      );
      if (affectedRows === 0) {
        const duplicate = await mgr.query(
          `SELECT id FROM weekly_point_return_periods WHERE week_start_date = ? LIMIT 1`,
          [week.weekStartDate],
        );
        return {
          created: false,
          periodId: Number(duplicate[0]?.id || 0),
          reason: 'already_exists',
        };
      }

      const periodId = Number(
        insertResult?.insertId ?? insertResult?.[0]?.insertId ?? 0,
      );
      let activeUsers = 0;
      let excludedOnlyUsers = 0;
      for (const row of users) {
        const eligibleConsumed = this.roundPoints(
          Math.max(0, this.toFiniteNumber(row.eligibleConsumed)),
        );
        const excludedConsumed = this.roundPoints(
          Math.max(0, this.toFiniteNumber(row.excludedConsumed)),
        );
        const status = eligibleConsumed > 0 ? 0 : 2;
        if (status === 0) activeUsers += 1;
        else excludedOnlyUsers += 1;

        await mgr.query(
          `INSERT INTO weekly_point_return_accounts
            (period_id, user_id, eligible_consumed_points, excluded_consumed_points,
             remaining_base_points, total_returned_points, paid_days,
             multiplier, daily_rate, status)
           VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
          [
            periodId,
            Number(row.userId),
            eligibleConsumed,
            excludedConsumed,
            eligibleConsumed,
            this.roundPoints(multiplier),
            this.roundPoints(dailyRate),
            status,
          ],
        );
      }

      if (activeUsers === 0) {
        await mgr.query(
          `UPDATE weekly_point_return_periods SET status = 1 WHERE id = ?`,
          [periodId],
        );
      }

      return {
        created: true,
        periodId,
        weekStartDate: week.weekStartDate,
        weekEndDate: week.weekEndDate,
        activeUsers,
        excludedOnlyUsers,
      };
    });
  }

  /** 按返还日补发每个用户尚未发放的日返还，单用户最多发7天。 */
  async processWeeklyPointReturnPayouts(now = new Date()) {
    await this.ensureWeeklyPointReturnTables();
    if (!(await this.isWeeklyPointReturnEnabled())) {
      return { paidRecords: 0, paidPoints: 0, reason: 'switch_disabled' };
    }

    // 周日00:00:01只处理上一周期第7天；周结算由周日23:59:59单独生成。
    if (now.getDay() !== 0) {
      await this.setupWeeklyPointReturnPeriod(now);
    }

    const today = this.startOfLocalDay(now);
    const periods = await this.dataSource.query(
      `SELECT id, week_end_date AS weekEndDate
       FROM weekly_point_return_periods
       WHERE status = 0
       ORDER BY week_start_date ASC`,
    );

    let paidRecords = 0;
    let paidPoints = 0;
    for (const period of periods) {
      const returnStartDate = this.addDays(
        this.parseLocalDate(period.weekEndDate),
        1,
      );
      const elapsedDays = Math.floor(
        (today.getTime() - returnStartDate.getTime()) / 86_400_000,
      );
      if (elapsedDays < 0) continue;
      const dueDay = Math.min(7, elapsedDays + 1);
      const periodId = Number(period.id);

      while (true) {
        const accounts = await this.dataSource.query(
          `SELECT id
           FROM weekly_point_return_accounts
           WHERE period_id = ?
             AND status = 0
             AND paid_days < ?
           ORDER BY id ASC
           LIMIT ${WEEKLY_POINT_RETURN_BATCH_SIZE}`,
          [periodId, dueDay],
        );
        if (accounts.length === 0) break;

        for (const account of accounts) {
          for (let dayIndex = 1; dayIndex <= dueDay; dayIndex += 1) {
            const payout = await this.dataSource.transaction(async (mgr) => {
              const lockedRows = await mgr.query(
                `SELECT id, user_id AS userId, remaining_base_points AS remainingBase,
                        total_returned_points AS totalReturned, paid_days AS paidDays,
                        multiplier, daily_rate AS dailyRate, status
                 FROM weekly_point_return_accounts
                 WHERE id = ?
                 FOR UPDATE`,
                [Number(account.id)],
              );
              const locked = lockedRows[0];
              if (!locked || Number(locked.status) !== 0) {
                return { paid: false, stop: true };
              }

              const paidDays = Number(locked.paidDays);
              if (paidDays >= dayIndex) {
                return { paid: false, stop: false };
              }
              if (dayIndex !== paidDays + 1) {
                return { paid: false, stop: true };
              }

              const baseBefore = this.roundPoints(
                Math.max(0, this.toFiniteNumber(locked.remainingBase)),
              );
              const multiplier = this.toFiniteNumber(locked.multiplier);
              const dailyRate = this.toFiniteNumber(locked.dailyRate);
              const returnAmount = this.roundPoints(
                baseBefore * multiplier * dailyRate,
              );
              if (returnAmount <= 0) {
                await mgr.query(
                  `UPDATE weekly_point_return_accounts
                   SET status = 1, updated_at = NOW()
                   WHERE id = ?`,
                  [Number(account.id)],
                );
                return { paid: false, stop: true };
              }

              const baseAfter = this.roundPoints(
                Math.max(0, baseBefore - returnAmount),
              );
              const returnDate = this.formatLocalDate(
                this.addDays(returnStartDate, dayIndex - 1),
              );
              const changed = await this.changeCurrency(
                Number(locked.userId),
                'points',
                returnAmount,
                'weekly_point_return',
                `每周积分返还第${dayIndex}天`,
                mgr,
              );
              await mgr.query(
                `INSERT INTO weekly_point_return_daily_records
                  (period_id, account_id, user_id, return_date, day_index,
                   base_before_return, multiplier, daily_rate, return_amount,
                   base_after_return, currency_log_id, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                [
                  periodId,
                  Number(account.id),
                  Number(locked.userId),
                  returnDate,
                  dayIndex,
                  baseBefore,
                  this.roundPoints(multiplier),
                  this.roundPoints(dailyRate),
                  returnAmount,
                  baseAfter,
                  changed.logId,
                ],
              );

              const totalReturned = this.roundPoints(
                this.toFiniteNumber(locked.totalReturned) + returnAmount,
              );
              await mgr.query(
                `UPDATE weekly_point_return_accounts
                 SET remaining_base_points = ?,
                     total_returned_points = ?,
                     paid_days = ?,
                     status = ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                [
                  baseAfter,
                  totalReturned,
                  dayIndex,
                  dayIndex >= 7 ? 1 : 0,
                  Number(account.id),
                ],
              );

              return {
                paid: true,
                stop: dayIndex >= 7,
                amount: returnAmount,
              };
            });

            if (payout.paid) {
              paidRecords += 1;
              paidPoints = this.roundPoints(
                paidPoints + this.toFiniteNumber(payout.amount),
              );
            }
            if (payout.stop) break;
          }
        }
      }

      const pending = await this.dataSource.query(
        `SELECT COUNT(*) AS total
         FROM weekly_point_return_accounts
         WHERE period_id = ? AND status = 0`,
        [periodId],
      );
      if (Number(pending[0]?.total || 0) === 0) {
        await this.dataSource.query(
          `UPDATE weekly_point_return_periods
           SET status = 1, updated_at = NOW()
           WHERE id = ?`,
          [periodId],
        );
      }
    }

    return { paidRecords, paidPoints };
  }

  private isLotteryGameForBackfill(gameName: any, gameUrl: any, result: any) {
    const text = `${gameName || ''} ${gameUrl || ''} ${result || ''}`.toLowerCase();
    return (
      text.includes('lottery') ||
      text.includes('wheel') ||
      text.includes('lucky') ||
      text.includes('幸运转盘') ||
      text.includes('转盘') ||
      text.includes('抽奖')
    );
  }

  private inferLegacyGameTurnoverSource(
    resultValue: any,
    amount: number,
    gameName?: any,
    gameUrl?: any,
  ) {
    if (this.isLotteryGameForBackfill(gameName, gameUrl, resultValue)) return null;

    const result = String(resultValue || '').toLowerCase();
    const xiangqiSource = this.inferXiangqiTurnoverSourceForBackfill(result, amount, gameName, gameUrl);
    if (xiangqiSource) return xiangqiSource;

    const excludedKeywords = [
      'lottery',
      'wheel',
      'lucky',
      'draw',
      'prize',
      '转盘',
      '抽奖',
      'skin',
      'buy_skin',
      'snake_skin_buy',
      'buy',
      'purchase',
      '购买',
      'skill',
      'upgrade',
      'level',
      'rod',
      'bait',
      'net',
      'shop',
      'daily_login',
      'login_reward',
      'daily',
      'login',
    ];
    if (excludedKeywords.some((keyword) => result.includes(keyword))) return null;

    if (
      result.includes('fish_sell') ||
      result.includes('sell_fish') ||
      result.includes('fishing_sell') ||
      result.includes('sell_garbage') ||
      result.includes('卖鱼') ||
      result.includes('售鱼')
    ) {
      return amount > 0 ? 'fish_sell' : null;
    }
    if (result.includes('revive') || result.includes('resurrect') || result.includes('复活')) {
      return amount < 0 ? 'revive' : null;
    }
    if (
      result.includes('bet') ||
      result.includes('stake') ||
      result.includes('wager') ||
      result.includes('下注') ||
      result.includes('投注')
    ) {
      return amount < 0 ? 'bet' : null;
    }
    if (result.includes('entry') || result.includes('入场')) {
      return amount < 0 ? 'game_entry' : null;
    }
    if (
      result.includes('settle') ||
      result.includes('win') ||
      result.includes('reward') ||
      result.includes('earn') ||
      result.includes('结算') ||
      result.includes('获胜') ||
      result.includes('奖励') ||
      result.includes('收益')
    ) {
      return amount > 0 ? 'game_settle' : null;
    }
    return amount > 0 ? 'game_settle' : 'game_spend';
  }

  private inferXiangqiTurnoverSourceForBackfill(
    normalizedResult: string,
    amount: number,
    gameName?: any,
    gameUrl?: any,
  ) {
    const text = `${gameName || ''} ${gameUrl || ''} ${normalizedResult || ''}`.toLowerCase();
    const isXiangqi =
      text.includes('xiangqi') ||
      text.includes('象棋') ||
      text.includes('象雀') ||
      text.includes('对弈');
    if (!isXiangqi) return null;

    if (amount < 0) {
      if (
        normalizedResult.includes('retract') ||
        normalizedResult.includes('undo') ||
        normalizedResult.includes('悔棋')
      ) {
        return 'xiangqi_retract';
      }
      if (
        normalizedResult.includes('hint') ||
        normalizedResult.includes('tips') ||
        normalizedResult.includes('提示')
      ) {
        return 'xiangqi_hint';
      }
      if (normalizedResult.includes('entry') || normalizedResult.includes('入场')) {
        return 'xiangqi_entry';
      }
      if (
        normalizedResult.includes('bet') ||
        normalizedResult.includes('stake') ||
        normalizedResult.includes('wager') ||
        normalizedResult.includes('下注') ||
        normalizedResult.includes('投注')
      ) {
        return 'xiangqi_bet';
      }
      return 'xiangqi_spend';
    }

    if (amount > 0) {
      if (normalizedResult.includes('study') || normalizedResult.includes('canju')) {
        return 'xiangqi_study_level';
      }
      if (
        normalizedResult.includes('settle') ||
        normalizedResult.includes('win') ||
        normalizedResult.includes('reward') ||
        normalizedResult.includes('earn') ||
        normalizedResult.includes('结算') ||
        normalizedResult.includes('获胜') ||
        normalizedResult.includes('奖励') ||
        normalizedResult.includes('收益')
      ) {
        return 'xiangqi_settle';
      }
      return 'xiangqi_earn';
    }

    return null;
  }

  private async withUserDisplayInfo<T extends { userId: number }>(items: T[]) {
    const ids = Array.from(
      new Set(items.map((item) => Number(item.userId)).filter((id) => id > 0)),
    );
    if (ids.length === 0) return items;

    const rows = await this.dataSource.query(
      `SELECT id, account, nickname FROM users WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
    const userMap = new Map<number, any>(
      rows.map((row: any) => [
        Number(row.id),
        {
          account: row.account || '',
          nickname: row.nickname || '',
        },
      ]),
    );

    return items.map((item) => ({
      ...item,
      account: userMap.get(Number(item.userId))?.account || '',
      nickname: userMap.get(Number(item.userId))?.nickname || '',
    }));
  }

  async backfillLegacyGameTurnoverRewards(options: LegacyRewardBackfillOptions = {}) {
    await this.ensureDirectGameRewardTables();
    await this.ensureCurrencyAccountsForExistingUsers();

    const dryRun = options.dryRun !== false;
    const startedAtText = await this.getConfigValue(WEEKLY_POINT_RETURN_STARTED_AT_KEY, '');
    const defaultTo = this.parseLocalDateTime(startedAtText) || new Date();
    const fromAt = this.parseBackfillDateTime(options.from, null);
    const toAt = this.parseBackfillEndDateTime(options.to, defaultTo) || defaultTo;
    const safeLimit = Math.min(20_000, Math.max(1, Math.floor(Number(options.limit) || 5000)));
    const where: string[] = [
      `(gr.points_earned > 0 OR gr.points_spent > 0)`,
      `gr.created_at <= ?`,
      `NOT EXISTS (
        SELECT 1 FROM game_turnover_records t
        WHERE t.biz_id IN (
          CONCAT('game_record:', gr.id, ':earned'),
          CONCAT('game_record:', gr.id, ':spent'),
          CONCAT('legacy_game_record:', gr.id, ':earned'),
          CONCAT('legacy_game_record:', gr.id, ':spent')
        )
      )`,
    ];
    const params: any[] = [this.formatLocalDateTime(toAt)];
    if (fromAt) {
      where.push(`gr.created_at >= ?`);
      params.push(this.formatLocalDateTime(fromAt));
    }

    const rows = await this.dataSource.query(
      `SELECT gr.id, gr.user_id AS userId, gr.game_id AS gameId, gr.result,
              gr.points_earned AS pointsEarned, gr.points_spent AS pointsSpent,
              gr.created_at AS createdAt, g.name AS gameName, g.game_url AS gameUrl
       FROM game_records gr
       LEFT JOIN games g ON g.id = gr.game_id
       WHERE ${where.join(' AND ')}
       ORDER BY gr.id ASC
       LIMIT ${safeLimit}`,
      params,
    );

    let candidates = 0;
    let insertedTurnovers = 0;
    let skipped = 0;
    let rewardCount = 0;
    let rewardAmount = 0;
    let failed = 0;
    let turnoverAmount = 0;
    const recipientSummaryMap = new Map<number, any>();
    const addGameRewardEntries = (entries: any[], sourceUserId: number) => {
      for (const entry of entries || []) {
        const userId = Number(entry.ancestorUserId);
        if (!userId) continue;
        const current = recipientSummaryMap.get(userId) || {
          userId,
          rewardAmount: 0,
          rewardCount: 0,
          turnoverAmount: 0,
          minGeneration: Number(entry.generation || 0),
          maxGeneration: Number(entry.generation || 0),
          validDirectCount: Number(entry.validDirectCount || 0),
          allowedGeneration: Number(entry.maxGeneration || 0),
          sourceUserIds: new Set<number>(),
        };
        current.rewardAmount = this.roundPoints(
          current.rewardAmount + this.toFiniteNumber(entry.rewardAmount),
        );
        current.rewardCount += 1;
        current.turnoverAmount = this.roundPoints(
          current.turnoverAmount + this.toFiniteNumber(entry.turnoverAmount),
        );
        current.minGeneration = Math.min(current.minGeneration || Number(entry.generation), Number(entry.generation));
        current.maxGeneration = Math.max(current.maxGeneration || Number(entry.generation), Number(entry.generation));
        current.validDirectCount = Math.max(current.validDirectCount || 0, Number(entry.validDirectCount || 0));
        current.allowedGeneration = Math.max(current.allowedGeneration || 0, Number(entry.maxGeneration || 0));
        if (sourceUserId) current.sourceUserIds.add(Number(sourceUserId));
        recipientSummaryMap.set(userId, current);
      }
    };

    for (const row of rows) {
      const parts = [
        { suffix: 'spent', amount: -Math.abs(this.toFiniteNumber(row.pointsSpent)) },
        { suffix: 'earned', amount: Math.abs(this.toFiniteNumber(row.pointsEarned)) },
      ].filter((part) => Math.abs(part.amount) > 0);

      for (const part of parts) {
        const sourceType = this.inferLegacyGameTurnoverSource(
          row.result,
          part.amount,
          row.gameName,
          row.gameUrl,
        );
        if (!sourceType) {
          skipped += 1;
          continue;
        }

        const amount = this.roundPoints(Math.abs(part.amount));
        const bizId = `legacy_game_record:${row.id}:${part.suffix}`;
        candidates += 1;
        turnoverAmount = this.roundPoints(turnoverAmount + amount);

        if (dryRun) {
          const entries = await this.previewDirectGameRewardEntries(
            Number(row.userId),
            amount,
            this.dataSource.manager,
          );
          rewardCount += entries.length;
          const entriesAmount = entries.reduce(
            (sum, entry) => this.roundPoints(sum + this.toFiniteNumber(entry.rewardAmount)),
            0,
          );
          rewardAmount = this.roundPoints(rewardAmount + entriesAmount);
          addGameRewardEntries(entries, Number(row.userId));
          continue;
        }

        try {
          const result = await this.dataSource.transaction(async (mgr) => {
            const exists = await mgr.query(
              `SELECT id FROM game_turnover_records WHERE biz_id = ? LIMIT 1`,
              [bizId],
            );
            if (exists.length > 0) {
              return { inserted: false, rewardCount: 0, rewardAmount: 0 };
            }

            const turnover = await mgr.save(
              GameTurnoverRecord,
              mgr.create(GameTurnoverRecord, {
                userId: Number(row.userId),
                gameId: row.gameId ? Number(row.gameId) : null,
                sourceType,
                turnoverAmount: amount,
                currencyLogId: null,
                bizId,
                description: `历史游戏流水回补：${row.gameName || '游戏'} ${row.result || ''}`.slice(0, 200),
                rewardStatus: 0,
                rewardCount: 0,
                totalRewardAmount: 0,
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
              }),
            );

            const reward = await this.issueDirectGameRewardsForTurnover(turnover, mgr);
            return {
              inserted: true,
              rewardCount: Number(reward.rewardCount || 0),
              rewardAmount: this.toFiniteNumber(reward.rewardAmount),
              rewardEntries: reward.rewardEntries || [],
            };
          });

          if (result.inserted) insertedTurnovers += 1;
          rewardCount += Number(result.rewardCount || 0);
          rewardAmount = this.roundPoints(rewardAmount + this.toFiniteNumber(result.rewardAmount));
          addGameRewardEntries(result.rewardEntries || [], Number(row.userId));
        } catch (_) {
          failed += 1;
        }
      }
    }

    const userDetails = await this.withUserDisplayInfo(
      Array.from(recipientSummaryMap.values())
        .map((item: any) => {
          const { sourceUserIds, ...rest } = item;
          return {
            ...rest,
            sourceUserCount: sourceUserIds?.size || 0,
          };
        })
        .sort((a: any, b: any) => Number(b.rewardAmount) - Number(a.rewardAmount)),
    );

    return {
      dryRun,
      from: fromAt ? this.formatLocalDateTime(fromAt) : null,
      to: this.formatLocalDateTime(toAt),
      scannedGameRecords: rows.length,
      candidates,
      insertedTurnovers,
      skipped,
      turnoverAmount,
      rewardCount,
      rewardAmount,
      failed,
      hasMore: rows.length >= safeLimit,
      userDetails,
    };
  }

  async backfillLegacyWeeklyPointReturns(options: LegacyRewardBackfillOptions = {}) {
    await this.ensureWeeklyPointReturnTables();
    await this.ensureCurrencyAccountsForExistingUsers();

    const dryRun = options.dryRun !== false;
    const multiplierStr = await this.getConfigValue(WEEKLY_POINT_RETURN_MULTIPLIER_KEY, '1.5');
    const dailyRateStr = await this.getConfigValue(WEEKLY_POINT_RETURN_DAILY_RATE_KEY, '0.01');
    const multiplier = this.toFiniteNumber(multiplierStr);
    const dailyRate = this.toFiniteNumber(dailyRateStr);
    if (multiplier <= 0 || dailyRate <= 0) {
      return {
        dryRun,
        createdPeriods: 0,
        activeUsers: 0,
        paidRecords: 0,
        paidPoints: 0,
        userDetails: [],
        reason: 'invalid_rate',
      };
    }
    const firstLogRows = await this.dataSource.query(
      `SELECT MIN(created_at) AS firstAt
       FROM currency_logs
       WHERE currency_type = 'points' AND amount < 0`,
    );
    const firstLogAt = firstLogRows?.[0]?.firstAt ? new Date(firstLogRows[0].firstAt) : null;
    const fromAt = this.parseBackfillDateTime(options.from, firstLogAt);
    const toAt = this.parseBackfillEndDateTime(options.to, new Date()) || new Date();
    if (!fromAt) {
      return {
        dryRun,
        createdPeriods: 0,
        activeUsers: 0,
        paidRecords: 0,
        paidPoints: 0,
        userDetails: [],
        reason: 'no_history_consumption',
      };
    }

    const lastWeekEndAt = this.getLastCompletedWeekEndAt(toAt);
    if (lastWeekEndAt.getTime() < fromAt.getTime()) {
      return {
        dryRun,
        from: this.formatLocalDateTime(fromAt),
        to: this.formatLocalDateTime(toAt),
        createdPeriods: 0,
        activeUsers: 0,
        paidRecords: 0,
        paidPoints: 0,
        userDetails: [],
        reason: 'no_completed_week',
      };
    }

    let cursorMonday = this.getMondayOfWeek(fromAt);
    let createdPeriods = 0;
    let skippedPeriods = 0;
    let activeUsers = 0;
    let eligibleConsumed = 0;
    let excludedConsumed = 0;
    const periods: Array<{
      weekStartDate: string;
      weekEndDate: string;
      activeUsers: number;
      eligibleConsumed: number;
      excludedConsumed: number;
      status: string;
    }> = [];
    const weeklyUserSummaryMap = new Map<number, any>();
    const payoutNow = new Date();

    const estimateWeeklyReturn = (baseValue: number, weekEndDate: string) => {
      const returnStartDate = this.addDays(this.parseLocalDate(weekEndDate), 1);
      const elapsedDays = Math.floor(
        (this.startOfLocalDay(payoutNow).getTime() - returnStartDate.getTime()) / 86_400_000,
      );
      const dueDays = Math.min(7, Math.max(0, elapsedDays + 1));
      let base = this.roundPoints(Math.max(0, baseValue));
      let total = 0;
      for (let dayIndex = 1; dayIndex <= dueDays; dayIndex += 1) {
        const amount = this.roundPoints(base * multiplier * dailyRate);
        if (amount <= 0) break;
        total = this.roundPoints(total + amount);
        base = this.roundPoints(Math.max(0, base - amount));
      }
      return { dueDays, returnAmount: total };
    };

    const addWeeklyUserSummary = (
      userId: number,
      weekStartDate: string,
      weekEndDate: string,
      row: any,
    ) => {
      const eligible = this.roundPoints(Math.max(0, this.toFiniteNumber(row.eligibleConsumed)));
      const excluded = this.roundPoints(Math.max(0, this.toFiniteNumber(row.excludedConsumed)));
      if (eligible <= 0) return;
      const estimated = estimateWeeklyReturn(eligible, weekEndDate);
      const current = weeklyUserSummaryMap.get(userId) || {
        userId,
        weekCount: 0,
        eligibleConsumed: 0,
        excludedConsumed: 0,
        dueDays: 0,
        returnAmount: 0,
        periods: [],
      };
      current.weekCount += 1;
      current.eligibleConsumed = this.roundPoints(current.eligibleConsumed + eligible);
      current.excludedConsumed = this.roundPoints(current.excludedConsumed + excluded);
      current.dueDays += estimated.dueDays;
      current.returnAmount = this.roundPoints(current.returnAmount + estimated.returnAmount);
      current.periods.push({
        weekStartDate,
        weekEndDate,
        eligibleConsumed: eligible,
        excludedConsumed: excluded,
        dueDays: estimated.dueDays,
        returnAmount: estimated.returnAmount,
      });
      weeklyUserSummaryMap.set(userId, current);
    };

    while (true) {
      const sunday = this.addDays(cursorMonday, 6);
      sunday.setHours(23, 59, 59, 0);
      if (sunday.getTime() > lastWeekEndAt.getTime()) break;

      const weekStartAt = new Date(cursorMonday);
      weekStartAt.setHours(0, 0, 1, 0);
      const effectiveStartAt = this.maxDate(weekStartAt, fromAt);
      const weekStartDate = this.formatLocalDate(cursorMonday);
      const weekEndDate = this.formatLocalDate(sunday);
      const existing = await this.dataSource.query(
        `SELECT id FROM weekly_point_return_periods WHERE week_start_date = ? LIMIT 1`,
        [weekStartDate],
      );
      if (existing.length > 0) {
        skippedPeriods += 1;
        periods.push({
          weekStartDate,
          weekEndDate,
          activeUsers: 0,
          eligibleConsumed: 0,
          excludedConsumed: 0,
          status: 'already_exists',
        });
        cursorMonday = this.addDays(cursorMonday, 7);
        continue;
      }

      const rows = await this.getWeeklyPointReturnConsumeRows(effectiveStartAt, sunday);
      for (const row of rows) {
        addWeeklyUserSummary(Number(row.userId), weekStartDate, weekEndDate, row);
      }
      const weekActiveUsers = rows.filter((row: any) => this.toFiniteNumber(row.eligibleConsumed) > 0).length;
      const weekEligible = rows.reduce(
        (sum: number, row: any) => this.roundPoints(sum + this.toFiniteNumber(row.eligibleConsumed)),
        0,
      );
      const weekExcluded = rows.reduce(
        (sum: number, row: any) => this.roundPoints(sum + this.toFiniteNumber(row.excludedConsumed)),
        0,
      );

      if (!dryRun) {
        const result = await this.setupWeeklyPointReturnPeriod(sunday, {
          allowBeforeFeatureStart: true,
          forceWeekStartAt: effectiveStartAt,
        });
        if (result.created) createdPeriods += 1;
        else skippedPeriods += 1;
      } else {
        createdPeriods += 1;
      }

      activeUsers += weekActiveUsers;
      eligibleConsumed = this.roundPoints(eligibleConsumed + weekEligible);
      excludedConsumed = this.roundPoints(excludedConsumed + weekExcluded);
      periods.push({
        weekStartDate,
        weekEndDate,
        activeUsers: weekActiveUsers,
        eligibleConsumed: weekEligible,
        excludedConsumed: weekExcluded,
        status: dryRun ? 'preview' : 'created',
      });

      cursorMonday = this.addDays(cursorMonday, 7);
    }

    const payout = dryRun
      ? { paidRecords: 0, paidPoints: 0 }
      : await this.processWeeklyPointReturnPayouts(new Date());
    const userDetails = await this.withUserDisplayInfo(
      Array.from(weeklyUserSummaryMap.values())
        .map((item: any) => ({
          ...item,
          periods: item.periods || [],
        }))
        .sort((a: any, b: any) => Number(b.returnAmount) - Number(a.returnAmount)),
    );

    return {
      dryRun,
      from: this.formatLocalDateTime(fromAt),
      to: this.formatLocalDateTime(toAt),
      createdPeriods,
      skippedPeriods,
      activeUsers,
      eligibleConsumed,
      excludedConsumed,
      paidRecords: payout.paidRecords || 0,
      paidPoints: payout.paidPoints || 0,
      userDetails,
      periods,
    };
  }

  async backfillLegacyRewardMechanisms(options: LegacyRewardBackfillOptions = {}) {
    await this.ensureDefaultConfigs();
    const dryRun = options.dryRun !== false;
    const result: any = { dryRun };

    if (options.game !== false) {
      result.game = await this.backfillLegacyGameTurnoverRewards({ ...options, dryRun });
    }
    if (options.weekly !== false) {
      result.weekly = await this.backfillLegacyWeeklyPointReturns({ ...options, dryRun });
    }

    return result;
  }
}
