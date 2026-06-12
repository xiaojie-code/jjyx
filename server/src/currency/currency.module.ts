import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCurrency } from '../entities/user-currency.entity';
import { CurrencyLog } from '../entities/currency-log.entity';
import { PointSynthesis } from '../entities/point-synthesis.entity';
import { Withdrawal } from '../entities/withdrawal.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { DailyDeduction } from '../entities/daily-deduction.entity';
import { RechargeOrder } from '../entities/recharge-order.entity';
import { User } from '../entities/user.entity';
import { GameTurnoverRecord } from '../entities/game-turnover-record.entity';
import { DirectGameRewardRecord } from '../entities/direct-game-reward-record.entity';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';
import { CurrencyScheduler } from './currency.scheduler';
import { RechargeController } from './recharge.controller';
import { RechargeService } from './recharge.service';
import { SmsService } from './sms.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserCurrency,
      CurrencyLog,
      PointSynthesis,
      Withdrawal,
      SystemConfig,
      DailyDeduction,
      RechargeOrder,
      User,
      GameTurnoverRecord,
      DirectGameRewardRecord,
    ]),
    NotificationModule,
  ],
  controllers: [CurrencyController, RechargeController],
  providers: [CurrencyService, CurrencyScheduler, RechargeService, SmsService],
  exports: [CurrencyService, RechargeService],
})
export class CurrencyModule {}
