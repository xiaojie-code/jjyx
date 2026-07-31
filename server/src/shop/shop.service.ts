import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CurrencyService } from '../currency/currency.service';
import { ServiceNotificationService } from '../notification/service-notification.service';

type PaymentMethod = 'silver' | 'cash';
type ReviewAction = 'approve' | 'reject';

type CagExchangeConfig = {
  enabled: boolean;
  silverPrice: number;
  startAt: string;
  endAt: string;
  userLimit: number;
  isActive: boolean;
  unavailableReason: string;
};

type ShopProduct = {
  key: string;
  title: string;
  imageName?: string;
  cashPrice?: number | null;
  silverPrice: number;
  silverOnly?: boolean;
  available?: boolean;
};

const DEFAULT_SILVER_PRICE = 1000;
const CAG_CONFIG = {
  enabled: 'shop_cag_exchange_enabled',
  silverPrice: 'shop_cag_silver_price',
  startAt: 'shop_cag_exchange_start_at',
  endAt: 'shop_cag_exchange_end_at',
  userLimit: 'shop_cag_user_limit',
} as const;
const SHOP_PRODUCTS: ShopProduct[] = [
  {
    key: 'cag',
    title: 'CAG',
    imageName: '28c6042b-83b9-423f-89a3-8b5042532853.png',
    cashPrice: null,
    silverPrice: 0,
    silverOnly: true,
    available: false,
  },
  {
    key: 'health-ring',
    title: '云芯智能健康指环',
    imageName: 'd31a7373-c4e4-4a6a-9d09-c50f5c7fcab6.png',
    cashPrice: 925,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'health-watch',
    title: '云芯健康陪伴手表',
    imageName: 'product-health-watch.png',
    cashPrice: 628,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'health-watch-2',
    title: '云芯健康陪伴手表二代',
    imageName: 'product-health-watch-2.jpg',
    cashPrice: 1598,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'ai-glasses',
    title: '云芯ai智能眼镜',
    imageName: '0da22a71-4ed1-42b3-9037-51f839110739.png',
    cashPrice: 728,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'water-dispenser',
    title: '云芯智能饮水机',
    imageName: 'wecom-temp-104741-4729fce3272ce5f72e4c37a95c51e0b4.jpg',
    cashPrice: 3150,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'sweeping-robot',
    title: '云芯扫地机器人 R10',
    imageName: 'wecom-temp-106614-d3636a8da16208935187051b9af7d1b0.jpg',
    cashPrice: 4050,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'ai-companion-robot',
    title: '云芯 AI 伴侣机器人',
    imageName: 'a7246507-baef-40e4-88be-cdc79ccf5700.png',
    cashPrice: 61668,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'water-heater',
    title: '云芯即热式电热水器',
    imageName: 'wecom-temp-81610-3123efb8a6290ed8802926f63a996ab5.jpg',
    cashPrice: 7515,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'range-hood',
    title: '云芯抽油烟机',
    imageName: '3082d493-56e4-445e-8025-24748e08d55a.png',
    cashPrice: 4068,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'dishwasher-dryer',
    title: '云芯洗碗机-带烘干',
    imageName: '31f8b0f3-454e-4b00-9a4e-29b6dd93abdd.png',
    cashPrice: 6299,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'cooking-machine',
    title: '云芯智能炒菜机',
    imageName: 'wecom-temp-102952-7f383878d5d4ae179ab2335d5ebe12a1.jpg',
    cashPrice: 4500,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'air-conditioner',
    title: '云芯空调（上门安装）',
    imageName: '3ec9c07d-3382-4c4a-9944-c9d4f0789b48.jpg',
    cashPrice: 5788,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'three-wheel',
    title: '云芯三轮车',
    imageName: 'slc-composite.png',
    cashPrice: 30000,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'fridge-605l',
    title: '云芯大屏对开门冰箱 605L',
    imageName: 'wecom-temp-118430-281e0c3401f86df1e1c929e80d621e2b.jpg',
    cashPrice: 8089,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
  {
    key: 'tv-100',
    title: '云芯智慧大屏 100 寸',
    imageName: 'wecom-temp-66807-eeaeb548f43a250372d3c78260367bdf.jpg',
    cashPrice: 17098,
    silverPrice: DEFAULT_SILVER_PRICE,
  },
];

@Injectable()
export class ShopService implements OnModuleInit {
  private readonly productMap = new Map(SHOP_PRODUCTS.map((p) => [p.key, p]));

  constructor(
    private readonly dataSource: DataSource,
    private readonly currencyService: CurrencyService,
    private readonly serviceNotificationService: ServiceNotificationService,
  ) {}

  async onModuleInit() {
    await this.ensureTables();
    await this.ensureCagConfigs();
  }

  private async ensureTables() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS shop_addresses (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        receiver_name VARCHAR(50) NOT NULL DEFAULT '',
        receiver_phone VARCHAR(30) NOT NULL DEFAULT '',
        receiver_address VARCHAR(255) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_shop_address_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商城用户默认收货地址';
    `);

    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS shop_orders (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_sn VARCHAR(40) NOT NULL,
        user_id INT NOT NULL,
        product_key VARCHAR(80) NOT NULL,
        product_title VARCHAR(120) NOT NULL,
        product_image VARCHAR(255) NULL,
        payment_method VARCHAR(20) NOT NULL COMMENT 'silver/cash',
        quantity INT NOT NULL DEFAULT 1,
        unit_silver_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_silver_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        unit_cash_price DECIMAL(12,2) NULL,
        total_cash_amount DECIMAL(12,2) NULL,
        receiver_name VARCHAR(50) NOT NULL,
        receiver_phone VARCHAR(30) NOT NULL,
        receiver_address VARCHAR(255) NOT NULL,
        status TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1已确认发货 2已驳回',
        admin_remark VARCHAR(200) NULL,
        logistics_company VARCHAR(80) NULL,
        logistics_no VARCHAR(100) NULL,
        currency_log_id BIGINT NULL,
        refund_currency_log_id BIGINT NULL,
        operator_id INT NULL,
        handled_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_shop_order_sn (order_sn),
        INDEX idx_shop_orders_user (user_id),
        INDEX idx_shop_orders_status (status),
        INDEX idx_shop_orders_payment (payment_method)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商城商品订单';
    `);

    const alters = [
      `ALTER TABLE shop_orders ADD COLUMN product_image VARCHAR(255) NULL`,
      `ALTER TABLE shop_orders ADD COLUMN admin_remark VARCHAR(200) NULL`,
      `ALTER TABLE shop_orders ADD COLUMN refund_currency_log_id BIGINT NULL`,
      `ALTER TABLE shop_orders ADD COLUMN logistics_company VARCHAR(80) NULL`,
      `ALTER TABLE shop_orders ADD COLUMN logistics_no VARCHAR(100) NULL`,
      `ALTER TABLE shop_orders ADD COLUMN operator_id INT NULL`,
      `ALTER TABLE shop_orders ADD COLUMN handled_at DATETIME NULL`,
    ];
    for (const sql of alters) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {}
    }
  }

  private getProduct(key: any) {
    const product = this.productMap.get(String(key || '').trim());
    if (!product) throw new BadRequestException('商品不存在');
    return product;
  }

  private normalizeQuantity(value: any) {
    const quantity = Math.floor(Number(value || 1));
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new BadRequestException('商品数量不正确');
    }
    if (quantity > 99) throw new BadRequestException('单次最多订购99件');
    return quantity;
  }

  private normalizeAddress(data: any) {
    const receiverName = String(data?.receiverName || '').trim();
    const receiverPhone = String(data?.receiverPhone || '').trim();
    const receiverAddress = String(data?.receiverAddress || '').trim();
    if (!receiverName || !receiverPhone || !receiverAddress) {
      throw new BadRequestException('请填写完整收货信息');
    }
    if (receiverName.length > 30)
      throw new BadRequestException('收货人姓名过长');
    if (receiverPhone.length > 20)
      throw new BadRequestException('收货手机号过长');
    if (receiverAddress.length > 200)
      throw new BadRequestException('收货地址过长');
    return { receiverName, receiverPhone, receiverAddress };
  }

  private createOrderSn() {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;
    return `SO${stamp}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;
  }

  private async getConfig(key: string, defaultValue = '') {
    const rows = await this.dataSource.query(
      `SELECT config_value AS value FROM system_configs WHERE config_key = ? LIMIT 1`,
      [key],
    );
    return rows?.[0]?.value ?? defaultValue;
  }

  private async ensureCagConfigs() {
    const defaults = [
      {
        key: CAG_CONFIG.enabled,
        name: 'CAG兑换开关',
        value: 'false',
        description: '开启后，用户可在商城使用银币兑换CAG',
      },
      {
        key: CAG_CONFIG.silverPrice,
        name: 'CAG银币兑换比例',
        value: '1000',
        description: '兑换1个CAG需要消耗的银币数量',
      },
      {
        key: CAG_CONFIG.startAt,
        name: 'CAG兑换开始时间',
        value: '',
        description: '留空表示不限制开始时间',
      },
      {
        key: CAG_CONFIG.endAt,
        name: 'CAG兑换结束时间',
        value: '',
        description: '留空表示不限制结束时间',
      },
      {
        key: CAG_CONFIG.userLimit,
        name: 'CAG单用户兑换上限',
        value: '1',
        description: '单个用户在活动期间最多可兑换的数量，0表示不限制',
      },
    ];
    for (const item of defaults) {
      await this.dataSource.query(
        `INSERT INTO system_configs
          (config_key, config_name, config_value, description, updated_at)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE config_key = VALUES(config_key)`,
        [item.key, item.name, item.value, item.description],
      );
    }
  }

  private parseConfigDate(value: string) {
    if (!value) return null;
    const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private async readCagConfig(): Promise<CagExchangeConfig> {
    const rows = await this.dataSource.query(
      `SELECT config_key AS configKey, config_value AS configValue
       FROM system_configs
       WHERE config_key IN (?, ?, ?, ?, ?)`,
      [
        CAG_CONFIG.enabled,
        CAG_CONFIG.silverPrice,
        CAG_CONFIG.startAt,
        CAG_CONFIG.endAt,
        CAG_CONFIG.userLimit,
      ],
    );
    const values = new Map<string, string>(
      rows.map((row: any) => [String(row.configKey), String(row.configValue ?? '')]),
    );
    const enabled = values.get(CAG_CONFIG.enabled) === 'true';
    const silverPrice = Math.max(
      0,
      Math.floor(Number(values.get(CAG_CONFIG.silverPrice) || 0)),
    );
    const startAt = values.get(CAG_CONFIG.startAt) || '';
    const endAt = values.get(CAG_CONFIG.endAt) || '';
    const userLimit = Math.max(
      0,
      Math.floor(Number(values.get(CAG_CONFIG.userLimit) || 0)),
    );
    const now = Date.now();
    const startTime = this.parseConfigDate(startAt)?.getTime() ?? null;
    const endTime = this.parseConfigDate(endAt)?.getTime() ?? null;
    let unavailableReason = '';
    if (!enabled) unavailableReason = 'CAG兑换当前未开启';
    else if (silverPrice <= 0) unavailableReason = 'CAG银币兑换比例尚未配置';
    else if (startTime != null && now < startTime)
      unavailableReason = 'CAG兑换活动尚未开始';
    else if (endTime != null && now > endTime)
      unavailableReason = 'CAG兑换活动已结束';
    return {
      enabled,
      silverPrice,
      startAt,
      endAt,
      userLimit,
      isActive: unavailableReason === '',
      unavailableReason,
    };
  }

  private getCagPeriodFilter(config: CagExchangeConfig, column = 'created_at') {
    const conditions: string[] = [];
    const params: string[] = [];
    if (config.startAt) {
      conditions.push(`${column} >= ?`);
      params.push(config.startAt);
    }
    if (config.endAt) {
      conditions.push(`${column} <= ?`);
      params.push(config.endAt);
    }
    return {
      sql: conditions.length ? ` AND ${conditions.join(' AND ')}` : '',
      params,
    };
  }

  private async getUserCagExchangedQuantity(
    userId: number,
    config: CagExchangeConfig,
  ) {
    if (!userId) return 0;
    const period = this.getCagPeriodFilter(config);
    const rows = await this.dataSource.query(
      `SELECT COALESCE(SUM(quantity), 0) AS quantity
       FROM shop_orders
       WHERE user_id = ? AND product_key = 'cag' AND status IN (0, 1)
       ${period.sql}`,
      [userId, ...period.params],
    );
    return Number(rows?.[0]?.quantity || 0);
  }

  async getCagConfig() {
    const config = await this.readCagConfig();
    const rows = await this.dataSource.query(
      `SELECT COALESCE(SUM(quantity), 0) AS exchangedQuantity,
              COUNT(DISTINCT user_id) AS exchangedUsers
       FROM shop_orders
       WHERE product_key = 'cag' AND status IN (0, 1)`,
    );
    return {
      ...config,
      exchangedQuantity: Number(rows?.[0]?.exchangedQuantity || 0),
      exchangedUsers: Number(rows?.[0]?.exchangedUsers || 0),
    };
  }

  async updateCagConfig(data: any) {
    const enabled = data?.enabled === true || data?.enabled === 'true';
    const silverPrice = Math.floor(Number(data?.silverPrice));
    const userLimit = Math.floor(Number(data?.userLimit));
    const startAt = String(data?.startAt || '').trim();
    const endAt = String(data?.endAt || '').trim();
    if (!Number.isInteger(silverPrice) || silverPrice <= 0) {
      throw new BadRequestException('CAG银币兑换比例必须是大于0的整数');
    }
    if (!Number.isInteger(userLimit) || userLimit < 0) {
      throw new BadRequestException('单用户兑换上限必须是大于等于0的整数');
    }
    const startDate = this.parseConfigDate(startAt);
    const endDate = this.parseConfigDate(endAt);
    if (startAt && !startDate)
      throw new BadRequestException('CAG兑换开始时间格式不正确');
    if (endAt && !endDate)
      throw new BadRequestException('CAG兑换结束时间格式不正确');
    if (startDate && endDate && endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('CAG兑换结束时间必须晚于开始时间');
    }
    const updates = [
      [CAG_CONFIG.enabled, String(enabled)],
      [CAG_CONFIG.silverPrice, String(silverPrice)],
      [CAG_CONFIG.startAt, startAt],
      [CAG_CONFIG.endAt, endAt],
      [CAG_CONFIG.userLimit, String(userLimit)],
    ];
    await this.dataSource.transaction(async (mgr) => {
      for (const [key, value] of updates) {
        await mgr.query(
          `UPDATE system_configs SET config_value = ?, updated_at = NOW()
           WHERE config_key = ?`,
          [value, key],
        );
      }
    });
    return this.getCagConfig();
  }

  private mapOrder(row: any) {
    const status = Number(row.status || 0);
    const productKey = row.productKey ?? row.product_key;
    return {
      id: Number(row.id),
      orderSn: row.orderSn || row.order_sn,
      userId: Number(row.userId ?? row.user_id),
      userAccount: row.userAccount ?? row.user_account ?? null,
      userNickname: row.userNickname ?? row.user_nickname ?? null,
      productKey,
      productTitle: row.productTitle ?? row.product_title,
      productImage: row.productImage ?? row.product_image,
      paymentMethod: row.paymentMethod ?? row.payment_method,
      quantity: Number(row.quantity || 0),
      unitSilverPrice: Number(
        row.unitSilverPrice ?? row.unit_silver_price ?? 0,
      ),
      totalSilverAmount: Number(
        row.totalSilverAmount ?? row.total_silver_amount ?? 0,
      ),
      unitCashPrice:
        (row.unitCashPrice ?? row.unit_cash_price) == null
          ? null
          : Number(row.unitCashPrice ?? row.unit_cash_price),
      totalCashAmount:
        (row.totalCashAmount ?? row.total_cash_amount) == null
          ? null
          : Number(row.totalCashAmount ?? row.total_cash_amount),
      receiverName: row.receiverName ?? row.receiver_name,
      receiverPhone: row.receiverPhone ?? row.receiver_phone,
      receiverAddress: row.receiverAddress ?? row.receiver_address,
      status,
      statusText:
        status === 0
          ? '待审核'
          : status === 1
            ? productKey === 'cag'
              ? '兑换已确认'
              : '已确认发货'
            : '已驳回',
      adminRemark: row.adminRemark ?? row.admin_remark,
      logisticsCompany: row.logisticsCompany ?? row.logistics_company,
      logisticsNo: row.logisticsNo ?? row.logistics_no,
      currencyLogId: row.currencyLogId ?? row.currency_log_id,
      refundCurrencyLogId:
        row.refundCurrencyLogId ?? row.refund_currency_log_id,
      handledAt: row.handledAt ?? row.handled_at,
      createdAt: row.createdAt ?? row.created_at,
    };
  }

  async getCatalog(userId?: number) {
    const cagConfig = await this.readCagConfig();
    const exchangedQuantity = userId
      ? await this.getUserCagExchangedQuantity(userId, cagConfig)
      : 0;
    const remainingLimit =
      cagConfig.userLimit > 0
        ? Math.max(0, cagConfig.userLimit - exchangedQuantity)
        : null;
    return SHOP_PRODUCTS.map((product) => {
      if (product.key !== 'cag') return product;
      const limitReached = remainingLimit != null && remainingLimit <= 0;
      return {
        ...product,
        silverPrice: cagConfig.silverPrice,
        available: cagConfig.isActive && !limitReached,
        exchangeEnabled: cagConfig.enabled,
        exchangeStartAt: cagConfig.startAt,
        exchangeEndAt: cagConfig.endAt,
        userLimit: cagConfig.userLimit,
        exchangedQuantity,
        remainingLimit,
        unavailableReason: limitReached
          ? '你已达到本次CAG兑换上限'
          : cagConfig.unavailableReason,
      };
    });
  }

  async getPaymentInfo() {
    const qrcode = await this.getConfig('recharge_qrcode', '');
    const payeeName = await this.getConfig('recharge_payee_name', '');
    return { qrcode, payeeName };
  }

  async getDefaultAddress(userId: number) {
    const rows = await this.dataSource.query(
      `SELECT receiver_name AS receiverName,
              receiver_phone AS receiverPhone,
              receiver_address AS receiverAddress
       FROM shop_addresses
       WHERE user_id = ?
       LIMIT 1`,
      [userId],
    );
    return (
      rows?.[0] || { receiverName: '', receiverPhone: '', receiverAddress: '' }
    );
  }

  async createOrder(userId: number, data: any) {
    const baseProduct = this.getProduct(data.productKey);
    const product = { ...baseProduct };
    let cagConfig: CagExchangeConfig | null = null;
    if (product.key === 'cag') {
      cagConfig = await this.readCagConfig();
      if (!cagConfig.isActive) {
        throw new BadRequestException(cagConfig.unavailableReason);
      }
      product.available = true;
      product.silverPrice = cagConfig.silverPrice;
    }
    if (product.available === false) {
      throw new BadRequestException('该商品暂未开放');
    }
    const quantity = this.normalizeQuantity(data.quantity);
    const paymentMethod = String(
      data.paymentMethod || '',
    ).trim() as PaymentMethod;
    if (!['silver', 'cash'].includes(paymentMethod)) {
      throw new BadRequestException('请选择支付方式');
    }
    if (product.silverOnly && paymentMethod !== 'silver') {
      throw new BadRequestException('该商品仅支持银币兑换');
    }
    if (paymentMethod === 'cash' && product.cashPrice == null) {
      throw new BadRequestException('该商品暂不支持现金购买');
    }
    const address =
      product.key === 'cag'
        ? { receiverName: '', receiverPhone: '', receiverAddress: '' }
        : this.normalizeAddress(data);
    const totalSilver = product.silverPrice * quantity;
    const totalCash =
      product.cashPrice == null ? null : product.cashPrice * quantity;
    const orderSn = this.createOrderSn();

    const result = await this.dataSource.transaction(async (mgr) => {
      if (product.key === 'cag') {
        await mgr.query(`SELECT id FROM users WHERE id = ? FOR UPDATE`, [userId]);
        if (cagConfig && cagConfig.userLimit > 0) {
          const period = this.getCagPeriodFilter(cagConfig);
          const rows = await mgr.query(
            `SELECT COALESCE(SUM(quantity), 0) AS quantity
             FROM shop_orders
             WHERE user_id = ? AND product_key = 'cag' AND status IN (0, 1)
             ${period.sql}`,
            [userId, ...period.params],
          );
          const exchanged = Number(rows?.[0]?.quantity || 0);
          if (exchanged + quantity > cagConfig.userLimit) {
            const remaining = Math.max(0, cagConfig.userLimit - exchanged);
            throw new BadRequestException(
              remaining > 0
                ? `本次最多还可兑换${remaining}个CAG`
                : '你已达到本次CAG兑换上限',
            );
          }
        }
      } else {
        await mgr.query(
          `INSERT INTO shop_addresses
            (user_id, receiver_name, receiver_phone, receiver_address, created_at, updated_at)
           VALUES (?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE
            receiver_name = VALUES(receiver_name),
            receiver_phone = VALUES(receiver_phone),
            receiver_address = VALUES(receiver_address),
            updated_at = NOW()`,
          [
            userId,
            address.receiverName,
            address.receiverPhone,
            address.receiverAddress,
          ],
        );
      }

      let currencyLogId: number | null = null;
      if (paymentMethod === 'silver') {
        const changed = await this.currencyService.changeCurrency(
          userId,
          'silver',
          -totalSilver,
          'shop_exchange',
          `商城银币兑换：${product.title} x${quantity}`,
          mgr,
        );
        currencyLogId = changed.logId;
      }

      const insert = await mgr.query(
        `INSERT INTO shop_orders
          (order_sn, user_id, product_key, product_title, product_image,
           payment_method, quantity, unit_silver_price, total_silver_amount,
           unit_cash_price, total_cash_amount, receiver_name, receiver_phone,
           receiver_address, status, currency_log_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())`,
        [
          orderSn,
          userId,
          product.key,
          product.title,
          product.imageName || null,
          paymentMethod,
          quantity,
          product.silverPrice,
          totalSilver,
          product.cashPrice ?? null,
          totalCash,
          address.receiverName,
          address.receiverPhone,
          address.receiverAddress,
          currencyLogId,
        ],
      );
      const id = Number(insert?.insertId ?? insert?.[0]?.insertId ?? 0);
      return { id, orderSn };
    });

    await this.serviceNotificationService.notifyAdmin({
      type: 'shop_order',
      title: '新的商城订单',
      content: `用户${userId}提交${paymentMethod === 'silver' ? '银币兑换' : '现金购买'}订单：${product.title} x${quantity}`,
      fromUserId: userId,
      payload: { shopOrderId: result.id },
    });
    await this.serviceNotificationService.notifyUser({
      recipientId: userId,
      type: 'shop_order_progress',
      title: '商城订单处理中',
      content: `你的商城订单「${product.title} x${quantity}」已提交，管理员处理中，请等待。`,
      payload: {
        shopOrderId: result.id,
        orderSn: result.orderSn,
        status: 'pending',
      },
    });

    return {
      id: result.id,
      orderSn: result.orderSn,
      message: paymentMethod === 'silver' ? '兑换订单已提交' : '购买订单已提交',
    };
  }

  async myOrders(userId: number) {
    const rows = await this.dataSource.query(
      `SELECT * FROM shop_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
    return rows.map((row: any) => this.mapOrder(row));
  }

  async adminList(query: any) {
    const where: string[] = [];
    const params: any[] = [];
    const statusRaw = query.status === undefined ? '' : String(query.status);
    const paymentMethod = String(query.paymentMethod || '').trim();
    const keyword = String(query.keyword || '').trim();
    if (statusRaw !== '') {
      const status = Number(statusRaw);
      if (Number.isFinite(status)) {
        where.push('o.status = ?');
        params.push(status);
      }
    }
    if (paymentMethod) {
      where.push('o.payment_method = ?');
      params.push(paymentMethod);
    }
    if (keyword) {
      const like = `%${keyword}%`;
      const keywordNumber = Number(keyword);
      if (Number.isFinite(keywordNumber) && keywordNumber > 0) {
        where.push(
          '(o.id = ? OR o.user_id = ? OR o.order_sn LIKE ? OR u.account LIKE ? OR u.nickname LIKE ? OR o.product_title LIKE ? OR o.receiver_name LIKE ? OR o.receiver_phone LIKE ?)',
        );
        params.push(
          keywordNumber,
          keywordNumber,
          like,
          like,
          like,
          like,
          like,
          like,
        );
      } else {
        where.push(
          '(o.order_sn LIKE ? OR u.account LIKE ? OR u.nickname LIKE ? OR o.product_title LIKE ? OR o.receiver_name LIKE ? OR o.receiver_phone LIKE ?)',
        );
        params.push(like, like, like, like, like, like);
      }
    }
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(100, Math.max(10, Number(query.pageSize || 20)));
    const offset = (page - 1) * pageSize;
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const list = await this.dataSource.query(
      `SELECT o.*,
              o.order_sn AS orderSn,
              o.product_key AS productKey,
              o.product_title AS productTitle,
              o.product_image AS productImage,
              o.payment_method AS paymentMethod,
              o.unit_silver_price AS unitSilverPrice,
              o.total_silver_amount AS totalSilverAmount,
              o.unit_cash_price AS unitCashPrice,
              o.total_cash_amount AS totalCashAmount,
              o.receiver_name AS receiverName,
              o.receiver_phone AS receiverPhone,
              o.receiver_address AS receiverAddress,
              o.admin_remark AS adminRemark,
              o.logistics_company AS logisticsCompany,
              o.logistics_no AS logisticsNo,
              o.currency_log_id AS currencyLogId,
              o.refund_currency_log_id AS refundCurrencyLogId,
              o.handled_at AS handledAt,
              o.created_at AS createdAt,
              u.account AS userAccount,
              u.nickname AS userNickname
       FROM shop_orders o
       LEFT JOIN users u ON u.id = o.user_id
       ${whereSql}
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );
    const totalRows = await this.dataSource.query(
      `SELECT COUNT(*) AS total
       FROM shop_orders o
       LEFT JOIN users u ON u.id = o.user_id
       ${whereSql}`,
      params,
    );
    const statsRows = await this.dataSource.query(
      `SELECT status, COUNT(*) AS count FROM shop_orders GROUP BY status`,
    );
    const stats = { pending: 0, approved: 0, rejected: 0 };
    for (const row of statsRows) {
      if (Number(row.status) === 0) stats.pending = Number(row.count || 0);
      if (Number(row.status) === 1) stats.approved = Number(row.count || 0);
      if (Number(row.status) === 2) stats.rejected = Number(row.count || 0);
    }
    return {
      list: list.map((row: any) => this.mapOrder(row)),
      total: Number(totalRows?.[0]?.total || 0),
      page,
      pageSize,
      stats,
    };
  }

  async adminReview(id: number, operatorId: number, data: any) {
    const action = String(data.action || '').trim() as ReviewAction;
    if (!['approve', 'reject'].includes(action)) {
      throw new BadRequestException('请选择审核操作');
    }
    const remark =
      String(data.remark || '')
        .trim()
        .slice(0, 200) || null;
    const logisticsCompany =
      String(data.logisticsCompany || '')
        .trim()
        .slice(0, 80) || null;
    const logisticsNo =
      String(data.logisticsNo || '')
        .trim()
        .slice(0, 100) || null;

    const reviewed = await this.dataSource.transaction(async (mgr) => {
      const rows = await mgr.query(
        `SELECT * FROM shop_orders WHERE id = ? FOR UPDATE`,
        [id],
      );
      const order = rows?.[0];
      if (!order) throw new NotFoundException('订单不存在');
      if (Number(order.status) !== 0)
        throw new BadRequestException('订单已处理');

      let refundLogId: number | null = null;
      if (action === 'reject' && order.payment_method === 'silver') {
        const changed = await this.currencyService.changeCurrency(
          Number(order.user_id),
          'silver',
          Number(order.total_silver_amount || 0),
          'shop_exchange_refund',
          `商城兑换驳回退回：${order.product_title} x${order.quantity}`,
          mgr,
        );
        refundLogId = changed.logId;
      }

      await mgr.query(
        `UPDATE shop_orders
         SET status = ?,
             admin_remark = ?,
             logistics_company = ?,
             logistics_no = ?,
             refund_currency_log_id = ?,
             operator_id = ?,
             handled_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [
          action === 'approve' ? 1 : 2,
          remark,
          action === 'approve' ? logisticsCompany : null,
          action === 'approve' ? logisticsNo : null,
          refundLogId,
          operatorId || null,
          id,
        ],
      );

      return {
        userId: Number(order.user_id),
        orderSn: String(order.order_sn || ''),
        productKey: String(order.product_key || ''),
        productTitle: String(order.product_title || ''),
        quantity: Number(order.quantity || 0),
      };
    });
    await this.serviceNotificationService.notifyUser({
      recipientId: reviewed.userId,
      type: 'shop_order_result',
      title:
        action === 'approve'
          ? reviewed.productKey === 'cag'
            ? 'CAG兑换已确认'
            : '商城订单已发货'
          : '商城订单已驳回',
      content:
        action === 'approve'
          ? `您的商城订单${reviewed.orderSn}${
              reviewed.productKey === 'cag' ? '已确认兑换' : '已确认发货'
            }：${reviewed.productTitle} x${reviewed.quantity}${
              reviewed.productKey !== 'cag' && (logisticsCompany || logisticsNo)
                ? `，物流：${logisticsCompany || ''} ${logisticsNo || ''}`
                : ''
            }`
          : `您的商城订单${reviewed.orderSn}已驳回：${reviewed.productTitle} x${reviewed.quantity}${
              remark ? `，原因：${remark}` : ''
            }`,
      fromUserId: operatorId || undefined,
      payload: {
        shopOrderId: id,
        orderSn: reviewed.orderSn,
        status: action === 'approve' ? 'approved' : 'rejected',
      },
    });
    return {
      message:
        action === 'approve'
          ? reviewed.productKey === 'cag'
            ? 'CAG兑换已确认'
            : '订单已确认发货'
          : '订单已驳回',
    };
  }
}
