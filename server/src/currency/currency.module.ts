import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCurrency } from '../entities/user-currency.entity';
import { CurrencyLog } from '../entities/currency-log.entity';
import { PointReturn } from '../entities/point-return.entity';
import { PointSynthesis } from '../entities/point-synthesis.entity';
import { Withdrawal } from '../entities/withdrawal.entity';
import { InviteReward } from '../entities/invite-reward.entity';
import { User } from '../entities/user.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { DailyDeduction } from '../entities/daily-deduction.entity';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';
import { CurrencyScheduler } from './currency.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserCurrency,
      CurrencyLog,
      PointReturn,
      PointSynthesis,
      Withdrawal,
      InviteReward,
      User,
      SystemConfig,
      DailyDeduction,
    ]),
  ],
  controllers: [CurrencyController],
  providers: [CurrencyService, CurrencyScheduler],
  exports: [CurrencyService],
})
export class CurrencyModule {}
