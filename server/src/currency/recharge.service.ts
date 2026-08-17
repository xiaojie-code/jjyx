import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RechargeOrder } from '../entities/recharge-order.entity';
import { User } from '../entities/user.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { Cdk } from '../entities/cdk.entity';
import { CdkType } from '../entities/cdk-type.entity';
import { ServiceNotificationService } from '../notification/service-notification.service';
import { SmsService } from './sms.service';
import { CurrencyService } from './currency.service';

const POINTS_RECHARGE_AMOUNT = 50;
const POINTS_RECHARGE_REWARD = 1500;
const CDK_RECHARGE_AMOUNT_OPTIONS = [500, 2000];
const RECHARGE_AMOUNT_OPTIONS = [
  POINTS_RECHARGE_AMOUNT,
  ...CDK_RECHARGE_AMOUNT_OPTIONS,
];
const CHINA_MOBILE_REGEX = /^1[3-9]\d{9}$/;

@Injectable()
export class RechargeService implements OnModuleInit {
  constructor(
    @InjectRepository(RechargeOrder)
    private readonly orderRepo: Repository<RechargeOrder>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(Cdk)
    private readonly cdkRepo: Repository<Cdk>,
    @InjectRepository(CdkType)
    private readonly cdkTypeRepo: Repository<CdkType>,
    private readonly serviceNotificationService: ServiceNotificationService,
    private readonly smsService: SmsService,
    private readonly currencyService: CurrencyService,
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
      `ALTER TABLE cdk_types ADD COLUMN activation_amount DECIMAL(10,2) NULL COMMENT '激活档位金额：500或2000' AFTER description`,
      `ALTER TABLE cdks ADD COLUMN activation_amount DECIMAL(10,2) NULL COMMENT '激活档位金额快照：500或2000' AFTER items_json`,
    ];
    for (const sql of alters) {
      try {
        await this.orderRepo.query(sql);
      } catch (_) {
        // 列已存在则忽略
      }
    }
  }

  private normalizeRechargeAmount(value: any): number | null {
    const amount = Number(value);
    return RECHARGE_AMOUNT_OPTIONS.includes(amount) ? amount : null;
  }

  private normalizeActivationAmount(value: any): number | null {
    const amount = Number(value);
    return CDK_RECHARGE_AMOUNT_OPTIONS.includes(amount) ? amount : null;
  }

  private isValidMainlandMobile(phone: string): boolean {
    return CHINA_MOBILE_REGEX.test(phone);
  }

  private getDefaultCdkTypeMeta(activationAmount: number) {
    return {
      name: `充值${activationAmount}激活码`,
      description: `充值${activationAmount}元用户专用激活码`,
    };
  }

  private async findOrCreateCdkTypeByAmount(activationAmount: number) {
    const normalized = this.normalizeActivationAmount(activationAmount);
    if (!normalized) throw new BadRequestException('请选择CDK档位：500或2000');

    const existing = await this.cdkTypeRepo.findOne({
      where: { activationAmount: normalized as any },
    });
    if (existing) return existing;

    const meta = this.getDefaultCdkTypeMeta(normalized);
    return this.cdkTypeRepo.save(
      this.cdkTypeRepo.create({
        name: meta.name,
        description: meta.description,
        activationAmount: normalized,
      }),
    );
  }

  private generateCdkCode(): string {
    return uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
  }

  private async createRechargeActivationCdk(
    activationAmount: number,
  ): Promise<Cdk> {
    const normalized = this.normalizeActivationAmount(activationAmount);
    if (!normalized) throw new BadRequestException('请选择CDK档位：500或2000');

    const cdkType = await this.findOrCreateCdkTypeByAmount(normalized);
    for (let i = 0; i < 8; i++) {
      const cdk = this.cdkRepo.create({
        code: this.generateCdkCode(),
        cdkTypeId: cdkType.id,
        itemsJson: [],
        activationAmount: normalized,
        status: 0,
      });
      try {
        return await this.cdkRepo.save(cdk);
      } catch (error) {
        if (i === 7) throw error;
      }
    }
    throw new BadRequestException('激活码生成失败，请稍后重试');
  }

  private inferActivationAmountFromItems(itemsJson: any): number | null {
    if (!Array.isArray(itemsJson)) return null;
    for (const item of itemsJson) {
      const key = String(item?.item || item?.key || '').trim();
      const amount = this.normalizeActivationAmount(
        item?.amount ?? item?.value,
      );
      if (
        amount &&
        [
          'activation_amount',
          'activationAmount',
          'recharge_amount',
          'rechargeAmount',
        ].includes(key)
      ) {
        return amount;
      }
    }
    return null;
  }

  private async resolveCdkActivationAmount(
    code: string,
  ): Promise<number | null> {
    const cdk = await this.cdkRepo.findOne({ where: { code } });
    if (!cdk) return null;
    const directAmount = this.normalizeActivationAmount(cdk.activationAmount);
    if (directAmount) return directAmount;

    const cdkType = await this.cdkTypeRepo.findOne({
      where: { id: cdk.cdkTypeId },
    });
    const typeAmount = this.normalizeActivationAmount(
      cdkType?.activationAmount,
    );
    if (typeAmount) return typeAmount;

    return this.inferActivationAmountFromItems(cdk.itemsJson);
  }

  /** App 端：获取收款信息（二维码、收款人、说明、套餐） */
  async getRechargeInfo() {
    const qrcode = await this.getConfig('recharge_qrcode', '');
    const payeeName = await this.getConfig('recharge_payee_name', '');
    const notice = await this.getConfig(
      'recharge_notice',
      '请先扫码付款，再填写姓名和手机号提交。管理员核实后，50元档发放1500积分，500元和2000元档通过短信发送激活码。',
    );
    const packages = RECHARGE_AMOUNT_OPTIONS.join(',');
    return {
      qrcode,
      payeeName,
      notice,
      packages,
      amountOptions: RECHARGE_AMOUNT_OPTIONS,
    };
  }

  /** App 端：提交充值申请 */
  async submitOrder(
    userId: number,
    data: {
      realName?: string;
      phone?: string;
      amount?: number;
      packageName?: string;
    },
  ) {
    const realName = String(data.realName || '').trim();
    const phone = String(data.phone || '').trim();
    if (!realName) throw new BadRequestException('请填写姓名');
    if (realName.length > 20) throw new BadRequestException('姓名过长');
    if (!this.isValidMainlandMobile(phone)) {
      throw new BadRequestException('请填写正确的11位手机号（需以13-19开头）');
    }
    const amount =
      data.amount === undefined || data.amount === null
        ? null
        : Number(data.amount);
    if (amount === null || !RECHARGE_AMOUNT_OPTIONS.includes(amount)) {
      throw new BadRequestException('请选择充值金额：50、500或2000');
    }

    // 防重复：同一用户存在待核实订单时不允许重复提交
    const pending = await this.orderRepo.findOne({
      where: { userId: Number(userId), status: 0 },
    });
    if (pending) {
      throw new BadRequestException(
        '你有一笔待核实的充值申请，请等待管理员处理',
      );
    }

    const order = this.orderRepo.create({
      userId: Number(userId),
      realName,
      phone,
      amount,
      packageName: `${amount}元档`,
      status: 0,
    });
    await this.orderRepo.save(order);

    // 给管理员发服务通知
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const accountInfo = user ? `账号 ${user.account}` : `用户${userId}`;
    const fulfillmentText =
      amount === POINTS_RECHARGE_AMOUNT
        ? `发放${POINTS_RECHARGE_REWARD}积分`
        : '发放激活码';
    await this.serviceNotificationService.notifyAdmin({
      type: 'recharge',
      title: '新的充值申请',
      content: `${realName}（${accountInfo}）提交充值申请，手机号 ${phone}${amount ? `，金额 ${amount} 元` : ''}，请核实收款后${fulfillmentText}`,
      fromUserId: userId,
      payload: { orderId: order.id, phone, amount },
    });
    await this.serviceNotificationService.notifyUser({
      recipientId: userId,
      type: 'recharge_progress',
      title: '充值申请处理中',
      content: `你的 ${amount} 元充值申请已提交，管理员处理中，请等待。`,
      payload: { orderId: order.id, amount, status: 'pending' },
    });

    return {
      message:
        amount === POINTS_RECHARGE_AMOUNT
          ? `充值申请已提交，管理员核实后将发放${POINTS_RECHARGE_REWARD}积分`
          : '充值申请已提交，管理员核实后会通过短信发送激活码',
    };
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
      statusText:
        o.status === 0
          ? '待核实'
          : o.status === 1
            ? Number(o.amount) === POINTS_RECHARGE_AMOUNT
              ? '已发积分'
              : '已发码'
            : '已驳回',
      adminRemark: o.adminRemark,
      createdAt: o.createdAt,
      handledAt: o.handledAt,
    }));
  }

  // ==================== 管理端 ====================

  /** 管理端：充值订单列表（支持状态/关键词筛选） */
  async adminList(query: {
    status?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
  }) {
    const page = parseInt(query.page || '1', 10) || 1;
    const pageSize = parseInt(query.pageSize || '20', 10) || 20;
    const offset = (page - 1) * pageSize;

    const conditions: string[] = [];
    const params: any[] = [];

    if (
      query.status !== undefined &&
      query.status !== '' &&
      query.status !== null
    ) {
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
    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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
          Number(r.status) === 0
            ? '待核实'
            : Number(r.status) === 1
              ? Number(r.amount) === POINTS_RECHARGE_AMOUNT
                ? '已发积分'
                : '已发码'
              : '已驳回',
      })),
      total,
      page,
      pageSize,
    };
  }

  /** 管理端：核实订单（50元发积分，其他档位标记已发码，或驳回） */
  async adminReview(
    id: number,
    operatorId: number,
    data: { action: 'approve' | 'reject'; remark?: string },
  ) {
    const reviewResult = await this.orderRepo.manager.transaction(
      async (manager) => {
        const order = await manager.findOne(RechargeOrder, {
          where: { id: Number(id) },
          lock: { mode: 'pessimistic_write' },
        });
        if (!order) throw new NotFoundException('充值订单不存在');
        if (order.status !== 0) throw new BadRequestException('该订单已处理');

        const amount = this.normalizeRechargeAmount(order.amount);
        if (!amount) {
          throw new BadRequestException(
            '订单充值金额不合法，请让用户重新选择50、500或2000提交',
          );
        }

        const status = data.action === 'approve' ? 1 : 2;
        let pointsAfter: number | null = null;
        let adminRemark = String(data.remark || '').trim() || null;

        if (
          data.action === 'approve' &&
          amount === POINTS_RECHARGE_AMOUNT
        ) {
          const changed = await this.currencyService.changeCurrency(
            order.userId,
            'points',
            POINTS_RECHARGE_REWARD,
            'recharge_bonus',
            `50元充值审核通过，赠送${POINTS_RECHARGE_REWARD}积分`,
            manager,
          );
          pointsAfter = changed.after;
          adminRemark =
            adminRemark || `已发放${POINTS_RECHARGE_REWARD}积分`;
        }

        await manager.update(RechargeOrder, id, {
          status,
          adminRemark,
          operatorId: Number(operatorId) || null,
          handledAt: new Date(),
        });

        return { order, amount, status, pointsAfter };
      },
    );

    const { order, amount, status, pointsAfter } = reviewResult;
    const isPointsRecharge = amount === POINTS_RECHARGE_AMOUNT;

    // 通知用户处理结果
    await this.serviceNotificationService.notifyUser({
      recipientId: order.userId,
      type: 'recharge_result',
      title: data.action === 'approve' ? '充值已处理' : '充值申请被驳回',
      content:
        data.action === 'approve'
          ? isPointsRecharge
            ? `你的50元充值申请已核实，${POINTS_RECHARGE_REWARD}积分已到账。`
            : `你的充值申请已核实，激活码已通过短信发送至 ${order.phone}，请注意查收。`
          : `你的充值申请未通过：${String(data.remark || '').trim() || '请联系客服'}`,
      payload: {
        orderId: order.id,
        status,
        pointsReward:
          data.action === 'approve' && isPointsRecharge
            ? POINTS_RECHARGE_REWARD
            : undefined,
        pointsAfter,
      },
    });

    return {
      message:
        data.action === 'approve'
          ? isPointsRecharge
            ? `审核通过，已发放${POINTS_RECHARGE_REWARD}积分`
            : '已标记为已发码'
          : '已驳回',
      pointsReward:
        data.action === 'approve' && isPointsRecharge
          ? POINTS_RECHARGE_REWARD
          : undefined,
      pointsAfter,
    };
  }

  /** 管理端：发送激活码短信，发送成功后标记为已发码 */
  async adminSendActivationCode(
    id: number,
    operatorId: number,
    _data: { code?: string },
  ) {
    const order = await this.orderRepo.findOne({ where: { id: Number(id) } });
    if (!order) throw new NotFoundException('充值订单不存在');
    if (order.status !== 0) throw new BadRequestException('该订单已处理');

    const realName = String(order.realName || '').trim();
    const phone = String(order.phone || '').trim();

    if (!realName)
      throw new BadRequestException('付款人姓名为空，不能发送短信');
    if (!this.isValidMainlandMobile(phone)) {
      throw new BadRequestException('手机号格式不正确，需为11位且以13-19开头');
    }
    const orderAmount = this.normalizeRechargeAmount(order.amount);
    if (!orderAmount) {
      throw new BadRequestException(
        '订单充值金额不合法，请让用户重新选择50、500或2000提交',
      );
    }

    // 兼容尚未更新的管理后台：50元档调用旧“发码”接口时也改为发积分。
    if (orderAmount === POINTS_RECHARGE_AMOUNT) {
      return this.adminReview(id, operatorId, { action: 'approve' });
    }

    const cdk = await this.createRechargeActivationCdk(orderAmount);
    try {
      await this.smsService.sendActivationCode({
        mobile: phone,
        code: cdk.code,
        realName,
      });
    } catch (error) {
      await this.cdkRepo.delete(cdk.id).catch(() => undefined);
      throw error;
    }

    await this.orderRepo.update(id, {
      status: 1,
      adminRemark: `激活码：${cdk.code}`,
      operatorId: Number(operatorId) || null,
      handledAt: new Date(),
    });

    await this.serviceNotificationService.notifyUser({
      recipientId: order.userId,
      type: 'recharge_result',
      title: '充值已处理',
      content: `你的充值申请已核实，激活码已通过短信发送至 ${phone}，请注意查收。`,
      payload: {
        orderId: order.id,
        status: 1,
        cdkId: cdk.id,
        activationAmount: orderAmount,
      },
    });

    return {
      message: '激活码短信已发送',
      phone,
      code: cdk.code,
      cdkId: cdk.id,
      activationAmount: orderAmount,
    };
  }

  /** 管理端：统计 */
  async adminStats() {
    const pending = await this.orderRepo.count({ where: { status: 0 } });
    const approved = await this.orderRepo.count({ where: { status: 1 } });
    const rejected = await this.orderRepo.count({ where: { status: 2 } });
    return { pending, approved, rejected };
  }
}
