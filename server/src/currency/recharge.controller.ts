import { Controller, Get, Post, Body } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RechargeService } from './recharge.service';

@Controller('recharge')
export class RechargeController {
  constructor(private readonly rechargeService: RechargeService) {}

  /** 获取收款信息（二维码、收款人、说明） */
  @Get('info')
  getInfo() {
    return this.rechargeService.getRechargeInfo();
  }

  /** 提交充值申请 */
  @Post('submit')
  submit(
    @CurrentUser('id') userId: number,
    @Body() data: { realName?: string; phone?: string; amount?: number; packageName?: string },
  ) {
    return this.rechargeService.submitOrder(userId, data);
  }

  /** 我的充值记录 */
  @Get('orders')
  myOrders(@CurrentUser('id') userId: number) {
    return this.rechargeService.myOrders(userId);
  }
}
