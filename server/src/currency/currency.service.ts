import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { UserCurrency } from '../entities/user-currency.entity';
import { CurrencyLog } from '../entities/currency-log.entity';
import { PointReturn } from '../entities/point-return.entity';
import { PointSynthesis } from '../entities/point-synthesis.entity';
import { Withdrawal } from '../entities/withdrawal.entity';
import { SystemConfig } from '../entities/system-config.entity';
import { DailyDeduction } from '../entities/daily-deduction.entity';
import { generateSn } from '../common/utils/sn-generator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ServiceNotificationService } from '../notification/service-notification.service';
import * as bcrypt from 'bcryptjs';

type CurrencyType = 'points' | 'gold' | 'silver' | 'special' | 'reward' | 'invite';

@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(UserCurrency)
    private readonly currencyRepo: Repository<UserCurrency>,
    @InjectRepository(CurrencyLog)
    private readonly logRepo: Repository<CurrencyLog>,
    @InjectRepository(PointReturn)
    private readonly returnRepo: Repository<PointReturn>,
    @InjectRepository(PointSynthesis)
    private readonly synthesisRepo: Repository<PointSynthesis>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalRepo: Repository<Withdrawal>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(DailyDeduction)
    private readonly deductionRepo: Repository<DailyDeduction>,
    private readonly dataSource: DataSource,
    private readonly serviceNotificationService: ServiceNotificationService,
  ) {}

  /** 获取用户货币余额 */
  async getBalance(userId: number) {
    const c = await this.currencyRepo.findOne({ where: { userId } });
    if (!c) throw new NotFoundException('货币账户不存在');
    return {
      points: Number(c.points),
      gold: Number(c.gold),
      silver: Number(c.silver),
      specialPointsTier1: Number(c.specialPointsTier1),
      specialPointsTier2: Number(c.specialPointsTier2),
      specialPointsTier3: Number(c.specialPointsTier3),
      rewardPoints: Number(c.rewardPoints),
      invitePoints: Number(c.invitePoints),
    };
  }

  /** 统一货币变动（事务内） */
  async changeCurrency(
    userId: number,
    type: CurrencyType,
    amount: number,
    logType: string,
    description: string,
    manager?: EntityManager,
  ) {
    const mgr = manager || this.dataSource.manager;

    const currency = await mgr.findOne(UserCurrency, { where: { userId } });
    if (!currency) throw new NotFoundException('货币账户不存在');

    let fieldName: keyof UserCurrency;
    switch (type) {
      case 'points': fieldName = 'points'; break;
      case 'gold': fieldName = 'gold'; break;
      case 'silver': fieldName = 'silver'; break;
      case 'reward': fieldName = 'rewardPoints'; break;
      case 'invite': fieldName = 'invitePoints'; break;
      default: throw new BadRequestException('不支持的货币类型');
    }

    const before = Number(currency[fieldName]);
    const after = before + amount;
    if (after < 0) throw new BadRequestException('余额不足');

    (currency as any)[fieldName] = after;
    await mgr.save(UserCurrency, currency);

    // 记录流水
    const log = mgr.create(CurrencyLog, {
      userId,
      sn: generateSn('CL'),
      currencyType: type,
      amount,
      beforeBalance: before,
      afterBalance: after,
      logType,
      description,
    });
    await mgr.save(CurrencyLog, log);

    return { before, after, amount };
  }

  /** 货币明细查询 */
  async getLogs(userId: number, currencyType: string | undefined, pagination: PaginationDto) {
    const qb = this.logRepo.createQueryBuilder('log')
      .where('log.user_id = :userId', { userId })
      .orderBy('log.created_at', 'DESC');

    if (currencyType) {
      qb.andWhere('log.currency_type = :currencyType', { currencyType });
    }

    const total = await qb.getCount();
    const list = await qb
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .getMany();

    return { list, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  /** 特殊积分三档位发放（后台调用） */
  async addSpecialPoints(userId: number, amount: number, manager?: EntityManager) {
    const mgr = manager || this.dataSource.manager;
    const currency = await mgr.findOne(UserCurrency, { where: { userId } });
    if (!currency) throw new NotFoundException('货币账户不存在');

    if (currency.specialPointsCount >= 3) {
      throw new BadRequestException('特殊积分已满3个档位，无法继续发放');
    }

    const count = currency.specialPointsCount + 1;
    if (count === 1) currency.specialPointsTier1 = amount;
    else if (count === 2) currency.specialPointsTier2 = amount;
    else if (count === 3) currency.specialPointsTier3 = amount;
    currency.specialPointsCount = count;

    await mgr.save(UserCurrency, currency);

    // 记录流水
    const log = mgr.create(CurrencyLog, {
      userId,
      sn: generateSn('SP'),
      currencyType: 'special',
      amount,
      beforeBalance: 0,
      afterBalance: amount,
      logType: 'admin_add',
      description: `特殊积分第${count}档发放`,
    });
    await mgr.save(CurrencyLog, log);

    return { tier: count, amount };
  }

  /** 奖励积分每日产出（定时任务调用） */
  async dailyRewardProduction() {
    const currencies = await this.currencyRepo.find();
    for (const c of currencies) {
      const t1 = Number(c.specialPointsTier1);
      const t2 = Number(c.specialPointsTier2);
      const t3 = Number(c.specialPointsTier3);
      const daily = ((t1 * 0.3) / 365) + ((t2 * 0.3) / 365) + ((t3 * 0.3) / 365);

      if (daily > 0) {
        await this.dataSource.transaction(async (mgr) => {
          await this.changeCurrency(c.userId, 'reward', daily, 'daily_reward', '每日奖励积分产出', mgr);
        });
      }
    }
  }

  /** 积分返还定时任务 */
  async dailyPointReturn() {
    const today = new Date();
    const returns = await this.returnRepo.find({ where: { status: 0 } });

    for (const r of returns) {
      const startDate = new Date(r.returnStartDate);
      if (today < startDate) continue;

      const daily = Number(r.dailyReturn);
      const remaining = Number(r.returnTotal) - Number(r.returnedAmount);
      const toReturn = Math.min(daily, remaining);

      if (toReturn <= 0) {
        await this.returnRepo.update(r.id, { status: 1 });
        continue;
      }

      await this.dataSource.transaction(async (mgr) => {
        await this.changeCurrency(r.userId, 'points', toReturn, 'point_return', '积分返还', mgr);
        const newReturned = Number(r.returnedAmount) + toReturn;
        await mgr.update(PointReturn, r.id, {
          returnedAmount: newReturned,
          status: newReturned >= Number(r.returnTotal) ? 1 : 0,
        });
      });
    }
  }

  /** 积分合成 */
  async synthesize(userId: number, configId: number) {
    const config = await this.synthesisRepo.findOne({ where: { id: configId, status: 1 } });
    if (!config) throw new BadRequestException('合成配置不存在或已禁用');

    await this.dataSource.transaction(async (mgr) => {
      await this.changeCurrency(userId, 'points', -Number(config.consumePoints), 'synthesize', '积分合成消耗', mgr);
      await this.changeCurrency(userId, config.targetCurrency as CurrencyType, Number(config.targetAmount), 'synthesize', '积分合成获得', mgr);
    });

    return { message: '合成成功' };
  }

  /** 获取合成配置列表 */
  async getSynthesisConfigs() {
    return this.synthesisRepo.find({ where: { status: 1 } });
  }

  private async ensureWithdrawSecurityTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS withdraw_securities (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_withdraw_security_user_id (user_id),
        INDEX idx_withdraw_security_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  private normalizeWithdrawPassword(password?: string) {
    const value = String(password || '').trim();
    if (!/^\d{6}$/.test(value)) {
      throw new BadRequestException('提现密码必须是6位数字');
    }
    return value;
  }

  private normalizeWithdrawPhone(phone?: string) {
    const value = String(phone || '').trim();
    if (!/^1\d{10}$/.test(value)) {
      throw new BadRequestException('请输入正确的预留手机号');
    }
    return value;
  }

  async getWithdrawSecurity(userId: number) {
    await this.ensureWithdrawSecurityTable();
    const rows = await this.dataSource.query(
      `SELECT phone FROM withdraw_securities WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    const phone = rows?.[0]?.phone || '';
    return {
      hasPassword: rows.length > 0,
      phoneMasked: phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '',
    };
  }

  async setWithdrawPassword(
    userId: number,
    data: { phone?: string; password?: string; confirmPassword?: string },
  ) {
    await this.ensureWithdrawSecurityTable();
    const existing = await this.dataSource.query(
      `SELECT id FROM withdraw_securities WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    if (existing.length > 0) {
      return { message: '提现密码已设置', hasPassword: true };
    }
    const phone = this.normalizeWithdrawPhone(data.phone);
    const password = this.normalizeWithdrawPassword(data.password);
    const confirmPassword = this.normalizeWithdrawPassword(data.confirmPassword);
    if (password !== confirmPassword) {
      throw new BadRequestException('两次输入的提现密码不一致');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.dataSource.query(
      `INSERT INTO withdraw_securities (user_id, phone, password_hash)
       VALUES (?, ?, ?)`,
      [userId, phone, passwordHash],
    );
    return { message: '提现密码设置成功' };
  }

  async resetWithdrawPassword(
    userId: number,
    data: { phone?: string; password?: string; confirmPassword?: string },
  ) {
    await this.ensureWithdrawSecurityTable();
    const rows = await this.dataSource.query(
      `SELECT id, phone FROM withdraw_securities WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) {
      throw new BadRequestException('请先设置提现密码');
    }
    const phone = this.normalizeWithdrawPhone(data.phone);
    if (phone !== rows[0].phone) {
      throw new BadRequestException('预留手机号验证失败');
    }
    const password = this.normalizeWithdrawPassword(data.password);
    const confirmPassword = this.normalizeWithdrawPassword(data.confirmPassword);
    if (password !== confirmPassword) {
      throw new BadRequestException('两次输入的提现密码不一致');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.dataSource.query(
      `UPDATE withdraw_securities SET password_hash = ?, updated_at = NOW() WHERE user_id = ?`,
      [passwordHash, userId],
    );
    return { message: '提现密码重置成功' };
  }

  private async verifyWithdrawPassword(userId: number, withdrawPassword?: string) {
    await this.ensureWithdrawSecurityTable();
    const rows = await this.dataSource.query(
      `SELECT password_hash FROM withdraw_securities WHERE user_id = ? LIMIT 1`,
      [userId],
    );
    if (rows.length === 0) {
      throw new BadRequestException('请先设置提现密码');
    }
    const password = this.normalizeWithdrawPassword(withdrawPassword);
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) {
      throw new BadRequestException('提现密码错误');
    }
  }

  /** 提现申请 */
  async withdraw(userId: number, data: { amount: number; paymentMethod: string; accountName: string; accountNumber: string; content?: string; withdrawPassword?: string }) {
    const { amount, paymentMethod, accountName, accountNumber, content, withdrawPassword } = data;
    if (!amount || amount < 100) throw new BadRequestException('提现最低100元');
    if (amount % 100 !== 0) throw new BadRequestException('提现金额必须是100的整数倍');
    if (!paymentMethod || !['alipay', 'bank'].includes(paymentMethod)) {
      throw new BadRequestException('请选择提现方式（支付宝或银行卡）');
    }
    if (!accountName || !accountName.trim()) throw new BadRequestException('请填写收款人姓名');
    if (!accountNumber || !accountNumber.trim()) throw new BadRequestException('请填写收款账号');
    await this.verifyWithdrawPassword(userId, withdrawPassword);

    // 校验可提现余额 = 实时可提现推广收益 - 待审核/已通过提现总额。
    const { totalEarned, totalWithdrawn } = await this.getWithdrawableBalance(userId);
    const available = totalEarned - totalWithdrawn;
    if (amount > available) {
      throw new BadRequestException(`可提现余额不足，当前可提现 ${available.toFixed(0)} 元`);
    }

    // 创建提现记录（不扣积分，直接记录）
    const fee = Math.floor(amount * 0.2);
    const actualAmount = amount - fee;
    const withdrawal = this.withdrawalRepo.create({
      userId,
      amount,
      paymentMethod,
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      content: `提现${amount}元，手续费${fee}元（20%），实际到账${actualAmount}元` + (content?.trim() ? `；备注：${content.trim()}` : ''),
      status: 0,
    });
    await this.withdrawalRepo.save(withdrawal);

    // 给管理员发送服务通知
    await this.serviceNotificationService.notifyAdmin({
      type: 'withdrawal',
      title: '新的提现申请',
      content: `${accountName.trim()} 申请提现 ${amount} 元（实际到账 ${actualAmount} 元），收款方式：${paymentMethod}`,
      fromUserId: userId,
      payload: { withdrawalId: withdrawal.id, amount, actualAmount },
    });

    return { message: '提现申请已提交，请等待审核' };
  }

  /** 获取用户可提现余额 */
  async getWithdrawableBalance(userId: number) {
    // 1-4号位与特殊奖励产生后即可提现，不等待矩阵完成。
    const earnedResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(i.amount), 0) as total FROM matrix_incomes i
       INNER JOIN matrices m ON i.matrix_id = m.id
       WHERE i.owner_id = ?
         AND (i.slot_number BETWEEN 1 AND 4 OR i.slot_number = 0)
         AND m.owner_id = ?`,
      [userId, userId],
    );
    const totalEarned = Number(earnedResult?.[0]?.total || 0);

    // 已提现总额（待审核 + 已通过）
    const withdrawnResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM withdrawals WHERE user_id = ? AND status IN (0, 1)`,
      [userId],
    );
    const totalWithdrawn = Number(withdrawnResult?.[0]?.total || 0);

    return { totalEarned, totalWithdrawn };
  }

  /** 获取用户交易记录：推广收益入账 + 提现申请。 */
  async getWithdrawRecords(userId: number) {
    const withdrawals = await this.withdrawalRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const incomes = await this.dataSource.query(
      `SELECT i.id, i.amount, i.slot_number, i.description, i.created_at,
              u.account AS source_account, u.nickname AS source_nickname
       FROM matrix_incomes i
       LEFT JOIN users u ON u.id = i.from_user_id
       WHERE i.owner_id = ?
         AND (i.slot_number BETWEEN 1 AND 4 OR i.slot_number = 0)
       ORDER BY i.created_at DESC`,
      [userId],
    );

    const incomeRecords = incomes.map((r: any) => ({
      id: `income-${r.id}`,
      transactionType: 'income',
      amount: Number(r.amount),
      isSpecialReward: Number(r.slot_number) === 0,
      title: Number(r.slot_number) === 0 ? '特殊奖励' : '推广收益',
      description: r.description,
      sourceAccount: r.source_account || '',
      sourceNickname: r.source_nickname || '',
      createdAt: r.created_at,
    }));
    const withdrawalRecords = withdrawals.map(r => ({
      id: `withdrawal-${r.id}`,
      transactionType: 'withdrawal',
      amount: Number(r.amount),
      fee: Math.floor(Number(r.amount) * 0.2),
      actualAmount: Number(r.amount) - Math.floor(Number(r.amount) * 0.2),
      paymentMethod: r.paymentMethod,
      accountName: r.accountName,
      accountNumber: r.accountNumber,
      status: r.status, // 0待审核 1已打款 2驳回
      statusText: r.status === 0 ? '审核中' : r.status === 1 ? '已打款' : '已驳回',
      createdAt: r.createdAt,
      reviewTime: r.reviewTime,
    }));

    return [...incomeRecords, ...withdrawalRecords].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  /** 提现审核（管理端） */
  async reviewWithdrawal(id: number, approve: boolean) {
    const w = await this.withdrawalRepo.findOne({ where: { id } });
    if (!w) throw new NotFoundException('提现记录不存在');
    if (w.status !== 0) throw new BadRequestException('该申请已处理');

    if (approve) {
      await this.withdrawalRepo.update(id, { status: 1, reviewTime: new Date() });
    } else {
      // 驳回：直接更新状态（不需要返还，因为提现不扣积分）
      await this.withdrawalRepo.update(id, { status: 2, reviewTime: new Date() });
    }

    return { message: approve ? '已通过' : '已驳回' };
  }

  // ==================== 系统配置 ====================

  /** 获取配置值 */
  async getConfigValue(key: string, defaultValue: string): Promise<string> {
    const config = await this.configRepo.findOne({ where: { configKey: key } });
    return config ? config.configValue : defaultValue;
  }

  /** 获取所有配置 */
  async getAllConfigs() {
    return this.configRepo.find();
  }

  /** 更新配置 */
  async updateConfig(key: string, value: string) {
    await this.configRepo.update({ configKey: key }, { configValue: value });
    return { message: '配置已更新' };
  }

  /** 初始化默认配置（首次启动时） */
  async ensureDefaultConfigs() {
    const defaults = [
      { configKey: 'daily_deduction_rate', configName: '每日积分扣除比例', configValue: '0.01', description: '每天扣除用户积分的百分比，0.01表示1%' },
      { configKey: 'weekly_return_multiplier', configName: '每周返还倍率', configValue: '1.5', description: '每周一返还上周扣除积分的倍率' },
      { configKey: 'meeting_start_cost', configName: '普通成员发起会议消耗', configValue: '10000', description: '普通群成员发起群会议需要扣除的积分，群主和管理员免费' },
      { configKey: 'data_retention_days', configName: '聊天/会议数据保留天数', configValue: '7', description: '后台清理聊天记录和已结束会议时使用的保留天数' },
      { configKey: 'meeting_media_mode', configName: '会议媒体模式', configValue: 'p2p', description: 'p2p 或 sfu；SFU 服务接入稳定后可切换为 sfu' },
      { configKey: 'meeting_sfu_endpoint', configName: '会议SFU地址', configValue: '', description: 'mediasoup/Janus 信令或控制服务地址，未配置时客户端继续使用 P2P' },
      { configKey: 'meeting_turn_urls', configName: '会议TURN地址', configValue: '', description: 'TURN/STUN 地址，多个地址用英文逗号或换行分隔' },
      { configKey: 'meeting_turn_username', configName: '会议TURN用户名', configValue: '', description: 'TURN 服务用户名' },
      { configKey: 'meeting_turn_credential', configName: '会议TURN密码', configValue: '', description: 'TURN 服务密码或凭据' },
      { configKey: 'meeting_recording_enabled', configName: '会议录制开关', configValue: 'false', description: '是否启用服务端录制能力' },
      { configKey: 'meeting_recording_auto', configName: '会议自动录制', configValue: 'false', description: '启用录制后是否自动开始录制' },
      { configKey: 'ai_api_key', configName: '云AI API Key', configValue: '', description: '云AI服务密钥，例如 SiliconFlow / DeepSeek 的 API Key' },
      { configKey: 'ai_base_url', configName: '云AI接口地址', configValue: 'https://api.siliconflow.cn/v1', description: '兼容 OpenAI Chat Completions 的接口地址' },
      { configKey: 'ai_model', configName: '云AI模型', configValue: 'deepseek-ai/DeepSeek-V3', description: '云AI使用的模型名称' },
      { configKey: 'recharge_qrcode', configName: '充值收款码', configValue: '', description: '充值页展示的收款二维码图片地址（后台上传）' },
      { configKey: 'recharge_payee_name', configName: '充值收款人', configValue: '', description: '充值页展示的收款人姓名' },
      { configKey: 'recharge_notice', configName: '充值说明', configValue: '请先扫码付款，再填写姓名和手机号提交，管理员核实后会通过短信发送激活码。', description: '充值页展示的操作说明' },
      { configKey: 'recharge_packages', configName: '充值套餐', configValue: '', description: '充值套餐档位，多个用英文逗号分隔，如 100,200,500' },
    ];
    for (const d of defaults) {
      const exists = await this.configRepo.findOne({ where: { configKey: d.configKey } });
      if (!exists) {
        await this.configRepo.save(this.configRepo.create(d));
      }
    }
  }

  // ==================== 每日积分扣除 ====================

  /** 每日积分扣除（定时任务调用） */
  async dailyPointDeduction() {
    const rateStr = await this.getConfigValue('daily_deduction_rate', '0.01');
    const rate = parseFloat(rateStr);
    if (rate <= 0 || rate >= 1) return;

    const today = new Date().toISOString().slice(0, 10);
    const currencies = await this.currencyRepo.find();

    for (const c of currencies) {
      const balance = Number(c.points);
      if (balance <= 0) continue;

      const deductAmount = Math.round(balance * rate * 100) / 100;
      if (deductAmount <= 0) continue;

      await this.dataSource.transaction(async (mgr) => {
        await this.changeCurrency(c.userId, 'points', -deductAmount, 'daily_deduction', `每日积分扣除(${(rate * 100).toFixed(2)}%)`, mgr);

        const record = mgr.create(DailyDeduction, {
          userId: c.userId,
          deductionDate: today,
          beforeBalance: balance,
          deductedAmount: deductAmount,
          deductionRate: rate,
        });
        await mgr.save(DailyDeduction, record);
      });
    }
  }

  // ==================== 每周一积分返还 ====================

  /** 每周一统计上周扣除并创建返还计划（定时任务调用） */
  async weeklyReturnSetup() {
    const multiplierStr = await this.getConfigValue('weekly_return_multiplier', '1.5');
    const multiplier = parseFloat(multiplierStr);
    if (multiplier <= 0) return;

    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - 7);
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - 1);

    const lastMondayStr = lastMonday.toISOString().slice(0, 10);
    const lastSundayStr = lastSunday.toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    const results = await this.deductionRepo
      .createQueryBuilder('d')
      .select('d.user_id', 'userId')
      .addSelect('SUM(d.deducted_amount)', 'totalDeducted')
      .where('d.deduction_date >= :start', { start: lastMondayStr })
      .andWhere('d.deduction_date <= :end', { end: lastSundayStr })
      .groupBy('d.user_id')
      .getRawMany();

    for (const row of results) {
      const userId = Number(row.userId);
      const totalDeducted = Number(row.totalDeducted);
      if (totalDeducted <= 0) continue;

      const returnTotal = Math.round(totalDeducted * multiplier * 100) / 100;
      const dailyReturn = Math.round((returnTotal / 7) * 100) / 100;

      const plan = this.returnRepo.create({
        userId,
        weekStart: lastMondayStr,
        totalConsumed: totalDeducted,
        returnTotal,
        returnedAmount: 0,
        dailyReturn,
        returnStartDate: todayStr,
        status: 0,
      });
      await this.returnRepo.save(plan);
    }
  }
}
