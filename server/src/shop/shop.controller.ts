import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('catalog')
  catalog() {
    return this.shopService.getCatalog();
  }

  @Get('payment-info')
  paymentInfo() {
    return this.shopService.getPaymentInfo();
  }

  @Get('address')
  address(@CurrentUser('id') userId: number) {
    return this.shopService.getDefaultAddress(userId);
  }

  @Post('orders')
  createOrder(@CurrentUser('id') userId: number, @Body() data: any) {
    return this.shopService.createOrder(userId, data);
  }

  @Get('orders')
  myOrders(@CurrentUser('id') userId: number) {
    return this.shopService.myOrders(userId);
  }
}
