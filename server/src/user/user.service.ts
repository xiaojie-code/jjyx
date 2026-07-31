import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Mint } from 'mint-filter';
import { User } from '../entities/user.entity';
import { UserCurrency } from '../entities/user-currency.entity';
import { Cdk } from '../entities/cdk.entity';
import { CdkType } from '../entities/cdk-type.entity';
import { SystemSwitch } from '../entities/system-switch.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
import { Friendship } from '../entities/friendship.entity';
import { Message } from '../entities/message.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MatrixService } from '../matrix/matrix.service';
import {
  CurrencyService,
  WEEKLY_POINT_RETURN_ALWAYS_ELIGIBLE_LOG_TYPES,
  WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES,
} from '../currency/currency.service';

const LOW_ACTIVATION_AMOUNT = 500;
const HIGH_ACTIVATION_AMOUNT = 2000;
const LOW_ACTIVATION_POINTS = 2500;
const HIGH_ACTIVATION_POINTS = 10000;
const LOW_ACTIVATION_SHARES = 50;
const HIGH_ACTIVATION_SHARES = 200;
const PROFILE_TOTAL_USER_COUNT_OVERRIDE_KEY =
  'profile_total_user_count_override';

@Injectable()
export class UserService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserCurrency)
    private readonly currencyRepo: Repository<UserCurrency>,
    @InjectRepository(Cdk)
    private readonly cdkRepo: Repository<Cdk>,
    @InjectRepository(CdkType)
    private readonly cdkTypeRepo: Repository<CdkType>,
    @InjectRepository(SystemSwitch)
    private readonly switchRepo: Repository<SystemSwitch>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly convMemberRepo: Repository<ConversationMember>,
    @InjectRepository(Friendship)
    private readonly friendshipRepo: Repository<Friendship>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly currencyService: CurrencyService,
    @Inject(forwardRef(() => MatrixService))
    private readonly matrixService: MatrixService,
  ) {}

  async onModuleInit() {
    await this.ensureActivationColumns();
  }

  private async ensureActivationColumns() {
    const alters = [
      `ALTER TABLE users ADD COLUMN activation_amount DECIMAL(10,2) NULL COMMENT '用户激活档位金额：500或2000' AFTER is_activated`,
      `ALTER TABLE users ADD COLUMN activated_cdk_id INT NULL COMMENT '用户激活使用的CDK ID' AFTER activation_amount`,
      `ALTER TABLE users ADD INDEX idx_users_activation_amount (activation_amount)`,
      `ALTER TABLE cdk_types ADD COLUMN activation_amount DECIMAL(10,2) NULL COMMENT '激活档位金额：500或2000' AFTER description`,
      `ALTER TABLE cdks ADD COLUMN activation_amount DECIMAL(10,2) NULL COMMENT '激活档位金额快照：500或2000' AFTER items_json`,
      `ALTER TABLE user_currencies ADD COLUMN copper DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER silver`,
    ];
    for (const sql of alters) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {}
    }
    await this.dataSource.query(
      `UPDATE users SET activation_amount = ? WHERE is_activated = 1 AND activation_amount IS NULL`,
      [HIGH_ACTIVATION_AMOUNT],
    );
    await this.dataSource.query(
      `UPDATE cdks SET activation_amount = ? WHERE activation_amount IS NULL`,
      [HIGH_ACTIVATION_AMOUNT],
    );
  }

  private roundPoints(value: number) {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }

  private calculateWeeklyReturnProjection(row: any) {
    const status = Number(row.status || 0);
    const paidDays = Math.max(0, Math.min(7, Number(row.paidDays ?? row.paid_days ?? 0)));
    const multiplier = Number(row.multiplier || 0);
    const dailyRate = Number(row.dailyRate ?? row.daily_rate ?? 0);
    let base = this.roundPoints(
      Math.max(0, Number(row.remainingBasePoints ?? row.remaining_base_points ?? 0)),
    );

    if (status !== 0 || paidDays >= 7 || multiplier <= 0 || dailyRate <= 0 || base <= 0) {
      return { unpaidDays: 0, nextReturnAmount: 0, pendingReturnPoints: 0 };
    }

    let pendingReturnPoints = 0;
    let nextReturnAmount = 0;
    for (let day = paidDays + 1; day <= 7; day += 1) {
      const amount = this.roundPoints(base * multiplier * dailyRate);
      if (amount <= 0) break;
      if (nextReturnAmount <= 0) nextReturnAmount = amount;
      pendingReturnPoints = this.roundPoints(pendingReturnPoints + amount);
      base = this.roundPoints(Math.max(0, base - amount));
    }

    return {
      unpaidDays: Math.max(0, 7 - paidDays),
      nextReturnAmount,
      pendingReturnPoints,
    };
  }

  private addDaysToLocalDateText(dateText: string, days: number) {
    if (!dateText) return '';
    const [year, month, day] = dateText.split('-').map((item) => Number(item));
    if (!year || !month || !day) return dateText;
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + days);
    const two = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
  }

  private mapWeeklyPointReturnAccount(row: any) {
    if (!row) return null;
    const eligible = this.roundPoints(Number(row.eligibleConsumedPoints || 0));
    const excluded = this.roundPoints(Number(row.excludedConsumedPoints || 0));
    const returned = this.roundPoints(Number(row.returnedPoints || 0));
    const projection = this.calculateWeeklyReturnProjection(row);
    const weekEndDate = row.weekEndDate?.toString() || '';

    return {
      ...row,
      id: Number(row.id),
      periodId: Number(row.periodId),
      userId: Number(row.userId),
      status: Number(row.status),
      paidDays: Number(row.paidDays || 0),
      multiplier: Number(row.multiplier || 0),
      dailyRate: Number(row.dailyRate || 0),
      eligibleConsumedPoints: eligible,
      excludedConsumedPoints: excluded,
      totalConsumedPoints: this.roundPoints(eligible + excluded),
      remainingBasePoints: this.roundPoints(Number(row.remainingBasePoints || 0)),
      returnedPoints: returned,
      pendingReturnPoints: projection.pendingReturnPoints,
      expectedReturnPoints: this.roundPoints(returned + projection.pendingReturnPoints),
      nextReturnAmount: projection.nextReturnAmount,
      unpaidDays: projection.unpaidDays,
      returnWeekStartDate: this.addDaysToLocalDateText(weekEndDate, 1),
      returnWeekEndDate: this.addDaysToLocalDateText(weekEndDate, 7),
    };
  }

  private buildWeeklyReturnSchedule(account: any, records: any[]) {
    if (!account) return [];
    const byDay = new Map<number, any>();
    for (const record of records) {
      byDay.set(Number(record.dayIndex), record);
    }

    const schedule: any[] = [];
    let forecastBase = this.roundPoints(Number(account.remainingBasePoints || 0));
    const paidDays = Number(account.paidDays || 0);
    const multiplier = Number(account.multiplier || 0);
    const dailyRate = Number(account.dailyRate || 0);
    const weekEndDate = account.weekEndDate?.toString() || '';

    for (let day = 1; day <= 7; day += 1) {
      const paidRecord = byDay.get(day);
      const returnDate = this.addDaysToLocalDateText(weekEndDate, day);
      if (paidRecord) {
        schedule.push({
          ...paidRecord,
          dayIndex: day,
          returnDate: paidRecord.returnDate || returnDate,
          paid: true,
        });
        continue;
      }

      let returnAmount = 0;
      let baseBeforeReturn = forecastBase;
      let baseAfterReturn = forecastBase;
      if (day > paidDays && Number(account.status) === 0 && multiplier > 0 && dailyRate > 0 && forecastBase > 0) {
        returnAmount = this.roundPoints(forecastBase * multiplier * dailyRate);
        baseAfterReturn = this.roundPoints(Math.max(0, forecastBase - returnAmount));
        forecastBase = baseAfterReturn;
      }

      schedule.push({
        id: 0,
        dayIndex: day,
        returnDate,
        baseBeforeReturn,
        multiplier,
        dailyRate,
        returnAmount,
        baseAfterReturn,
        paid: false,
        status: 0,
      });
    }

    return schedule;
  }

  private normalizeActivationAmount(value: any): number | null {
    const amount = Number(value);
    if (amount === LOW_ACTIVATION_AMOUNT || amount === HIGH_ACTIVATION_AMOUNT) {
      return amount;
    }
    return null;
  }

  private inferActivationAmountFromItems(itemsJson: any): number | null {
    if (!Array.isArray(itemsJson)) return null;
    for (const item of itemsJson) {
      const key = String(item?.item || item?.key || '').trim();
      const amount = this.normalizeActivationAmount(item?.amount ?? item?.value);
      if (
        amount &&
        ['activation_amount', 'activationAmount', 'recharge_amount', 'rechargeAmount'].includes(key)
      ) {
        return amount;
      }
    }
    return null;
  }

  private async resolveCdkActivationAmount(cdk: Cdk, manager?: any): Promise<number> {
    const directAmount = this.normalizeActivationAmount(cdk.activationAmount);
    if (directAmount) return directAmount;

    const cdkType = manager
      ? await manager.findOne(CdkType, { where: { id: cdk.cdkTypeId } })
      : await this.cdkTypeRepo.findOne({ where: { id: cdk.cdkTypeId } });
    const typeAmount = this.normalizeActivationAmount(cdkType?.activationAmount);
    if (typeAmount) return typeAmount;

    return this.inferActivationAmountFromItems(cdk.itemsJson) ?? HIGH_ACTIVATION_AMOUNT;
  }

  private getActivationReward(activationAmount: number) {
    if (activationAmount === LOW_ACTIVATION_AMOUNT) {
      return { points: LOW_ACTIVATION_POINTS, shares: LOW_ACTIVATION_SHARES };
    }
    return { points: HIGH_ACTIVATION_POINTS, shares: HIGH_ACTIVATION_SHARES };
  }

  /** 检查功能开关 */
  private async checkSwitch(key: string) {
    const sw = await this.switchRepo.findOne({ where: { featureKey: key } });
    if (sw && sw.status === 0) {
      throw new ForbiddenException('系统维护中');
    }
  }

  /** 激活后自动添加客服联系人，但不自动加入系统总群 */
  private async ensureCustomerServiceContact(userId: number) {
    try {
      const admin = await this.userRepo.findOne({
        where: { account: 'admin' },
      });
      if (!admin || Number(admin.id) === Number(userId)) return;

      if (admin.nickname !== '客服') {
        await this.userRepo.update(admin.id, { nickname: '客服' });
      }

      await this.dataSource.transaction(async (manager) => {
        const pairs = [
          { userId, friendId: admin.id, remark: '客服' },
          { userId: admin.id, friendId: userId, remark: null },
        ];
        for (const pair of pairs) {
          const existing = await manager.findOne(Friendship, {
            where: { userId: pair.userId, friendId: pair.friendId },
          });
          if (!existing) {
            await manager.save(Friendship, manager.create(Friendship, pair));
          }
        }

        const existingChat = await manager.query(
          `SELECT c.id
           FROM conversations c
           INNER JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = ?
           INNER JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = ?
           WHERE c.type = 1
           LIMIT 1`,
          [userId, admin.id],
        );
        let conversationId = existingChat[0]?.id;
        const welcomeText =
          '欢迎使用云AI，我是客服，有任何问题都可以随时联系我。';

        if (existingChat.length === 0) {
          const conversation = await manager.save(
            Conversation,
            manager.create(Conversation, {
              type: 1,
              creatorId: admin.id,
              status: 1,
            }),
          );
          conversationId = conversation.id;
          await manager.save(ConversationMember, [
            manager.create(ConversationMember, {
              conversationId: conversation.id,
              userId: admin.id,
              role: 1,
            }),
            manager.create(ConversationMember, {
              conversationId: conversation.id,
              userId,
              role: 1,
            }),
          ]);
        }

        if (conversationId) {
          const existingWelcome = await manager.findOne(Message, {
            where: {
              conversationId: Number(conversationId),
              senderId: admin.id,
              content: welcomeText,
            },
          });
          if (!existingWelcome) {
            await manager.save(
              Message,
              manager.create(Message, {
                conversationId: Number(conversationId),
                senderId: admin.id,
                msgType: 1,
                content: welcomeText,
                status: 1,
              }),
            );
            await manager.increment(
              ConversationMember,
              { conversationId: Number(conversationId), userId },
              'unreadCount',
              1,
            );
          }
        }
      });
    } catch (e) {
      // 客服联系人初始化失败不影响激活流程
    }
  }

  /** 生成邀请码 */
  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private async ensureSystemGroupMembership(userId: number) {
    const systemGroup = await this.convRepo.findOne({
      where: { type: 2, isSystem: true, status: 1 },
    });
    if (!systemGroup) return;
    const existing = await this.convMemberRepo.findOne({
      where: { conversationId: systemGroup.id, userId },
    });
    if (existing) return;
    await this.convMemberRepo.save(
      this.convMemberRepo.create({
        conversationId: systemGroup.id,
        userId,
        role: 1,
      }),
    );
  }

  /** 注册 */
  async register(dto: RegisterDto, ip: string) {
    await this.checkSwitch('register');
    const requestInviteCode = dto.inviteCode?.trim().toUpperCase();
    if (!requestInviteCode) {
      throw new BadRequestException('邀请码不能为空');
    }

    const exists = await this.userRepo.findOne({
      where: { account: dto.account },
    });
    if (exists) {
      throw new ConflictException('账号已存在');
    }

    // 验证邀请码
    let inviterId: number | null = null;
    const inviter = await this.userRepo.findOne({
      where: { inviteCode: requestInviteCode },
    });
    if (!inviter) {
      throw new BadRequestException('邀请码不存在');
    }
    inviterId = inviter.id;

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const now = new Date();

    // 生成唯一邀请码
    let inviteCode: string;
    do {
      inviteCode = this.generateInviteCode();
    } while (await this.userRepo.findOne({ where: { inviteCode } }));

    const user = this.userRepo.create({
      account: dto.account,
      passwordHash,
      nickname: `用户${Date.now().toString().slice(-6)}`,
      avatar: '/default-avatar.png',
      inviteCode,
      invitedBy: inviterId,
      registerIp: ip,
      registerTime: now,
    });

    const savedUser = await this.userRepo.save(user);

    // 创建货币账户（注册时不送积分，激活后才送）
    await this.currencyRepo.save(
      this.currencyRepo.create({ userId: savedUser.id }),
    );
    await this.ensureSystemGroupMembership(savedUser.id);

    // 签发 token
    const token = this.jwtService.sign({
      sub: savedUser.id,
      account: savedUser.account,
    });

    // 矩阵推广：注册时不再入位，需要激活后才触发
    // 激活逻辑在 activate 方法中处理

    return {
      token,
      user: {
        id: savedUser.id,
        account: savedUser.account,
        nickname: savedUser.nickname,
        avatar: savedUser.avatar,
        userType: savedUser.userType,
        isActivated: savedUser.isActivated,
        activationAmount: savedUser.activationAmount == null ? null : Number(savedUser.activationAmount),
      },
    };
  }

  /** 登录 */
  async login(dto: LoginDto, ip: string) {
    await this.checkSwitch('login');

    const user = await this.userRepo.findOne({
      where: { account: dto.account },
    });
    if (!user) {
      throw new UnauthorizedException('账号不存在');
    }
    if (user.status !== 1) {
      throw new ForbiddenException('账号已被禁用');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('密码错误');
    }

    // 更新登录信息
    user.loginIp = ip;
    user.loginTime = new Date();
    await this.userRepo.save(user);
    await this.ensureSystemGroupMembership(user.id);

    const token = this.jwtService.sign({ sub: user.id, account: user.account });

    return {
      token,
      user: {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
        avatar: user.avatar,
        userType: user.userType,
        isActivated: user.isActivated,
        activationAmount: user.activationAmount == null ? null : Number(user.activationAmount),
      },
    };
  }

  /** 获取当前用户信息 */
  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');

    const [currency, totalUserCountOverride] = await Promise.all([
      this.currencyRepo.findOne({ where: { userId } }),
      this.currencyService.getConfigValue(
        PROFILE_TOTAL_USER_COUNT_OVERRIDE_KEY,
        '',
      ),
    ]);
    const overrideText = String(totalUserCountOverride || '').trim();
    const overrideValue = Number(overrideText);
    const totalUserCount =
      overrideText &&
      /^\d+$/.test(overrideText) &&
      Number.isSafeInteger(overrideValue)
        ? overrideValue
        : await this.userRepo.count();

    return {
      id: user.id,
      account: user.account,
      nickname: user.nickname,
      avatar: user.avatar,
      userType: user.userType,
      isActivated: user.isActivated,
      activationAmount: user.activationAmount == null ? null : Number(user.activationAmount),
      shares: user.shares,
      inviteCode: user.inviteCode,
      totalUserCount,
      currency: currency
        ? {
            points: Number(currency.points),
            gold: Number(currency.gold),
            totalGoldEarned: Number(currency.totalGoldEarned || 0),
            silver: Number(currency.silver),
            copper: Number(currency.copper),
            specialPointsTier1: Number(currency.specialPointsTier1),
            specialPointsTier2: Number(currency.specialPointsTier2),
            specialPointsTier3: Number(currency.specialPointsTier3),
            rewardPoints: Number(currency.rewardPoints),
            invitePoints: Number(currency.invitePoints),
          }
        : null,
    };
  }

  /** 更新头像 */
  async updateAvatar(userId: number, avatarPath: string) {
    await this.userRepo.update(userId, { avatar: avatarPath });
    return { avatar: avatarPath };
  }

  /** 更新昵称（含敏感词检测） */
  async updateNickname(userId: number, nickname: string) {
    if (nickname.length < 2 || nickname.length > 10) {
      throw new BadRequestException('昵称长度需要2-10个字');
    }

    // 敏感词过滤
    const sensitiveWords = [
      '赌博',
      '色情',
      '毒品',
      '暴力',
      '政治',
      '法轮功',
      '共产党',
      '习近平',
    ];
    const mint = new Mint(sensitiveWords);
    if (!mint.verify(nickname)) {
      throw new BadRequestException('昵称包含敏感词，请修改');
    }

    await this.userRepo.update(userId, { nickname });
    return { nickname };
  }

  async changePassword(
    userId: number,
    currentPassword?: string,
    newPassword?: string,
  ) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestException('请填写原密码和新密码');
    }
    if (newPassword.length < 6 || newPassword.length > 50) {
      throw new BadRequestException('新密码长度需要6-50位');
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('原密码不正确');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(userId, { passwordHash });
    return { message: '密码修改成功' };
  }

  async requestPasswordReset(account?: string, phone?: string) {
    const trimmedAccount = account?.trim();
    const trimmedPhone = phone?.trim();
    if (!trimmedAccount || !trimmedPhone) {
      throw new BadRequestException('请填写账号和手机号');
    }
    const user = await this.userRepo.findOne({
      where: { account: trimmedAccount },
    });
    if (!user) {
      throw new BadRequestException('账号不存在');
    }
    await this.ensurePasswordResetTable();
    await this.dataSource.query(
      `INSERT INTO password_reset_requests
        (user_id, account, phone, status, created_at, updated_at)
       VALUES (?, ?, ?, 0, NOW(), NOW())`,
      [user.id, user.account, trimmedPhone],
    );
    return { message: '重置密码申请已提交，请等待管理员处理' };
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

  /** CDK激活 */
  async activate(userId: number, code: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    if (user.isActivated) throw new BadRequestException('已激活，无需重复激活');

    const cdk = await this.cdkRepo.findOne({ where: { code, status: 0 } });
    if (!cdk) throw new BadRequestException('激活码无效或已被使用');

    const activationAmount = await this.resolveCdkActivationAmount(cdk);
    const activationReward = this.getActivationReward(activationAmount);

    // 事务：标记CDK已使用 + 激活用户 + 发放奖励
    await this.dataSource.transaction(async (manager) => {
      // 标记CDK
      await manager.update(Cdk, cdk.id, {
        status: 1,
        usedBy: userId,
        usedAt: new Date(),
        activationAmount,
      });

      let inviteCode = user.inviteCode;
      if (!inviteCode) {
        do {
          inviteCode = this.generateInviteCode();
        } while (await manager.findOne(User, { where: { inviteCode } }));
      }

      // 激活用户 + 发放持股数
      await manager.update(User, userId, {
        isActivated: true,
        shares: activationReward.shares,
        activationAmount,
        activatedCdkId: cdk.id,
        inviteCode,
      });

      // 激活送10000积分
      await manager.query(
        `UPDATE user_currencies SET points = points + ? WHERE user_id = ?`,
        [activationReward.points, userId],
      );

      // 发放CDK奖励到货币账户
      if (cdk.itemsJson && Array.isArray(cdk.itemsJson)) {
        const currency = await manager.findOne(UserCurrency, {
          where: { userId },
        });
        if (currency) {
          for (const item of cdk.itemsJson) {
            const amount = Number(item.amount) || 0;
            switch (item.item) {
              case 'points':
                // 激活固定赠送 10000 普通积分，不再叠加 CDK 配置里的普通积分。
                break;
              case 'gold':
                currency.gold = Number(currency.gold) + amount;
                break;
              case 'silver':
                currency.silver = Number(currency.silver) + amount;
                break;
              case 'copper':
                currency.copper = Number(currency.copper) + amount;
                break;
              case 'reward_points':
                currency.rewardPoints = Number(currency.rewardPoints) + amount;
                break;
            }
          }
          await manager.save(UserCurrency, currency);
        }
      }
    });

    // 激活后触发矩阵入位
    if (user.invitedBy) {
      await this.matrixService.onUserRegistered(userId, user.invitedBy);
    } else {
      await this.matrixService.createFirstMatrix(userId);
    }

    // 指定账号（333333/666666）深层推广树激活奖励。
    await this.matrixService.grantSpecialTreeActivationReward(userId);

    // 激活后只自动添加客服联系人，总群需由客服邀请后进入
    await this.ensureCustomerServiceContact(userId);

    return { message: '激活成功', shares: activationReward.shares, activationAmount };
  }

  /** 获取邀请记录（直推+间推） */
  async getInviteRecords(userId: number) {
    // 直推：我邀请的人
    const directInvitees = await this.userRepo.find({
      where: { invitedBy: userId },
    });

    // 间推：我邀请的人再邀请的人
    const directIds = directInvitees.map((u) => u.id);
    let indirectInvitees: any[] = [];
    if (directIds.length > 0) {
      indirectInvitees = await this.userRepo
        .createQueryBuilder('u')
        .where('u.invited_by IN (:...ids)', { ids: directIds })
        .getMany();
    }

    return {
      directCount: directInvitees.length,
      indirectCount: indirectInvitees.length,
      totalReward: 0,
      directInvitees: directInvitees.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        account: u.account,
        registerTime: u.registerTime,
        type: 'direct',
        reward: 0,
      })),
      indirectInvitees: indirectInvitees.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        account: u.account,
        registerTime: u.registerTime,
        invitedBy: u.invitedBy,
        type: 'indirect',
        reward: 0,
      })),
      rewards: [],
    };
  }

  /** 当前用户的每周积分返还信息 */
  async getMyWeeklyPointReturn(userId: number) {
    await this.currencyService.ensureDefaultConfigs();

    const accountRows = await this.dataSource.query(
      `SELECT
         a.id,
         a.period_id AS periodId,
         a.user_id AS userId,
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
       WHERE a.user_id = ?
       ORDER BY p.week_start_date DESC, a.id DESC
       LIMIT 1`,
      [userId],
    );

    const rawCurrent = accountRows?.[0] || null;
    const current = this.mapWeeklyPointReturnAccount(rawCurrent);

    const recordRows = current
      ? await this.dataSource.query(
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
             DATE_FORMAT(r.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
           FROM weekly_point_return_daily_records r
           WHERE r.account_id = ?
           ORDER BY r.day_index ASC, r.id ASC`,
          [current.id],
        )
      : [];

    const records = recordRows.map((row: any) => ({
      ...row,
      id: Number(row.id),
      dayIndex: Number(row.dayIndex),
      status: Number(row.status),
      baseBeforeReturn: this.roundPoints(Number(row.baseBeforeReturn || 0)),
      multiplier: Number(row.multiplier || 0),
      dailyRate: Number(row.dailyRate || 0),
      returnAmount: this.roundPoints(Number(row.returnAmount || 0)),
      baseAfterReturn: this.roundPoints(Number(row.baseAfterReturn || 0)),
      currencyLogId: row.currencyLogId ? Number(row.currencyLogId) : null,
      paid: true,
    }));

    const historyRows = await this.dataSource.query(
      `SELECT
         a.id,
         a.period_id AS periodId,
         a.user_id AS userId,
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
       WHERE a.user_id = ?
       ORDER BY p.week_start_date DESC, a.id DESC`,
      [userId],
    );

    const returnHistoryRows = await this.dataSource.query(
      `SELECT
         r.id,
         r.account_id AS accountId,
         DATE_FORMAT(r.return_date, '%Y-%m-%d') AS returnDate,
         r.day_index AS dayIndex,
         r.return_amount AS returnAmount,
         r.currency_log_id AS currencyLogId,
         DATE_FORMAT(p.week_start_date, '%Y-%m-%d') AS weekStartDate,
         DATE_FORMAT(p.week_end_date, '%Y-%m-%d') AS weekEndDate
       FROM weekly_point_return_daily_records r
       LEFT JOIN weekly_point_return_periods p ON p.id = r.period_id
       WHERE r.user_id = ? AND r.status = 1
       ORDER BY r.return_date DESC, r.id DESC`,
      [userId],
    );

    const excludedPlaceholders = WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES.map(
      () => '?',
    ).join(', ');
    const alwaysEligiblePlaceholders =
      WEEKLY_POINT_RETURN_ALWAYS_ELIGIBLE_LOG_TYPES.map(() => '?').join(', ');
    const consumptionRows = await this.dataSource.query(
      `SELECT
         l.id,
         l.sn,
         l.log_type AS logType,
         l.description,
         l.amount,
         ABS(l.amount) AS consumedPoints,
         l.before_balance AS beforeBalance,
         l.after_balance AS afterBalance,
         DATE_FORMAT(l.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
         a.id AS accountId,
         CASE
           WHEN l.log_type IN (${alwaysEligiblePlaceholders}) THEN 1
           WHEN l.log_type IN (${excludedPlaceholders}) THEN 0
           ELSE 1
         END AS isEligible
       FROM weekly_point_return_accounts a
       INNER JOIN weekly_point_return_periods p ON p.id = a.period_id
       INNER JOIN currency_logs l
         ON l.user_id = a.user_id
        AND l.currency_type = 'points'
        AND l.amount < 0
        AND l.created_at >= p.week_start_at
        AND l.created_at <= p.week_end_at
       WHERE a.user_id = ?
       ORDER BY l.created_at DESC, l.id DESC`,
      [
        ...WEEKLY_POINT_RETURN_ALWAYS_ELIGIBLE_LOG_TYPES,
        ...WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES,
        userId,
      ],
    );

    const history = historyRows
      .map((row: any) => this.mapWeeklyPointReturnAccount(row))
      .filter(Boolean);
    const returnHistory = returnHistoryRows.map((row: any) => ({
      ...row,
      id: Number(row.id),
      accountId: Number(row.accountId),
      dayIndex: Number(row.dayIndex),
      returnAmount: this.roundPoints(Number(row.returnAmount || 0)),
      currencyLogId: row.currencyLogId ? Number(row.currencyLogId) : null,
    }));
    const consumptionHistory = consumptionRows.map((row: any) => ({
      ...row,
      id: Number(row.id),
      accountId: Number(row.accountId),
      amount: this.roundPoints(Number(row.amount || 0)),
      consumedPoints: this.roundPoints(Number(row.consumedPoints || 0)),
      beforeBalance: this.roundPoints(Number(row.beforeBalance || 0)),
      afterBalance: this.roundPoints(Number(row.afterBalance || 0)),
      isEligible: Number(row.isEligible) === 1,
    }));

    const cumulativePeriods = history.map((account: any) => ({
      ...account,
      consumptionRecords: consumptionHistory.filter(
        (record: any) => record.accountId === account.id,
      ),
      returnRecords: returnHistory.filter(
        (record: any) => record.accountId === account.id,
      ),
    }));
    const cumulativeSummary = cumulativePeriods.reduce(
      (summary: any, account: any) => ({
        consumedPoints: this.roundPoints(
          summary.consumedPoints + Number(account.totalConsumedPoints || 0),
        ),
        eligibleConsumedPoints: this.roundPoints(
          summary.eligibleConsumedPoints +
            Number(account.eligibleConsumedPoints || 0),
        ),
        expectedReturnPoints: this.roundPoints(
          summary.expectedReturnPoints +
            Number(account.expectedReturnPoints || 0),
        ),
        returnedPoints: this.roundPoints(
          summary.returnedPoints + Number(account.returnedPoints || 0),
        ),
        pendingReturnPoints: this.roundPoints(
          summary.pendingReturnPoints +
            Number(account.pendingReturnPoints || 0),
        ),
        periodCount: summary.periodCount + 1,
      }),
      {
        consumedPoints: 0,
        eligibleConsumedPoints: 0,
        expectedReturnPoints: 0,
        returnedPoints: 0,
        pendingReturnPoints: 0,
        periodCount: 0,
      },
    );

    return {
      current,
      records,
      cumulativeSummary,
      cumulativePeriods,
      historicalReturnedPoints: cumulativeSummary.returnedPoints,
      returnHistory,
      schedule: this.buildWeeklyReturnSchedule(current, records),
      history,
    };
  }
}
