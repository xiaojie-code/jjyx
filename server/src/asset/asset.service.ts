import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AssetAccount } from '../entities/asset-account.entity';
import { AssetRechargeOrder } from '../entities/asset-recharge-order.entity';
import { AssetWithdrawal } from '../entities/asset-withdrawal.entity';
import { AssetInterestRecord } from '../entities/asset-interest-record.entity';
import { ServiceNotificationService } from '../notification/service-notification.service';

const ANNUAL_RATE = 0.65;
const DAILY_RATE = ANNUAL_RATE / 365;
const WITHDRAW_FEE_RATE = 0.2;

@Injectable()
export class AssetService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AssetAccount)
    private readonly accountRepo: Repository<AssetAccount>,
    @InjectRepository(AssetRechargeOrder)
    private readonly rechargeRepo: Repository<AssetRechargeOrder>,
    @InjectRepository(AssetWithdrawal)
    private readonly withdrawalRepo: Repository<AssetWithdrawal>,
    @InjectRepository(AssetInterestRecord)
    private readonly interestRepo: Repository<AssetInterestRecord>,
    private readonly dataSource: DataSource,
    private readonly notificationService: ServiceNotificationService,
  ) {}

  async onModuleInit() {
    await this.ensureTables();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Asia/Shanghai' })
  async accrueDailyInterestForAll() {
    const rows = await this.dataSource.query(
      `SELECT user_id AS userId FROM asset_accounts WHERE principal_balance > 0`,
    );
    for (const row of rows || []) {
      await this.accrueInterestForUser(Number(row.userId));
    }
  }

  private async ensureTables() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS asset_accounts (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        principal_balance DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '资产包本金余额',
        interest_balance DECIMAL(18,6) NOT NULL DEFAULT 0 COMMENT '资产包利息余额',
        total_recharged DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '累计审核通过充值本金',
        total_withdrawn DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '累计提现申请金额，含手续费',
        total_interest DECIMAL(18,6) NOT NULL DEFAULT 0 COMMENT '累计生成利息',
        last_interest_date DATE NULL COMMENT '最后一次计息日期',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_asset_accounts_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资产包账户表';
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS asset_recharge_orders (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        real_name VARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        amount DECIMAL(18,2) NOT NULL,
        confirmed_amount DECIMAL(18,2) NULL COMMENT '管理员确认到账金额',
        status TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1已确认 2已驳回',
        admin_remark VARCHAR(200) NULL,
        operator_id INT NULL,
        handled_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_asset_recharge_user (user_id),
        INDEX idx_asset_recharge_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资产包充值订单表';
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS asset_withdrawals (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        amount DECIMAL(18,2) NOT NULL COMMENT '提现申请金额，含手续费',
        fee DECIMAL(18,2) NOT NULL COMMENT '手续费，默认20%',
        actual_amount DECIMAL(18,2) NOT NULL COMMENT '实际到账金额',
        payment_method VARCHAR(20) NOT NULL DEFAULT 'alipay' COMMENT 'alipay/bank',
        account_name VARCHAR(50) NOT NULL,
        account_number VARCHAR(80) NOT NULL,
        interest_deducted DECIMAL(18,6) NOT NULL DEFAULT 0 COMMENT '审核通过时扣除的利息金额',
        principal_deducted DECIMAL(18,2) NOT NULL DEFAULT 0 COMMENT '审核通过时扣除的本金金额',
        status TINYINT NOT NULL DEFAULT 0 COMMENT '0待审核 1已通过 2已驳回',
        admin_remark VARCHAR(200) NULL,
        operator_id INT NULL,
        handled_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_asset_withdraw_user (user_id),
        INDEX idx_asset_withdraw_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资产包提现表';
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS asset_interest_records (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        interest_date DATE NOT NULL COMMENT '计息日期',
        base_principal DECIMAL(18,2) NOT NULL COMMENT '当日计息本金',
        annual_rate DECIMAL(10,6) NOT NULL COMMENT '年化利率，默认0.65',
        interest_amount DECIMAL(18,6) NOT NULL COMMENT '当日生成利息',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_asset_interest_user_date (user_id, interest_date),
        INDEX idx_asset_interest_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资产包每日利息明细表';
    `);
  }

  private amount(value: any): number {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  private money6(value: any): number {
    return Math.round((Number(value) || 0) * 1000000) / 1000000;
  }

  private dateKey(date = new Date()): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private addDays(dateText: string, days: number): string {
    const date = new Date(`${dateText}T00:00:00`);
    date.setDate(date.getDate() + days);
    return this.dateKey(date);
  }

  private validateRechargeAmount(amount: number) {
    if (!Number.isFinite(amount) || amount < 500 || amount > 100000) {
      throw new BadRequestException('充值金额最少500，最高10W');
    }
    if (amount % 100 !== 0) {
      throw new BadRequestException('充值金额必须是100的整数倍');
    }
  }

  private validateWithdrawAmount(amount: number) {
    if (!Number.isFinite(amount) || amount < 100) {
      throw new BadRequestException('提现最低100');
    }
    if (amount % 100 !== 0) {
      throw new BadRequestException('提现金额必须是100的整数倍');
    }
  }

  private async requireActivatedUser(userId: number, manager = this.dataSource.manager) {
    const user = await manager.findOne(User, {
      where: { id: Number(userId) },
      select: ['id', 'account', 'nickname', 'isActivated'],
    });
    if (!user) throw new NotFoundException('用户不存在');
    if (!user.isActivated) throw new BadRequestException('请先激活后使用资产包功能');
    return user;
  }

  private async getOrCreateAccount(userId: number, manager = this.dataSource.manager) {
    let account = await manager.findOne(AssetAccount, { where: { userId } });
    if (!account) {
      account = manager.create(AssetAccount, {
        userId,
        principalBalance: 0,
        interestBalance: 0,
        totalRecharged: 0,
        totalWithdrawn: 0,
        totalInterest: 0,
        lastInterestDate: null,
      });
      account = await manager.save(AssetAccount, account);
    }
    return account;
  }

  async accrueInterestForUser(userId: number, manager = this.dataSource.manager) {
    const account = await this.getOrCreateAccount(userId, manager);
    const principal = this.amount(account.principalBalance);
    const today = this.dateKey();
    if (principal <= 0) {
      account.lastInterestDate = today;
      return manager.save(AssetAccount, account);
    }

    let nextDate = account.lastInterestDate
      ? this.addDays(String(account.lastInterestDate), 1)
      : this.addDays(this.dateKey(account.createdAt), 1);
    while (nextDate <= today) {
      const existing = await manager.findOne(AssetInterestRecord, {
        where: { userId, interestDate: nextDate },
      });
      if (!existing) {
        const interestAmount = this.money6(principal * DAILY_RATE);
        await manager.save(AssetInterestRecord, manager.create(AssetInterestRecord, {
          userId,
          interestDate: nextDate,
          basePrincipal: principal,
          annualRate: ANNUAL_RATE,
          interestAmount,
        }));
        account.interestBalance = this.money6(Number(account.interestBalance) + interestAmount);
        account.totalInterest = this.money6(Number(account.totalInterest) + interestAmount);
      }
      account.lastInterestDate = nextDate;
      nextDate = this.addDays(nextDate, 1);
    }
    return manager.save(AssetAccount, account);
  }

  async getOverview(userId: number) {
    await this.requireActivatedUser(userId);
    const account = await this.accrueInterestForUser(userId);
    const recentInterests = await this.interestRepo.find({
      where: { userId },
      order: { interestDate: 'DESC' },
      take: 7,
    });
    return {
      principalBalance: Number(account.principalBalance),
      interestBalance: Number(account.interestBalance),
      totalBalance: this.money6(Number(account.principalBalance) + Number(account.interestBalance)),
      totalRecharged: Number(account.totalRecharged),
      totalWithdrawn: Number(account.totalWithdrawn),
      totalInterest: Number(account.totalInterest),
      annualRate: ANNUAL_RATE,
      dailyRate: DAILY_RATE,
      todayEstimatedInterest: this.money6(Number(account.principalBalance) * DAILY_RATE),
      recentInterests,
    };
  }

  async submitRecharge(userId: number, data: { amount?: number; realName?: string; phone?: string }) {
    const user = await this.requireActivatedUser(userId);
    const amount = this.amount(data.amount);
    this.validateRechargeAmount(amount);
    const realName = String(data.realName || '').trim();
    const phone = String(data.phone || '').trim();
    if (!realName) throw new BadRequestException('请填写付款姓名');
    if (!/^1\d{10}$/.test(phone)) throw new BadRequestException('请填写正确的手机号');

    const order = await this.rechargeRepo.save(this.rechargeRepo.create({
      userId,
      realName,
      phone,
      amount,
      status: 0,
    }));
    await this.notificationService.notifyAdmin({
      type: 'asset_recharge',
      title: '新的资产包充值申请',
      content: `${user.nickname || user.account} 提交资产包充值 ${amount} 元，请核实收款后确认到账。`,
      fromUserId: userId,
      payload: { assetRechargeId: order.id, amount },
    });
    return { message: '资产包充值申请已提交，请等待管理员确认' };
  }

  async myRechargeOrders(userId: number) {
    await this.requireActivatedUser(userId);
    return this.rechargeRepo.find({
      where: { userId },
      order: { id: 'DESC' },
      take: 50,
    });
  }

  async submitWithdrawal(userId: number, data: {
    amount?: number;
    paymentMethod?: string;
    accountName?: string;
    accountNumber?: string;
  }) {
    const user = await this.requireActivatedUser(userId);
    await this.accrueInterestForUser(userId);
    const amount = this.amount(data.amount);
    this.validateWithdrawAmount(amount);
    const paymentMethod = String(data.paymentMethod || 'alipay').trim();
    if (paymentMethod !== 'alipay') {
      throw new BadRequestException('当前只支持支付宝提现');
    }
    const accountName = String(data.accountName || '').trim();
    const accountNumber = String(data.accountNumber || '').trim();
    if (!accountName) throw new BadRequestException('请填写收款人姓名');
    if (!accountNumber) throw new BadRequestException('请填写收款账号');
    if (!/^1\d{10}$/.test(accountNumber)) throw new BadRequestException('请填写正确的11位支付宝手机号');

    const account = await this.accountRepo.findOne({ where: { userId } });
    const pendingRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM asset_withdrawals
       WHERE user_id = ? AND status = 0`,
      [userId],
    );
    const pendingAmount = Number(pendingRows?.[0]?.total || 0);
    const available = this.money6(
      Number(account?.principalBalance || 0) +
      Number(account?.interestBalance || 0) -
      pendingAmount,
    );
    if (amount > available) {
      throw new BadRequestException(`资产包余额不足，当前可提现 ${Math.floor(available)} 元`);
    }

    const fee = this.amount(amount * WITHDRAW_FEE_RATE);
    const actualAmount = this.amount(amount - fee);
    const withdrawal = await this.withdrawalRepo.save(this.withdrawalRepo.create({
      userId,
      amount,
      fee,
      actualAmount,
      paymentMethod,
      accountName,
      accountNumber,
      status: 0,
    }));
    await this.notificationService.notifyAdmin({
      type: 'asset_withdrawal',
      title: '新的资产包提现申请',
      content: `${user.nickname || user.account} 申请资产包提现 ${amount} 元，实际到账 ${actualAmount} 元。`,
      fromUserId: userId,
      payload: { assetWithdrawalId: withdrawal.id, amount, actualAmount },
    });
    return { message: '资产包提现申请已提交，请等待管理员审核' };
  }

  async myWithdrawals(userId: number) {
    await this.requireActivatedUser(userId);
    return this.withdrawalRepo.find({
      where: { userId },
      order: { id: 'DESC' },
      take: 50,
    });
  }

  async adminListRecharges(query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const keyword = String(query.keyword || '').trim();
    const qb = this.rechargeRepo.createQueryBuilder('o')
      .leftJoin(User, 'u', 'u.id = o.user_id')
      .select([
        'o.id AS id',
        'o.user_id AS userId',
        'u.account AS userAccount',
        'u.nickname AS userNickname',
        'o.real_name AS realName',
        'o.phone AS phone',
        'o.amount AS amount',
        'o.confirmed_amount AS confirmedAmount',
        'o.status AS status',
        'o.admin_remark AS adminRemark',
        'o.handled_at AS handledAt',
        'o.created_at AS createdAt',
      ])
      .orderBy('o.id', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);
    if (query.status !== undefined && query.status !== '') {
      qb.where('o.status = :status', { status: Number(query.status) });
    }
    if (keyword) {
      qb.andWhere(
        `(CAST(o.id AS CHAR) LIKE :keyword
          OR CAST(o.user_id AS CHAR) LIKE :keyword
          OR u.account LIKE :keyword
          OR u.nickname LIKE :keyword
          OR o.real_name LIKE :keyword
          OR o.phone LIKE :keyword)`,
        { keyword: `%${keyword}%` },
      );
    }
    const list = await qb.getRawMany();
    const totalQb = this.rechargeRepo.createQueryBuilder('o');
    totalQb.leftJoin(User, 'u', 'u.id = o.user_id');
    if (query.status !== undefined && query.status !== '') {
      totalQb.where('o.status = :status', { status: Number(query.status) });
    }
    if (keyword) {
      totalQb.andWhere(
        `(CAST(o.id AS CHAR) LIKE :keyword
          OR CAST(o.user_id AS CHAR) LIKE :keyword
          OR u.account LIKE :keyword
          OR u.nickname LIKE :keyword
          OR o.real_name LIKE :keyword
          OR o.phone LIKE :keyword)`,
        { keyword: `%${keyword}%` },
      );
    }
    return { list, total: await totalQb.getCount(), page, pageSize };
  }

  async adminReviewRecharge(id: number, operatorId: number, data: { action?: string; confirmedAmount?: number; remark?: string }) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(AssetRechargeOrder, { where: { id } });
      if (!order) throw new NotFoundException('资产包充值订单不存在');
      if (Number(order.status) !== 0) throw new BadRequestException('该订单已处理');

      if (data.action === 'reject') {
        order.status = 2;
        order.adminRemark = String(data.remark || '').trim() || '管理员驳回';
        order.operatorId = operatorId;
        order.handledAt = new Date();
        await manager.save(AssetRechargeOrder, order);
        await this.notificationService.notifyUser({
          recipientId: order.userId,
          type: 'asset_recharge_result',
          title: '资产包充值未通过',
          content: `你的资产包充值申请未通过：${order.adminRemark}`,
          payload: { assetRechargeId: order.id },
        });
        return { message: '已驳回' };
      }

      const confirmedAmount = this.amount(data.confirmedAmount ?? order.amount);
      this.validateRechargeAmount(confirmedAmount);
      await this.accrueInterestForUser(order.userId, manager);
      const account = await this.getOrCreateAccount(order.userId, manager);
      account.principalBalance = this.amount(Number(account.principalBalance) + confirmedAmount);
      account.totalRecharged = this.amount(Number(account.totalRecharged) + confirmedAmount);
      if (!account.lastInterestDate) account.lastInterestDate = this.dateKey();
      await manager.save(AssetAccount, account);

      order.status = 1;
      order.confirmedAmount = confirmedAmount;
      order.adminRemark = String(data.remark || '').trim() || null;
      order.operatorId = operatorId;
      order.handledAt = new Date();
      await manager.save(AssetRechargeOrder, order);
      await this.notificationService.notifyUser({
        recipientId: order.userId,
        type: 'asset_recharge_result',
        title: '资产包充值已到账',
        content: `你的资产包充值 ${confirmedAmount} 元已确认到账。`,
        payload: { assetRechargeId: order.id, amount: confirmedAmount },
      });
      return { message: '已确认到账' };
    });
  }

  async adminListWithdrawals(query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const keyword = String(query.keyword || '').trim();
    const qb = this.withdrawalRepo.createQueryBuilder('w')
      .leftJoin(User, 'u', 'u.id = w.user_id')
      .select([
        'w.id AS id',
        'w.user_id AS userId',
        'u.account AS userAccount',
        'u.nickname AS userNickname',
        'w.amount AS amount',
        'w.fee AS fee',
        'w.actual_amount AS actualAmount',
        'w.payment_method AS paymentMethod',
        'w.account_name AS accountName',
        'w.account_number AS accountNumber',
        'w.status AS status',
        'w.admin_remark AS adminRemark',
        'w.handled_at AS handledAt',
        'w.created_at AS createdAt',
      ])
      .orderBy('w.id', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);
    if (query.status !== undefined && query.status !== '') {
      qb.where('w.status = :status', { status: Number(query.status) });
    }
    if (keyword) {
      qb.andWhere(
        `(CAST(w.id AS CHAR) LIKE :keyword
          OR CAST(w.user_id AS CHAR) LIKE :keyword
          OR u.account LIKE :keyword
          OR u.nickname LIKE :keyword
          OR w.account_name LIKE :keyword
          OR w.account_number LIKE :keyword)`,
        { keyword: `%${keyword}%` },
      );
    }
    const list = await qb.getRawMany();
    const totalQb = this.withdrawalRepo.createQueryBuilder('w');
    totalQb.leftJoin(User, 'u', 'u.id = w.user_id');
    if (query.status !== undefined && query.status !== '') {
      totalQb.where('w.status = :status', { status: Number(query.status) });
    }
    if (keyword) {
      totalQb.andWhere(
        `(CAST(w.id AS CHAR) LIKE :keyword
          OR CAST(w.user_id AS CHAR) LIKE :keyword
          OR u.account LIKE :keyword
          OR u.nickname LIKE :keyword
          OR w.account_name LIKE :keyword
          OR w.account_number LIKE :keyword)`,
        { keyword: `%${keyword}%` },
      );
    }
    return { list, total: await totalQb.getCount(), page, pageSize };
  }

  async adminReviewWithdrawal(id: number, operatorId: number, data: { action?: string; remark?: string }) {
    return this.dataSource.transaction(async (manager) => {
      const withdrawal = await manager.findOne(AssetWithdrawal, { where: { id } });
      if (!withdrawal) throw new NotFoundException('资产包提现记录不存在');
      if (Number(withdrawal.status) !== 0) throw new BadRequestException('该提现已处理');

      withdrawal.operatorId = operatorId;
      withdrawal.handledAt = new Date();
      withdrawal.adminRemark = String(data.remark || '').trim() || null;

      if (data.action === 'reject') {
        withdrawal.status = 2;
        await manager.save(AssetWithdrawal, withdrawal);
        await this.notificationService.notifyUser({
          recipientId: withdrawal.userId,
          type: 'asset_withdrawal_result',
          title: '资产包提现未通过',
          content: `你的资产包提现申请未通过：${withdrawal.adminRemark || '请联系客服'}`,
          payload: { assetWithdrawalId: withdrawal.id },
        });
        return { message: '已驳回' };
      }

      await this.accrueInterestForUser(withdrawal.userId, manager);
      const account = await this.getOrCreateAccount(withdrawal.userId, manager);
      const amount = this.amount(withdrawal.amount);
      const available = this.money6(Number(account.principalBalance) + Number(account.interestBalance));
      if (amount > available) throw new BadRequestException('资产包余额不足，不能通过提现');

      const interestDeducted = Math.min(Number(account.interestBalance), amount);
      const principalDeducted = this.amount(amount - interestDeducted);
      account.interestBalance = this.money6(Number(account.interestBalance) - interestDeducted);
      account.principalBalance = this.amount(Number(account.principalBalance) - principalDeducted);
      account.totalWithdrawn = this.amount(Number(account.totalWithdrawn) + amount);
      await manager.save(AssetAccount, account);

      withdrawal.status = 1;
      withdrawal.interestDeducted = this.money6(interestDeducted);
      withdrawal.principalDeducted = principalDeducted;
      await manager.save(AssetWithdrawal, withdrawal);
      await this.notificationService.notifyUser({
        recipientId: withdrawal.userId,
        type: 'asset_withdrawal_result',
        title: '资产包提现已通过',
        content: `你的资产包提现 ${amount} 元已通过，手续费 ${withdrawal.fee} 元，实际到账 ${withdrawal.actualAmount} 元。`,
        payload: { assetWithdrawalId: withdrawal.id, amount, actualAmount: withdrawal.actualAmount },
      });
      return { message: '已通过' };
    });
  }

  async adminListAccounts(query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const keyword = String(query.keyword || '').trim();
    const qb = this.accountRepo.createQueryBuilder('a')
      .leftJoin(User, 'u', 'u.id = a.user_id')
      .select([
        'a.id AS id',
        'a.user_id AS userId',
        'u.account AS userAccount',
        'u.nickname AS userNickname',
        'a.principal_balance AS principalBalance',
        'a.interest_balance AS interestBalance',
        'a.total_recharged AS totalRecharged',
        'a.total_withdrawn AS totalWithdrawn',
        'a.total_interest AS totalInterest',
        'a.last_interest_date AS lastInterestDate',
        'a.updated_at AS updatedAt',
      ])
      .orderBy('a.id', 'DESC')
      .offset((page - 1) * pageSize)
      .limit(pageSize);
    if (keyword) {
      qb.where(
        `(CAST(a.user_id AS CHAR) LIKE :keyword
          OR u.account LIKE :keyword
          OR u.nickname LIKE :keyword)`,
        { keyword: `%${keyword}%` },
      );
    }
    const totalQb = this.accountRepo.createQueryBuilder('a')
      .leftJoin(User, 'u', 'u.id = a.user_id');
    if (keyword) {
      totalQb.where(
        `(CAST(a.user_id AS CHAR) LIKE :keyword
          OR u.account LIKE :keyword
          OR u.nickname LIKE :keyword)`,
        { keyword: `%${keyword}%` },
      );
    }
    return { list: await qb.getRawMany(), total: await totalQb.getCount(), page, pageSize };
  }
}
