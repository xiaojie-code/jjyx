import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ShopService } from './shop.service';

@Controller('admin/shop')
export class AdminShopController {
  constructor(private readonly shopService: ShopService) {}

  private assertAdmin(user: any) {
    if (Number(user?.userType) !== 2) {
      throw new ForbiddenException('仅运营管理员可修改CAG兑换配置');
    }
  }

  @Get('orders')
  orders(@Query() query: any) {
    return this.shopService.adminList(query);
  }

  @Get('cag-config')
  cagConfig(@CurrentUser() user: any) {
    this.assertAdmin(user);
    return this.shopService.getCagConfig();
  }

  @Put('cag-config')
  updateCagConfig(@CurrentUser() user: any, @Body() data: any) {
    this.assertAdmin(user);
    return this.shopService.updateCagConfig(data);
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
