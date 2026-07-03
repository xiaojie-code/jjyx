import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AssetService } from './asset.service';

@Controller('admin/assets')
export class AdminAssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get('stats')
  stats() {
    return this.assetService.adminAssetStats();
  }

  @Get('accounts')
  accounts(@Query() query: any) {
    return this.assetService.adminListAccounts(query);
  }

  @Get('referral-rewards')
  referralRewards(@Query() query: any) {
    return this.assetService.adminListReferralRewards(query);
  }

  @Get('recharges')
  recharges(@Query() query: any) {
    return this.assetService.adminListRecharges(query);
  }

  @Post('recharges/:id/review')
  reviewRecharge(
    @CurrentUser('id') operatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.assetService.adminReviewRecharge(id, operatorId, data);
  }

  @Get('withdrawals')
  withdrawals(@Query() query: any) {
    return this.assetService.adminListWithdrawals(query);
  }

  @Post('withdrawals/:id/review')
  reviewWithdrawal(
    @CurrentUser('id') operatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.assetService.adminReviewWithdrawal(id, operatorId, data);
  }
}
