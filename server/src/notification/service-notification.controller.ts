import { Controller, Get, Put, Param, Query, ParseIntPipe } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ServiceNotificationService } from './service-notification.service';

@Controller('notifications')
export class ServiceNotificationController {
  constructor(private readonly service: ServiceNotificationService) {}

  /** 服务通知列表 */
  @Get()
  list(
    @CurrentUser('id') userId: number,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list(
      userId,
      parseInt(page || '1', 10) || 1,
      parseInt(pageSize || '20', 10) || 20,
    );
  }

  /** 未读数量 */
  @Get('unread-count')
  unreadCount(@CurrentUser('id') userId: number) {
    return this.service.unreadCount(userId);
  }

  /** 全部标记已读 */
  @Put('read-all')
  markAllRead(@CurrentUser('id') userId: number) {
    return this.service.markAllRead(userId);
  }

  /** 标记单条已读 */
  @Put(':id/read')
  markRead(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.markRead(userId, id);
  }
}
