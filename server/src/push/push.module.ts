import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushDevice } from '../entities/push-device.entity';
import { UserSetting } from '../entities/user-setting.entity';
import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([PushDevice, UserSetting]),
  ],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
