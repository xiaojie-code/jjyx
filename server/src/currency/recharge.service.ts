import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RechargeOrder } from '../entities/recharge-order.entity';
import { User } from '../entities/user.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { ServiceNotificationService } from '../notification/service-notification.service';

@Injectable()
export class RechargeService implements OnModuleInit {
  constructor(
    @InjectRepository(RechargeOrder)
    private readonly orderRepo: Repository<RechargeOrder>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    private readonly serviceNotificationService: ServiceNotificationService,
  ) {}

  async onModuleInit() {
    await this.ensureTable();
  }

  private async getConfig(key: string, defaultValue = ''): Promise<string> {
    const c = await this.configRepo.findOne({ where: { configKey: key } });
    return c ? c.configValue : defaultValue;
  }

  /** 确保充值订单表结构存在且字段齐全（兼容旧表） */
  private async ensureTable() {
    await this.orderRepo.query(`
      CREATE TABLE IF NOT EXISTS recharge_orders (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        real_name VARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NULL,
        package_name VARCHAR(50) NULL,
        status TINYINT NOT NULL DEFAULT 0 COMMENT '0待核实 1已发码 2已驳回',
        admin_remark VARCHAR(200) NULL,
        operator_id INT NULL,
        handled_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_recharge_user (user_id),
        INDEX idx_recharge_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // 兼容旧表：逐个补列
    const alters = [
      `ALTER TABLE recharge_orders ADD COLUMN amount DECIMAL(10,2) NULL`,
      `ALTER TABLE recharge_orders ADD COLUMN package_name VARCHAR(50) NULL`,
      `ALTER TABLE recharge_orders ADD COLUMN admin_remark VARCHAR(200) NULL`,
      `ALTER TABLE recharge_orders ADD COLUMN operator_id INT NULL`,
      `ALTER TABLE recharge_orders ADD COLUMN handled_at DATETIME NULL`,
    ];
    for (const sql of alters) {
      try {
        await this.orderRepo.query(sql);
      } catch (_) {
        // 列已存在则忽略
      }
    }
  }

  /** App 端：获取收款信息（二维码、收款人、说明、套餐） */
  async getRechargeInfo() {
    const qrcode = await this.getConfig('recharge_qrcode', '');
    const payeeName = await this.getConfig('recharge_payee_name', '');
    const notice = await this.getConfig(
      'recharge_notice',
      '请先扫码付款，再填写姓名和手机号提交，管理员核实后会通过短信发送激活码。',
    );
    const packages = await this.getConfig('recharge_packages', '');
    return { qrcode, payeeName, notice, packages };
  }

  /** App 端：提交充值申请 */
  async submitOrder(
    userId: number,
    data: { realName?: string; phone?: string; amount?: number; packageName?: string },
  ) {
    const realName = String(data.realName || '').trim();
    const phone = String(data.phone || '').trim();
    if (!realName) throw new BadRequestException('请填写姓名');
    if (realName.length > 20) throw new BadRequestException('姓名过长');
    if (!/^1\d{10}$/.test(phone)) {
      throw new BadRequestException('请填写正确的11位手机号');
    }
    const amount =
      data.amount === undefined || data.amount === null
        ? null
        : Number(data.amount);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      throw new BadRequestException('充值金额不合法');
    }

    // 防重复：同一用户存在待核实订单时不允许重复提交
    const pending = await this.orderRepo.findOne({
      where: { userId: Number(userId), status: 0 },
    });
    if (pending) {
      throw new BadRequestException('你有一笔待核实的充值申请，请等待管理员处理');
    }

    const order = this.orderRepo.create({
      userId: Number(userId),
      realName,
      phone,
      amount,
      packageName: String(data.packageName || '').trim() || null,
      status: 0,
    });
    await this.orderRepo.save(order);

    // 给管理员发服务通知
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const accountInfo = user ? `账号 ${user.account}` : `用户${userId}`;
    await this.serviceNotificationService.notifyAdmin({
      type: 'recharge',
      title: '新的充值申请',
      content: `${realName}（${accountInfo}）提交充值申请，手机号 ${phone}${amount ? `，金额 ${amount} 元` : ''}，请核实收款后发放激活码`,
      fromUserId: userId,
      payload: { orderId: order.id, phone, amount },
    });

    return { message: '充值申请已提交，管理员核实后会通过短信发送激活码' };
  }

  /** App 端：我的充值记录 */
  async myOrders(userId: number) {
    const list = await this.orderRepo.find({
      where: { userId: Number(userId) },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return list.map((o) => ({
      id: o.id,
      realName: o.realName,
      phone: o.phone,
      amount: o.amount == null ? null : Number(o.amount),
      packageName: o.packageName,
      status: o.status,
      statusText: o.status === 0 ? '待核实' : o.status === 1 ? '已发码' : '已驳回',
      adminRemark: o.adminRemark,
      createdAt: o.createdAt,
      handledAt: o.handledAt,
    }));
  }

  // ==================== 管理端 ====================

  /** 管理端：充值订单列表（支持状态/关键词筛选） */
  async adminList(query: { status?: string; keyword?: string; page?: string; pageSize?: string }) {
    const page = parseInt(query.page || '1', 10) || 1;
    const pageSize = parseInt(query.pageSize || '20', 10) || 20;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (query.status !== undefined && query.status !== '' && query.status !== null) {
      conditions.push('o.status = ?');
      params.push(Number(query.status));
    }
    if (query.keyword) {
      conditions.push(
        '(o.real_name LIKE ? OR o.phone LIKE ? OR u.account LIKE ? OR u.nickname LIKE ?)',
      );
      const kw = `%${query.keyword}%`;
      params.push(kw, kw, kw, kw);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalRows = await this.orderRepo.query(
      `SELECT COUNT(*) AS cnt
       FROM recharge_orders o
       LEFT JOIN users u ON u.id = o.user_id
       ${where}`,
      params,
    );
    const total = Number(totalRows?.[0]?.cnt || 0);

    const rows = await this.orderRepo.query(
      `SELECT o.id AS id, o.user_id AS userId, o.real_name AS realName, o.phone AS phone,
              o.amount AS amount, o.package_name AS packageName, o.status AS status,
              o.admin_remark AS adminRemark, o.handled_at AS handledAt, o.created_at AS createdAt,
              u.account AS account, u.nickname AS nickname
       FROM recharge_orders o
       LEFT JOIN users u ON u.id = o.user_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );

    return {
      list: rows.map((r: any) => ({
        ...r,
        amount: r.amount == null ? null : Number(r.amount),
        status: Number(r.status),
        statusText:
          Number(r.status) === 0 ? '待核实' : Number(r.status) === 1 ? '已发码' : '已驳回',
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 管理端：核实订单（标记已发码 / 驳回） */
  async adminReview(
    id: number,
    operatorId: number,
    data: { action: 'approve' | 'reject'; remark?: string },
  ) {
    const order = await this.orderRepo.findOne({ where: { id: Number(id) } });
    if (!order) throw new NotFoundException('充值订单不存在');
    if (order.status !== 0) throw new BadRequestException('该订单已处理');

    const status = data.action === 'approve' ? 1 : 2;
    await this.orderRepo.update(id, {
      status,
      adminRemark: String(data.remark || '').trim() || null,
      operatorId: Number(operatorId) || null,
      handledAt: new Date(),
    });

    // 通知用户处理结果
    await this.serviceNotificationService.notifyUser({
      recipientId: order.userId,
      type: 'recharge_result',
      title: data.action === 'approve' ? '充值已处理' : '充值申请被驳回',
      content:
        data.action === 'approve'
          ? `你的充值申请已核实，激活码已通过短信发送至 ${order.phone}，请注意查收。`
          : `你的充值申请未通过：${String(data.remark || '').trim() || '请联系客服'}`,
      payload: { orderId: order.id, status },
    });

    return { message: data.action === 'approve' ? '已标记为已发码' : '已驳回' };
  }

  /** 管理端：统计 */
  async adminStats() {
    const pending = await this.orderRepo.count({ where: { status: 0 } });
    const approved = await this.orderRepo.count({ where: { status: 1 } });
    const rejected = await this.orderRepo.count({ where: { status: 2 } });
    return { pending, approved, rejected };
  }
}
