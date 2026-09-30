import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
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

type CurrencyType =
  | 'points'
  | 'gold'
  | 'silver'
  | 'copper'
  | 'special'
  | 'reward'
  | 'invite';

const WEEKLY_POINT_RETURN_SWITCH_KEY = 'weekly_point_return';
const WEEKLY_POINT_RETURN_MULTIPLIER_KEY = 'weekly_point_return_multiplier';
const WEEKLY_POINT_RETURN_DAILY_RATE_KEY = 'weekly_point_return_daily_rate';
const WEEKLY_POINT_RETURN_STARTED_AT_KEY = 'weekly_point_return_started_at';
export const WEEKLY_POINT_RETURN_EXCLUSION_CORRECTION_TYPES = [
  'synthesize',
  'silver_synthesis',
  'shop_exchange',
  'shop_points_exchange',
  'cag_exchange',
];
export const WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES = [
  'group_create',
  'group_create_cost',
  'meeting_start',
  ...WEEKLY_POINT_RETURN_EXCLUSION_CORRECTION_TYPES,
  'weekly_point_return_correction',
];
export const WEEKLY_POINT_RETURN_ALWAYS_ELIGIBLE_LOG_TYPES = ['game_entry'];
const WEEKLY_POINT_RETURN_BATCH_SIZE = 100;
const DIRECT_GAME_REWARD_SWITCH_KEY = 'direct_game_reward';
const DIRECT_GAME_REWARD_RATE_KEY = 'direct_game_reward_rate';
const DIRECT_GAME_REWARD_DEFAULT_RATE = 0.0015;
const DIRECT_GAME_REWARD_MAX_GENERATION = 20;
const WITHDRAW_COPPER_GOLD_UNIT_KEY = 'withdraw_copper_gold_unit';
const WITHDRAW_COPPER_COST_PER_UNIT_KEY = 'withdraw_copper_cost_per_unit';
const GAME_COPPER_MINUTES_PER_COIN_KEY = 'game_copper_minutes_per_coin';
const GAME_COPPER_DAILY_MAX_KEY = 'game_copper_daily_max';
const GAME_DURATION_REPORT_MAX_SECONDS = 6 * 60 * 60;
const SILVER_SYNTHESIS_POINTS_KEY = 'silver_synthesis_points_per_coin';
const SILVER_SYNTHESIS_POINTS_DEFAULT = 5000;
const GOLD_EXCHANGE_RATE_KEY = 'gold_exchange_rate';
const PROFILE_TOTAL_USER_COUNT_OVERRIDE_KEY =
  'profile_total_user_count_override';
