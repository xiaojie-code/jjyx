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
    this.logger.log('系统配置初始化完成');
  }

  /** 每天0:00 奖励积分产出 */
  @Cron('0 0 0 * * *')
  async handleDailyReward() {
    this.logger.log('开始执行每日奖励积分产出...');
    await this.currencyService.dailyRewardProduction();
    this.logger.log('每日奖励积分产出完成');
  }

  /** 每天1:00 积分返还 */
  @Cron('0 0 1 * * *')
  async handleDailyReturn() {
    this.logger.log('开始执行每日积分返还...');
    await this.currencyService.dailyPointReturn();
    this.logger.log('每日积分返还完成');
  }

  /** 每天2:00 积分扣除 */
  @Cron('0 0 2 * * *')
  async handleDailyDeduction() {
    this.logger.log('开始执行每日积分扣除...');
    await this.currencyService.dailyPointDeduction();
    this.logger.log('每日积分扣除完成');
  }

  /** 每周一3:00 统计上周扣除并创建返还计划 */
  @Cron('0 0 3 * * 1')
  async handleWeeklyReturn() {
    this.logger.log('开始执行每周返还计划生成...');
    await this.currencyService.weeklyReturnSetup();
    this.logger.log('每周返还计划生成完成');
  }
}
