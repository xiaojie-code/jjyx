import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CurrencyService } from './currency.service';

@Injectable()
export class CurrencyScheduler implements OnModuleInit {
  private readonly logger = new Logger(CurrencyScheduler.name);

  constructor(private readonly currencyService: CurrencyService) {}

  /** 启动时初始化默认配置 */
  async onModuleInit() {
    await this.currencyService.ensureDefaultConfigs();
    const pendingRewards = await this.currencyService.processPendingDirectGameRewards(500);
    const pendingReturns = await this.currencyService.dailyPointReturn();
    this.logger.log(
      `系统配置初始化完成，未处理游戏流水奖励补处理: processed=${pendingRewards.processed || 0}, rewards=${pendingRewards.rewardCount || 0}; 每周积分返还启动补处理: records=${pendingReturns.paidRecords || 0}, points=${pendingReturns.paidPoints || 0}`,
    );
  }

  /** 每天0:00 保留兼容调度入口，当前版本不新增铜币 */
  @Cron('0 0 0 * * *')
  async handleDailyReward() {
    this.logger.log('每日铜币产出已停用，保留调度兼容入口');
    await this.currencyService.dailyRewardProduction();
  }

  /** 每天00:00:01 发放当日每周积分返还 */
  @Cron('1 0 0 * * *')
  async handleDailyReturn() {
    this.logger.log('开始执行每周积分返还每日发放...');
    const result = await this.currencyService.dailyPointReturn();
    this.logger.log(
      `每周积分返还每日发放完成: records=${result.paidRecords || 0}, points=${result.paidPoints || 0}`,
    );
  }

  /** 每天2:00 积分扣除 */
  @Cron('0 0 2 * * *')
  async handleDailyDeduction() {
    this.logger.log('开始执行每日积分扣除...');
    await this.currencyService.dailyPointDeduction();
    this.logger.log('每日积分扣除完成');
  }

  /** 每周日23:59:59 统计本周消费并创建下周返还计划 */
  @Cron('59 59 23 * * 0')
  async handleWeeklyReturn() {
    this.logger.log('开始执行每周积分返还结算...');
    const result = await this.currencyService.weeklyReturnSetup();
    this.logger.log(
      `每周积分返还结算完成: created=${result.created}, periodId=${result.periodId || 0}`,
    );
  }
}
