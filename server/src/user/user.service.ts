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
import { InviteReward } from '../entities/invite-reward.entity';
import { SystemSwitch } from '../entities/system-switch.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
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
    @InjectRepository(InviteReward)
    private readonly inviteRewardRepo: Repository<InviteReward>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly convMemberRepo: Repository<ConversationMember>,
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

  /** 激活后自动加入系统总群 */
  private async joinSystemGroup(userId: number) {
    try {
      // 查找系统总群（is_system=true 的群）
      const systemGroup = await this.convRepo.findOne({ where: { isSystem: true, type: 2 } });
      if (!systemGroup) return;
      // 检查是否已在群中
      const existing = await this.convMemberRepo.findOne({
        where: { conversationId: systemGroup.id, userId },
      });
      if (!existing) {
        await this.convMemberRepo.save(this.convMemberRepo.create({
          conversationId: systemGroup.id,
          userId,
          role: 1,
        }));
      }
    } catch (e) {
      // 加群失败不影响激活流程
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

    const exists = await this.userRepo.findOne({ where: { account: dto.account } });
    if (exists) {
      throw new ConflictException('账号已存在');
    }

    // 验证邀请码
    let inviterId: number | null = null;
    if (dto.inviteCode) {
      const inviter = await this.userRepo.findOne({ where: { inviteCode: dto.inviteCode } });
      if (!inviter) {
        throw new BadRequestException('邀请码不存在');
      }
      inviterId = inviter.id;
    }

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

    // 邀请奖励：直推100，间推30（发放到普通积分，记录流水）
    if (inviterId) {
      // 直推奖励 - 加积分
      await this.dataSource.query(
        `UPDATE user_currencies SET points = points + 100 WHERE user_id = ?`,
        [inviterId],
      );
      await this.dataSource.query(
        `INSERT INTO invite_rewards (inviter_id, invitee_id, reward_type, reward_amount, trigger_type, created_at) VALUES (?, ?, 'points', 100, 'direct_invite', NOW())`,
        [inviterId, savedUser.id],
      );

      // 间推奖励：查邀请者的邀请者
      const directInviter = await this.userRepo.findOne({ where: { id: inviterId } });
      if (directInviter && directInviter.invitedBy) {
        await this.dataSource.query(
          `UPDATE user_currencies SET points = points + 30 WHERE user_id = ?`,
          [directInviter.invitedBy],
        );
        await this.dataSource.query(
          `INSERT INTO invite_rewards (inviter_id, invitee_id, reward_type, reward_amount, trigger_type, created_at) VALUES (?, ?, 'points', 30, 'indirect_invite', NOW())`,
          [directInviter.invitedBy, savedUser.id],
        );
      }
    }

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
        shares: 100,
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
                currency.points = Number(currency.points) + amount;
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

    // 激活后自动加入系统总群
    await this.joinSystemGroup(userId);

    return { message: '激活成功', shares: 100 };
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

    // 奖励记录
    const rewards = await this.inviteRewardRepo.find({
      where: { inviterId: userId },
      order: { createdAt: 'DESC' },
    });

    return {
      directCount: directInvitees.length,
      indirectCount: indirectInvitees.length,
      totalReward: rewards.reduce((sum, r) => sum + Number(r.rewardAmount), 0),
      directInvitees: directInvitees.map(u => ({
        id: u.id,
        nickname: u.nickname,
        account: u.account,
        registerTime: u.registerTime,
        type: 'direct',
        reward: 100,
      })),
      indirectInvitees: indirectInvitees.map(u => ({
        id: u.id,
        nickname: u.nickname,
        account: u.account,
        registerTime: u.registerTime,
        invitedBy: u.invitedBy,
        type: 'indirect',
        reward: 30,
      })),
      rewards,
    };
  }
}