const GOLD_TRADE_DEPOSIT = 100;
const GOLD_TRADE_FEE_RATE = 0.05;
const COPPER_TRADE_DEPOSIT_RATE = 1;

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
  private goldModuleTablesReady = false;
  private legacyMatrixGoldMigrationChecked = false;

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
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    );
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

  private async requireActivatedForCurrencyTrade(
    userId: number,
    manager?: EntityManager,
  ) {
    const mgr = manager || this.dataSource.manager;
    const rows = await mgr.query(
      `SELECT id, status, is_activated AS isActivated FROM users WHERE id = ? LIMIT 1`,
      [userId],
    );
    const user = rows?.[0];
    if (!user || Number(user.status) !== 1) {
      throw new ForbiddenException('账号不可用');
    }
    if (!(user.isActivated === true || Number(user.isActivated) === 1)) {
      throw new ForbiddenException('请先激活后再进行金币、铜币交易');
    }
  }

  private formatLocalDateTime(date: Date) {
    return `${this.formatLocalDate(date)} ${this.pad2(date.getHours())}:${this.pad2(date.getMinutes())}:${this.pad2(date.getSeconds())}`;
  }

  private parseLocalDate(value: any) {
    if (value instanceof Date) {
      return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate(),
        0,
        0,
        0,
        0,
      );
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
    if (
      String(value || '')
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})$/)
    ) {
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
      `ALTER TABLE user_currencies ADD COLUMN copper DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER silver`,
      `ALTER TABLE user_currencies ADD COLUMN total_gold_earned DECIMAL(18,6) NOT NULL DEFAULT 0 AFTER gold`,
      `ALTER TABLE user_currencies MODIFY COLUMN gold DECIMAL(18, 6) NOT NULL DEFAULT 0`,
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

  private shouldCountOriginalGold(logType: string, amount: number) {
    if (amount <= 0) return false;
    const type = String(logType || '').toLowerCase();
    return ![
      'gold_trade_cancel_refund',
      'gold_trade_deposit_refund',
      'gold_trade_lock_refund',
      'matrix_gold_withdraw_reject_refund',
    ].includes(type);
  }

  private async ensureGoldModuleTables() {
    if (this.goldModuleTablesReady) return;
    await this.ensureCurrencyPrecisionForWeeklyReturn();
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS gold_withdraw_credits (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        gold_amount DECIMAL(18,6) NOT NULL,
        exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 1,
        cash_amount DECIMAL(18,2) NOT NULL,
        currency_log_id BIGINT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_gold_withdraw_user (user_id),
        INDEX idx_gold_withdraw_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='金币转入提现模块记录';
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS gold_trade_orders (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_sn VARCHAR(40) NOT NULL,
        seller_user_id INT NOT NULL,
        buyer_user_id INT NULL,
        quantity DECIMAL(18,6) NOT NULL,
        total_price DECIMAL(18,2) NOT NULL,
        fee_gold DECIMAL(18,6) NOT NULL,
        deposit_gold DECIMAL(18,6) NOT NULL DEFAULT 100,
        alipay_name VARCHAR(50) NOT NULL,
        alipay_qrcode VARCHAR(255) NOT NULL,
        status TINYINT NOT NULL DEFAULT 0 COMMENT '0出售中 1买家已确认支付 2已完成 3已取消',
        seller_lock_log_id BIGINT NULL,
        seller_refund_log_id BIGINT NULL,
        buyer_receive_log_id BIGINT NULL,
        buyer_confirmed_at DATETIME NULL,
        seller_confirmed_at DATETIME NULL,
        seller_viewed_at DATETIME NULL,
        cancelled_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_gold_trade_order_sn (order_sn),
        INDEX idx_gold_trade_status_time (status, created_at),
        INDEX idx_gold_trade_seller_status (seller_user_id, status),
        INDEX idx_gold_trade_buyer_status (buyer_user_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='金币出售交易订单';
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS copper_trade_orders (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_sn VARCHAR(40) NOT NULL,
        seller_user_id INT NOT NULL,
        buyer_user_id INT NULL,
        quantity DECIMAL(18,6) NOT NULL,
        total_price DECIMAL(18,2) NOT NULL,
        deposit_copper DECIMAL(18,6) NOT NULL DEFAULT 100,
        alipay_name VARCHAR(50) NOT NULL,
        alipay_qrcode VARCHAR(255) NOT NULL,
        status TINYINT NOT NULL DEFAULT 0 COMMENT '0出售中 1买家已确认支付 2已完成 3已取消',
        seller_lock_log_id BIGINT NULL,
        seller_refund_log_id BIGINT NULL,
        buyer_receive_log_id BIGINT NULL,
        buyer_confirmed_at DATETIME NULL,
        seller_confirmed_at DATETIME NULL,
        seller_viewed_at DATETIME NULL,
        cancelled_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_copper_trade_order_sn (order_sn),
        INDEX idx_copper_trade_status_time (status, created_at),
        INDEX idx_copper_trade_seller_status (seller_user_id, status),
        INDEX idx_copper_trade_buyer_status (buyer_user_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='铜币出售交易订单';
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS matrix_gold_migration_records (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        migrated_amount DECIMAL(18,6) NOT NULL DEFAULT 0,
        currency_log_id BIGINT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_matrix_gold_migration_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='历史矩阵可提现余额转金币记录';
    `);
    try {
      await this.dataSource.query(
        `ALTER TABLE matrix_incomes ADD COLUMN gold_currency_log_id BIGINT NULL COMMENT '转金币对应currency_logs.id' AFTER claimed_at`,
      );
    } catch (_) {}
    try {
      await this.dataSource.query(
        `ALTER TABLE matrix_incomes ADD INDEX idx_matrix_incomes_gold_log (gold_currency_log_id)`,
      );
    } catch (_) {}
    const goldTradeAlterSql = [
      `ALTER TABLE gold_trade_orders ADD COLUMN seller_refund_log_id BIGINT NULL AFTER seller_lock_log_id`,
      `ALTER TABLE gold_trade_orders ADD COLUMN buyer_receive_log_id BIGINT NULL AFTER seller_refund_log_id`,
      `ALTER TABLE gold_trade_orders ADD COLUMN buyer_confirmed_at DATETIME NULL AFTER buyer_receive_log_id`,
      `ALTER TABLE gold_trade_orders ADD COLUMN seller_confirmed_at DATETIME NULL AFTER buyer_confirmed_at`,
      `ALTER TABLE gold_trade_orders ADD COLUMN seller_viewed_at DATETIME NULL AFTER seller_confirmed_at`,
      `ALTER TABLE gold_trade_orders ADD COLUMN cancelled_at DATETIME NULL AFTER seller_viewed_at`,
    ];
    for (const sql of goldTradeAlterSql) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {}
    }
    const copperTradeAlterSql = [
      `ALTER TABLE copper_trade_orders ADD COLUMN seller_refund_log_id BIGINT NULL AFTER seller_lock_log_id`,
      `ALTER TABLE copper_trade_orders ADD COLUMN buyer_receive_log_id BIGINT NULL AFTER seller_refund_log_id`,
      `ALTER TABLE copper_trade_orders ADD COLUMN buyer_confirmed_at DATETIME NULL AFTER buyer_receive_log_id`,
      `ALTER TABLE copper_trade_orders ADD COLUMN seller_confirmed_at DATETIME NULL AFTER buyer_confirmed_at`,
      `ALTER TABLE copper_trade_orders ADD COLUMN seller_viewed_at DATETIME NULL AFTER seller_confirmed_at`,
      `ALTER TABLE copper_trade_orders ADD COLUMN cancelled_at DATETIME NULL AFTER seller_viewed_at`,
    ];
    for (const sql of copperTradeAlterSql) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {}
    }
    this.goldModuleTablesReady = true;
  }

  private async getGoldExchangeRate(manager?: EntityManager) {
    const rows = await (manager || this.dataSource.manager).query(
      `SELECT config_value AS value FROM system_configs WHERE config_key = ? LIMIT 1`,
      [GOLD_EXCHANGE_RATE_KEY],
    );
    const rate = Number(rows?.[0]?.value ?? 1);
    return Number.isFinite(rate) && rate > 0 ? rate : 1;
  }

  private roundGold(value: number) {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }

  private roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private async migrateLegacyMatrixWithdrawableToGold() {
    if (this.legacyMatrixGoldMigrationChecked) return;
    await this.ensureGoldModuleTables();
    const users = await this.dataSource.query(`
      SELECT owner_id AS userId
      FROM matrix_incomes
      WHERE slot_number BETWEEN 1 AND 4 OR slot_number = 0
      GROUP BY owner_id
    `);
    for (const row of users || []) {
      const userId = Number(row.userId);
      if (!userId) continue;
      await this.dataSource.transaction(async (mgr) => {
        const existed = await mgr.query(
          `SELECT id FROM matrix_gold_migration_records WHERE user_id = ? LIMIT 1`,
          [userId],
        );
        if (existed.length > 0) return;

        const userRows = await mgr.query(
          `SELECT id FROM users WHERE id = ? LIMIT 1`,
          [userId],
        );
        if (userRows.length === 0) {
          await mgr.query(
            `INSERT INTO matrix_gold_migration_records (user_id, migrated_amount)
             VALUES (?, 0)`,
            [userId],
          );
          return;
        }
        await mgr.query(
          `INSERT IGNORE INTO user_currencies (user_id) VALUES (?)`,
          [userId],
        );

        const incomeRows = await mgr.query(
          `SELECT COALESCE(SUM(amount), 0) AS total
           FROM matrix_incomes
           WHERE owner_id = ? AND (slot_number BETWEEN 1 AND 4 OR slot_number = 0)`,
          [userId],
        );
        const withdrawalRows = await mgr.query(
          `SELECT COALESCE(SUM(amount), 0) AS total
           FROM withdrawals
           WHERE user_id = ? AND status IN (0, 1)`,
          [userId],
        );
        const available = this.roundGold(
          Math.max(
            0,
            Number(incomeRows?.[0]?.total || 0) -
              Number(withdrawalRows?.[0]?.total || 0),
          ),
        );
        if (available <= 0) {
          await mgr.query(
            `INSERT INTO matrix_gold_migration_records (user_id, migrated_amount)
             VALUES (?, 0)`,
            [userId],
          );
          return;
        }
        const changed = await this.changeCurrency(
          userId,
          'gold',
          available,
          'matrix_gold_migration',
          `历史推广矩阵可提现余额转金币：${available}金币`,
          mgr,
        );
        await mgr.query(
          `INSERT INTO matrix_gold_migration_records
             (user_id, migrated_amount, currency_log_id)
           VALUES (?, ?, ?)`,
          [userId, available, changed.logId],
        );
      });
    }
    this.legacyMatrixGoldMigrationChecked = true;
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

  private async migrateRewardSynthesisToCopper() {
    try {
      await this.dataSource.query(
        `UPDATE point_synthesis SET target_currency = 'copper' WHERE target_currency = 'reward'`,
      );
    } catch (_) {
      // 兼容尚未创建交易合成表的数据库。
    }
  }

  private async ensureSynthesisConfigTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS point_synthesis (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        consume_points DECIMAL(12,2) NOT NULL,
        target_currency VARCHAR(20) NOT NULL,
        target_amount DECIMAL(12,2) NOT NULL,
        status TINYINT NOT NULL DEFAULT 1 COMMENT '1启用 0禁用',
        INDEX idx_point_synthesis_target (target_currency),
        INDEX idx_point_synthesis_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交易合成配置';
    `);
  }

  private async ensureDefaultSynthesisConfigs() {
    await this.ensureSynthesisConfigTable();
    const consumePoints = await this.getPositiveIntegerConfig(
      SILVER_SYNTHESIS_POINTS_KEY,
      SILVER_SYNTHESIS_POINTS_DEFAULT,
    );
    await this.dataSource.query(
      `INSERT INTO point_synthesis (consume_points, target_currency, target_amount, status)
       SELECT ?, 'silver', 1, 1
       FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM point_synthesis
         WHERE target_currency = 'silver' AND target_amount = 1 AND status = 1
       )`,
      [consumePoints],
    );
    await this.dataSource.query(
      `UPDATE point_synthesis
       SET consume_points = ?, target_amount = 1, status = 1
       WHERE target_currency = 'silver'`,
      [consumePoints],
    );
  }

  private async ensureWithdrawalCopperColumns() {
    const statements = [
      `ALTER TABLE withdrawals ADD COLUMN copper_cost DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '提现消耗铜币数量' AFTER content`,
      `ALTER TABLE withdrawals ADD COLUMN copper_log_id BIGINT NULL COMMENT '提现消耗铜币流水ID' AFTER copper_cost`,
      `ALTER TABLE withdrawals ADD COLUMN copper_refund_log_id BIGINT NULL COMMENT '提现驳回退回铜币流水ID' AFTER copper_log_id`,
      `ALTER TABLE withdrawals ADD INDEX idx_withdrawal_copper_log (copper_log_id)`,
      `ALTER TABLE withdrawals ADD INDEX idx_withdrawal_copper_refund_log (copper_refund_log_id)`,
    ];
    for (const sql of statements) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {
        // Compatible with databases where the column/index already exists.
      }
    }
  }

  private async ensureGameDurationCopperTables() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS game_play_time_daily (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        play_date DATE NOT NULL,
        total_seconds INT NOT NULL DEFAULT 0,
        rewarded_copper DECIMAL(12,2) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_game_play_daily_user_date (user_id, play_date),
        INDEX idx_game_play_daily_user (user_id),
        INDEX idx_game_play_daily_date (play_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游戏时长铜币每日累计';
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS game_play_sessions (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        game_id INT NULL,
        session_id VARCHAR(100) NOT NULL,
        play_date DATE NOT NULL,
        duration_seconds INT NOT NULL DEFAULT 0,
        copper_reward DECIMAL(12,2) NOT NULL DEFAULT 0,
        currency_log_id BIGINT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_game_play_session_user_session (user_id, session_id),
        INDEX idx_game_play_session_user_time (user_id, created_at),
        INDEX idx_game_play_session_game_time (game_id, created_at),
        INDEX idx_game_play_session_date (play_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游戏时长上报会话';
    `);
  }

  private async getPositiveIntegerConfig(
    key: string,
    defaultValue: number,
    manager?: EntityManager,
  ) {
    const rows = await (manager || this.dataSource.manager).query(
      `SELECT config_value AS value FROM system_configs WHERE config_key = ? LIMIT 1`,
      [key],
    );
    const parsed = Number(rows?.[0]?.value ?? defaultValue);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
  }

  private async getSilverSynthesisPointsForUser(
    userId: number,
    manager?: EntityManager,
  ) {
    return this.getPositiveIntegerConfig(
      SILVER_SYNTHESIS_POINTS_KEY,
      SILVER_SYNTHESIS_POINTS_DEFAULT,
      manager,
    );
  }

  private async getWithdrawCopperConfig(manager?: EntityManager) {
    const goldUnit = await this.getPositiveIntegerConfig(
      WITHDRAW_COPPER_GOLD_UNIT_KEY,
      100,
      manager,
    );
    const copperPerUnit = await this.getPositiveIntegerConfig(
      WITHDRAW_COPPER_COST_PER_UNIT_KEY,
      1,
      manager,
    );
    return { goldUnit, copperPerUnit };
  }

  private calculateWithdrawCopperCost(
    amount: number,
    config: { goldUnit: number; copperPerUnit: number },
  ) {
    if (amount <= 0 || config.goldUnit <= 0 || config.copperPerUnit <= 0)
      return 0;
    return Math.ceil(amount / config.goldUnit) * config.copperPerUnit;
  }

  private async getGameCopperConfig(manager?: EntityManager) {
    const minutesPerCoin = await this.getPositiveIntegerConfig(
      GAME_COPPER_MINUTES_PER_COIN_KEY,
      15,
      manager,
    );
    const dailyMax = await this.getPositiveIntegerConfig(
      GAME_COPPER_DAILY_MAX_KEY,
      2,
      manager,
    );
    return { minutesPerCoin, dailyMax };
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

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS weekly_point_return_exclusion_corrections (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        period_id BIGINT NOT NULL,
        account_id BIGINT NOT NULL,
        user_id INT NOT NULL,
        moved_to_excluded_points DECIMAL(18,6) NOT NULL DEFAULT 0,
        eligible_points_before DECIMAL(18,6) NOT NULL DEFAULT 0,
        eligible_points_after DECIMAL(18,6) NOT NULL DEFAULT 0,
        returned_points_before DECIMAL(18,6) NOT NULL DEFAULT 0,
        returned_points_after DECIMAL(18,6) NOT NULL DEFAULT 0,
        recovered_points DECIMAL(18,6) NOT NULL DEFAULT 0,
        currency_log_id BIGINT NULL,
        correction_log_types VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_weekly_return_exclusion_correction_account (account_id),
        INDEX idx_weekly_return_exclusion_correction_user (user_id),
        INDEX idx_weekly_return_exclusion_correction_period (period_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='每周积分返还排除消费历史修正记录';
    `);

    const commentStatements = [
      `ALTER TABLE weekly_point_return_daily_records ADD COLUMN adjusted_return_amount DECIMAL(18,6) NULL AFTER return_amount`,
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
      totalGoldEarned: Number(c.totalGoldEarned || 0),
      silver: Number(c.silver),
      copper: Number(c.copper),
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
      case 'points':
        fieldName = 'points';
        break;
      case 'gold':
        fieldName = 'gold';
        break;
      case 'silver':
        fieldName = 'silver';
        break;
      case 'copper':
        fieldName = 'copper';
        break;
      case 'reward':
        fieldName = 'rewardPoints';
        break;
      case 'invite':
        fieldName = 'invitePoints';
        break;
      default:
        throw new BadRequestException('不支持的货币类型');
    }

    const before = Number(currency[fieldName]);
    const after = before + amount;
    if (after < 0) throw new BadRequestException('余额不足');

    (currency as any)[fieldName] = after;
    if (type === 'gold' && this.shouldCountOriginalGold(logType, amount)) {
      currency.totalGoldEarned = this.roundGold(
        Number(currency.totalGoldEarned || 0) + amount,
      );
    }
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
  async getLogs(
    userId: number,
    currencyType: string | undefined,
    pagination: PaginationDto,
  ) {
    const qb = this.logRepo
      .createQueryBuilder('log')
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

    const logIds = list.map((item) => Number(item.id)).filter((id) => id > 0);
    const extraByLogId = new Map<number, any>();
    if (logIds.length > 0) {
      try {
        const turnoverRows = await this.dataSource.query(
          `SELECT currency_log_id AS currencyLogId,
                  source_type AS sourceType,
                  game_id AS gameId
           FROM game_turnover_records
           WHERE currency_log_id IN (${logIds.map(() => '?').join(',')})`,
          logIds,
        );
        for (const row of turnoverRows || []) {
          const id = Number(row.currencyLogId);
          if (!id) continue;
          extraByLogId.set(id, {
            ...(extraByLogId.get(id) || {}),
            sourceType: row.sourceType,
            source_type: row.sourceType,
            gameId: row.gameId,
            game_id: row.gameId,
          });
        }
      } catch (_) {}

      try {
        const requestRows = await this.dataSource.query(
          `SELECT currency_log_id AS currencyLogId,
                  reason AS requestReason
           FROM game_points_change_requests
           WHERE currency_log_id IN (${logIds.map(() => '?').join(',')})`,
          logIds,
        );
        for (const row of requestRows || []) {
          const id = Number(row.currencyLogId);
          if (!id) continue;
          extraByLogId.set(id, {
            ...(extraByLogId.get(id) || {}),
            requestReason: row.requestReason,
            request_reason: row.requestReason,
          });
        }
      } catch (_) {}
    }

    const enrichedList = list.map((item) => ({
      ...item,
      ...(extraByLogId.get(Number(item.id)) || {}),
    }));

    return {
      list: enrichedList,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async recordGamePlayDuration(
    userId: number,
    gameId: number | null,
    data: { sessionId?: string; durationSeconds?: number },
  ) {
    await this.ensureGameDurationCopperTables();
    const sessionId = String(data.sessionId || '')
      .trim()
      .slice(0, 100);
    if (!sessionId) throw new BadRequestException('缺少游戏会话ID');

    const durationSeconds = Math.floor(Number(data.durationSeconds || 0));
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return {
        counted: false,
        duplicate: false,
        copperReward: 0,
        durationSeconds: 0,
      };
    }
    const safeDurationSeconds = Math.min(
      durationSeconds,
      GAME_DURATION_REPORT_MAX_SECONDS,
    );
    const playDate = this.formatLocalDate(new Date());

    return this.dataSource.transaction(async (mgr) => {
      await mgr.query(
        `INSERT IGNORE INTO game_play_sessions
          (user_id, game_id, session_id, play_date, duration_seconds, copper_reward, currency_log_id, created_at)
         VALUES (?, ?, ?, ?, 0, 0, NULL, NOW())`,
        [userId, gameId || null, sessionId, playDate],
      );
      const sessionRows = await mgr.query(
        `SELECT duration_seconds AS durationSeconds, copper_reward AS copperReward
         FROM game_play_sessions
         WHERE user_id = ? AND session_id = ?
         FOR UPDATE`,
        [userId, sessionId],
      );
      const session = sessionRows?.[0] || {};
      const previousDurationSeconds = Number(session.durationSeconds || 0);
      const countedDurationSeconds = Math.max(
        0,
        safeDurationSeconds - previousDurationSeconds,
      );
      if (countedDurationSeconds <= 0) {
        return {
          counted: false,
          duplicate: true,
          durationSeconds: previousDurationSeconds,
          countedDurationSeconds: 0,
          copperReward: 0,
          rewardedCopperSession: Number(session.copperReward || 0),
        };
      }

      await mgr.query(
        `INSERT IGNORE INTO game_play_time_daily
          (user_id, play_date, total_seconds, rewarded_copper, created_at, updated_at)
         VALUES (?, ?, 0, 0, NOW(), NOW())`,
        [userId, playDate],
      );
      const dailyRows = await mgr.query(
        `SELECT id, total_seconds AS totalSeconds, rewarded_copper AS rewardedCopper
         FROM game_play_time_daily
         WHERE user_id = ? AND play_date = ?
         FOR UPDATE`,
        [userId, playDate],
      );
      const daily = dailyRows?.[0] || {};
      const totalBefore = Number(daily.totalSeconds || 0);
      const rewardedBefore = Number(daily.rewardedCopper || 0);
      const totalAfter = totalBefore + countedDurationSeconds;
      // 保留游戏时长统计，但停止通过游戏时长新增铜币；历史发放记录不回滚。
      const copperReward = 0;
      const currencyLogId: number | null = null;
      const rewardedAfter = rewardedBefore;

      await mgr.query(
        `UPDATE game_play_time_daily
         SET total_seconds = ?, rewarded_copper = ?, updated_at = NOW()
         WHERE id = ?`,
        [totalAfter, rewardedAfter, daily.id],
      );
      await mgr.query(
        `UPDATE game_play_sessions
         SET duration_seconds = ?,
             copper_reward = copper_reward + ?,
             currency_log_id = COALESCE(?, currency_log_id)
         WHERE user_id = ? AND session_id = ?`,
        [safeDurationSeconds, copperReward, currencyLogId, userId, sessionId],
      );

      return {
        counted: true,
        duplicate: false,
        durationSeconds: safeDurationSeconds,
        countedDurationSeconds,
        totalSecondsToday: totalAfter,
        copperReward,
        rewardedCopperToday: rewardedAfter,
        minutesPerCoin: 0,
        dailyMax: 0,
      };
    });
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

    for (
      let generation = 2;
      generation <= DIRECT_GAME_REWARD_MAX_GENERATION;
      generation += 1
    ) {
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
      if (
        parent &&
        Number(parent.status) === 1 &&
        (parent.is_activated === true || Number(parent.is_activated) === 1)
      ) {
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
    const amount = this.roundPoints(
      Math.abs(this.toFiniteNumber(turnover.turnoverAmount)),
    );

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
      const validDirectCount = await this.getValidDirectCount(
        ancestor.userId,
        manager,
      );
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
            validDirectCount: Number(
              existing.validDirectCount || validDirectCount,
            ),
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

    return {
      turnoverId,
      rewardCount,
      rewardAmount,
      rewardEntries,
      skipped: false,
    };
  }

  async processPendingDirectGameRewards(limit = 200) {
    await this.ensureDirectGameRewardTables();
    const safeLimit = Math.min(
      1000,
      Math.max(1, Math.floor(Number(limit) || 200)),
    );
    if (!(await this.isDirectGameRewardEnabled())) {
      return {
        processed: 0,
        rewardCount: 0,
        rewardAmount: 0,
        skipped: true,
        reason: 'switch_disabled',
      };
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
            return {
              turnoverId: Number(row.id),
              rewardCount: 0,
              rewardAmount: 0,
              skipped: true,
            };
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
        rewardAmount = this.roundPoints(
          rewardAmount + this.toFiniteNumber(result.rewardAmount),
        );
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
      const validDirectCount = await this.getValidDirectCount(
        ancestor.userId,
        manager,
      );
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
    const amount = this.roundPoints(
      Math.abs(this.toFiniteNumber(input.amount)),
    );
    const sourceUserId = Number(input.userId);
    if (!sourceUserId || amount <= 0) {
      return { turnoverId: 0, rewardCount: 0, rewardAmount: 0, skipped: true };
    }

    const manager = input.manager || this.dataSource.manager;
    const shouldOwnTransaction = !input.manager;
    const runner = async (mgr: EntityManager) =>
      this.recordGameTurnoverInTransaction(input, amount, mgr);

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
        bizId:
          input.bizId === undefined || input.bizId === null
            ? null
            : String(input.bizId).slice(0, 100),
        description: String(input.description || '').slice(0, 200),
        rewardStatus: 0,
        rewardCount: 0,
        totalRewardAmount: 0,
      }),
    );

    return this.issueDirectGameRewardsForTurnover(turnover, manager);
  }

  /** 特殊积分三档位发放（后台调用） */
  async addSpecialPoints(
    userId: number,
    amount: number,
    manager?: EntityManager,
  ) {
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

  /** 铜币每日产出（定时任务调用） */
  async dailyRewardProduction() {
    // 保留定时任务入口以兼容旧调度器，但当前版本不再新增铜币。
    return { disabled: true, processed: 0 };
  }

  /** 每周积分返还每日发放入口（兼容旧调用名） */
  async dailyPointReturn() {
    return this.processWeeklyPointReturnPayouts();
  }

  /** 交易合成 */
  async synthesize(userId: number, configId: number, quantityRaw = 1) {
    await this.ensureDefaultSynthesisConfigs();
    const safeConfigId = Math.floor(Number(configId));
    if (!Number.isFinite(safeConfigId) || safeConfigId <= 0) {
      throw new BadRequestException('合成配置不正确');
    }
    const config = await this.synthesisRepo.findOne({
      where: { id: safeConfigId, status: 1 },
    });
    if (!config) throw new BadRequestException('合成配置不存在或已禁用');
    const quantity = Math.floor(Number(quantityRaw || 1));
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new BadRequestException('合成数量不正确');
    }
    if (quantity > 999) {
      throw new BadRequestException('单次最多合成999个');
    }

    await this.dataSource.transaction(async (mgr) => {
      const targetCurrency =
        config.targetCurrency === 'reward' ? 'copper' : config.targetCurrency;
      if (targetCurrency === 'copper') {
        throw new BadRequestException('铜币合成功能暂未开放');
      }
      const unitConsumePoints =
        targetCurrency === 'silver'
          ? await this.getSilverSynthesisPointsForUser(userId, mgr)
          : Number(config.consumePoints);
      const consumePoints = unitConsumePoints * quantity;
      const targetAmount = Number(config.targetAmount) * quantity;
      if (
        !Number.isFinite(consumePoints) ||
        consumePoints <= 0 ||
        !Number.isFinite(targetAmount) ||
        targetAmount <= 0
      ) {
        throw new BadRequestException('合成配置不正确');
      }
      await this.changeCurrency(
        userId,
        'points',
        -consumePoints,
        'synthesize',
        `交易合成消耗：${consumePoints}积分`,
        mgr,
      );
      await this.changeCurrency(
        userId,
        targetCurrency as CurrencyType,
        targetAmount,
        'synthesize',
        `交易合成获得：${targetAmount}${targetCurrency === 'silver' ? '银币' : targetCurrency === 'gold' ? '金币' : '铜币'}`,
        mgr,
      );
    });

    return { message: '合成成功' };
  }

  /** 获取合成配置列表 */
  async getSynthesisConfigs(userId: number) {
    await this.ensureDefaultSynthesisConfigs();
    const configs = await this.synthesisRepo.find({ where: { status: 1 } });
    const silverConsumePoints =
      await this.getSilverSynthesisPointsForUser(userId);
    return configs
      .filter((config) => {
        const target = config.targetCurrency === 'reward'
          ? 'copper'
          : config.targetCurrency;
        return target !== 'copper';
      })
      .map((config) =>
      config.targetCurrency === 'silver'
        ? { ...config, consumePoints: silverConsumePoints }
        : config,
      );
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
    const confirmPassword = this.normalizeWithdrawPassword(
      data.confirmPassword,
    );
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
    const confirmPassword = this.normalizeWithdrawPassword(
      data.confirmPassword,
    );
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

  private async verifyWithdrawPassword(
    userId: number,
    withdrawPassword?: string,
  ) {
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

  private validateGoldQuantity(value: any, label = '金币数量') {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity < 100 || quantity % 100 !== 0) {
      throw new BadRequestException(`${label}必须是100或者100的整数倍`);
    }
    return this.roundGold(quantity);
  }

  private mapGoldTradeRow(row: any, currentUserId?: number) {
    const quantity = this.roundGold(Number(row.quantity || 0));
    const totalPrice = this.roundMoney(
      Number(row.totalPrice ?? row.total_price ?? 0),
    );
    const sellerUserId = Number(row.sellerUserId ?? row.seller_user_id ?? 0);
    const buyerUserId = row.buyerUserId ?? row.buyer_user_id;
    const status = Number(row.status || 0);
    return {
      id: Number(row.id),
      orderSn: row.orderSn ?? row.order_sn,
      sellerUserId,
      sellerAccount: row.sellerAccount ?? row.seller_account ?? '',
      sellerNickname: row.sellerNickname ?? row.seller_nickname ?? '',
      buyerUserId: buyerUserId == null ? null : Number(buyerUserId),
      buyerAccount: row.buyerAccount ?? row.buyer_account ?? '',
      buyerNickname: row.buyerNickname ?? row.buyer_nickname ?? '',
      quantity,
      totalPrice,
      unitPrice: quantity > 0 ? this.roundMoney(totalPrice / quantity) : 0,
      feeGold: this.roundGold(Number(row.feeGold ?? row.fee_gold ?? 0)),
      depositGold: this.roundGold(
        Number(row.depositGold ?? row.deposit_gold ?? 0),
      ),
      alipayName: row.alipayName ?? row.alipay_name ?? '',
      alipayQrcode: row.alipayQrcode ?? row.alipay_qrcode ?? '',
      status,
      statusText:
        status === 0
          ? '出售中'
          : status === 1
            ? '待卖家确认'
            : status === 2
              ? '已完成'
              : '已取消',
      isSeller: currentUserId ? sellerUserId === Number(currentUserId) : false,
      isBuyer:
        currentUserId && buyerUserId != null
          ? Number(buyerUserId) === Number(currentUserId)
          : false,
      canBuy: currentUserId
        ? status === 0 && sellerUserId !== Number(currentUserId)
        : status === 0,
      buyerConfirmedAt: row.buyerConfirmedAt ?? row.buyer_confirmed_at ?? null,
      sellerConfirmedAt:
        row.sellerConfirmedAt ?? row.seller_confirmed_at ?? null,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
    };
  }

  async getGoldOverview(userId: number) {
    await this.ensureGoldModuleTables();
    await this.migrateLegacyMatrixWithdrawableToGold();
    const balance = await this.getBalance(userId);
    const exchangeRate = await this.getGoldExchangeRate();
    const badge = await this.getGoldTradeBadge(userId);
    return {
      gold: balance.gold,
      totalGoldEarned: balance.totalGoldEarned,
      exchangeRate,
      estimatedCashValue: this.roundMoney(
        Number(balance.gold || 0) * exchangeRate,
      ),
      tradeFeeRate: GOLD_TRADE_FEE_RATE,
      tradeDeposit: GOLD_TRADE_DEPOSIT,
      pendingTradeCount: badge.count,
    };
  }

  async transferGoldToWithdraw(userId: number, data: { quantity: number }) {
    await this.ensureGoldModuleTables();
    const quantity = this.validateGoldQuantity(data?.quantity, '提现金币数量');
    const exchangeRate = await this.getGoldExchangeRate();
    const cashAmount = this.roundMoney(quantity * exchangeRate);

    await this.dataSource.transaction(async (mgr) => {
      const changed = await this.changeCurrency(
        userId,
        'gold',
        -quantity,
        'gold_withdraw_transfer',
        `${quantity}金币按${exchangeRate}比例转入提现模块，折合${cashAmount}元`,
        mgr,
      );
      await mgr.query(
        `INSERT INTO gold_withdraw_credits
           (user_id, gold_amount, exchange_rate, cash_amount, currency_log_id)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, quantity, exchangeRate, cashAmount, changed.logId],
      );
    });

    return { message: '已转入提现模块', quantity, exchangeRate, cashAmount };
  }

  async createGoldTrade(
    userId: number,
    data: {
      quantity: number;
      totalPrice: number;
      alipayName?: string;
      alipayQrcode?: string;
    },
  ) {
    await this.ensureGoldModuleTables();
    await this.requireActivatedForCurrencyTrade(userId);
    const quantity = this.validateGoldQuantity(data?.quantity, '出售金币数量');
    const totalPrice = this.roundMoney(Number(data?.totalPrice));
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      throw new BadRequestException('请填写正确的出售价格');
    }
    const alipayName = String(data?.alipayName || '').trim();
    const alipayQrcode = String(data?.alipayQrcode || '').trim();
    if (!alipayName) throw new BadRequestException('请填写支付宝实名姓名');
    if (!alipayQrcode) throw new BadRequestException('请上传支付宝收款码');

    const feeGold = this.roundGold(quantity * GOLD_TRADE_FEE_RATE);
    const depositGold = GOLD_TRADE_DEPOSIT;
    const lockGold = this.roundGold(quantity + feeGold + depositGold);
    const orderSn = generateSn('GT');

    await this.dataSource.transaction(async (mgr) => {
      const changed = await this.changeCurrency(
        userId,
        'gold',
        -lockGold,
        'gold_trade_lock',
        `发布金币出售：锁定${quantity}金币，手续费${feeGold}金币，担保${depositGold}金币`,
        mgr,
      );
      await mgr.query(
        `INSERT INTO gold_trade_orders
          (order_sn, seller_user_id, quantity, total_price, fee_gold, deposit_gold,
           alipay_name, alipay_qrcode, status, seller_lock_log_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          orderSn,
          userId,
          quantity,
          totalPrice,
          feeGold,
          depositGold,
          alipayName,
          alipayQrcode,
          changed.logId,
        ],
      );
    });

    return { message: '出售订单已发布', orderSn };
  }

  async listGoldTrades(userId: number) {
    await this.ensureGoldModuleTables();
    const rows = await this.dataSource.query(
      `SELECT o.id, o.order_sn AS orderSn, o.seller_user_id AS sellerUserId,
              o.buyer_user_id AS buyerUserId, o.quantity, o.total_price AS totalPrice,
              o.fee_gold AS feeGold, o.deposit_gold AS depositGold,
              o.alipay_name AS alipayName, o.alipay_qrcode AS alipayQrcode,
              o.status, o.buyer_confirmed_at AS buyerConfirmedAt,
              o.seller_confirmed_at AS sellerConfirmedAt,
              o.created_at AS createdAt, o.updated_at AS updatedAt,
              su.account AS sellerAccount, su.nickname AS sellerNickname,
              bu.account AS buyerAccount, bu.nickname AS buyerNickname
       FROM gold_trade_orders o
       LEFT JOIN users su ON su.id = o.seller_user_id
       LEFT JOIN users bu ON bu.id = o.buyer_user_id
       WHERE o.status = 0
          OR o.seller_user_id = ?
          OR o.buyer_user_id = ?
       ORDER BY
         CASE WHEN o.status = 1 AND o.seller_user_id = ? THEN 0 ELSE 1 END,
         o.created_at DESC
       LIMIT 100`,
      [userId, userId, userId],
    );
    return rows.map((row: any) => this.mapGoldTradeRow(row, userId));
  }

  async getGoldTradeDetail(userId: number, id: number) {
    await this.ensureGoldModuleTables();
    const rows = await this.dataSource.query(
      `SELECT o.id, o.order_sn AS orderSn, o.seller_user_id AS sellerUserId,
              o.buyer_user_id AS buyerUserId, o.quantity, o.total_price AS totalPrice,
              o.fee_gold AS feeGold, o.deposit_gold AS depositGold,
              o.alipay_name AS alipayName, o.alipay_qrcode AS alipayQrcode,
              o.status, o.buyer_confirmed_at AS buyerConfirmedAt,
              o.seller_confirmed_at AS sellerConfirmedAt,
              o.created_at AS createdAt, o.updated_at AS updatedAt,
              su.account AS sellerAccount, su.nickname AS sellerNickname,
              bu.account AS buyerAccount, bu.nickname AS buyerNickname
       FROM gold_trade_orders o
       LEFT JOIN users su ON su.id = o.seller_user_id
       LEFT JOIN users bu ON bu.id = o.buyer_user_id
       WHERE o.id = ?
       LIMIT 1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('出售订单不存在');
    const item = this.mapGoldTradeRow(rows[0], userId);
    if (item.status !== 0 && !item.isSeller && !item.isBuyer) {
      throw new BadRequestException('无权查看该订单');
    }
    return item;
  }

  async cancelGoldTrade(userId: number, id: number) {
    await this.ensureGoldModuleTables();
    await this.dataSource.transaction(async (mgr) => {
      const rows = await mgr.query(
        `SELECT * FROM gold_trade_orders WHERE id = ? AND seller_user_id = ? FOR UPDATE`,
        [id, userId],
      );
      if (rows.length === 0) throw new NotFoundException('出售订单不存在');
      const order = rows[0];
      if (Number(order.status) !== 0)
        throw new BadRequestException('当前订单不能取消');
      const refundGold = this.roundGold(
        Number(order.quantity || 0) +
          Number(order.fee_gold || 0) +
          Number(order.deposit_gold || 0),
      );
      const changed = await this.changeCurrency(
        userId,
        'gold',
        refundGold,
        'gold_trade_cancel_refund',
        `取消金币出售，退回锁定金币、手续费和担保金币`,
        mgr,
      );
      await mgr.query(
        `UPDATE gold_trade_orders
         SET status = 3, seller_refund_log_id = ?, cancelled_at = NOW()
         WHERE id = ?`,
        [changed.logId, id],
      );
    });
    return { message: '已取消出售，金币已退回' };
  }

  async confirmGoldTradePaid(userId: number, id: number) {
    await this.ensureGoldModuleTables();
    await this.requireActivatedForCurrencyTrade(userId);
    await this.dataSource.transaction(async (mgr) => {
      const rows = await mgr.query(
        `SELECT * FROM gold_trade_orders WHERE id = ? FOR UPDATE`,
        [id],
      );
      if (rows.length === 0) throw new NotFoundException('出售订单不存在');
      const order = rows[0];
      if (Number(order.status) !== 0 || order.buyer_receive_log_id) {
        throw new BadRequestException('该订单已被购买或不可购买');
      }
      if (Number(order.seller_user_id) === Number(userId)) {
        throw new BadRequestException('不能购买自己发布的金币');
      }
      await mgr.query(
        `UPDATE gold_trade_orders
         SET buyer_user_id = ?, status = 1, buyer_confirmed_at = NOW(), seller_viewed_at = NULL
         WHERE id = ?`,
        [userId, id],
      );
    });
    return { message: '已确认支付，请等待卖家确认到账后放币', released: false };
  }

  async confirmGoldTradeReceived(userId: number, id: number) {
    await this.ensureGoldModuleTables();
    await this.dataSource.transaction(async (mgr) => {
      const rows = await mgr.query(
        `SELECT * FROM gold_trade_orders WHERE id = ? AND seller_user_id = ? FOR UPDATE`,
        [id, userId],
      );
      if (rows.length === 0) throw new NotFoundException('出售订单不存在');
      const order = rows[0];
      if (
        Number(order.status) !== 1 ||
        !order.buyer_user_id ||
        order.buyer_receive_log_id
      ) {
        throw new BadRequestException('当前订单还不能确认到账');
      }
      const quantity = this.roundGold(Number(order.quantity || 0));
      const depositGold = this.roundGold(
        Number(order.deposit_gold || GOLD_TRADE_DEPOSIT),
      );
      const buyerChanged = await this.changeCurrency(
        Number(order.buyer_user_id),
        'gold',
        quantity,
        'gold_trade_buy_receive',
        `购买金币到账：订单${order.order_sn}`,
        mgr,
      );
      const refundChanged = await this.changeCurrency(
        userId,
        'gold',
        depositGold,
        'gold_trade_deposit_refund',
        `金币出售完成，退回担保金币：订单${order.order_sn}`,
        mgr,
      );
      await mgr.query(
        `UPDATE gold_trade_orders
         SET status = 2, buyer_receive_log_id = ?, seller_refund_log_id = ?,
             seller_confirmed_at = NOW(), seller_viewed_at = NOW()
         WHERE id = ?`,
        [buyerChanged.logId, refundChanged.logId, id],
      );
    });
    return { message: '已确认到账，金币已转给买家' };
  }

  async getGoldTradeBadge(userId: number) {
    await this.ensureGoldModuleTables();
    const rows = await this.dataSource.query(
      `SELECT COUNT(*) AS count
       FROM gold_trade_orders
       WHERE seller_user_id = ?
         AND status = 1
         AND (seller_viewed_at IS NULL OR seller_viewed_at < buyer_confirmed_at)`,
      [userId],
    );
    return { count: Number(rows?.[0]?.count || 0) };
  }

  async clearGoldTradeBadge(userId: number) {
    await this.ensureGoldModuleTables();
    await this.dataSource.query(
      `UPDATE gold_trade_orders
       SET seller_viewed_at = NOW()
       WHERE seller_user_id = ? AND status = 1`,
      [userId],
    );
    return { message: '已读' };
  }

  private validateCopperQuantity(value: any, label = '铜币数量') {
    const quantity = Number(value);
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isInteger(quantity)
    ) {
      throw new BadRequestException(`${label}必须是大于0的整数`);
    }
    return this.roundGold(quantity);
  }

  private mapCopperTradeRow(row: any, currentUserId?: number) {
    const quantity = this.roundGold(Number(row.quantity || 0));
    const totalPrice = this.roundMoney(
      Number(row.totalPrice ?? row.total_price ?? 0),
    );
    const sellerUserId = Number(row.sellerUserId ?? row.seller_user_id ?? 0);
    const buyerUserId = row.buyerUserId ?? row.buyer_user_id;
    const status = Number(row.status || 0);
    return {
      id: Number(row.id),
      orderSn: row.orderSn ?? row.order_sn,
      sellerUserId,
      sellerAccount: row.sellerAccount ?? row.seller_account ?? '',
      sellerNickname: row.sellerNickname ?? row.seller_nickname ?? '',
      buyerUserId: buyerUserId == null ? null : Number(buyerUserId),
      buyerAccount: row.buyerAccount ?? row.buyer_account ?? '',
      buyerNickname: row.buyerNickname ?? row.buyer_nickname ?? '',
      quantity,
      totalPrice,
      unitPrice: quantity > 0 ? this.roundMoney(totalPrice / quantity) : 0,
      feeCopper: 0,
      depositCopper: this.roundGold(
        Number(row.depositCopper ?? row.deposit_copper ?? 0),
      ),
      alipayName: row.alipayName ?? row.alipay_name ?? '',
      alipayQrcode: row.alipayQrcode ?? row.alipay_qrcode ?? '',
      status,
      statusText:
        status === 0
          ? '出售中'
          : status === 1
            ? '待卖家确认'
            : status === 2
              ? '已完成'
              : '已取消',
      isSeller: currentUserId ? sellerUserId === Number(currentUserId) : false,
      isBuyer:
        currentUserId && buyerUserId != null
          ? Number(buyerUserId) === Number(currentUserId)
          : false,
      canBuy: currentUserId
        ? status === 0 && sellerUserId !== Number(currentUserId)
        : status === 0,
      buyerConfirmedAt: row.buyerConfirmedAt ?? row.buyer_confirmed_at ?? null,
      sellerConfirmedAt:
        row.sellerConfirmedAt ?? row.seller_confirmed_at ?? null,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
    };
  }

  async getCopperOverview(userId: number) {
    await this.ensureGoldModuleTables();
    const balance = await this.getBalance(userId);
    const badge = await this.getCopperTradeBadge(userId);
    return {
      copper: balance.copper,
      tradeFeeRate: 0,
      tradeDepositRate: COPPER_TRADE_DEPOSIT_RATE,
      pendingTradeCount: badge.count,
    };
  }

  async createCopperTrade(
    userId: number,
    data: {
      quantity: number;
      totalPrice: number;
      alipayName?: string;
      alipayQrcode?: string;
    },
  ) {
    await this.ensureGoldModuleTables();
    const quantity = this.validateCopperQuantity(
      data?.quantity,
      '出售铜币数量',
    );
    const totalPrice = this.roundMoney(Number(data?.totalPrice));
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      throw new BadRequestException('请填写正确的出售价格');
    }
    const alipayName = String(data?.alipayName || '').trim();
    const alipayQrcode = String(data?.alipayQrcode || '').trim();
    if (!alipayName) throw new BadRequestException('请填写支付宝实名姓名');
    if (!alipayQrcode) throw new BadRequestException('请上传支付宝收款码');

    const depositCopper = this.roundGold(quantity * COPPER_TRADE_DEPOSIT_RATE);
    const lockCopper = this.roundGold(quantity + depositCopper);
    const orderSn = generateSn('CT');

    await this.dataSource.transaction(async (mgr) => {
      const changed = await this.changeCurrency(
        userId,
        'copper',
        -lockCopper,
        'copper_trade_lock',
        `发布铜币出售：锁定${quantity}铜币，担保${depositCopper}铜币`,
        mgr,
      );
      await mgr.query(
        `INSERT INTO copper_trade_orders
          (order_sn, seller_user_id, quantity, total_price, deposit_copper,
           alipay_name, alipay_qrcode, status, seller_lock_log_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          orderSn,
          userId,
          quantity,
          totalPrice,
          depositCopper,
          alipayName,
          alipayQrcode,
          changed.logId,
        ],
      );
    });

    return { message: '出售订单已发布', orderSn };
  }

  async listCopperTrades(userId: number) {
    await this.ensureGoldModuleTables();
    const rows = await this.dataSource.query(
      `SELECT o.id, o.order_sn AS orderSn, o.seller_user_id AS sellerUserId,
              o.buyer_user_id AS buyerUserId, o.quantity, o.total_price AS totalPrice,
              o.deposit_copper AS depositCopper,
              o.alipay_name AS alipayName, o.alipay_qrcode AS alipayQrcode,
              o.status, o.buyer_confirmed_at AS buyerConfirmedAt,
              o.seller_confirmed_at AS sellerConfirmedAt,
              o.created_at AS createdAt, o.updated_at AS updatedAt,
              su.account AS sellerAccount, su.nickname AS sellerNickname,
              bu.account AS buyerAccount, bu.nickname AS buyerNickname
       FROM copper_trade_orders o
       LEFT JOIN users su ON su.id = o.seller_user_id
       LEFT JOIN users bu ON bu.id = o.buyer_user_id
       WHERE o.status = 0
          OR o.seller_user_id = ?
          OR o.buyer_user_id = ?
       ORDER BY
         CASE WHEN o.status = 1 AND o.seller_user_id = ? THEN 0 ELSE 1 END,
         o.created_at DESC
       LIMIT 100`,
      [userId, userId, userId],
    );
    return rows.map((row: any) => this.mapCopperTradeRow(row, userId));
  }

  async getCopperTradeDetail(userId: number, id: number) {
    await this.ensureGoldModuleTables();
    const rows = await this.dataSource.query(
      `SELECT o.id, o.order_sn AS orderSn, o.seller_user_id AS sellerUserId,
              o.buyer_user_id AS buyerUserId, o.quantity, o.total_price AS totalPrice,
              o.deposit_copper AS depositCopper,
              o.alipay_name AS alipayName, o.alipay_qrcode AS alipayQrcode,
              o.status, o.buyer_confirmed_at AS buyerConfirmedAt,
              o.seller_confirmed_at AS sellerConfirmedAt,
              o.created_at AS createdAt, o.updated_at AS updatedAt,
              su.account AS sellerAccount, su.nickname AS sellerNickname,
              bu.account AS buyerAccount, bu.nickname AS buyerNickname
       FROM copper_trade_orders o
       LEFT JOIN users su ON su.id = o.seller_user_id
       LEFT JOIN users bu ON bu.id = o.buyer_user_id
       WHERE o.id = ?
       LIMIT 1`,
      [id],
    );
    if (rows.length === 0) throw new NotFoundException('出售订单不存在');
    const item = this.mapCopperTradeRow(rows[0], userId);
    if (item.status !== 0 && !item.isSeller && !item.isBuyer) {
      throw new BadRequestException('无权查看该订单');
    }
    return item;
  }

  async cancelCopperTrade(userId: number, id: number) {
    await this.ensureGoldModuleTables();
    await this.dataSource.transaction(async (mgr) => {
      const rows = await mgr.query(
        `SELECT * FROM copper_trade_orders WHERE id = ? AND seller_user_id = ? FOR UPDATE`,
        [id, userId],
      );
      if (rows.length === 0) throw new NotFoundException('出售订单不存在');
      const order = rows[0];
      if (Number(order.status) !== 0)
        throw new BadRequestException('当前订单不能取消');
      const refundCopper = this.roundGold(
        Number(order.quantity || 0) + Number(order.deposit_copper || 0),
      );
      const changed = await this.changeCurrency(
        userId,
        'copper',
        refundCopper,
        'copper_trade_cancel_refund',
        `取消铜币出售，退回锁定铜币和担保铜币`,
        mgr,
      );
      await mgr.query(
        `UPDATE copper_trade_orders
         SET status = 3, seller_refund_log_id = ?, cancelled_at = NOW()
         WHERE id = ?`,
        [changed.logId, id],
      );
    });
    return { message: '已取消出售，铜币已退回' };
  }

  async confirmCopperTradePaid(userId: number, id: number) {
    await this.ensureGoldModuleTables();
    await this.dataSource.transaction(async (mgr) => {
      const rows = await mgr.query(
        `SELECT * FROM copper_trade_orders WHERE id = ? FOR UPDATE`,
        [id],
      );
      if (rows.length === 0) throw new NotFoundException('出售订单不存在');
      const order = rows[0];
      if (Number(order.status) !== 0 || order.buyer_receive_log_id) {
        throw new BadRequestException('该订单已被购买或不可购买');
      }
      if (Number(order.seller_user_id) === Number(userId)) {
        throw new BadRequestException('不能购买自己发布的铜币');
      }
      await mgr.query(
        `UPDATE copper_trade_orders
         SET buyer_user_id = ?, status = 1, buyer_confirmed_at = NOW(), seller_viewed_at = NULL
         WHERE id = ?`,
        [userId, id],
      );
    });
    return { message: '已确认支付，请等待卖家确认到账后放币', released: false };
  }

  async confirmCopperTradeReceived(userId: number, id: number) {
    await this.ensureGoldModuleTables();
    await this.dataSource.transaction(async (mgr) => {
      const rows = await mgr.query(
        `SELECT * FROM copper_trade_orders WHERE id = ? AND seller_user_id = ? FOR UPDATE`,
        [id, userId],
      );
      if (rows.length === 0) throw new NotFoundException('出售订单不存在');
      const order = rows[0];
      if (
        Number(order.status) !== 1 ||
        !order.buyer_user_id ||
        order.buyer_receive_log_id
      ) {
        throw new BadRequestException('当前订单还不能确认到账');
      }
      const quantity = this.roundGold(Number(order.quantity || 0));
      const depositCopper = this.roundGold(Number(order.deposit_copper || 0));
      const buyerChanged = await this.changeCurrency(
        Number(order.buyer_user_id),
        'copper',
        quantity,
        'copper_trade_buy_receive',
        `购买铜币到账：订单${order.order_sn}`,
        mgr,
      );
      const refundChanged = await this.changeCurrency(
        userId,
        'copper',
        depositCopper,
        'copper_trade_deposit_refund',
        `铜币出售完成，退回担保铜币：订单${order.order_sn}`,
        mgr,
      );
      await mgr.query(
        `UPDATE copper_trade_orders
         SET status = 2, buyer_receive_log_id = ?, seller_refund_log_id = ?,
             seller_confirmed_at = NOW(), seller_viewed_at = NOW()
         WHERE id = ?`,
        [buyerChanged.logId, refundChanged.logId, id],
      );
    });
    return { message: '已确认到账，铜币已转给买家' };
  }

  async getCopperTradeBadge(userId: number) {
    await this.ensureGoldModuleTables();
    const rows = await this.dataSource.query(
      `SELECT COUNT(*) AS count
       FROM copper_trade_orders
       WHERE seller_user_id = ?
         AND status = 1
         AND (seller_viewed_at IS NULL OR seller_viewed_at < buyer_confirmed_at)`,
      [userId],
    );
    return { count: Number(rows?.[0]?.count || 0) };
  }

  async clearCopperTradeBadge(userId: number) {
    await this.ensureGoldModuleTables();
    await this.dataSource.query(
      `UPDATE copper_trade_orders
       SET seller_viewed_at = NOW()
       WHERE seller_user_id = ? AND status = 1`,
      [userId],
    );
    return { message: '已读' };
  }

  /** 提现申请 */
  async withdraw(
    userId: number,
    data: {
      amount: number;
      paymentMethod: string;
      accountName: string;
      accountNumber: string;
      content?: string;
      withdrawPassword?: string;
    },
  ) {
    const {
      amount,
      paymentMethod,
      accountName,
      accountNumber,
      content,
      withdrawPassword,
    } = data;
    if (!amount || amount < 100) throw new BadRequestException('提现最低100元');
    if (amount % 100 !== 0)
      throw new BadRequestException('提现金额必须是100的整数倍');
    if (!paymentMethod || !['alipay', 'bank'].includes(paymentMethod)) {
      throw new BadRequestException('请选择提现方式（支付宝或银行卡）');
    }
    if (!accountName || !accountName.trim())
      throw new BadRequestException('请填写收款人姓名');
    if (!accountNumber || !accountNumber.trim())
      throw new BadRequestException('请填写收款账号');
    await this.verifyWithdrawPassword(userId, withdrawPassword);
    await this.ensureWithdrawalCopperColumns();

    // 校验可提现余额 = 金币转入提现模块额度 - 迁移后的待审核/已通过提现总额。
    const { totalEarned, totalWithdrawn, copper } =
      await this.getWithdrawableBalance(userId);
    const available = totalEarned - totalWithdrawn;
    if (amount > available) {
      throw new BadRequestException(
        `可提现余额不足，当前可提现 ${available.toFixed(0)} 元`,
      );
    }
    const copperConfig = await this.getWithdrawCopperConfig();
    const copperCost = this.calculateWithdrawCopperCost(amount, copperConfig);
    if (copperCost > copper) {
      throw new BadRequestException(
        `铜币不足，本次提现需消耗 ${copperCost} 个铜币`,
      );
    }

    const fee = Math.floor(amount * 0.2);
    const actualAmount = amount - fee;
    const withdrawal = await this.dataSource.transaction(async (mgr) => {
      const changed =
        copperCost > 0
          ? await this.changeCurrency(
              userId,
              'copper',
              -copperCost,
              'withdraw_copper_cost',
              `提现${amount}金币消耗铜币`,
              mgr,
            )
          : null;

      const record = mgr.create(Withdrawal, {
        userId,
        amount,
        paymentMethod,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        content:
          `提现${amount}元，手续费${fee}元（20%），实际到账${actualAmount}元` +
          (content?.trim() ? `；备注：${content.trim()}` : ''),
        copperCost,
        copperLogId: changed?.logId ?? null,
        copperRefundLogId: null,
        status: 0,
      });
      return mgr.save(Withdrawal, record);
    });

    // 给管理员发送服务通知
    await this.serviceNotificationService.notifyAdmin({
      type: 'withdrawal',
      title: '新的提现申请',
      content: `${accountName.trim()} 申请提现 ${amount} 元（实际到账 ${actualAmount} 元，消耗铜币 ${copperCost}），收款方式：${paymentMethod}`,
      fromUserId: userId,
      payload: {
        withdrawalId: withdrawal.id,
        amount,
        actualAmount,
        copperCost,
      },
    });
    await this.serviceNotificationService.notifyUser({
      recipientId: userId,
      type: 'withdrawal_progress',
      title: '提现申请处理中',
      content: `你的 ${amount} 元提现申请已提交，管理员处理中，请等待。`,
      payload: {
        withdrawalId: withdrawal.id,
        amount,
        actualAmount,
        status: 'pending',
      },
    });

    return { message: '提现申请已提交，请等待审核', copperCost };
  }

  /** 获取用户可提现余额 */
  async getWithdrawableBalance(userId: number) {
    await this.ensureWithdrawalCopperColumns();
    await this.ensureGoldModuleTables();
    await this.migrateLegacyMatrixWithdrawableToGold();

    const earnedResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(cash_amount), 0) as total
       FROM gold_withdraw_credits
       WHERE user_id = ?`,
      [userId],
    );
    const totalEarned = Number(earnedResult?.[0]?.total || 0);

    const migrationRows = await this.dataSource.query(
      `SELECT created_at AS createdAt
       FROM matrix_gold_migration_records
       WHERE user_id = ?
       LIMIT 1`,
      [userId],
    );
    const migrationAt = migrationRows?.[0]?.createdAt || null;

    // 已提现总额（待审核 + 已通过）。旧矩阵可提现余额迁移前的提现已在迁移时扣过，避免重复扣减。
    const withdrawParams: any[] = [userId];
    let migrationFilter = '';
    if (migrationAt) {
      migrationFilter = ' AND created_at >= ?';
      withdrawParams.push(migrationAt);
    }
    const withdrawnResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM withdrawals
       WHERE user_id = ? AND status IN (0, 1)${migrationFilter}`,
      withdrawParams,
    );
    const totalWithdrawn = Number(withdrawnResult?.[0]?.total || 0);
    const currency = await this.currencyRepo.findOne({ where: { userId } });
    const copperConfig = await this.getWithdrawCopperConfig();

    return {
      totalEarned,
      totalWithdrawn,
      copper: Number(currency?.copper || 0),
      withdrawCopperConfig: copperConfig,
    };
  }

  /** 获取用户交易记录：推广收益入账 + 提现申请。 */
  async getWithdrawRecords(userId: number) {
    await this.ensureGoldModuleTables();
    const withdrawals = await this.withdrawalRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const credits = await this.dataSource.query(
      `SELECT id, gold_amount AS goldAmount, exchange_rate AS exchangeRate,
              cash_amount AS cashAmount, created_at AS createdAt
       FROM gold_withdraw_credits
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId],
    );

    const creditRecords = credits.map((r: any) => ({
      id: `gold-credit-${r.id}`,
      transactionType: 'income',
      amount: Number(r.cashAmount || 0),
      title: '金币转入提现',
      description: `${this.roundGold(Number(r.goldAmount || 0))}金币 × ${Number(r.exchangeRate || 1)} = ${this.roundMoney(Number(r.cashAmount || 0))}元`,
      sourceAccount: '',
      sourceNickname: '',
      createdAt: r.createdAt,
    }));
    const withdrawalRecords = withdrawals.map((r) => ({
      id: `withdrawal-${r.id}`,
      transactionType: 'withdrawal',
      amount: Number(r.amount),
      fee: Math.floor(Number(r.amount) * 0.2),
      actualAmount: Number(r.amount) - Math.floor(Number(r.amount) * 0.2),
      paymentMethod: r.paymentMethod,
      accountName: r.accountName,
      accountNumber: r.accountNumber,
      copperCost: Number(r.copperCost || 0),
      copperRefunded: !!r.copperRefundLogId,
      status: r.status, // 0待审核 1已打款 2驳回
      statusText:
        r.status === 0 ? '审核中' : r.status === 1 ? '已打款' : '已驳回',
      createdAt: r.createdAt,
      reviewTime: r.reviewTime,
    }));

    return [...creditRecords, ...withdrawalRecords].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /** 提现审核（管理端） */
  async reviewWithdrawal(id: number, approve: boolean) {
    await this.ensureWithdrawalCopperColumns();
    const reviewed = await this.dataSource.transaction(async (mgr) => {
      const w = await mgr.findOne(Withdrawal, { where: { id } });
      if (!w) throw new NotFoundException('提现记录不存在');
      if (w.status !== 0) throw new BadRequestException('该申请已处理');

      w.status = approve ? 1 : 2;
      w.reviewTime = new Date();

      const copperCost = Number(w.copperCost || 0);
      if (!approve && copperCost > 0 && !w.copperRefundLogId) {
        const changed = await this.changeCurrency(
          w.userId,
          'copper',
          copperCost,
          'withdraw_copper_refund',
          `提现驳回退回铜币`,
          mgr,
        );
        w.copperRefundLogId = changed.logId;
      }

      if (!approve) {
        const migrationRows = await mgr.query(
          `SELECT created_at AS createdAt
           FROM matrix_gold_migration_records
           WHERE user_id = ?
           LIMIT 1`,
          [w.userId],
        );
        const migrationAt = migrationRows?.[0]?.createdAt
          ? new Date(migrationRows[0].createdAt).getTime()
          : 0;
        const withdrawalAt = w.createdAt
          ? new Date(w.createdAt).getTime()
          : Date.now();
        if (migrationAt > 0 && withdrawalAt <= migrationAt) {
          await this.changeCurrency(
            w.userId,
            'gold',
            Number(w.amount || 0),
            'matrix_gold_withdraw_reject_refund',
            `历史推广提现驳回，退回金币`,
            mgr,
          );
        }
      }

      await mgr.save(Withdrawal, w);
      return {
        userId: Number(w.userId),
        amount: Number(w.amount || 0),
        copperRefunded: !approve && Number(w.copperCost || 0) > 0,
      };
    });

    const actualAmount = reviewed.amount - Math.floor(reviewed.amount * 0.2);
    await this.serviceNotificationService.notifyUser({
      recipientId: reviewed.userId,
      type: 'withdrawal_result',
      title: approve ? '提现申请已通过' : '提现申请未通过',
      content: approve
        ? `你的 ${reviewed.amount} 元提现申请已通过，实际到账 ${actualAmount} 元。`
        : `你的 ${reviewed.amount} 元提现申请未通过${reviewed.copperRefunded ? '，本次消耗的铜币已退回账户' : ''}。`,
      payload: {
        withdrawalId: id,
        amount: reviewed.amount,
        actualAmount,
        status: approve ? 'approved' : 'rejected',
      },
    });

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
    const categoryOrder = [
      'points',
      'currency',
      'game',
      'recharge',
      'meeting',
      'ai',
      'profile',
      'other',
    ];
    const categoryNames: Record<string, string> = {
      points: '积分返还',
      currency: '币种交易',
      game: '游戏奖励',
      recharge: '充值管理',
      meeting: '会议社交',
      ai: '云AI',
      profile: '用户展示',
      other: '其他配置',
    };
    const getCategory = (key: string) => {
      if (
        key === 'daily_deduction_rate' ||
        key === 'weekly_return_multiplier' ||
        key.startsWith('weekly_point_return_')
      ) {
        return 'points';
      }
      if (
        key === SILVER_SYNTHESIS_POINTS_KEY ||
        key === GOLD_EXCHANGE_RATE_KEY ||
        key.startsWith('withdraw_copper_')
      ) {
        return 'currency';
      }
      if (
        key.startsWith('game_copper_') ||
        key.startsWith('direct_game_reward_')
      ) {
        return 'game';
      }
      if (key.startsWith('recharge_')) return 'recharge';
      if (key.startsWith('meeting_') || key === 'data_retention_days')
        return 'meeting';
      if (key.startsWith('ai_')) return 'ai';
      if (key === PROFILE_TOTAL_USER_COUNT_OVERRIDE_KEY) return 'profile';
      return 'other';
    };
    const configs = (await this.configRepo.find()).filter(
      (config) => !config.configKey.startsWith('shop_cag_'),
    );
    return configs
      .map((config) => {
        const category = getCategory(config.configKey);
        return {
          ...config,
          category,
          categoryName: categoryNames[category],
        };
      })
      .sort((a, b) => {
        const categoryDiff =
          categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
        return (
          categoryDiff || a.configName.localeCompare(b.configName, 'zh-CN')
        );
      });
  }

  /** 更新配置 */
  async updateConfig(key: string, value: string) {
    let configValue = value == null ? '' : String(value);
    const positiveIntegerKeys = new Set([
      WITHDRAW_COPPER_GOLD_UNIT_KEY,
      WITHDRAW_COPPER_COST_PER_UNIT_KEY,
      GAME_COPPER_MINUTES_PER_COIN_KEY,
      GAME_COPPER_DAILY_MAX_KEY,
      SILVER_SYNTHESIS_POINTS_KEY,
    ]);
    if (positiveIntegerKeys.has(key)) {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new BadRequestException('该配置只能填写大于0的整数');
      }
    }
    if (key === GOLD_EXCHANGE_RATE_KEY) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new BadRequestException('金币兑换比例必须是大于0的数字');
      }
    }
    if (key === PROFILE_TOTAL_USER_COUNT_OVERRIDE_KEY) {
      configValue = configValue.trim();
      if (configValue && !/^\d+$/.test(configValue)) {
        throw new BadRequestException('总用户数只能留空或填写非负整数');
      }
      const parsed = Number(configValue);
      if (configValue && !Number.isSafeInteger(parsed)) {
        throw new BadRequestException('总用户数超出可支持的整数范围');
      }
    }
    await this.configRepo.update({ configKey: key }, { configValue });
    if (key === SILVER_SYNTHESIS_POINTS_KEY) {
      await this.ensureDefaultSynthesisConfigs();
    }
    return { message: '配置已更新' };
  }

  /** 初始化默认配置（首次启动时） */
  async ensureDefaultConfigs() {
    await this.ensureWeeklyPointReturnTables();
    await this.ensureDirectGameRewardTables();
    await this.ensureDefaultSwitches();
    await this.ensureCurrencyAccountsForExistingUsers();
    await this.ensureDefaultSynthesisConfigs();
    await this.migrateRewardSynthesisToCopper();
    await this.ensureWithdrawalCopperColumns();
    await this.ensureGameDurationCopperTables();
    await this.ensureGoldModuleTables();
    await this.migrateLegacyMatrixWithdrawableToGold();
    const defaults = [
      {
        configKey: 'daily_deduction_rate',
        configName: '每日积分扣除比例',
        configValue: '0.01',
        description: '每天扣除用户积分的百分比，0.01表示1%',
      },
      {
        configKey: 'weekly_return_multiplier',
        configName: '每周返还倍率',
        configValue: '1.5',
        description: '旧版每周返还逻辑使用的倍率，与新的积分返还功能无关',
      },
      {
        configKey: WEEKLY_POINT_RETURN_MULTIPLIER_KEY,
        configName: '积分返还倍率',
        configValue: '1.5',
        description: '新的积分返还功能独立倍率：剩余返还基数×该倍率×每日比例',
      },
      {
        configKey: WEEKLY_POINT_RETURN_DAILY_RATE_KEY,
        configName: '积分返还每日比例',
        configValue: '0.01',
        description: '每周积分返还每天使用的比例，0.01表示1%',
      },
      {
        configKey: WEEKLY_POINT_RETURN_STARTED_AT_KEY,
        configName: '积分返还开始时间',
        configValue: this.formatLocalDateTime(new Date()),
        description:
          '功能首次初始化时间；只结算结束时间不早于该时间的消费周，避免上线时追溯发放历史周',
      },
      {
        configKey: DIRECT_GAME_REWARD_RATE_KEY,
        configName: '直推流水奖励比例',
        configValue: String(DIRECT_GAME_REWARD_DEFAULT_RATE),
        description:
          '下级有效游戏流水给符合条件上级的普通积分收益比例，0.0015表示千分之1.5',
      },
      {
        configKey: WITHDRAW_COPPER_GOLD_UNIT_KEY,
        configName: '提现金币单位',
        configValue: '100',
        description:
          '提现金币与铜币消耗比例的金币单位，例如100表示每100金币计算一次铜币消耗',
      },
      {
        configKey: WITHDRAW_COPPER_COST_PER_UNIT_KEY,
        configName: '每单位提现消耗铜币',
        configValue: '1',
        description:
          '提现每个金币单位需要消耗的铜币数量，例如100:1填1，100:2填2',
      },
      {
        configKey: GAME_COPPER_MINUTES_PER_COIN_KEY,
        configName: '游戏时长铜币分钟数',
        configValue: '15',
        description: '用户当天所有游戏时长累计每满多少分钟获得1个铜币',
      },
      {
        configKey: GAME_COPPER_DAILY_MAX_KEY,
        configName: '游戏时长每日铜币上限',
        configValue: '2',
        description: '用户每天最多可通过游戏时长获得的铜币数量',
      },
      {
        configKey: GOLD_EXCHANGE_RATE_KEY,
        configName: '金币兑换现金比例',
        configValue: '1',
        description: '1金币可兑换多少元，默认1，可填0.9或1.1',
      },
      {
        configKey: SILVER_SYNTHESIS_POINTS_KEY,
        configName: '银币合成积分比例',
        configValue: String(SILVER_SYNTHESIS_POINTS_DEFAULT),
        description: '所有账户合成1个银币需要消耗的积分数量，默认5000积分',
      },
      {
        configKey: PROFILE_TOTAL_USER_COUNT_OVERRIDE_KEY,
        configName: 'APP总用户数展示值',
        configValue: '',
        description:
          '留空时显示当前真实注册用户数；填写非负整数后，APP“我的”页面显示该手动数值',
      },
      {
        configKey: 'meeting_start_cost',
        configName: '普通成员发起会议消耗',
        configValue: '10000',
        description: '普通群成员发起群会议需要扣除的积分，群主和管理员免费',
      },
      {
        configKey: 'data_retention_days',
        configName: '聊天/会议数据保留天数',
        configValue: '7',
        description: '后台清理聊天记录和已结束会议时使用的保留天数',
      },
      {
        configKey: 'meeting_media_mode',
        configName: '会议媒体模式',
        configValue: 'p2p',
        description: 'p2p、trtc 或 sfu；腾讯云 TRTC 接入稳定后可切换为 trtc',
      },
      {
        configKey: 'meeting_sfu_endpoint',
        configName: '会议SFU地址',
        configValue: '',
        description:
          'mediasoup/Janus 信令或控制服务地址，未配置时客户端继续使用 P2P',
      },
      {
        configKey: 'meeting_turn_urls',
        configName: '会议TURN地址',
        configValue: '',
        description: 'TURN/STUN 地址，多个地址用英文逗号或换行分隔',
      },
      {
        configKey: 'meeting_turn_username',
        configName: '会议TURN用户名',
        configValue: '',
        description: 'TURN 服务用户名',
      },
      {
        configKey: 'meeting_turn_credential',
        configName: '会议TURN密码',
        configValue: '',
        description: 'TURN 服务密码或凭据',
      },
      {
        configKey: 'meeting_recording_enabled',
        configName: '会议录制开关',
        configValue: 'false',
        description: '是否启用服务端录制能力',
      },
      {
        configKey: 'meeting_recording_auto',
        configName: '会议自动录制',
        configValue: 'false',
        description: '启用录制后是否自动开始录制',
      },
      {
        configKey: 'ai_api_key',
        configName: '云AI API Key',
        configValue: '',
        description: '云AI服务密钥，例如 SiliconFlow / DeepSeek 的 API Key',
      },
      {
        configKey: 'ai_base_url',
        configName: '云AI接口地址',
        configValue: 'https://api.siliconflow.cn/v1',
        description: '兼容 OpenAI Chat Completions 的接口地址',
      },
      {
        configKey: 'ai_model',
        configName: '云AI模型',
        configValue: 'deepseek-ai/DeepSeek-V3',
        description: '云AI使用的模型名称',
      },
      {
        configKey: 'recharge_qrcode',
        configName: '充值收款码',
        configValue: '',
        description: '充值页展示的收款二维码图片地址（后台上传）',
      },
      {
        configKey: 'recharge_payee_name',
        configName: '充值收款人',
        configValue: '',
        description: '充值页展示的收款人姓名',
      },
      {
        configKey: 'recharge_wallet_address',
        configName: '充值钱包地址',
        configValue: '',
        description: '充值页可切换的钱包收款地址',
      },
      {
        configKey: 'recharge_notice',
        configName: '充值说明',
        configValue:
          '请选择收款方式完成付款，再填写姓名和手机号提交，管理员核实后发放2000积分。',
        description: '充值页展示的操作说明',
      },
      {
        configKey: 'recharge_packages',
        configName: '充值套餐',
        configValue: '50',
        description: '当前充值档位（用户端固定为50元）',
      },
    ];
    for (const d of defaults) {
      const exists = await this.configRepo.findOne({
        where: { configKey: d.configKey },
      });
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
        await this.changeCurrency(
          c.userId,
          'points',
          -deductAmount,
          'daily_deduction',
          `每日积分扣除(${(rate * 100).toFixed(2)}%)`,
          mgr,
        );

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
    const excludedPlaceholders = WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES.map(
      () => '?',
    ).join(', ');
    const alwaysEligiblePlaceholders =
      WEEKLY_POINT_RETURN_ALWAYS_ELIGIBLE_LOG_TYPES.map(() => '?').join(', ');
    return this.dataSource.query(
      `SELECT
         user_id AS userId,
         ROUND(SUM(CASE
           WHEN log_type IN (${excludedPlaceholders})
             AND log_type NOT IN (${alwaysEligiblePlaceholders}) THEN ABS(amount)
           ELSE 0
         END), 6) AS excludedConsumed,
         ROUND(SUM(CASE
           WHEN log_type IN (${alwaysEligiblePlaceholders})
             OR log_type NOT IN (${excludedPlaceholders}) THEN ABS(amount)
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
        ...WEEKLY_POINT_RETURN_ALWAYS_ELIGIBLE_LOG_TYPES,
        ...WEEKLY_POINT_RETURN_ALWAYS_ELIGIBLE_LOG_TYPES,
        ...WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES,
        this.formatLocalDateTime(startAt),
        this.formatLocalDateTime(endAt),
      ],
    );
  }

  /** 统计刚结束的一周消费，并按用户创建独立返还账户。 */
  async setupWeeklyPointReturnPeriod(
    now = new Date(),
    options: {
      allowBeforeFeatureStart?: boolean;
      forceWeekStartAt?: Date;
    } = {},
  ) {
    await this.ensureWeeklyPointReturnTables();
    if (!(await this.isWeeklyPointReturnEnabled())) {
      return { created: false, periodId: 0, reason: 'switch_disabled' };
    }

    const multiplierStr = await this.getConfigValue(
      WEEKLY_POINT_RETURN_MULTIPLIER_KEY,
      '1.5',
    );
    const dailyRateStr = await this.getConfigValue(
      WEEKLY_POINT_RETURN_DAILY_RATE_KEY,
      '0.01',
    );
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
    if (
      !options.allowBeforeFeatureStart &&
      startedAt &&
      week.weekEndAt.getTime() < startedAt.getTime()
    ) {
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

  private projectWeeklyPointReturn(
    basePoints: number,
    paidDays: number,
    multiplier: number,
    dailyRate: number,
  ) {
    let base = this.roundPoints(Math.max(0, basePoints));
    let total = 0;
    const records: Array<{
      dayIndex: number;
      baseBeforeReturn: number;
      returnAmount: number;
      baseAfterReturn: number;
    }> = [];
    const safeDays = Math.max(0, Math.min(7, Math.floor(paidDays)));
    for (let dayIndex = 1; dayIndex <= safeDays; dayIndex += 1) {
      const baseBeforeReturn = base;
      const returnAmount = this.roundPoints(
        baseBeforeReturn * multiplier * dailyRate,
      );
      const baseAfterReturn = this.roundPoints(
        Math.max(0, baseBeforeReturn - returnAmount),
      );
      records.push({
        dayIndex,
        baseBeforeReturn,
        returnAmount,
        baseAfterReturn,
      });
      total = this.roundPoints(total + returnAmount);
      base = baseAfterReturn;
    }
    return { total, remainingBase: base, records };
  }

  async reconcileWeeklyPointReturnExclusions(
    options: { dryRun?: boolean } = {},
  ) {
    await this.ensureWeeklyPointReturnTables();
    const dryRun = options.dryRun !== false;
    const placeholders = WEEKLY_POINT_RETURN_EXCLUSION_CORRECTION_TYPES.map(
      () => '?',
    ).join(', ');
    const accounts = await this.dataSource.query(
      `SELECT
         a.id AS accountId,
         a.period_id AS periodId,
         a.user_id AS userId,
         a.eligible_consumed_points AS eligiblePoints,
         a.excluded_consumed_points AS excludedPoints,
         a.total_returned_points AS returnedPoints,
         a.paid_days AS paidDays,
         a.multiplier,
         a.daily_rate AS dailyRate,
         a.status,
         p.week_start_at AS weekStartAt,
         p.week_end_at AS weekEndAt,
         p.excluded_log_types AS excludedLogTypes,
         u.account,
         u.nickname,
         c.points AS currentPoints
       FROM weekly_point_return_accounts a
       INNER JOIN weekly_point_return_periods p ON p.id = a.period_id
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN user_currencies c ON c.user_id = a.user_id
       LEFT JOIN weekly_point_return_exclusion_corrections x ON x.account_id = a.id
       WHERE x.id IS NULL
       ORDER BY p.week_start_date ASC, a.id ASC`,
    );
    const sourceRows = await this.dataSource.query(
      `SELECT a.id AS accountId, l.log_type AS logType,
              ROUND(SUM(ABS(l.amount)), 6) AS consumedPoints
       FROM weekly_point_return_accounts a
       INNER JOIN weekly_point_return_periods p ON p.id = a.period_id
       INNER JOIN currency_logs l
         ON l.user_id = a.user_id
        AND l.currency_type = 'points'
        AND l.amount < 0
        AND l.created_at >= p.week_start_at
        AND l.created_at <= p.week_end_at
       LEFT JOIN weekly_point_return_exclusion_corrections x ON x.account_id = a.id
       WHERE x.id IS NULL
         AND l.log_type IN (${placeholders})
       GROUP BY a.id, l.log_type`,
      WEEKLY_POINT_RETURN_EXCLUSION_CORRECTION_TYPES,
    );
    const sourceMap = new Map<number, Map<string, number>>();
    for (const row of sourceRows) {
      const accountId = Number(row.accountId);
      const values = sourceMap.get(accountId) || new Map<string, number>();
      values.set(
        String(row.logType),
        this.roundPoints(this.toFiniteNumber(row.consumedPoints)),
      );
      sourceMap.set(accountId, values);
    }

    const candidates = accounts
      .map((row: any) => {
        const snapshot = new Set(
          String(row.excludedLogTypes || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        );
        const missingTypes = WEEKLY_POINT_RETURN_EXCLUSION_CORRECTION_TYPES.filter(
          (type) => !snapshot.has(type),
        );
        const sourceValues = sourceMap.get(Number(row.accountId));
        const detectedPoints = this.roundPoints(
          missingTypes.reduce(
            (sum, type) => sum + (sourceValues?.get(type) || 0),
            0,
          ),
        );
        const eligibleBefore = this.roundPoints(
          Math.max(0, this.toFiniteNumber(row.eligiblePoints)),
        );
        const movedToExcluded = this.roundPoints(
          Math.min(eligibleBefore, detectedPoints),
        );
        if (movedToExcluded <= 0) return null;
        const eligibleAfter = this.roundPoints(
          Math.max(0, eligibleBefore - movedToExcluded),
        );
        const paidDays = Math.max(
          0,
          Math.min(7, Number(row.paidDays || 0)),
        );
        const projection = this.projectWeeklyPointReturn(
          eligibleAfter,
          paidDays,
          this.toFiniteNumber(row.multiplier),
          this.toFiniteNumber(row.dailyRate),
        );
        const returnedBefore = this.roundPoints(
          Math.max(0, this.toFiniteNumber(row.returnedPoints)),
        );
        const recoverPoints = this.roundPoints(
          Math.max(0, returnedBefore - projection.total),
        );
        const currentPoints = this.roundPoints(
          this.toFiniteNumber(row.currentPoints),
        );
        return {
          ...row,
          accountId: Number(row.accountId),
          periodId: Number(row.periodId),
          userId: Number(row.userId),
          missingTypes,
          movedToExcluded,
          eligibleBefore,
          eligibleAfter,
          returnedBefore,
          returnedAfter: projection.total,
          recoverPoints,
          currentPoints,
          sufficientBalance: currentPoints >= recoverPoints,
        };
      })
      .filter(Boolean) as any[];

    const remainingBalanceByUser = new Map<number, number>();
    for (const candidate of candidates) {
      const available = remainingBalanceByUser.has(candidate.userId)
        ? Number(remainingBalanceByUser.get(candidate.userId))
        : candidate.currentPoints;
      candidate.sufficientBalance = available >= candidate.recoverPoints;
      if (candidate.sufficientBalance) {
        remainingBalanceByUser.set(
          candidate.userId,
          this.roundPoints(available - candidate.recoverPoints),
        );
      }
    }

    const preview = {
      dryRun,
      candidateAccounts: candidates.length,
      affectedUsers: new Set(candidates.map((item) => item.userId)).size,
      movedToExcludedPoints: this.roundPoints(
        candidates.reduce((sum, item) => sum + item.movedToExcluded, 0),
      ),
      recoverPoints: this.roundPoints(
        candidates.reduce((sum, item) => sum + item.recoverPoints, 0),
      ),
      insufficientAccounts: candidates.filter(
        (item) => !item.sufficientBalance,
      ).length,
      details: candidates.map((item) => ({
        accountId: item.accountId,
        periodId: item.periodId,
        userId: item.userId,
        account: item.account || '',
        nickname: item.nickname || '',
        movedToExcludedPoints: item.movedToExcluded,
        eligiblePointsBefore: item.eligibleBefore,
        eligiblePointsAfter: item.eligibleAfter,
        returnedPointsBefore: item.returnedBefore,
        returnedPointsAfter: item.returnedAfter,
        recoverPoints: item.recoverPoints,
        currentPoints: item.currentPoints,
        sufficientBalance: item.sufficientBalance,
      })),
    };
    if (dryRun || candidates.length === 0) return preview;

    let correctedAccounts = 0;
    let recoveredPoints = 0;
    const insufficient: any[] = [];
    const affectedPeriodIds = new Set<number>();
    for (const candidate of candidates) {
      if (!candidate.sufficientBalance) {
        insufficient.push({
          accountId: candidate.accountId,
          userId: candidate.userId,
          account: candidate.account || '',
          requiredPoints: candidate.recoverPoints,
          currentPoints: candidate.currentPoints,
        });
        continue;
      }
      const result = await this.dataSource.transaction(async (mgr) => {
        const existing = await mgr.query(
          `SELECT id FROM weekly_point_return_exclusion_corrections
           WHERE account_id = ? LIMIT 1`,
          [candidate.accountId],
        );
        if (existing.length > 0) return null;
        const lockedRows = await mgr.query(
          `SELECT a.id AS accountId, a.period_id AS periodId,
                  a.user_id AS userId,
                  a.eligible_consumed_points AS eligiblePoints,
                  a.excluded_consumed_points AS excludedPoints,
                  a.total_returned_points AS returnedPoints,
                  a.paid_days AS paidDays, a.multiplier,
                  a.daily_rate AS dailyRate, a.status,
                  c.points AS currentPoints
           FROM weekly_point_return_accounts a
           INNER JOIN user_currencies c ON c.user_id = a.user_id
           WHERE a.id = ? FOR UPDATE`,
          [candidate.accountId],
        );
        const locked = lockedRows[0];
        if (!locked) return null;
        const eligibleBefore = this.roundPoints(
          Math.max(0, this.toFiniteNumber(locked.eligiblePoints)),
        );
        const movedToExcluded = this.roundPoints(
          Math.min(eligibleBefore, candidate.movedToExcluded),
        );
        const eligibleAfter = this.roundPoints(
          Math.max(0, eligibleBefore - movedToExcluded),
        );
        const paidDays = Math.max(
          0,
          Math.min(7, Number(locked.paidDays || 0)),
        );
        const projection = this.projectWeeklyPointReturn(
          eligibleAfter,
          paidDays,
          this.toFiniteNumber(locked.multiplier),
          this.toFiniteNumber(locked.dailyRate),
        );
        const returnedBefore = this.roundPoints(
          Math.max(0, this.toFiniteNumber(locked.returnedPoints)),
        );
        const recoverPoints = this.roundPoints(
          Math.max(0, returnedBefore - projection.total),
        );
        const currentPoints = this.roundPoints(
          this.toFiniteNumber(locked.currentPoints),
        );
        if (currentPoints < recoverPoints) {
          return {
            insufficient: true,
            requiredPoints: recoverPoints,
            currentPoints,
          };
        }
        let currencyLogId: number | null = null;
        if (recoverPoints > 0) {
          const changed = await this.changeCurrency(
            Number(locked.userId),
            'points',
            -recoverPoints,
            'weekly_point_return_correction',
            '积分返还排除商城兑换及银币合成消费历史修正',
            mgr,
          );
          currencyLogId = changed.logId;
        }
        const excludedAfter = this.roundPoints(
          Math.max(0, this.toFiniteNumber(locked.excludedPoints)) +
            movedToExcluded,
        );
        const status =
          eligibleAfter <= 0 ? 2 : paidDays >= 7 ? 1 : 0;
        await mgr.query(
          `UPDATE weekly_point_return_accounts
           SET eligible_consumed_points = ?, excluded_consumed_points = ?,
               remaining_base_points = ?, total_returned_points = ?,
               status = ?, updated_at = NOW()
           WHERE id = ?`,
          [
            eligibleAfter,
            excludedAfter,
            projection.remainingBase,
            projection.total,
            status,
            candidate.accountId,
          ],
        );
        for (const record of projection.records) {
          await mgr.query(
            `UPDATE weekly_point_return_daily_records
             SET base_before_return = ?, adjusted_return_amount = ?,
                 base_after_return = ?, updated_at = NOW()
             WHERE account_id = ? AND day_index = ?`,
            [
              record.baseBeforeReturn,
              record.returnAmount,
              record.baseAfterReturn,
              candidate.accountId,
              record.dayIndex,
            ],
          );
        }
        await mgr.query(
          `INSERT INTO weekly_point_return_exclusion_corrections
            (period_id, account_id, user_id, moved_to_excluded_points,
             eligible_points_before, eligible_points_after,
             returned_points_before, returned_points_after, recovered_points,
             currency_log_id, correction_log_types)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            Number(locked.periodId),
            candidate.accountId,
            Number(locked.userId),
            movedToExcluded,
            eligibleBefore,
            eligibleAfter,
            returnedBefore,
            projection.total,
            recoverPoints,
            currencyLogId,
            candidate.missingTypes.join(','),
          ],
        );
        return {
          insufficient: false,
          periodId: Number(locked.periodId),
          recoveredPoints: recoverPoints,
        };
      });
      if (!result) continue;
      if (result.insufficient) {
        insufficient.push({
          accountId: candidate.accountId,
          userId: candidate.userId,
          account: candidate.account || '',
          requiredPoints: result.requiredPoints,
          currentPoints: result.currentPoints,
        });
        continue;
      }
      correctedAccounts += 1;
      recoveredPoints = this.roundPoints(
        recoveredPoints + this.toFiniteNumber(result.recoveredPoints),
      );
      affectedPeriodIds.add(Number(result.periodId));
    }
    for (const periodId of affectedPeriodIds) {
      const pendingRows = await this.dataSource.query(
        `SELECT COUNT(*) AS total FROM weekly_point_return_accounts
         WHERE period_id = ? AND status = 0`,
        [periodId],
      );
      await this.dataSource.query(
        `UPDATE weekly_point_return_periods
         SET status = ?, updated_at = NOW() WHERE id = ?`,
        [Number(pendingRows[0]?.total || 0) > 0 ? 0 : 1, periodId],
      );
    }
    return {
      ...preview,
      dryRun: false,
      correctedAccounts,
      recoveredPoints,
      insufficientAccounts: insufficient.length,
      insufficient,
    };
  }

  private isLotteryGameForBackfill(gameName: any, gameUrl: any, result: any) {
    const text =
      `${gameName || ''} ${gameUrl || ''} ${result || ''}`.toLowerCase();
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
    if (this.isLotteryGameForBackfill(gameName, gameUrl, resultValue))
      return null;

    const result = String(resultValue || '').toLowerCase();
    const xiangqiSource = this.inferXiangqiTurnoverSourceForBackfill(
      result,
      amount,
      gameName,
      gameUrl,
    );
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
    if (excludedKeywords.some((keyword) => result.includes(keyword)))
      return null;

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
    if (
      result.includes('revive') ||
      result.includes('resurrect') ||
      result.includes('复活')
    ) {
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
    const text =
      `${gameName || ''} ${gameUrl || ''} ${normalizedResult || ''}`.toLowerCase();
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
      if (
        normalizedResult.includes('entry') ||
        normalizedResult.includes('入场')
      ) {
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
      if (
        normalizedResult.includes('study') ||
        normalizedResult.includes('canju')
      ) {
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

  async backfillLegacyGameTurnoverRewards(
    options: LegacyRewardBackfillOptions = {},
  ) {
    await this.ensureDirectGameRewardTables();
    await this.ensureCurrencyAccountsForExistingUsers();

    const dryRun = options.dryRun !== false;
    const startedAtText = await this.getConfigValue(
      WEEKLY_POINT_RETURN_STARTED_AT_KEY,
      '',
    );
    const defaultTo = this.parseLocalDateTime(startedAtText) || new Date();
    const fromAt = this.parseBackfillDateTime(options.from, null);
    const toAt =
      this.parseBackfillEndDateTime(options.to, defaultTo) || defaultTo;
    const safeLimit = Math.min(
      20_000,
      Math.max(1, Math.floor(Number(options.limit) || 5000)),
    );
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
        current.minGeneration = Math.min(
          current.minGeneration || Number(entry.generation),
          Number(entry.generation),
        );
        current.maxGeneration = Math.max(
          current.maxGeneration || Number(entry.generation),
          Number(entry.generation),
        );
        current.validDirectCount = Math.max(
          current.validDirectCount || 0,
          Number(entry.validDirectCount || 0),
        );
        current.allowedGeneration = Math.max(
          current.allowedGeneration || 0,
          Number(entry.maxGeneration || 0),
        );
        if (sourceUserId) current.sourceUserIds.add(Number(sourceUserId));
        recipientSummaryMap.set(userId, current);
      }
    };

    for (const row of rows) {
      const parts = [
        {
          suffix: 'spent',
          amount: -Math.abs(this.toFiniteNumber(row.pointsSpent)),
        },
        {
          suffix: 'earned',
          amount: Math.abs(this.toFiniteNumber(row.pointsEarned)),
        },
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
            (sum, entry) =>
              this.roundPoints(sum + this.toFiniteNumber(entry.rewardAmount)),
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
                description:
                  `历史游戏流水回补：${row.gameName || '游戏'} ${row.result || ''}`.slice(
                    0,
                    200,
                  ),
                rewardStatus: 0,
                rewardCount: 0,
                totalRewardAmount: 0,
                createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
              }),
            );

            const reward = await this.issueDirectGameRewardsForTurnover(
              turnover,
              mgr,
            );
            return {
              inserted: true,
              rewardCount: Number(reward.rewardCount || 0),
              rewardAmount: this.toFiniteNumber(reward.rewardAmount),
              rewardEntries: reward.rewardEntries || [],
            };
          });

          if (result.inserted) insertedTurnovers += 1;
          rewardCount += Number(result.rewardCount || 0);
          rewardAmount = this.roundPoints(
            rewardAmount + this.toFiniteNumber(result.rewardAmount),
          );
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
        .sort(
          (a: any, b: any) => Number(b.rewardAmount) - Number(a.rewardAmount),
        ),
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

  async backfillLegacyWeeklyPointReturns(
    options: LegacyRewardBackfillOptions = {},
  ) {
    await this.ensureWeeklyPointReturnTables();
    await this.ensureCurrencyAccountsForExistingUsers();

    const dryRun = options.dryRun !== false;
    const multiplierStr = await this.getConfigValue(
      WEEKLY_POINT_RETURN_MULTIPLIER_KEY,
      '1.5',
    );
    const dailyRateStr = await this.getConfigValue(
      WEEKLY_POINT_RETURN_DAILY_RATE_KEY,
      '0.01',
    );
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
    const firstLogAt = firstLogRows?.[0]?.firstAt
      ? new Date(firstLogRows[0].firstAt)
      : null;
    const fromAt = this.parseBackfillDateTime(options.from, firstLogAt);
    const toAt =
      this.parseBackfillEndDateTime(options.to, new Date()) || new Date();
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
    let blockedReason = '';
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
        (this.startOfLocalDay(payoutNow).getTime() -
          returnStartDate.getTime()) /
          86_400_000,
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
      const eligible = this.roundPoints(
        Math.max(0, this.toFiniteNumber(row.eligibleConsumed)),
      );
      const excluded = this.roundPoints(
        Math.max(0, this.toFiniteNumber(row.excludedConsumed)),
      );
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
      current.eligibleConsumed = this.roundPoints(
        current.eligibleConsumed + eligible,
      );
      current.excludedConsumed = this.roundPoints(
        current.excludedConsumed + excluded,
      );
      current.dueDays += estimated.dueDays;
      current.returnAmount = this.roundPoints(
        current.returnAmount + estimated.returnAmount,
      );
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

      const rows = await this.getWeeklyPointReturnConsumeRows(
        effectiveStartAt,
        sunday,
      );
      for (const row of rows) {
        addWeeklyUserSummary(
          Number(row.userId),
          weekStartDate,
          weekEndDate,
          row,
        );
      }
      const weekActiveUsers = rows.filter(
        (row: any) => this.toFiniteNumber(row.eligibleConsumed) > 0,
      ).length;
      const weekEligible = rows.reduce(
        (sum: number, row: any) =>
          this.roundPoints(sum + this.toFiniteNumber(row.eligibleConsumed)),
        0,
      );
      const weekExcluded = rows.reduce(
        (sum: number, row: any) =>
          this.roundPoints(sum + this.toFiniteNumber(row.excludedConsumed)),
        0,
      );

      let periodStatus = dryRun ? 'preview' : 'created';
      if (!dryRun) {
        const result = await this.setupWeeklyPointReturnPeriod(sunday, {
          allowBeforeFeatureStart: true,
          forceWeekStartAt: effectiveStartAt,
        });
        if (result.created) {
          createdPeriods += 1;
        } else {
          skippedPeriods += 1;
          periodStatus = result.reason || 'skipped';
          if (!blockedReason && result.reason) blockedReason = result.reason;
        }
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
        status: periodStatus,
      });

      cursorMonday = this.addDays(cursorMonday, 7);
    }

    const payout = dryRun
      ? { paidRecords: 0, paidPoints: 0 }
      : await this.processWeeklyPointReturnPayouts(new Date());
    if (!blockedReason && (payout as any).reason)
      blockedReason = (payout as any).reason;
    const userDetails = await this.withUserDisplayInfo(
      Array.from(weeklyUserSummaryMap.values())
        .map((item: any) => ({
          ...item,
          periods: item.periods || [],
        }))
        .sort(
          (a: any, b: any) => Number(b.returnAmount) - Number(a.returnAmount),
        ),
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
      reason: blockedReason || undefined,
      userDetails,
      periods,
    };
  }

  async backfillLegacyRewardMechanisms(
    options: LegacyRewardBackfillOptions = {},
  ) {
    await this.ensureDefaultConfigs();
    const dryRun = options.dryRun !== false;
    const result: any = { dryRun };

    if (options.game !== false) {
      result.game = await this.backfillLegacyGameTurnoverRewards({
        ...options,
        dryRun,
      });
    }
    if (options.weekly !== false) {
      result.weekly = await this.backfillLegacyWeeklyPointReturns({
        ...options,
        dryRun,
      });
    }

    return result;
  }
}
