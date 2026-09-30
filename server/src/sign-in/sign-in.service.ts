import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, Repository } from 'typeorm';
import { SignInRecord } from '../entities/sign-in-record.entity';
import { CurrencyService } from '../currency/currency.service';

type WeekReward = {
  points: number;
  copper: number;
  fullWeekCopper?: number;
};

const WEEKDAY_NAMES = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期天'];

const WEEK_REWARDS: Record<number, WeekReward> = {
  1: { points: 100, copper: 0 },
  2: { points: 150, copper: 0 },
  3: { points: 200, copper: 0 },
  4: { points: 250, copper: 0 },
  5: { points: 300, copper: 0 },
  6: { points: 350, copper: 0 },
  7: { points: 500, copper: 0 },
};

@Injectable()
export class SignInService implements OnModuleInit {
  constructor(
    @InjectRepository(SignInRecord)
    private readonly signInRepo: Repository<SignInRecord>,
    private readonly currencyService: CurrencyService,
  ) {}

  async onModuleInit() {
    await this.ensureSignInTable();
  }

  private async ensureSignInTable(manager?: EntityManager) {
    const mgr = manager || this.signInRepo.manager;
    await mgr.query(`
      CREATE TABLE IF NOT EXISTS user_sign_in_records (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '签到用户ID',
        sign_date DATE NOT NULL COMMENT '签到日期',
        week_day TINYINT NOT NULL COMMENT '1周一 7周日',
        points_reward DECIMAL(18, 6) NOT NULL DEFAULT 0 COMMENT '本次签到发放积分',
        copper_reward DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT '本次签到发放铜币',
        is_full_week_reward TINYINT NOT NULL DEFAULT 0 COMMENT '是否满足周一到周日连续签到奖励',
        points_log_id BIGINT NULL COMMENT '积分流水ID',
        copper_log_id BIGINT NULL COMMENT '铜币流水ID',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_sign_in_date (user_id, sign_date),
        INDEX idx_user_sign_in_user_week (user_id, sign_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户每日签到记录';
    `);
  }

  private pad2(value: number) {
    return String(value).padStart(2, '0');
  }

  private formatLocalDate(date: Date) {
    return `${date.getFullYear()}-${this.pad2(date.getMonth() + 1)}-${this.pad2(date.getDate())}`;
  }

  private startOfLocalDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private getWeekDay(date: Date) {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  }

  private getMondayOfWeek(date: Date) {
    const weekDay = this.getWeekDay(date);
    return this.addDays(this.startOfLocalDay(date), 1 - weekDay);
  }

  private getRewardLabel(points: number, copper: number) {
    const parts: string[] = [];
    if (points > 0) parts.push(`${points}积分`);
    if (copper > 0) parts.push(`${copper}个铜币`);
    return parts.length > 0 ? parts.join(' + ') : '普通奖励';
  }

  private async getWeekRecords(userId: number, today = new Date(), manager?: EntityManager) {
    const weekStart = this.getMondayOfWeek(today);
    const weekEnd = this.addDays(weekStart, 6);
    const mgr = manager || this.signInRepo.manager;
    const records = await mgr.find(SignInRecord, {
      where: {
        userId,
        signDate: Between(this.formatLocalDate(weekStart), this.formatLocalDate(weekEnd)),
      },
      order: { signDate: 'ASC' },
    });
    return { weekStart, weekEnd, records };
  }

  private isFullWeekReadyBeforeSunday(records: SignInRecord[], weekStart: Date) {
    const signedDates = new Set(records.map((item) => String(item.signDate).slice(0, 10)));
    for (let i = 0; i < 6; i += 1) {
      if (!signedDates.has(this.formatLocalDate(this.addDays(weekStart, i)))) {
        return false;
      }
    }
    return true;
  }

  private resolveTodayReward(weekDay: number) {
    const base = WEEK_REWARDS[weekDay];
    if (!base) return { points: 0, copper: 0, fullWeek: false };
    return {
      points: base.points,
      copper: 0,
      fullWeek: false,
    };
  }

