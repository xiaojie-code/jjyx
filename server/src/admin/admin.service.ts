import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { UserCurrency } from '../entities/user-currency.entity';
import { CurrencyLog } from '../entities/currency-log.entity';
import { UserActivity } from '../entities/user-activity.entity';
import { BackpackItem } from '../entities/backpack-item.entity';
import { SystemSwitch } from '../entities/system-switch.entity';
import { LotteryConfig } from '../entities/lottery-config.entity';
import { Cdk } from '../entities/cdk.entity';
import { CdkType } from '../entities/cdk-type.entity';
import { Withdrawal } from '../entities/withdrawal.entity';
import { Agent } from '../entities/agent.entity';
import { Matrix } from '../entities/matrix.entity';
import { MatrixSlot } from '../entities/matrix-slot.entity';
import { MatrixIncome } from '../entities/matrix-income.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
import { Message } from '../entities/message.entity';
import { Meeting } from '../entities/meeting.entity';
import { CurrencyService } from '../currency/currency.service';
import { RechargeService } from '../currency/recharge.service';
import { ServiceNotificationService } from '../notification/service-notification.service';
import { MeetingService } from '../chat/meeting.service';
import { MeetingGateway } from '../chat/meeting.gateway';
import { PaginationDto } from '../common/dto/pagination.dto';

