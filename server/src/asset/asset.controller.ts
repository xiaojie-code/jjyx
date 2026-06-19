import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AssetService } from './asset.service';

@Controller('asset')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get('overview')
  getOverview(@CurrentUser('id') userId: number) {
    return this.assetService.getOverview(userId);
  }

  @Post('recharge')
  submitRecharge(@CurrentUser('id') userId: number, @Body() data: any) {
    return this.assetService.submitRecharge(userId, data);
  }

  @Get('recharges')
  myRecharges(@CurrentUser('id') userId: number) {
    return this.assetService.myRechargeOrders(userId);
  }

  @Post('withdraw')
  submitWithdrawal(@CurrentUser('id') userId: number, @Body() data: any) {
    return this.assetService.submitWithdrawal(userId, data);
  }

  @Get('withdrawals')
  myWithdrawals(@CurrentUser('id') userId: number) {
    return this.assetService.myWithdrawals(userId);
  }

  @Get('referral-rewards')
  myReferralRewards(@CurrentUser('id') userId: number) {
    return this.assetService.myReferralRewards(userId);
  }
}
