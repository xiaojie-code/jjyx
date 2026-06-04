import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Mint } from 'mint-filter';
import { User } from '../entities/user.entity';
import { UserCurrency } from '../entities/user-currency.entity';
import { Cdk } from '../entities/cdk.entity';
import { SystemSwitch } from '../entities/system-switch.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
import { Friendship } from '../entities/friendship.entity';
import { Message } from '../entities/message.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MatrixService } from '../matrix/matrix.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserCurrency)
    private readonly currencyRepo: Repository<UserCurrency>,
    @InjectRepository(Cdk)
    private readonly cdkRepo: Repository<Cdk>,
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
    @Inject(forwardRef(() => MatrixService))
    private readonly matrixService: MatrixService,
  ) {}

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
      const admin = await this.userRepo.findOne({ where: { account: 'admin' } });
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
        const welcomeText = '欢迎使用云AI，我是客服，有任何问题都可以随时联系我。';

        if (existingChat.length === 0) {
          const conversation = await manager.save(
            Conversation,
            manager.create(Conversation, { type: 1, creatorId: admin.id, status: 1 }),
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

  /** 注册 */
  async register(dto: RegisterDto, ip: string) {
    await this.checkSwitch('register');
    const requestInviteCode = dto.inviteCode?.trim().toUpperCase();
    if (!requestInviteCode) {
      throw new BadRequestException('邀请码不能为空');
    }

    const exists = await this.userRepo.findOne({ where: { account: dto.account } });
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
    await this.currencyRepo.save(this.currencyRepo.create({ userId: savedUser.id }));

    // 签发 token
    const token = this.jwtService.sign({ sub: savedUser.id, account: savedUser.account });

    // 矩阵推广：注册时不再入位，需要激活后才触发
    // 激活逻辑在 activate 方法中处理

    return {
      token,
      user: {
        id: savedUser.id,
        account: savedUser.account,
        nickname: savedUser.nickname,
        avatar: savedUser.avatar,
        isActivated: savedUser.isActivated,
      },
    };
  }

  /** 登录 */
  async login(dto: LoginDto, ip: string) {
    await this.checkSwitch('login');

    const user = await this.userRepo.findOne({ where: { account: dto.account } });
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

    const token = this.jwtService.sign({ sub: user.id, account: user.account });

    return {
      token,
      user: {
        id: user.id,
        account: user.account,
        nickname: user.nickname,
        avatar: user.avatar,
        isActivated: user.isActivated,
      },
    };
  }

  /** 获取当前用户信息 */
  async getProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');

    const currency = await this.currencyRepo.findOne({ where: { userId } });

    return {
      id: user.id,
      account: user.account,
      nickname: user.nickname,
      avatar: user.avatar,
      isActivated: user.isActivated,
      shares: user.shares,
      inviteCode: user.inviteCode,
      currency: currency
        ? {
            points: Number(currency.points),
            gold: Number(currency.gold),
            silver: Number(currency.silver),
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
    const sensitiveWords = ['赌博', '色情', '毒品', '暴力', '政治', '法轮功', '共产党', '习近平'];
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

    // 事务：标记CDK已使用 + 激活用户 + 发放奖励
    await this.dataSource.transaction(async (manager) => {
      // 标记CDK
      await manager.update(Cdk, cdk.id, {
        status: 1,
        usedBy: userId,
        usedAt: new Date(),
      });

      // 激活用户 + 发放持股数
      await manager.update(User, userId, {
        isActivated: true,
        shares: 200,
      });

      // 激活送10000积分
      await manager.query(
        `UPDATE user_currencies SET points = points + 10000 WHERE user_id = ?`,
        [userId],
      );

      // 发放CDK奖励到货币账户
      if (cdk.itemsJson && Array.isArray(cdk.itemsJson)) {
        const currency = await manager.findOne(UserCurrency, { where: { userId } });
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

    return { message: '激活成功', shares: 200 };
  }

  /** 获取邀请记录（直推+间推） */
  async getInviteRecords(userId: number) {
    // 直推：我邀请的人
    const directInvitees = await this.userRepo.find({ where: { invitedBy: userId } });

    // 间推：我邀请的人再邀请的人
    const directIds = directInvitees.map(u => u.id);
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
      directInvitees: directInvitees.map(u => ({
        id: u.id,
        nickname: u.nickname,
        account: u.account,
        registerTime: u.registerTime,
        type: 'direct',
        reward: 0,
      })),
      indirectInvitees: indirectInvitees.map(u => ({
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
}
