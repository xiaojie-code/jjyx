import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  RegisterPushDeviceDto,
  UnregisterPushDeviceDto,
} from './dto/register-push-device.dto';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('device')
  registerDevice(
    @CurrentUser('id') userId: number,
    @Body() dto: RegisterPushDeviceDto,
  ) {
    return this.pushService.registerDevice(userId, dto);
  }

  @Delete('device')
  unregisterDevice(
    @CurrentUser('id') userId: number,
    @Body() dto: UnregisterPushDeviceDto,
  ) {
    return this.pushService.unregisterDevice(userId, dto);
  }

  @Get('status')
  getStatus(@CurrentUser('id') userId: number) {
    return this.pushService.getUserPushStatus(userId);
  }

  @Post('test')
  test(@CurrentUser('id') userId: number) {
    return this.pushService.sendTestPush(userId);
  }
}
