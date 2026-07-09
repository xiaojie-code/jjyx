import { Module } from '@nestjs/common';
import { CurrencyModule } from '../currency/currency.module';
import { NotificationModule } from '../notification/notification.module';
import { ShopController } from './shop.controller';
import { AdminShopController } from './admin-shop.controller';
import { ShopService } from './shop.service';

@Module({
  imports: [CurrencyModule, NotificationModule],
  controllers: [ShopController, AdminShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