  private buildStatus(userId: number, today: Date, records: SignInRecord[]) {
    const todayDate = this.formatLocalDate(today);
    const weekStart = this.getMondayOfWeek(today);
    const weekEnd = this.addDays(weekStart, 6);
    const signedMap = new Map<string, SignInRecord>();
    for (const record of records) {
      signedMap.set(String(record.signDate).slice(0, 10), record);
    }

    const todayWeekDay = this.getWeekDay(today);
    const todayReward = this.resolveTodayReward(todayWeekDay);
    const days = Array.from({ length: 7 }, (_, index) => {
      const weekDay = index + 1;
      const date = this.addDays(weekStart, index);
      const dateText = this.formatLocalDate(date);
      const record = signedMap.get(dateText);
      const isToday = dateText === todayDate;
      const isPast = date.getTime() < this.startOfLocalDay(today).getTime();
      const isFuture = date.getTime() > this.startOfLocalDay(today).getTime();
      const reward = WEEK_REWARDS[weekDay];
      const displayCopper =
        weekDay === 7 && isToday && !record
          ? todayReward.copper
          : weekDay === 7
            ? (reward.fullWeekCopper || 0)
            : reward.copper;
      let status: 'signed' | 'available' | 'missed' | 'future';
      if (record) {
        status = 'signed';
      } else if (isToday) {
        status = 'available';
      } else if (isPast) {
        status = 'missed';
      } else {
        status = 'future';
      }
      return {
        weekDay,
        weekDayName: WEEKDAY_NAMES[index],
        date: dateText,
        isToday,
        isPast,
        isFuture,
        isSigned: Boolean(record),
        canSign: isToday && !record,
        status,
        pointsReward: record ? Number(record.pointsReward) : reward.points,
        copperReward: record ? Number(record.copperReward) : displayCopper,
        requiresFullWeek: weekDay === 7,
        fullWeekReward: record ? Number(record.isFullWeekReward) === 1 : false,
      };
    });

    const signedCount = days.filter((item) => item.isSigned).length;
    const todayRecord = signedMap.get(todayDate);
    return {
      userId,
      weekStartDate: this.formatLocalDate(weekStart),
      weekEndDate: this.formatLocalDate(weekEnd),
      today: todayDate,
      todayWeekDay,
      todayWeekDayName: WEEKDAY_NAMES[todayWeekDay - 1],
      todaySigned: Boolean(todayRecord),
      canSignToday: !todayRecord,
      signedCount,
      fullWeekReady: todayWeekDay === 7 && todayReward.fullWeek,
      todayReward: {
        points: todayRecord ? Number(todayRecord.pointsReward) : todayReward.points,
        copper: todayRecord ? Number(todayRecord.copperReward) : todayReward.copper,
        fullWeek: todayRecord ? Number(todayRecord.isFullWeekReward) === 1 : todayReward.fullWeek,
        label: this.getRewardLabel(
          todayRecord ? Number(todayRecord.pointsReward) : todayReward.points,
          todayRecord ? Number(todayRecord.copperReward) : todayReward.copper,
        ),
      },
      days,
    };
  }

  async getStatus(userId: number) {
    await this.ensureSignInTable();
    const today = new Date();
    const { records } = await this.getWeekRecords(userId, today);
    return this.buildStatus(userId, today, records);
  }

  async claim(userId: number) {
    await this.ensureSignInTable();
    const today = new Date();
    const todayDate = this.formatLocalDate(today);
    return this.signInRepo.manager.transaction(async (manager) => {
      await manager.query(
        `INSERT IGNORE INTO user_currencies (user_id) VALUES (?)`,
        [userId],
      );

      const existing = await manager.findOne(SignInRecord, {
        where: { userId, signDate: todayDate },
      });
      if (existing) {
        throw new BadRequestException('今天已经签到过了');
      }

      const { weekStart, records } = await this.getWeekRecords(userId, today, manager);
      const weekDay = this.getWeekDay(today);
      const reward = this.resolveTodayReward(weekDay);
      const record = await manager.save(
        SignInRecord,
        manager.create(SignInRecord, {
          userId,
          signDate: todayDate,
          weekDay,
          pointsReward: reward.points,
          copperReward: reward.copper,
          isFullWeekReward: reward.fullWeek ? 1 : 0,
          pointsLogId: null,
          copperLogId: null,
        }),
      );

      let pointsLogId: number | null = null;
      let copperLogId: number | null = null;
      const rewardText = this.getRewardLabel(reward.points, reward.copper);
      if (reward.points > 0) {
        const changed = await this.currencyService.changeCurrency(
          userId,
          'points',
          reward.points,
          'daily_sign_in',
          `每日签到奖励：${WEEKDAY_NAMES[weekDay - 1]} ${rewardText}`,
          manager,
        );
        pointsLogId = changed.logId;
      }
      if (reward.copper > 0) {
        const changed = await this.currencyService.changeCurrency(
          userId,
          'copper',
          reward.copper,
          'daily_sign_in',
          `每日签到奖励：${WEEKDAY_NAMES[weekDay - 1]} ${rewardText}`,
          manager,
        );
        copperLogId = changed.logId;
      }

      record.pointsLogId = pointsLogId;
      record.copperLogId = copperLogId;
      await manager.save(SignInRecord, record);

      const refreshedRecords = [...records, record];
      return {
        message: `签到成功，获得${rewardText}`,
        reward: {
          points: reward.points,
          copper: reward.copper,
          fullWeek: reward.fullWeek,
          label: rewardText,
        },
        status: this.buildStatus(userId, today, refreshedRecords),
      };
    }).catch((error) => {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException('今天已经签到过了');
      }
      throw error;
    });
  }
}
