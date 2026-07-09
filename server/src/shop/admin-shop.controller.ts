import { Body, Controller, Get, Param, ParseIntPipe, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ShopService } from './shop.service';

@Controller('admin/shop')
export class AdminShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('orders')
  orders(@Query() query: any) {
    return this.shopService.adminList(query);
  }

  @Put('orders/:id/review')
  review(
    @CurrentUser('id') operatorId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: any,
  ) {
    return this.shopService.adminReview(id, operatorId, data);
  }
}
