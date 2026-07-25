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
    await this.backfillPendingAdminNotifications();
    await this.backfillPendingUserProgressNotifications();
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

  private async backfillPendingAdminNotifications() {
    const adminIds = await this.getAdminRecipientIds();
    if (adminIds.length === 0) return;

    for (const recipientId of adminIds) {
      await this.backfillPendingWithdrawals(recipientId);
      await this.backfillPendingGroups(recipientId);
      await this.backfillPendingRecharges(recipientId);
    }
  }

  /** 为升级前已经提交、仍在审核中的业务补齐用户侧进度通知。 */
  private async backfillPendingUserProgressNotifications() {
    const tasks: Array<() => Promise<void>> = [
      async () => {
        const rows = await this.dataSource.query(
          `SELECT id, creator_id, name, created_at
           FROM conversations
           WHERE type = 2 AND status = 0 AND creator_id > 0
           ORDER BY id DESC LIMIT 500`,
        );
        for (const row of rows) {
          await this.insertIfMissing({
            recipientId: Number(row.creator_id),
            type: 'group_progress',
            title: '建群申请处理中',
            content: `你创建群聊「${row.name || '群聊'}」的申请已发送，管理员处理中，请等待。`,
            payload: {
              conversationId: Number(row.id),
              status: 'pending',
            },
            createdAt: row.created_at,
          });
        }
      },
      async () => {
        const rows = await this.dataSource.query(
          `SELECT id, user_id, amount, created_at
           FROM withdrawals
           WHERE status = 0
           ORDER BY id DESC LIMIT 500`,
        );
        for (const row of rows) {
          await this.insertIfMissing({
            recipientId: Number(row.user_id),
            type: 'withdrawal_progress',
            title: '提现申请处理中',
            content: `你的 ${Number(row.amount || 0)} 元提现申请已提交，管理员处理中，请等待。`,
            payload: {
              withdrawalId: Number(row.id),
              status: 'pending',
            },
            createdAt: row.created_at,
          });
        }
      },
      async () => {
        const rows = await this.dataSource.query(
          `SELECT id, user_id, amount, created_at
           FROM asset_withdrawals
           WHERE status = 0
           ORDER BY id DESC LIMIT 500`,
        );
        for (const row of rows) {
          await this.insertIfMissing({
            recipientId: Number(row.user_id),
            type: 'asset_withdrawal_progress',
            title: '资产包提现处理中',
            content: `你的资产包提现 ${Number(row.amount || 0)} 元申请已提交，管理员处理中，请等待。`,
            payload: {
              assetWithdrawalId: Number(row.id),
              status: 'pending',
            },
            createdAt: row.created_at,
          });
        }
      },
      async () => {
        const rows = await this.dataSource.query(
          `SELECT id, user_id, amount, created_at
           FROM recharge_orders
           WHERE status = 0
           ORDER BY id DESC LIMIT 500`,
        );
        for (const row of rows) {
          await this.insertIfMissing({
            recipientId: Number(row.user_id),
            type: 'recharge_progress',
            title: '充值申请处理中',
            content: `你的 ${Number(row.amount || 0)} 元充值申请已提交，管理员处理中，请等待。`,
            payload: { orderId: Number(row.id), status: 'pending' },
            createdAt: row.created_at,
          });
        }
      },
      async () => {
        const rows = await this.dataSource.query(
          `SELECT id, user_id, amount, created_at
           FROM asset_recharge_orders
           WHERE status = 0
           ORDER BY id DESC LIMIT 500`,
        );
        for (const row of rows) {
          await this.insertIfMissing({
            recipientId: Number(row.user_id),
            type: 'asset_recharge_progress',
            title: '资产包充值处理中',
            content: `你的资产包充值 ${Number(row.amount || 0)} 元申请已提交，管理员处理中，请等待。`,
            payload: {
              assetRechargeId: Number(row.id),
              status: 'pending',
            },
            createdAt: row.created_at,
          });
        }
      },
      async () => {
        const rows = await this.dataSource.query(
          `SELECT id, user_id, product_title, quantity, created_at
           FROM shop_orders
           WHERE status = 0
           ORDER BY id DESC LIMIT 500`,
        );
        for (const row of rows) {
          await this.insertIfMissing({
            recipientId: Number(row.user_id),
            type: 'shop_order_progress',
            title: '商城订单处理中',
            content: `你的商城订单「${row.product_title || '商品'} x${Number(row.quantity || 1)}」已提交，管理员处理中，请等待。`,
            payload: {
              shopOrderId: Number(row.id),
              status: 'pending',
            },
            createdAt: row.created_at,
          });
        }
      },
    ];

    for (const task of tasks) {
      try {
        await task();
      } catch (e) {
        // 某个业务表尚未部署时不影响其他通知和主服务启动。
        this.logger.warn(`回填用户业务进度通知失败：${String(e)}`);
      }
    }
  }

  private async insertIfMissing(params: {
    recipientId: number;
    type: string;
    title: string;
    content: string;
    fromUserId?: number | null;
    payload: Record<string, any>;
    createdAt?: string | Date | null;
  }) {
    const payloadJson = JSON.stringify(params.payload);
    const [key, value] = Object.entries(params.payload)[0] ?? [];
    if (key && value !== undefined && value !== null) {
      const existing = await this.dataSource.query(
        `SELECT id FROM service_notifications
         WHERE recipient_id = ? AND type = ? AND payload_json LIKE ?
         LIMIT 1`,
        [params.recipientId, params.type, `%"${key}":${Number(value)}%`],
      );
      if (existing.length > 0) return;
    }

    await this.dataSource.query(
      `INSERT INTO service_notifications
        (recipient_id, type, title, content, from_user_id, payload_json, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        params.recipientId,
        params.type,
        params.title,
        params.content,
        params.fromUserId ? Number(params.fromUserId) : null,
        payloadJson,
        params.createdAt || new Date(),
      ],
    );
  }

  private async backfillPendingWithdrawals(recipientId: number) {
    try {
      const rows = await this.dataSource.query(
        `SELECT w.id, w.user_id, w.amount, w.payment_method, w.account_name, w.created_at,
                u.account AS user_account, u.nickname AS user_nickname
         FROM withdrawals w
         LEFT JOIN users u ON u.id = w.user_id
         WHERE w.status = 0
         ORDER BY w.id DESC
         LIMIT 200`,
      );
      for (const row of rows) {
        const amount = Number(row.amount || 0);
        const actualAmount = amount - Math.floor(amount * 0.2);
        await this.insertIfMissing({
          recipientId,
          type: 'withdrawal',
          title: '新的提现申请',
          content: `${row.account_name || row.user_nickname || row.user_account || `用户${row.user_id}`} 申请提现 ${amount} 元（实际到账 ${actualAmount} 元），收款方式：${row.payment_method}`,
          fromUserId: Number(row.user_id),
          payload: { withdrawalId: Number(row.id), amount, actualAmount },
          createdAt: row.created_at,
        });
      }
    } catch (e) {
      this.logger.warn(`回填提现服务通知失败：${String(e)}`);
    }
  }

  private async backfillPendingGroups(recipientId: number) {
    try {
      const rows = await this.dataSource.query(
        `SELECT c.id, c.name, c.creator_id, c.created_at,
                u.account AS user_account, u.nickname AS user_nickname,
                COUNT(cm.id) AS member_count
         FROM conversations c
         LEFT JOIN users u ON u.id = c.creator_id
         LEFT JOIN conversation_members cm ON cm.conversation_id = c.id
         WHERE c.type = 2 AND c.status = 0
         GROUP BY c.id, c.name, c.creator_id, c.created_at, u.account, u.nickname
         ORDER BY c.id DESC
         LIMIT 200`,
      );
      for (const row of rows) {
        const creatorName =
          row.user_nickname || row.user_account || `用户${row.creator_id}`;
        const groupName = row.name || '群聊';
        const memberCount = Number(row.member_count || 0);
        await this.insertIfMissing({
          recipientId,
          type: 'group',
          title: '新的建群申请',
          content: `${creatorName} 申请创建群聊「${groupName}」，共 ${memberCount} 名成员，等待审核`,
          fromUserId: Number(row.creator_id),
          payload: {
            conversationId: Number(row.id),
            groupName,
            memberCount,
          },
          createdAt: row.created_at,
        });
      }
    } catch (e) {
      this.logger.warn(`回填建群服务通知失败：${String(e)}`);
    }
  }

  private async backfillPendingRecharges(recipientId: number) {
    try {
      const rows = await this.dataSource.query(
        `SELECT r.id, r.user_id, r.real_name, r.phone, r.amount, r.created_at,
                u.account AS user_account, u.nickname AS user_nickname
         FROM recharge_orders r
         LEFT JOIN users u ON u.id = r.user_id
         WHERE r.status = 0
         ORDER BY r.id DESC
         LIMIT 200`,
      );
      for (const row of rows) {
        const amount = row.amount == null ? null : Number(row.amount);
        const accountInfo = row.user_account
          ? `账号 ${row.user_account}`
          : `用户${row.user_id}`;
        await this.insertIfMissing({
          recipientId,
          type: 'recharge',
          title: '新的充值申请',
          content: `${row.real_name}（${accountInfo}）提交充值申请，手机号 ${row.phone}${amount ? `，金额 ${amount} 元` : ''}，请核实收款后发放激活码`,
          fromUserId: Number(row.user_id),
          payload: { orderId: Number(row.id), phone: row.phone, amount },
          createdAt: row.created_at,
        });
      }
    } catch (e) {
      this.logger.warn(`回填充值服务通知失败：${String(e)}`);
    }
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
