import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ServiceNotification } from '../entities/service-notification.entity';
import { User } from '../entities/user.entity';

/** 实时推送回调类型：由 ChatGateway 注入，避免模块循环依赖 */
export type ServiceNotificationPusher = (
  recipientId: number,
  payload: Record<string, any>,
) => void;

@Injectable()
export class ServiceNotificationService implements OnModuleInit {
  private readonly logger = new Logger(ServiceNotificationService.name);
  private pusher: ServiceNotificationPusher | null = null;
  private cachedAdminIds: number[] | null = null;

  constructor(
    @InjectRepository(ServiceNotification)
    private readonly repo: Repository<ServiceNotification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.ensureTable();
  }

  private async ensureTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS service_notifications (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        recipient_id INT NOT NULL,
        type VARCHAR(30) NOT NULL COMMENT '类型：withdrawal/group/recharge 等',
        title VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        from_user_id INT NULL,
        payload_json TEXT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_service_notifications_recipient (recipient_id),
        INDEX idx_service_notifications_recipient_read (recipient_id, is_read),
        INDEX idx_service_notifications_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const alters = [
      `ALTER TABLE service_notifications ADD COLUMN recipient_id INT NOT NULL DEFAULT 0`,
      `ALTER TABLE service_notifications ADD COLUMN type VARCHAR(30) NOT NULL DEFAULT '' COMMENT '类型：withdrawal/group/recharge 等'`,
      `ALTER TABLE service_notifications ADD COLUMN title VARCHAR(100) NOT NULL DEFAULT ''`,
      `ALTER TABLE service_notifications ADD COLUMN content TEXT NULL`,
      `ALTER TABLE service_notifications ADD COLUMN from_user_id INT NULL`,
      `ALTER TABLE service_notifications ADD COLUMN payload_json TEXT NULL`,
      `ALTER TABLE service_notifications ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0`,
      `ALTER TABLE service_notifications ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ];
    for (const sql of alters) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {
        // 字段已存在则忽略
      }
    }

    const indexes = [
      `CREATE INDEX idx_service_notifications_recipient ON service_notifications (recipient_id)`,
      `CREATE INDEX idx_service_notifications_recipient_read ON service_notifications (recipient_id, is_read)`,
      `CREATE INDEX idx_service_notifications_type ON service_notifications (type)`,
    ];
    for (const sql of indexes) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {
        // 索引已存在则忽略
      }
    }
  }

  /** 由 ChatGateway 注册实时推送通道 */
  registerPusher(pusher: ServiceNotificationPusher) {
    this.pusher = pusher;
  }

  /** 获取管理员/运营账号ID（优先 account=admin，同时兼容 user_type=2） */
  private async getAdminRecipientIds(): Promise<number[]> {
    if (this.cachedAdminIds?.length) return this.cachedAdminIds;
    const admins = await this.userRepo
      .createQueryBuilder('u')
      .where('(u.account = :account OR u.user_type = :userType)', {
        account: 'admin',
        userType: 2,
      })
      .andWhere('u.status = :status', { status: 1 })
      .getMany();
    const ids = [
      ...new Set(admins.map((u) => Number(u.id)).filter((id) => id > 0)),
    ];
    if (ids.length > 0) this.cachedAdminIds = ids;
    return ids;
  }

  /** 创建一条发给管理员的服务通知 */
  async notifyAdmin(params: {
    type: string;
    title: string;
    content: string;
    fromUserId?: number;
    payload?: Record<string, any>;
  }) {
    const adminIds = await this.getAdminRecipientIds();
    if (adminIds.length === 0) {
      this.logger.warn('未找到管理员账号(admin)或运营账号，跳过服务通知');
      return;
    }
    return Promise.all(
      adminIds.map((recipientId) =>
        this.notifyUser({ ...params, recipientId }),
      ),
    );
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
