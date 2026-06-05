import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceNotification } from '../entities/service-notification.entity';
import { User } from '../entities/user.entity';

/** 实时推送回调类型：由 ChatGateway 注入，避免模块循环依赖 */
export type ServiceNotificationPusher = (
  recipientId: number,
  payload: Record<string, any>,
) => void;

@Injectable()
export class ServiceNotificationService {
  private readonly logger = new Logger(ServiceNotificationService.name);
  private pusher: ServiceNotificationPusher | null = null;
  private cachedAdminId: number | null = null;

  constructor(
    @InjectRepository(ServiceNotification)
    private readonly repo: Repository<ServiceNotification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** 由 ChatGateway 注册实时推送通道 */
  registerPusher(pusher: ServiceNotificationPusher) {
    this.pusher = pusher;
  }

  /** 获取管理员用户ID（account = 'admin'），带缓存 */
  private async getAdminId(): Promise<number | null> {
    if (this.cachedAdminId) return this.cachedAdminId;
    const admin = await this.userRepo.findOne({ where: { account: 'admin' } });
    if (admin) this.cachedAdminId = Number(admin.id);
    return this.cachedAdminId;
  }

  /** 创建一条发给管理员的服务通知 */
  async notifyAdmin(params: {
    type: string;
    title: string;
    content: string;
    fromUserId?: number;
    payload?: Record<string, any>;
  }) {
    const adminId = await this.getAdminId();
    if (!adminId) {
      this.logger.warn('未找到管理员账号(admin)，跳过服务通知');
      return;
    }
    return this.notifyUser({ ...params, recipientId: adminId });
  }

  /** 创建一条服务通知并实时推送 */
  async notifyUser(params: {
    recipientId: number;
    type: string;
    title: string;
    content: string;
    fromUserId?: number;
    payload?: Record<string, any>;
  }) {
    try {
      const entity = this.repo.create({
        recipientId: Number(params.recipientId),
        type: params.type,
        title: params.title,
        content: params.content,
        fromUserId: params.fromUserId ? Number(params.fromUserId) : null,
        payloadJson: params.payload ? JSON.stringify(params.payload) : null,
        isRead: false,
      });
      const saved = await this.repo.save(entity);
      // 实时推送
      if (this.pusher) {
        this.pusher(Number(params.recipientId), {
          id: saved.id,
          type: saved.type,
          title: saved.title,
          content: saved.content,
          createdAt: saved.createdAt,
        });
      }
      return saved;
    } catch (e) {
      this.logger.error('创建服务通知失败', e as any);
      return null;
    }
  }

  /** 获取某用户的服务通知列表（分页） */
  async list(userId: number, page = 1, pageSize = 20) {
    const [list, total] = await this.repo.findAndCount({
      where: { recipientId: Number(userId) },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { list, total, page, pageSize };
  }

  /** 未读数量 */
  async unreadCount(userId: number) {
    const count = await this.repo.count({
      where: { recipientId: Number(userId), isRead: false },
    });
    return { count };
  }

  /** 全部标记已读 */
  async markAllRead(userId: number) {
    await this.repo.update(
      { recipientId: Number(userId), isRead: false },
      { isRead: true },
    );
    return { message: '已全部标记为已读' };
  }

  /** 标记单条已读 */
  async markRead(userId: number, id: number) {
    await this.repo.update(
      { id: Number(id), recipientId: Number(userId) },
      { isRead: true },
    );
    return { message: '已读' };
  }
}
