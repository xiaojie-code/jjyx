import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { join, extname } from 'path';
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
    @Body('quantity') quantity?: number,
  ) {
    return this.currencyService.synthesize(userId, configId, quantity);
  }

  @Get('synthesis-configs')
  async getSynthesisConfigs() {
    return this.currencyService.getSynthesisConfigs();
  }

  @Get('gold/overview')
  async getGoldOverview(@CurrentUser('id') userId: number) {
    return this.currencyService.getGoldOverview(userId);
  }

  @Post('gold/withdraw-transfer')
  async transferGoldToWithdraw(
    @CurrentUser('id') userId: number,
    @Body() data: { quantity: number },
  ) {
    return this.currencyService.transferGoldToWithdraw(userId, data);
  }

  @Get('gold/trades')
  async listGoldTrades(@CurrentUser('id') userId: number) {
    return this.currencyService.listGoldTrades(userId);
  }

  @Get('gold/trades/badge')
  async getGoldTradeBadge(@CurrentUser('id') userId: number) {
    return this.currencyService.getGoldTradeBadge(userId);
  }

  @Post('gold/trades/badge/read')
  async clearGoldTradeBadge(@CurrentUser('id') userId: number) {
    return this.currencyService.clearGoldTradeBadge(userId);
  }

  @Get('gold/trades/:id')
  async getGoldTradeDetail(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.currencyService.getGoldTradeDetail(userId, id);
  }

  @Post('gold/trades')
  async createGoldTrade(
    @CurrentUser('id') userId: number,
    @Body() data: { quantity: number; totalPrice: number; alipayName?: string; alipayQrcode?: string },
  ) {
    return this.currencyService.createGoldTrade(userId, data);
  }

  @Post('gold/trades/:id/cancel')
  async cancelGoldTrade(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.currencyService.cancelGoldTrade(userId, id);
  }

  @Post('gold/trades/:id/confirm-paid')
  async confirmGoldTradePaid(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.currencyService.confirmGoldTradePaid(userId, id);
  }

  @Post('gold/trades/:id/confirm-received')
  async confirmGoldTradeReceived(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.currencyService.confirmGoldTradeReceived(userId, id);
  }

  @Get('copper/overview')
  async getCopperOverview(@CurrentUser('id') userId: number) {
    return this.currencyService.getCopperOverview(userId);
  }

  @Get('copper/trades')
  async listCopperTrades(@CurrentUser('id') userId: number) {
    return this.currencyService.listCopperTrades(userId);
  }

  @Get('copper/trades/badge')
  async getCopperTradeBadge(@CurrentUser('id') userId: number) {
    return this.currencyService.getCopperTradeBadge(userId);
  }

  @Post('copper/trades/badge/read')
  async clearCopperTradeBadge(@CurrentUser('id') userId: number) {
    return this.currencyService.clearCopperTradeBadge(userId);
  }

  @Get('copper/trades/:id')
  async getCopperTradeDetail(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.currencyService.getCopperTradeDetail(userId, id);
  }

  @Post('copper/trades')
  async createCopperTrade(
    @CurrentUser('id') userId: number,
    @Body() data: { quantity: number; totalPrice: number; alipayName?: string; alipayQrcode?: string },
  ) {
    return this.currencyService.createCopperTrade(userId, data);
  }

  @Post('copper/trades/:id/cancel')
  async cancelCopperTrade(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.currencyService.cancelCopperTrade(userId, id);
  }

  @Post('copper/trades/:id/confirm-paid')
  async confirmCopperTradePaid(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.currencyService.confirmCopperTradePaid(userId, id);
  }

  @Post('copper/trades/:id/confirm-received')
  async confirmCopperTradeReceived(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.currencyService.confirmCopperTradeReceived(userId, id);
  }

  @Post('gold/trades/qrcode')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'gold-trade');
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname || '.png') || '.png';
        cb(null, `qrcode-${Date.now()}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  uploadGoldTradeQrcode(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择支付宝收款码图片');
    return { url: `/uploads/gold-trade/${file.filename}` };
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
