import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrencyService } from './currency.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('balance')
  async getBalance(@CurrentUser('id') userId: number) {
    return this.currencyService.getBalance(userId);
  }

  @Get('logs')
  async getLogs(
    @CurrentUser('id') userId: number,
    @Query('currencyType') currencyType: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const pagination = new PaginationDto();
    pagination.page = parseInt(page, 10) || 1;
    pagination.pageSize = parseInt(pageSize, 10) || 20;
    return this.currencyService.getLogs(userId, currencyType, pagination);
  }

  @Post('synthesize')
  async synthesize(
    @CurrentUser('id') userId: number,
    @Body('configId') configId: number,
  ) {
    return this.currencyService.synthesize(userId, configId);
  }

  @Get('synthesis-configs')
  async getSynthesisConfigs() {
    return this.currencyService.getSynthesisConfigs();
  }

  @Get('withdraw/security')
  async getWithdrawSecurity(@CurrentUser('id') userId: number) {
    return this.currencyService.getWithdrawSecurity(userId);
  }

  @Post('withdraw/password')
  async setWithdrawPassword(
    @CurrentUser('id') userId: number,
    @Body() data: { phone?: string; password?: string; confirmPassword?: string },
  ) {
    return this.currencyService.setWithdrawPassword(userId, data);
  }

  @Post('withdraw/password/reset')
  async resetWithdrawPassword(
    @CurrentUser('id') userId: number,
    @Body() data: { phone?: string; password?: string; confirmPassword?: string },
  ) {
    return this.currencyService.resetWithdrawPassword(userId, data);
  }

  @Post('withdraw')
  async withdraw(
    @CurrentUser('id') userId: number,
    @Body() data: { amount: number; paymentMethod: string; accountName: string; accountNumber: string; content?: string; withdrawPassword?: string },
  ) {
    return this.currencyService.withdraw(userId, data);
  }

  @Get('withdraw/records')
  async getWithdrawRecords(@CurrentUser('id') userId: number) {
    return this.currencyService.getWithdrawRecords(userId);
  }

  @Get('withdraw/balance')
  async getWithdrawBalance(@CurrentUser('id') userId: number) {
    return this.currencyService.getWithdrawableBalance(userId);
  }
}
