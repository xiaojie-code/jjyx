import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { AssetAccount } from '../entities/asset-account.entity';
import { AssetRechargeOrder } from '../entities/asset-recharge-order.entity';
import { AssetWithdrawal } from '../entities/asset-withdrawal.entity';
import { AssetInterestRecord } from '../entities/asset-interest-record.entity';
import { AssetReferralRewardRecord } from '../entities/asset-referral-reward-record.entity';
import { NotificationModule } from '../notification/notification.module';
import { AssetController } from './asset.controller';
import { AdminAssetController } from './admin-asset.controller';
import { AssetService } from './asset.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AssetAccount,
      AssetRechargeOrder,
      AssetWithdrawal,
      AssetInterestRecord,
      AssetReferralRewardRecord,
    ]),
    NotificationModule,
  ],
  controllers: [AssetController, AdminAssetController],
  providers: [AssetService],
  exports: [AssetService],
})
export class AssetModule {}