const CDK_ACTIVATION_AMOUNT_OPTIONS = [500, 2000];

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserCurrency)
    private currencyRepo: Repository<UserCurrency>,
    @InjectRepository(CurrencyLog) private logRepo: Repository<CurrencyLog>,
    @InjectRepository(UserActivity)
    private activityRepo: Repository<UserActivity>,
    @InjectRepository(BackpackItem)
    private backpackRepo: Repository<BackpackItem>,
    @InjectRepository(SystemSwitch)
    private switchRepo: Repository<SystemSwitch>,
    @InjectRepository(LotteryConfig)
    private lotteryRepo: Repository<LotteryConfig>,
    @InjectRepository(Cdk) private cdkRepo: Repository<Cdk>,
    @InjectRepository(CdkType) private cdkTypeRepo: Repository<CdkType>,
    @InjectRepository(Withdrawal)
    private withdrawalRepo: Repository<Withdrawal>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    @InjectRepository(Matrix) private matrixRepo: Repository<Matrix>,
    @InjectRepository(MatrixSlot)
    private matrixSlotRepo: Repository<MatrixSlot>,
    @InjectRepository(MatrixIncome)
    private matrixIncomeRepo: Repository<MatrixIncome>,
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private conversationMemberRepo: Repository<ConversationMember>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Meeting) private meetingRepo: Repository<Meeting>,
    private currencyService: CurrencyService,
    private meetingService: MeetingService,
    private meetingGateway: MeetingGateway,
    private rechargeService: RechargeService,
    private serviceNotificationService: ServiceNotificationService,
    private dataSource: DataSource,
  ) {}

  // ===== 用户管理 =====
  async getUsers(query: any, pagination: PaginationDto) {
    const qb = this.userRepo.createQueryBuilder('u');
    if (query.keyword) {
      qb.where(
        'u.id = :kw OR u.account LIKE :lkw OR u.nickname LIKE :lkw OR u.register_ip = :kw OR u.login_ip = :kw',
        { kw: query.keyword, lkw: `%${query.keyword}%` },
      );
    }
    if (query.status)
      qb.andWhere('u.status = :status', { status: query.status });
    const total = await qb.getCount();
    const list = await qb
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .orderBy('u.id', 'DESC')
      .getMany();
    const userIds = list.map((user) => user.id);
    const currencies = userIds.length
      ? await this.currencyRepo.find({ where: { userId: In(userIds) } })
      : [];
    const currencyMap = new Map(currencies.map((item) => [item.userId, item]));
    return {
      list: list.map((user) => {
        const currency = currencyMap.get(user.id);
        return {
          ...user,
          currency: currency
            ? {
                points: Number(currency.points || 0),
                gold: Number(currency.gold || 0),
                totalGoldEarned: Number(currency.totalGoldEarned || 0),
                silver: Number(currency.silver || 0),
                copper: Number(currency.copper || 0),
              }
            : {
                points: 0,
                gold: 0,
                totalGoldEarned: 0,
                silver: 0,
                copper: 0,
              },
        };
      }),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async getUserStats() {
    const [totalUsers, activatedUsers] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { isActivated: true } }),
    ]);
    return { totalUsers, activatedUsers };
  }

  async updateUser(id: number, data: any) {
    await this.userRepo.update(id, data);
  }
  async updateUserStatus(id: number, status: number) {
    await this.userRepo.update(id, { status });
  }
  async addCurrency(userId: number, type: string, amount: number) {
    if (type === 'special') {
      throw new BadRequestException('特殊积分功能已关闭');
    }
    return this.currencyService.changeCurrency(
      userId,
      type as any,
      amount,
      'admin_add',
      '后台发放',
    );
  }
  async getUserLogs(userId: number, query: any, pagination: PaginationDto) {
    const qb = this.logRepo
      .createQueryBuilder('l')
      .where('l.user_id = :userId', { userId });
    if (query.sn) qb.andWhere('l.sn = :sn', { sn: query.sn });
    const total = await qb.getCount();
    const list = await qb
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .orderBy('l.created_at', 'DESC')
      .getMany();
    return {
      list,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }
  async getUserActivities(userId: number, query: any) {
    const where: any = { userId };
    if (query.type) where.type = query.type;
    return this.activityRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
  async getUserBackpack(userId: number) {
    return this.backpackRepo.find({ where: { userId } });
  }

  async getPasswordResetRequests(query: any) {
    await this.ensurePasswordResetTable();
    const status = query.status === undefined || query.status === ''
      ? null
      : Number(query.status);
    const params: any[] = [];
    let where = '';
    if (status !== null && !Number.isNaN(status)) {
      where = 'WHERE r.status = ?';
      params.push(status);
    }
    return this.dataSource.query(
      `SELECT r.*, u.nickname
       FROM password_reset_requests r
       LEFT JOIN users u ON u.id = r.user_id
       ${where}
       ORDER BY r.id DESC
       LIMIT 200`,
      params,
    );
  }

  async resetUserPasswordByRequest(requestId: number) {
    await this.ensurePasswordResetTable();
    const rows = await this.dataSource.query(
      'SELECT * FROM password_reset_requests WHERE id = ? LIMIT 1',
      [requestId],
    );
    const request = rows?.[0];
    if (!request) throw new NotFoundException('重置申请不存在');
    const user = await this.userRepo.findOne({ where: { id: Number(request.user_id) } });
    if (!user) throw new NotFoundException('用户不存在');
    const newPassword = this.generateRandomPassword();
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(user.id, { passwordHash });
    await this.dataSource.query(
      `UPDATE password_reset_requests
       SET status = 1, new_password = ?, handled_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [newPassword, requestId],
    );
    return { account: user.account, phone: request.phone, newPassword };
  }

  async rejectPasswordResetRequest(requestId: number) {
    await this.ensurePasswordResetTable();
    await this.dataSource.query(
      `UPDATE password_reset_requests
       SET status = 2, handled_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [requestId],
    );
    return { message: '已拒绝' };
  }

  private async ensureAppVersionsTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS app_versions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(20) NOT NULL DEFAULT 'android',
        version_name VARCHAR(50) NOT NULL,
        version_code INT NOT NULL,
        download_url VARCHAR(500) NOT NULL,
        force_update TINYINT NOT NULL DEFAULT 0,
        changelog TEXT NULL,
        file_size BIGINT NULL,
        file_md5 VARCHAR(64) NULL,
        status TINYINT NOT NULL DEFAULT 1 COMMENT '1 enabled, 0 disabled',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_app_versions_platform_status_code (platform, status, version_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    try {
      await this.dataSource.query(`ALTER TABLE app_versions ADD COLUMN file_md5 VARCHAR(64) NULL`);
    } catch (_) {}
  }

  async getAppVersions() {
    await this.ensureAppVersionsTable();
    return this.dataSource.query(
      `SELECT id, platform, version_name AS versionName, version_code AS versionCode,
              download_url AS downloadUrl, force_update AS forceUpdate,
              changelog, file_size AS fileSize, file_md5 AS fileMd5, status,
              created_at AS createdAt, updated_at AS updatedAt
       FROM app_versions
       ORDER BY platform ASC, version_code DESC, id DESC
       LIMIT 200`,
    );
  }

  private parseAppVersionPayload(data: any) {
    const platform = String(data.platform || 'android').trim().toLowerCase();
    const versionName = String(data.versionName || '').trim();
    const versionCode = Number(data.versionCode);
    const downloadUrl = String(data.downloadUrl || '').trim();
    const changelog = String(data.changelog || '').trim();
    const fileMd5Text = String(data.fileMd5 || '').trim().toLowerCase();
    const fileMd5 = fileMd5Text || null;
    const fileSizeValue = data.fileSize === undefined || data.fileSize === null || data.fileSize === ''
      ? null
      : Number(data.fileSize);

    if (!platform) throw new BadRequestException('平台不能为空');
    if (platform !== 'android') throw new BadRequestException('当前仅支持Android版本');
    if (!versionName) throw new BadRequestException('版本名称不能为空');
    if (!Number.isInteger(versionCode) || versionCode <= 0) {
      throw new BadRequestException('版本号必须是大于0的整数');
    }
    if (!downloadUrl) throw new BadRequestException('下载地址不能为空');
    this.validateAppDownloadUrl(downloadUrl);
    if (fileSizeValue !== null && (!Number.isInteger(fileSizeValue) || fileSizeValue <= 0)) {
      throw new BadRequestException('文件大小必须是大于0的整数');
    }
    if (fileMd5 && !/^[a-f0-9]{32}$/.test(fileMd5)) {
      throw new BadRequestException('文件MD5必须是32位十六进制字符串');
    }

    return {
      platform,
      versionName,
      versionCode,
      downloadUrl,
      changelog: changelog || null,
      fileSize: fileSizeValue,
      fileMd5,
      forceUpdate: data.forceUpdate ? 1 : 0,
      status: Number(data.status) === 0 ? 0 : 1,
    };
  }

  private validateAppDownloadUrl(downloadUrl: string) {
    const lowerPath = downloadUrl.split(/[?#]/)[0].toLowerCase();
    if (!lowerPath.endsWith('.apk')) {
      throw new BadRequestException('下载地址必须指向.apk安装包');
    }

    if (downloadUrl.startsWith('/')) {
      if (downloadUrl.startsWith('//')) {
        throw new BadRequestException('下载地址不能使用协议相对地址，请填写http/https或/downloads路径');
      }
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(downloadUrl);
    } catch (_) {
      throw new BadRequestException('下载地址格式不正确，请填写http/https直链或/downloads路径');
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new BadRequestException('下载地址必须是http或https链接');
    }
  }

  async createAppVersion(data: any) {
    await this.ensureAppVersionsTable();
    const payload = this.parseAppVersionPayload(data);
    await this.dataSource.query(
      `INSERT INTO app_versions
        (platform, version_name, version_code, download_url, force_update, changelog, file_size, file_md5, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.platform,
        payload.versionName,
        payload.versionCode,
        payload.downloadUrl,
        payload.forceUpdate,
        payload.changelog,
        payload.fileSize,
        payload.fileMd5,
        payload.status,
      ],
    );
    return { message: '版本已发布' };
  }

  async updateAppVersion(id: number, data: any) {
    await this.ensureAppVersionsTable();
    const rows = await this.dataSource.query('SELECT id FROM app_versions WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) throw new NotFoundException('版本不存在');
    const payload = this.parseAppVersionPayload(data);
    await this.dataSource.query(
      `UPDATE app_versions
       SET platform = ?, version_name = ?, version_code = ?, download_url = ?,
           force_update = ?, changelog = ?, file_size = ?, file_md5 = ?, status = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        payload.platform,
        payload.versionName,
        payload.versionCode,
        payload.downloadUrl,
        payload.forceUpdate,
        payload.changelog,
        payload.fileSize,
        payload.fileMd5,
        payload.status,
        id,
      ],
    );
    return { message: '版本已更新' };
  }

  async deleteAppVersion(id: number) {
    await this.ensureAppVersionsTable();
    await this.dataSource.query('DELETE FROM app_versions WHERE id = ?', [id]);
    return { message: '版本已删除' };
  }

  private generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
  }

  private async ensurePasswordResetTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        account VARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        status TINYINT NOT NULL DEFAULT 0 COMMENT '0待处理 1已重置 2已拒绝',
        new_password VARCHAR(50) NULL,
        operator_id INT NULL,
        handled_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_password_reset_status (status),
        INDEX idx_password_reset_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  // ===== 功能开关 =====
  async getSwitches() {
    return this.switchRepo.find();
  }
  async updateSwitch(id: number, status: number) {
    await this.switchRepo.update(id, { status });
  }

  // ===== 转盘 =====
  async getLotteryConfigs() {
    return this.lotteryRepo.find({ order: { slotIndex: 'ASC' } });
  }
  async createLottery(data: any) {
    return this.lotteryRepo.save(this.lotteryRepo.create(data));
  }
  async updateLottery(id: number, data: any) {
    await this.lotteryRepo.update(id, data);
  }
  async deleteLottery(id: number) {
    await this.lotteryRepo.delete(id);
  }

  // ===== CDK =====
  private normalizeActivationAmount(value: any): number | null {
    const amount = Number(value);
    return CDK_ACTIVATION_AMOUNT_OPTIONS.includes(amount) ? amount : null;
  }

  private getActivationAmountLabel(activationAmount: any) {
    const amount = this.normalizeActivationAmount(activationAmount);
    return amount ? `充值${amount}激活码` : '';
  }

  private getDefaultCdkTypeMeta(activationAmount: number) {
    if (activationAmount === 500) {
      return {
        name: '充值500激活码',
        description: '充值500元用户专用激活码',
      };
    }
    return {
      name: '充值2000激活码',
      description: '充值2000元用户专用激活码',
    };
  }

  private async ensureCdkActivationColumns() {
    const alters = [
      `ALTER TABLE cdk_types ADD COLUMN activation_amount DECIMAL(10,2) NULL COMMENT '激活档位金额：500或2000' AFTER description`,
      `ALTER TABLE cdks ADD COLUMN activation_amount DECIMAL(10,2) NULL COMMENT '激活档位金额快照：500或2000' AFTER items_json`,
    ];
    for (const sql of alters) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {}
    }
    for (const activationAmount of CDK_ACTIVATION_AMOUNT_OPTIONS) {
      await this.findOrCreateCdkTypeByAmount(activationAmount);
    }
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

  async generateCdks(data: any) {
    await this.ensureCdkActivationColumns();
    const count = Math.floor(Number(data?.count) || 0);
    if (count < 1 || count > 1000) throw new BadRequestException('生成数量需要在1到1000之间');
    const requestedActivationAmount = this.normalizeActivationAmount(data?.activationAmount);
    let cdkType: CdkType | null = null;

    if (requestedActivationAmount) {
      cdkType = await this.findOrCreateCdkTypeByAmount(requestedActivationAmount);
    } else {
      cdkType = await this.cdkTypeRepo.findOne({ where: { id: Number(data?.cdkTypeId) } });
    }
    if (!cdkType) throw new NotFoundException('CDK类型不存在');
    const cdkActivationAmount = this.normalizeActivationAmount(cdkType.activationAmount);
    if (!cdkActivationAmount) throw new BadRequestException('请先给CDK类型配置500或2000档位');
    const itemsJson = Array.isArray(data?.itemsJson) ? data.itemsJson : [];
    const cdks = [];
    for (let i = 0; i < count; i++) {
      cdks.push(
        this.cdkRepo.create({
          code: uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase(),
          cdkTypeId: cdkType.id,
          itemsJson,
          activationAmount: cdkActivationAmount,
          status: 0,
        }),
      );
    }
    await this.cdkRepo.save(cdks);
    return { generated: count, activationAmount: cdkActivationAmount, cdkTypeId: cdkType.id };
  }
  async getCdkList(query: any, pagination: PaginationDto) {
    await this.ensureCdkActivationColumns();
    const qb = this.cdkRepo.createQueryBuilder('c');
    let hasWhere = false;
    if (query.status !== undefined && query.status !== '') {
      qb.where('c.status = :status', { status: Number(query.status) });
      hasWhere = true;
    }
    const activationAmount = this.normalizeActivationAmount(query.activationAmount);
    if (activationAmount) {
      const typeIds = (
        await this.cdkTypeRepo.find({
          select: ['id'],
          where: { activationAmount: activationAmount as any },
        })
      ).map((type) => Number(type.id));
      const clauses = ['c.activation_amount = :activationAmount'];
      const params: any = { activationAmount };
      if (typeIds.length > 0) {
        clauses.push('(c.activation_amount IS NULL AND c.cdk_type_id IN (:...typeIds))');
        params.typeIds = typeIds;
      }
      const clause = `(${clauses.join(' OR ')})`;
      if (hasWhere) qb.andWhere(clause, params);
      else qb.where(clause, params);
    }
    const total = await qb.getCount();
    const list = await qb
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .orderBy('c.created_at', 'DESC')
      .getMany();
    const typeIds = [...new Set(list.map((item) => Number(item.cdkTypeId)).filter(Boolean))];
    const types = typeIds.length > 0
      ? await this.cdkTypeRepo.createQueryBuilder('t').where('t.id IN (:...ids)', { ids: typeIds }).getMany()
      : [];
    const typeMap = new Map(types.map((type) => [Number(type.id), type]));
    return {
      list: list.map((item) => {
        const type = typeMap.get(Number(item.cdkTypeId));
        const activationAmount =
          this.normalizeActivationAmount(item.activationAmount) ||
          this.normalizeActivationAmount(type?.activationAmount);
        return {
          ...item,
          activationAmount,
          activationAmountLabel: this.getActivationAmountLabel(activationAmount),
          cdkTypeName: this.getActivationAmountLabel(activationAmount) || type?.name || '',
          rawCdkTypeName: type?.name || '',
        };
      }),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }
  async getCdkTypes() {
    await this.ensureCdkActivationColumns();
    return this.cdkTypeRepo.find({ order: { activationAmount: 'ASC', id: 'ASC' } });
  }
  async createCdkType(data: any) {
    await this.ensureCdkActivationColumns();
    const activationAmount = this.normalizeActivationAmount(data.activationAmount);
    if (!activationAmount) throw new BadRequestException('请选择CDK档位：500或2000');
    return this.cdkTypeRepo.save(this.cdkTypeRepo.create({
      name: String(data.name || '').trim(),
      description: String(data.description || '').trim() || null,
      activationAmount,
    }));
  }
  async updateCdkType(id: number, data: any) {
    await this.ensureCdkActivationColumns();
    const payload: any = {};
    if (data.name !== undefined) payload.name = String(data.name || '').trim();
    if (data.description !== undefined) payload.description = String(data.description || '').trim() || null;
    if (data.activationAmount !== undefined) {
      const activationAmount = this.normalizeActivationAmount(data.activationAmount);
      if (!activationAmount) throw new BadRequestException('请选择CDK档位：500或2000');
      payload.activationAmount = activationAmount;
    }
    await this.cdkTypeRepo.update(id, payload);
  }

  // ===== 提现 =====
  async getWithdrawals(query: any) {
    const params: any[] = [];
    const where: string[] = [];
    const keyword = String(query.keyword || '').trim();
    const statusRaw = query.status === undefined ? '' : String(query.status);
    const startDate = String(query.startDate || '').trim();
    const endDate = String(query.endDate || '').trim();

    if (keyword) {
      const keywordLike = `%${keyword}%`;
      const keywordNumber = Number(keyword);
      if (Number.isFinite(keywordNumber) && keywordNumber > 0) {
        where.push(
          '(w.user_id = ? OR u.account LIKE ? OR u.nickname LIKE ? OR w.account_name LIKE ? OR w.account_number LIKE ?)',
        );
        params.push(keywordNumber, keywordLike, keywordLike, keywordLike, keywordLike);
      } else {
        where.push(
          '(u.account LIKE ? OR u.nickname LIKE ? OR w.account_name LIKE ? OR w.account_number LIKE ?)',
        );
        params.push(keywordLike, keywordLike, keywordLike, keywordLike);
      }
    }

    if (statusRaw !== '') {
      const status = Number(statusRaw);
      if (Number.isFinite(status)) {
        where.push('w.status = ?');
        params.push(status);
      }
    }

    if (startDate) {
      where.push('w.created_at >= ?');
      params.push(`${startDate} 00:00:00`);
    }
    if (endDate) {
      where.push('w.created_at <= ?');
      params.push(`${endDate} 23:59:59`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const list = await this.dataSource.query(
      `SELECT
         w.id,
         w.user_id AS userId,
         u.account AS userAccount,
         u.nickname AS userNickname,
         w.amount,
         w.payment_method AS paymentMethod,
         w.account_name AS accountName,
         w.account_number AS accountNumber,
         w.content,
         w.copper_cost AS copperCost,
         w.copper_log_id AS copperLogId,
         w.copper_refund_log_id AS copperRefundLogId,
         w.status,
         w.review_time AS reviewTime,
         w.created_at AS createdAt,
         COALESCE(ut.successTotal, 0) AS userSuccessWithdrawn
       FROM withdrawals w
       LEFT JOIN users u ON u.id = w.user_id
       LEFT JOIN (
         SELECT user_id, SUM(amount) AS successTotal
         FROM withdrawals
         WHERE status = 1
         GROUP BY user_id
       ) ut ON ut.user_id = w.user_id
       ${whereSql}
       ORDER BY w.created_at DESC, w.id DESC
       LIMIT 500`,
      params,
    );

    const successTotalRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM withdrawals WHERE status = 1`,
    );
    const filteredSuccessRows = await this.dataSource.query(
      `SELECT COALESCE(SUM(w.amount), 0) AS total
       FROM withdrawals w
       LEFT JOIN users u ON u.id = w.user_id
       ${whereSql ? `${whereSql} AND w.status = 1` : 'WHERE w.status = 1'}`,
      params,
    );
    const matchedUserRows = keyword
      ? await this.dataSource.query(
          `SELECT COALESCE(SUM(t.successTotal), 0) AS total, COUNT(*) AS userCount
           FROM (
             SELECT mu.id, COALESCE(s.successTotal, 0) AS successTotal
             FROM (
               SELECT DISTINCT u.id
               FROM users u
               LEFT JOIN withdrawals wx ON wx.user_id = u.id
               WHERE ${
                 Number.isFinite(Number(keyword)) && Number(keyword) > 0
                   ? 'u.id = ? OR u.account LIKE ? OR u.nickname LIKE ? OR wx.account_name LIKE ? OR wx.account_number LIKE ?'
                   : 'u.account LIKE ? OR u.nickname LIKE ? OR wx.account_name LIKE ? OR wx.account_number LIKE ?'
               }
             ) mu
             LEFT JOIN (
               SELECT user_id, SUM(amount) AS successTotal
               FROM withdrawals
               WHERE status = 1
               GROUP BY user_id
             ) s ON s.user_id = mu.id
           ) t`,
          Number.isFinite(Number(keyword)) && Number(keyword) > 0
            ? [Number(keyword), `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
            : [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`],
        )
      : [{ total: 0, userCount: 0 }];

    return {
      list,
      stats: {
        successTotal: Number(successTotalRows?.[0]?.total || 0),
        filteredSuccessTotal: Number(filteredSuccessRows?.[0]?.total || 0),
        matchedUserSuccessTotal: Number(matchedUserRows?.[0]?.total || 0),
        matchedUserCount: Number(matchedUserRows?.[0]?.userCount || 0),
      },
    };
  }
  async reviewWithdrawal(id: number, approve: boolean) {
    return this.currencyService.reviewWithdrawal(id, approve);
  }

  // ===== 充值订单管理 =====
  async getRechargeOrders(query: any) {
    return this.rechargeService.adminList(query);
  }
  async reviewRecharge(id: number, operatorId: number, data: { action: 'approve' | 'reject'; remark?: string }) {
    return this.rechargeService.adminReview(id, operatorId, data);
  }
  async sendRechargeActivationCode(id: number, operatorId: number, data: { code?: string }) {
    return this.rechargeService.adminSendActivationCode(id, operatorId, data);
  }
  async getRechargeStats() {
    return this.rechargeService.adminStats();
  }

  // ===== 系统配置 =====
  async getConfigs() {
    return this.currencyService.getAllConfigs();
  }
  async updateConfig(key: string, value: string) {
    return this.currencyService.updateConfig(key, value);
  }
  async backfillLegacyRewardMechanisms(data: any) {
    return this.currencyService.backfillLegacyRewardMechanisms(data || {});
  }

  private safePositiveInt(value: any, fallback: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(Math.floor(parsed), max);
  }

  private formatAdminDate(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private normalizeAdminDate(value: any, fallback: string) {
    const text = String(value || '').trim();
    if (!text) return fallback;
    const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!matched) throw new BadRequestException('日期格式应为 YYYY-MM-DD');
    const year = Number(matched[1]);
    const month = Number(matched[2]);
    const day = Number(matched[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      throw new BadRequestException('查询日期无效');
    }
    return text;
  }

  private getGameDurationFilters(query: any) {
    const today = new Date();
    const defaultEndDate = this.formatAdminDate(today);
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - 6);
    const startDate = this.normalizeAdminDate(
      query.startDate,
      this.formatAdminDate(defaultStart),
    );
    const endDate = this.normalizeAdminDate(query.endDate, defaultEndDate);
    if (startDate > endDate) {
      throw new BadRequestException('开始日期不能晚于结束日期');
    }

    const where = ['s.play_date BETWEEN ? AND ?'];
    const params: any[] = [startDate, endDate];
    const keyword = String(query.keyword || '').trim();
    if (keyword) {
      where.push('(u.id = ? OR u.account LIKE ? OR u.nickname LIKE ?)');
      params.push(Number(keyword) || 0, `%${keyword}%`, `%${keyword}%`);
    }
    const gameId = Number(query.gameId || 0);
    if (Number.isInteger(gameId) && gameId > 0) {
      where.push('s.game_id = ?');
      params.push(gameId);
    }
    return {
      startDate,
      endDate,
      gameId: gameId > 0 ? gameId : 0,
      where,
      params,
    };
  }

  private roundAdminPoints(value: number) {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }

  private calculateWeeklyReturnProjection(row: any) {
    const status = Number(row.status || 0);
    const paidDays = Math.max(0, Math.min(7, Number(row.paidDays ?? row.paid_days ?? 0)));
    const multiplier = Number(row.multiplier || 0);
    const dailyRate = Number(row.dailyRate ?? row.daily_rate ?? 0);
    let base = this.roundAdminPoints(
      Math.max(0, Number(row.remainingBasePoints ?? row.remaining_base_points ?? 0)),
    );

    if (status !== 0 || paidDays >= 7 || multiplier <= 0 || dailyRate <= 0 || base <= 0) {
      return { unpaidDays: 0, nextReturnAmount: 0, pendingReturnPoints: 0 };
    }

    let pendingReturnPoints = 0;
    let nextReturnAmount = 0;
    for (let day = paidDays + 1; day <= 7; day += 1) {
      const amount = this.roundAdminPoints(base * multiplier * dailyRate);
      if (amount <= 0) break;
      if (nextReturnAmount <= 0) nextReturnAmount = amount;
      pendingReturnPoints = this.roundAdminPoints(pendingReturnPoints + amount);
      base = this.roundAdminPoints(Math.max(0, base - amount));
    }

    return {
      unpaidDays: Math.max(0, 7 - paidDays),
      nextReturnAmount,
      pendingReturnPoints,
    };
  }

  private async getLatestWeeklyPointReturnPeriodId() {
    const rows = await this.dataSource.query(
      `SELECT id FROM weekly_point_return_periods ORDER BY week_start_date DESC LIMIT 1`,
    );
    return Number(rows?.[0]?.id || 0);
  }

  async getWeeklyPointReturnOverview(query: any) {
    await this.currencyService.ensureDefaultConfigs();
    const page = this.safePositiveInt(query.page, 1, 100000);
    const pageSize = this.safePositiveInt(query.pageSize, 20, 100);
    const offset = (page - 1) * pageSize;

    const totalRows = await this.dataSource.query(
      `SELECT COUNT(*) AS total FROM weekly_point_return_periods`,
    );
    const total = Number(totalRows?.[0]?.total || 0);

    const periods = await this.dataSource.query(
      `SELECT
         p.id,
         DATE_FORMAT(p.week_start_date, '%Y-%m-%d') AS weekStartDate,
         DATE_FORMAT(p.week_end_date, '%Y-%m-%d') AS weekEndDate,
         DATE_FORMAT(p.week_start_at, '%Y-%m-%d %H:%i:%s') AS weekStartAt,
         DATE_FORMAT(p.week_end_at, '%Y-%m-%d %H:%i:%s') AS weekEndAt,
         DATE_FORMAT(p.settlement_started_at, '%Y-%m-%d %H:%i:%s') AS settlementStartedAt,
         p.multiplier,
         p.daily_rate AS dailyRate,
         p.excluded_log_types AS excludedLogTypes,
         p.status,
         COUNT(a.id) AS accountCount,
         SUM(CASE WHEN a.eligible_consumed_points > 0 THEN 1 ELSE 0 END) AS activeUsers,
         SUM(CASE WHEN a.status = 0 THEN 1 ELSE 0 END) AS pendingUsers,
         ROUND(COALESCE(SUM(a.eligible_consumed_points), 0), 6) AS eligibleConsumedPoints,
         ROUND(COALESCE(SUM(a.excluded_consumed_points), 0), 6) AS excludedConsumedPoints,
         ROUND(COALESCE(SUM(a.total_returned_points), 0), 6) AS returnedPoints,
         ROUND(COALESCE(SUM(a.remaining_base_points), 0), 6) AS remainingBasePoints,
         COALESCE(d.dailyRecordCount, 0) AS dailyRecordCount,
         ROUND(COALESCE(d.dailyReturnedPoints, 0), 6) AS dailyReturnedPoints,
         DATE_FORMAT(p.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
         DATE_FORMAT(p.updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
       FROM weekly_point_return_periods p
       LEFT JOIN weekly_point_return_accounts a ON a.period_id = p.id
       LEFT JOIN (
         SELECT period_id, COUNT(*) AS dailyRecordCount, SUM(return_amount) AS dailyReturnedPoints
         FROM weekly_point_return_daily_records
         GROUP BY period_id
       ) d ON d.period_id = p.id
       GROUP BY
         p.id, p.week_start_date, p.week_end_date, p.week_start_at, p.week_end_at,
         p.settlement_started_at, p.multiplier, p.daily_rate, p.excluded_log_types,
         p.status, p.created_at, p.updated_at, d.dailyRecordCount, d.dailyReturnedPoints
       ORDER BY p.week_start_date DESC
       LIMIT ${offset}, ${pageSize}`,
    );

    const periodIds = periods.map((item: any) => Number(item.id)).filter(Boolean);
    const pendingByPeriod = new Map<number, number>();
    if (periodIds.length > 0) {
      const accountRows = await this.dataSource.query(
        `SELECT period_id AS periodId, remaining_base_points AS remainingBasePoints,
                paid_days AS paidDays, multiplier, daily_rate AS dailyRate, status
         FROM weekly_point_return_accounts
         WHERE period_id IN (${periodIds.map(() => '?').join(',')})`,
        periodIds,
      );
      for (const row of accountRows) {
        const periodId = Number(row.periodId);
        const projection = this.calculateWeeklyReturnProjection(row);
        pendingByPeriod.set(
          periodId,
          this.roundAdminPoints((pendingByPeriod.get(periodId) || 0) + projection.pendingReturnPoints),
        );
      }
    }

    const summaryRows = await this.dataSource.query(
      `SELECT
         COUNT(*) AS accountCount,
         SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS pendingUsers,
         ROUND(COALESCE(SUM(eligible_consumed_points), 0), 6) AS eligibleConsumedPoints,
         ROUND(COALESCE(SUM(excluded_consumed_points), 0), 6) AS excludedConsumedPoints,
         ROUND(COALESCE(SUM(total_returned_points), 0), 6) AS returnedPoints,
         ROUND(COALESCE(SUM(CASE
           WHEN status = 0 AND paid_days < 7 THEN
             remaining_base_points * (1 - POW(1 - (multiplier * daily_rate), 7 - paid_days))
           ELSE 0
         END), 0), 6) AS pendingReturnPoints
       FROM weekly_point_return_accounts`,
    );
    const summaryRow = summaryRows?.[0] || {};

    const mappedPeriods = periods.map((row: any) => {
      const eligible = this.roundAdminPoints(Number(row.eligibleConsumedPoints || 0));
      const excluded = this.roundAdminPoints(Number(row.excludedConsumedPoints || 0));
      const returned = this.roundAdminPoints(Number(row.returnedPoints || 0));
      const pending = this.roundAdminPoints(pendingByPeriod.get(Number(row.id)) || 0);
      return {
        ...row,
        id: Number(row.id),
        status: Number(row.status),
        accountCount: Number(row.accountCount || 0),
        activeUsers: Number(row.activeUsers || 0),
        pendingUsers: Number(row.pendingUsers || 0),
        eligibleConsumedPoints: eligible,
        excludedConsumedPoints: excluded,
        totalConsumedPoints: this.roundAdminPoints(eligible + excluded),
        returnedPoints: returned,
        remainingBasePoints: this.roundAdminPoints(Number(row.remainingBasePoints || 0)),
        pendingReturnPoints: pending,
        expectedReturnPoints: this.roundAdminPoints(returned + pending),
        dailyRecordCount: Number(row.dailyRecordCount || 0),
        dailyReturnedPoints: this.roundAdminPoints(Number(row.dailyReturnedPoints || 0)),
      };
    });

    const totalEligible = this.roundAdminPoints(Number(summaryRow.eligibleConsumedPoints || 0));
    const totalExcluded = this.roundAdminPoints(Number(summaryRow.excludedConsumedPoints || 0));
    const totalReturned = this.roundAdminPoints(Number(summaryRow.returnedPoints || 0));
    const totalPending = this.roundAdminPoints(Number(summaryRow.pendingReturnPoints || 0));

    return {
      summary: {
        periodCount: total,
        accountCount: Number(summaryRow.accountCount || 0),
        pendingUsers: Number(summaryRow.pendingUsers || 0),
        eligibleConsumedPoints: totalEligible,
        excludedConsumedPoints: totalExcluded,
        totalConsumedPoints: this.roundAdminPoints(totalEligible + totalExcluded),
        returnedPoints: totalReturned,
        pendingReturnPoints: totalPending,
        expectedReturnPoints: this.roundAdminPoints(totalReturned + totalPending),
        latestPeriodId: mappedPeriods[0]?.id || 0,
      },
      periods: mappedPeriods,
      total,
      page,
      pageSize,
    };
  }

  async getWeeklyPointReturnAccounts(query: any) {
    await this.currencyService.ensureDefaultConfigs();
    const page = this.safePositiveInt(query.page, 1, 100000);
    const pageSize = this.safePositiveInt(query.pageSize, 20, 100);
    const offset = (page - 1) * pageSize;
    const periodId = Number(query.periodId || 0) || await this.getLatestWeeklyPointReturnPeriodId();
    if (!periodId) {
      return { list: [], total: 0, page, pageSize, period: null };
    }

    const where = ['a.period_id = ?'];
    const params: any[] = [periodId];
    const keyword = String(query.keyword || '').trim();
    if (keyword) {
      where.push('(u.id = ? OR u.account LIKE ? OR u.nickname LIKE ?)');
      params.push(Number(keyword) || 0, `%${keyword}%`, `%${keyword}%`);
    }
    if (query.status !== undefined && query.status !== '') {
      where.push('a.status = ?');
      params.push(Number(query.status));
    }

    const whereSql = where.join(' AND ');
    const totalRows = await this.dataSource.query(
      `SELECT COUNT(*) AS total
       FROM weekly_point_return_accounts a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE ${whereSql}`,
      params,
    );
    const total = Number(totalRows?.[0]?.total || 0);

    const listRows = await this.dataSource.query(
      `SELECT
         a.id,
         a.period_id AS periodId,
         a.user_id AS userId,
         u.account,
         u.nickname,
         u.is_activated AS isActivated,
         u.activation_amount AS activationAmount,
         DATE_FORMAT(p.week_start_date, '%Y-%m-%d') AS weekStartDate,
         DATE_FORMAT(p.week_end_date, '%Y-%m-%d') AS weekEndDate,
         a.eligible_consumed_points AS eligibleConsumedPoints,
         a.excluded_consumed_points AS excludedConsumedPoints,
         a.remaining_base_points AS remainingBasePoints,
         a.total_returned_points AS returnedPoints,
         a.paid_days AS paidDays,
         a.multiplier,
         a.daily_rate AS dailyRate,
         a.status,
         DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
         DATE_FORMAT(a.updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
       FROM weekly_point_return_accounts a
       LEFT JOIN weekly_point_return_periods p ON p.id = a.period_id
       LEFT JOIN users u ON u.id = a.user_id
       WHERE ${whereSql}
       ORDER BY a.id DESC
       LIMIT ${offset}, ${pageSize}`,
      params,
    );

    const periodRows = await this.dataSource.query(
      `SELECT id, DATE_FORMAT(week_start_date, '%Y-%m-%d') AS weekStartDate,
              DATE_FORMAT(week_end_date, '%Y-%m-%d') AS weekEndDate,
              multiplier, daily_rate AS dailyRate, status
       FROM weekly_point_return_periods
       WHERE id = ?
       LIMIT 1`,
      [periodId],
    );

    const list = listRows.map((row: any) => {
      const eligible = this.roundAdminPoints(Number(row.eligibleConsumedPoints || 0));
      const excluded = this.roundAdminPoints(Number(row.excludedConsumedPoints || 0));
      const returned = this.roundAdminPoints(Number(row.returnedPoints || 0));
      const projection = this.calculateWeeklyReturnProjection(row);
      return {
        ...row,
        id: Number(row.id),
        periodId: Number(row.periodId),
        userId: Number(row.userId),
        isActivated: Boolean(row.isActivated),
        activationAmount: row.activationAmount === null ? null : Number(row.activationAmount),
        status: Number(row.status),
        paidDays: Number(row.paidDays || 0),
        multiplier: Number(row.multiplier || 0),
        dailyRate: Number(row.dailyRate || 0),
        eligibleConsumedPoints: eligible,
        excludedConsumedPoints: excluded,
        totalConsumedPoints: this.roundAdminPoints(eligible + excluded),
        lastWeekConsumedPoints: this.roundAdminPoints(eligible + excluded),
        remainingBasePoints: this.roundAdminPoints(Number(row.remainingBasePoints || 0)),
        returnedPoints: returned,
        pendingReturnPoints: projection.pendingReturnPoints,
        currentWeekPendingReturnPoints: projection.pendingReturnPoints,
        expectedReturnPoints: this.roundAdminPoints(returned + projection.pendingReturnPoints),
        nextReturnAmount: projection.nextReturnAmount,
        unpaidDays: projection.unpaidDays,
      };
    });

    return {
      list,
      total,
      page,
      pageSize,
      period: periodRows?.[0]
        ? {
            ...periodRows[0],
            id: Number(periodRows[0].id),
            status: Number(periodRows[0].status),
            multiplier: Number(periodRows[0].multiplier || 0),
            dailyRate: Number(periodRows[0].dailyRate || 0),
          }
        : null,
    };
  }

  async getWeeklyPointReturnAccountDaily(accountId: number) {
    await this.currencyService.ensureDefaultConfigs();
    const accountRows = await this.dataSource.query(
      `SELECT
         a.id,
         a.period_id AS periodId,
         a.user_id AS userId,
         u.account,
         u.nickname,
         DATE_FORMAT(p.week_start_date, '%Y-%m-%d') AS weekStartDate,
         DATE_FORMAT(p.week_end_date, '%Y-%m-%d') AS weekEndDate,
         a.eligible_consumed_points AS eligibleConsumedPoints,
         a.excluded_consumed_points AS excludedConsumedPoints,
         a.remaining_base_points AS remainingBasePoints,
         a.total_returned_points AS returnedPoints,
         a.paid_days AS paidDays,
         a.multiplier,
         a.daily_rate AS dailyRate,
         a.status
       FROM weekly_point_return_accounts a
       LEFT JOIN weekly_point_return_periods p ON p.id = a.period_id
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.id = ?
       LIMIT 1`,
      [accountId],
    );
    const account = accountRows?.[0];
    if (!account) throw new NotFoundException('返还账户不存在');

    const records = await this.dataSource.query(
      `SELECT
         r.id,
         DATE_FORMAT(r.return_date, '%Y-%m-%d') AS returnDate,
         r.day_index AS dayIndex,
         r.base_before_return AS baseBeforeReturn,
         r.multiplier,
         r.daily_rate AS dailyRate,
         r.return_amount AS returnAmount,
         r.base_after_return AS baseAfterReturn,
         r.currency_log_id AS currencyLogId,
         r.status,
         l.sn AS currencyLogSn,
         DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM weekly_point_return_daily_records r
       LEFT JOIN currency_logs l ON l.id = r.currency_log_id
       WHERE r.account_id = ?
       ORDER BY r.day_index ASC, r.id ASC`,
      [accountId],
    );

    const projection = this.calculateWeeklyReturnProjection(account);
    const eligible = this.roundAdminPoints(Number(account.eligibleConsumedPoints || 0));
    const excluded = this.roundAdminPoints(Number(account.excludedConsumedPoints || 0));
    const returned = this.roundAdminPoints(Number(account.returnedPoints || 0));

    return {
      account: {
        ...account,
        id: Number(account.id),
        periodId: Number(account.periodId),
        userId: Number(account.userId),
        status: Number(account.status),
        paidDays: Number(account.paidDays || 0),
        multiplier: Number(account.multiplier || 0),
        dailyRate: Number(account.dailyRate || 0),
        eligibleConsumedPoints: eligible,
        excludedConsumedPoints: excluded,
        totalConsumedPoints: this.roundAdminPoints(eligible + excluded),
        remainingBasePoints: this.roundAdminPoints(Number(account.remainingBasePoints || 0)),
        returnedPoints: returned,
        pendingReturnPoints: projection.pendingReturnPoints,
        expectedReturnPoints: this.roundAdminPoints(returned + projection.pendingReturnPoints),
        nextReturnAmount: projection.nextReturnAmount,
        unpaidDays: projection.unpaidDays,
      },
      records: records.map((row: any) => ({
        ...row,
        id: Number(row.id),
        dayIndex: Number(row.dayIndex),
        status: Number(row.status),
        baseBeforeReturn: this.roundAdminPoints(Number(row.baseBeforeReturn || 0)),
        multiplier: Number(row.multiplier || 0),
        dailyRate: Number(row.dailyRate || 0),
        returnAmount: this.roundAdminPoints(Number(row.returnAmount || 0)),
        baseAfterReturn: this.roundAdminPoints(Number(row.baseAfterReturn || 0)),
        currencyLogId: row.currencyLogId ? Number(row.currencyLogId) : null,
      })),
    };
  }

  // ===== 游戏时长统计 =====
  async getGameDurationOverview(query: any) {
    await this.currencyService.ensureDefaultConfigs();
    const filters = this.getGameDurationFilters(query);
    const rows = await this.dataSource.query(
      `SELECT
         COUNT(*) AS sessionCount,
         COUNT(DISTINCT s.user_id) AS activeUsers,
         COUNT(DISTINCT s.game_id) AS activeGames,
         COALESCE(SUM(s.duration_seconds), 0) AS totalSeconds,
         COALESCE(SUM(s.copper_reward), 0) AS rewardedCopper
       FROM game_play_sessions s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE ${filters.where.join(' AND ')}`,
      filters.params,
    );
    const configRows = await this.dataSource.query(
      `SELECT config_key AS configKey, config_value AS configValue
       FROM system_configs
       WHERE config_key IN ('game_copper_minutes_per_coin', 'game_copper_daily_max')`,
    );
    const config = new Map(
      (configRows || []).map((row: any) => [
        String(row.configKey),
        Number(row.configValue || 0),
      ]),
    );
    const summary = rows?.[0] || {};
    return {
      startDate: filters.startDate,
      endDate: filters.endDate,
      activeUsers: Number(summary.activeUsers || 0),
      activeGames: Number(summary.activeGames || 0),
      sessionCount: Number(summary.sessionCount || 0),
      totalSeconds: Number(summary.totalSeconds || 0),
      rewardedCopper: Number(summary.rewardedCopper || 0),
      minutesPerCoin: config.get('game_copper_minutes_per_coin') || 15,
      dailyMax: config.get('game_copper_daily_max') || 2,
    };
  }

  async getGameDurationDaily(query: any) {
    const page = this.safePositiveInt(query.page, 1, 100000);
    const pageSize = this.safePositiveInt(query.pageSize, 20, 100);
    const offset = (page - 1) * pageSize;
    const filters = this.getGameDurationFilters(query);
    const whereSql = filters.where.join(' AND ');

    const totalRows = await this.dataSource.query(
      `SELECT COUNT(*) AS total
       FROM (
         SELECT s.user_id, s.play_date
         FROM game_play_sessions s
         LEFT JOIN users u ON u.id = s.user_id
         WHERE ${whereSql}
         GROUP BY s.user_id, s.play_date
       ) grouped_duration_rows`,
      filters.params,
    );
    const total = Number(totalRows?.[0]?.total || 0);
    const rows = await this.dataSource.query(
      `SELECT
         s.user_id AS userId,
         u.account,
         u.nickname,
         DATE_FORMAT(s.play_date, '%Y-%m-%d') AS playDate,
         COUNT(*) AS sessionCount,
         COUNT(DISTINCT s.game_id) AS gameCount,
         GROUP_CONCAT(DISTINCT g.name ORDER BY g.name SEPARATOR '、') AS gameNames,
         COALESCE(SUM(s.duration_seconds), 0) AS totalSeconds,
         COALESCE(SUM(s.copper_reward), 0) AS rewardedCopper,
         DATE_FORMAT(MAX(s.created_at), '%Y-%m-%d %H:%i:%s') AS latestSessionAt
       FROM game_play_sessions s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN games g ON g.id = s.game_id
       WHERE ${whereSql}
       GROUP BY s.user_id, s.play_date, u.account, u.nickname
       ORDER BY s.play_date DESC, totalSeconds DESC, s.user_id DESC
       LIMIT ${offset}, ${pageSize}`,
      filters.params,
    );

    return {
      list: (rows || []).map((row: any) => ({
        ...row,
        userId: Number(row.userId),
        sessionCount: Number(row.sessionCount || 0),
        gameCount: Number(row.gameCount || 0),
        totalSeconds: Number(row.totalSeconds || 0),
        rewardedCopper: Number(row.rewardedCopper || 0),
      })),
      total,
      page,
      pageSize,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
  }

  async getGameDurationGames() {
    const rows = await this.dataSource.query(
      `SELECT id, name, status
       FROM games
       ORDER BY sort_order ASC, id ASC`,
    );
    return (rows || []).map((row: any) => ({
      id: Number(row.id),
      name: row.name,
      status: Number(row.status),
    }));
  }

  async getGameDurationSessions(userId: number, query: any) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');
    const page = this.safePositiveInt(query.page, 1, 100000);
    const pageSize = this.safePositiveInt(query.pageSize, 20, 100);
    const offset = (page - 1) * pageSize;
    const requestedDate = String(query.date || '').trim();
    const filters = this.getGameDurationFilters({
      startDate: requestedDate || query.startDate,
      endDate: requestedDate || query.endDate,
      gameId: query.gameId,
    });
    filters.where.push('s.user_id = ?');
    filters.params.push(userId);
    const whereSql = filters.where.join(' AND ');

    const totalRows = await this.dataSource.query(
      `SELECT COUNT(*) AS total
       FROM game_play_sessions s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE ${whereSql}`,
      filters.params,
    );
    const summaryRows = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(s.duration_seconds), 0) AS totalSeconds,
         COALESCE(SUM(s.copper_reward), 0) AS rewardedCopper,
         COUNT(DISTINCT s.game_id) AS gameCount
       FROM game_play_sessions s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE ${whereSql}`,
      filters.params,
    );
    const rows = await this.dataSource.query(
      `SELECT
         s.id,
         s.session_id AS sessionId,
         s.game_id AS gameId,
         g.name AS gameName,
         DATE_FORMAT(s.play_date, '%Y-%m-%d') AS playDate,
         s.duration_seconds AS durationSeconds,
         s.copper_reward AS copperReward,
         s.currency_log_id AS currencyLogId,
         l.sn AS currencyLogSn,
         DATE_FORMAT(s.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
       FROM game_play_sessions s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN games g ON g.id = s.game_id
       LEFT JOIN currency_logs l ON l.id = s.currency_log_id
       WHERE ${whereSql}
       ORDER BY s.created_at DESC, s.id DESC
       LIMIT ${offset}, ${pageSize}`,
      filters.params,
    );
    const summary = summaryRows?.[0] || {};

    return {
      user: { id: user.id, account: user.account, nickname: user.nickname },
      summary: {
        totalSeconds: Number(summary.totalSeconds || 0),
        rewardedCopper: Number(summary.rewardedCopper || 0),
        gameCount: Number(summary.gameCount || 0),
      },
      list: (rows || []).map((row: any) => ({
        ...row,
        id: Number(row.id),
        gameId: row.gameId ? Number(row.gameId) : null,
        durationSeconds: Number(row.durationSeconds || 0),
        copperReward: Number(row.copperReward || 0),
        currencyLogId: row.currencyLogId ? Number(row.currencyLogId) : null,
      })),
      total: Number(totalRows?.[0]?.total || 0),
      page,
      pageSize,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
  }

  // ===== 分销 =====
  async getAgents(query: any) {
    if (query.id) return this.agentRepo.find({ where: { id: query.id } });
    return this.agentRepo.find();
  }
  async getAgentUsers(agentId: number) {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('代理不存在');
    return this.userRepo.find({ where: { invitedBy: agent.userId } });
  }

  // ===== 邀请关系 =====
  async getInviteTreeByKeyword(keyword: string) {
    const trimmedKeyword = keyword?.trim();
    if (!trimmedKeyword) throw new NotFoundException('请输入用户名或账号');

    const user =
      (await this.userRepo.findOne({ where: { account: trimmedKeyword } })) ??
      (await this.userRepo.findOne({
        where: { nickname: trimmedKeyword },
        order: { id: 'ASC' },
      }));

    if (!user) throw new NotFoundException('用户不存在');

    return this.getInviteTree(user.id);
  }

  async getInviteTree(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    // 直推：注册时填写当前用户邀请码的用户
    const direct = await this.userRepo.find({ where: { invitedBy: userId } });
    // 团推：直推用户拉的新用户
    const directIds = direct.map((u) => u.id);
    let team: any[] = [];
    if (directIds.length > 0) {
      team = await this.userRepo
        .createQueryBuilder('u')
        .where('u.invited_by IN (:...ids)', { ids: directIds })
        .getMany();
    }

    return {
      user: { id: user.id, nickname: user.nickname, account: user.account },
      directCount: direct.length,
      teamCount: team.length,
      directInvitees: direct.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        account: u.account,
        registerTime: u.registerTime,
      })),
      teamInvitees: team.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        account: u.account,
        invitedBy: u.invitedBy,
        registerTime: u.registerTime,
      })),
      indirectInvitees: team.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        account: u.account,
        invitedBy: u.invitedBy,
        registerTime: u.registerTime,
      })),
    };
  }

  async getInviteRecordsAdmin(query: any) {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.invited_by IS NOT NULL')
      .orderBy('u.register_time', 'DESC');
    if (query.inviterId) {
      qb.andWhere('u.invited_by = :inviterId', { inviterId: query.inviterId });
    }
    return qb.take(100).getMany();
  }

  // ===== 矩阵推广管理 =====
  async getMatrixList(query: any, pagination: PaginationDto) {
    const qb = this.matrixRepo.createQueryBuilder('m');
    if (query.ownerId)
      qb.where('m.owner_id = :ownerId', { ownerId: query.ownerId });
    if (query.status)
      qb.andWhere('m.status = :status', { status: query.status });
    const total = await qb.getCount();
    const list = await qb
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .orderBy('m.id', 'DESC')
      .getMany();

    // 附加用户昵称
    const ownerIds = [...new Set(list.map((m) => m.ownerId))];
    const users =
      ownerIds.length > 0
        ? await this.userRepo
            .createQueryBuilder('u')
            .where('u.id IN (:...ids)', { ids: ownerIds })
            .getMany()
        : [];
    const userMap = new Map(users.map((u) => [Number(u.id), u]));
    const withdrawalTotalMap = await this.getWithdrawalTotalMap(ownerIds);
    const directStatsMap = await this.getDirectInviteStatsMap(ownerIds);

    return {
      list: list.map((m) => ({
        ...m,
        ownerNickname: userMap.get(Number(m.ownerId))?.nickname || '',
        ownerAccount: userMap.get(Number(m.ownerId))?.account || '',
        totalWithdrawn: withdrawalTotalMap.get(Number(m.ownerId)) || 0,
        directUserCount: directStatsMap.get(Number(m.ownerId))?.total || 0,
        activatedDirectUserCount: directStatsMap.get(Number(m.ownerId))?.activated || 0,
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  private async getDirectInviteStatsMap(userIds: number[]) {
    const ids = [...new Set((userIds || []).map((id) => Number(id)).filter((id) => id > 0))];
    const result = new Map<number, { total: number; activated: number }>();
    if (!ids.length) return result;
    const placeholders = ids.map(() => '?').join(',');
    const rows = await this.dataSource.query(
      `SELECT invited_by AS inviterId,
              COUNT(1) AS total,
              SUM(CASE WHEN is_activated = 1 THEN 1 ELSE 0 END) AS activated
       FROM users
       WHERE invited_by IN (${placeholders})
       GROUP BY invited_by`,
      ids,
    );
    for (const row of rows || []) {
      result.set(Number(row.inviterId), {
        total: Number(row.total || 0),
        activated: Number(row.activated || 0),
      });
    }
    return result;
  }

  private async getWithdrawalTotalMap(userIds: number[]) {
    const ids = [...new Set((userIds || []).map((id) => Number(id)).filter((id) => id > 0))];
    const result = new Map<number, number>();
    if (!ids.length) return result;
    const placeholders = ids.map(() => '?').join(',');
    const rows = await this.dataSource.query(
      `SELECT user_id AS userId, COALESCE(SUM(amount), 0) AS total
       FROM withdrawals
       WHERE status = 1 AND user_id IN (${placeholders})
       GROUP BY user_id`,
      ids,
    );
    for (const row of rows || []) {
      result.set(Number(row.userId), Number(row.total || 0));
    }
    return result;
  }

  async getMatrixWithdrawals(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: Number(userId) } });
    if (!user) throw new NotFoundException('用户不存在');
    const list = await this.withdrawalRepo.find({
      where: { userId: Number(userId), status: 1 },
      order: { reviewTime: 'DESC', createdAt: 'DESC' },
    });
    return {
      user: {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
      },
      totalWithdrawn: list.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      list,
    };
  }

  async getMatrixDirectUsers(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: Number(userId) } });
    if (!user) throw new NotFoundException('用户不存在');

    const list = await this.userRepo
      .createQueryBuilder('u')
      .where('u.invited_by = :userId', { userId: Number(userId) })
      .orderBy('u.register_time', 'DESC')
      .addOrderBy('u.id', 'DESC')
      .getMany();

    const activatedCount = list.filter((item) => item.isActivated === true || Number(item.isActivated) === 1).length;
    return {
      user: {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
        inviteCode: user.inviteCode,
        isActivated: user.isActivated,
        activationAmount: user.activationAmount,
      },
      total: list.length,
      activatedCount,
      inactiveCount: list.length - activatedCount,
      list: list.map((item) => ({
        id: item.id,
        account: item.account,
        nickname: item.nickname,
        inviteCode: item.inviteCode,
        status: item.status,
        isActivated: item.isActivated,
        activationAmount: item.activationAmount,
        registerTime: item.registerTime,
        loginTime: item.loginTime,
      })),
    };
  }

  async getMatrixDetail(matrixId: number) {
    const matrix = await this.matrixRepo.findOne({ where: { id: matrixId } });
    if (!matrix) throw new NotFoundException('矩阵不存在');

    const slots = await this.matrixSlotRepo.find({
      where: { matrixId },
      order: { slotNumber: 'ASC' },
    });

    // 获取坑位用户信息
    const userIds = slots.map((s) => s.userId);
    const users =
      userIds.length > 0
        ? await this.userRepo
            .createQueryBuilder('u')
            .where('u.id IN (:...ids)', { ids: userIds })
            .getMany()
        : [];
    const userMap = new Map(users.map((u) => [Number(u.id), u]));

    const owner = await this.userRepo.findOne({
      where: { id: matrix.ownerId },
    });

    return {
      matrix: {
        ...matrix,
        ownerNickname: owner?.nickname,
        ownerAccount: owner?.account,
      },
      slots: slots.map((s) => ({
        ...s,
        userNickname: userMap.get(Number(s.userId))?.nickname || '',
        userAccount: userMap.get(Number(s.userId))?.account || '',
        userActivationAmount: userMap.get(Number(s.userId))?.activationAmount || null,
      })),
    };
  }

  async getMatrixIncomes(query: any, pagination: PaginationDto) {
    const qb = this.matrixIncomeRepo.createQueryBuilder('i');
    if (query.ownerId)
      qb.where('i.owner_id = :ownerId', { ownerId: query.ownerId });
    if (query.incomeType)
      qb.andWhere('i.income_type = :type', { type: query.incomeType });
    const total = await qb.getCount();
    const list = await qb
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .orderBy('i.created_at', 'DESC')
      .getMany();

    // 附加用户信息
    const allUserIds = [
      ...new Set([
        ...list.map((i) => i.ownerId),
        ...list.map((i) => i.fromUserId),
      ]),
    ];
    const users =
      allUserIds.length > 0
        ? await this.userRepo
            .createQueryBuilder('u')
            .where('u.id IN (:...ids)', { ids: allUserIds })
            .getMany()
        : [];
    const userMap = new Map(users.map((u) => [Number(u.id), u]));
    const withdrawalTotalMap = await this.getWithdrawalTotalMap(allUserIds);

    return {
      list: list.map((i) => ({
        ...i,
        ownerNickname: userMap.get(Number(i.ownerId))?.nickname || '',
        ownerActivationAmount: i.ownerActivationAmount || userMap.get(Number(i.ownerId))?.activationAmount || null,
        fromUserNickname: userMap.get(Number(i.fromUserId))?.nickname || '',
        fromUserActivationAmount: i.sourceActivationAmount || userMap.get(Number(i.fromUserId))?.activationAmount || null,
        ownerTotalWithdrawn: withdrawalTotalMap.get(Number(i.ownerId)) || 0,
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async getMatrixStats() {
    const totalMatrices = await this.matrixRepo.count();
    const activeMatrices = await this.matrixRepo.count({
      where: { status: 1 },
    });
    const completedMatrices = await this.matrixRepo.count({
      where: { status: 2 },
    });
    const totalIncome = await this.matrixIncomeRepo
      .createQueryBuilder('i')
      .select('SUM(i.amount)', 'total')
      .getRawOne();
    const claimedIncome = await this.matrixIncomeRepo
      .createQueryBuilder('i')
      .select('SUM(i.amount)', 'total')
      .where('i.is_claimed = true')
      .getRawOne();
    return {
      totalMatrices,
      activeMatrices,
      completedMatrices,
      totalIncome: Number(totalIncome?.total || 0),
      claimedIncome: Number(claimedIncome?.total || 0),
    };
  }

  // ===== 社交/会议管理 =====
  async getAdminMessages(query: any) {
    return this.meetingService.adminListMessages(query);
  }
  async deleteAdminMessage(id: number) {
    return this.meetingService.adminDeleteMessage(id);
  }
  async getAdminMeetings(query: any) {
    return this.meetingService.adminListMeetings(query);
  }
  async endAdminMeeting(id: number) {
    const result = await this.meetingService.adminEndMeeting(id);
    this.meetingGateway.notifyMeeting(id, 'meeting:ended', {
      meetingId: id,
      operatorId: 0,
      force: true,
    });
    return result;
  }
  async updateMeetingRecording(id: number, recordingUrl: string) {
    return this.meetingService.adminUpdateRecording(id, recordingUrl);
  }
  async cleanSocialData(days?: number) {
    return this.meetingService.adminCleanExpired(days);
  }

  // ===== 建群审核 =====
  /** 获取待审核群列表 */
  async getPendingGroups(pagination: PaginationDto) {
    const qb = this.conversationRepo.createQueryBuilder('c')
      .where('c.type = 2 AND c.status = 0')
      .orderBy('c.created_at', 'DESC');
    const total = await qb.getCount();
    const list = await qb
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .getMany();
    return { list, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  /** 审核群聊（通过/拒绝） */
  async reviewGroup(groupId: number, action: 'approve' | 'reject') {
    const conv = await this.conversationRepo.findOne({ where: { id: groupId, type: 2 } });
    if (!conv) throw new NotFoundException('群聊不存在');
    if (action === 'approve') {
      await this.conversationRepo.update(groupId, { status: 1 });
      return { message: '已通过' };
    } else {
      await this.conversationRepo.update(groupId, { status: 2 });
      return { message: '已拒绝' };
    }
  }

  /** 创建系统总群（仅一次） */
  async createSystemGroup(name: string) {
    const existing = await this.conversationRepo.findOne({ where: { isSystem: true } });
    if (existing) throw new NotFoundException('系统总群已存在，ID=' + existing.id);
    const conv = await this.conversationRepo.save(
      this.conversationRepo.create({ type: 2, name, creatorId: 0, status: 1, isSystem: true }),
    );
    return { message: '系统总群创建成功', conversationId: conv.id, name };
  }

  // ===== CDK 状态控制 =====
  /** 手动修改 CDK 状态 */
  async updateCdkStatus(cdkId: number, status: number) {
    const cdk = await this.cdkRepo.findOne({ where: { id: cdkId } });
    if (!cdk) throw new NotFoundException('CDK不存在');
    await this.cdkRepo.update(cdkId, { status });
    return { message: '状态已更新' };
  }
}
