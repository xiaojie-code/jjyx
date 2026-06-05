import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceNotification } from '../entities/service-notification.entity';
import { User } from '../entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { ServiceNotificationService } from './service-notification.service';
import { ServiceNotificationController } from './service-notification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceNotification, User]),
    AuthModule,
  ],
  controllers: [ServiceNotificationController],
  providers: [ServiceNotificationService],
  exports: [ServiceNotificationService],
})
export class NotificationModule {}
