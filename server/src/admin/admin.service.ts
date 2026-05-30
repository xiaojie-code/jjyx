import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
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
import { MeetingService } from '../chat/meeting.service';
import { MeetingGateway } from '../chat/meeting.gateway';
import { PaginationDto } from '../common/dto/pagination.dto';

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
    return {
      list,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
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
  async generateCdks(cdkTypeId: number, count: number, itemsJson: any) {
    const cdks = [];
    for (let i = 0; i < count; i++) {
      cdks.push(
        this.cdkRepo.create({
          code: uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase(),
          cdkTypeId,
          itemsJson,
          status: 0,
        }),
      );
    }
    await this.cdkRepo.save(cdks);
    return { generated: count };
  }
  async getCdkList(query: any, pagination: PaginationDto) {
    const qb = this.cdkRepo.createQueryBuilder('c');
    if (query.status !== undefined)
      qb.where('c.status = :status', { status: query.status });
    const total = await qb.getCount();
    const list = await qb
      .skip((pagination.page - 1) * pagination.pageSize)
      .take(pagination.pageSize)
      .orderBy('c.created_at', 'DESC')
      .getMany();
    return {
      list,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }
  async getCdkTypes() {
    return this.cdkTypeRepo.find();
  }
  async createCdkType(data: any) {
    return this.cdkTypeRepo.save(this.cdkTypeRepo.create(data));
  }
  async updateCdkType(id: number, data: any) {
    await this.cdkTypeRepo.update(id, data);
  }

  // ===== 提现 =====
  async getWithdrawals(query: any) {
    return this.withdrawalRepo.find({ order: { createdAt: 'DESC' } });
  }
  async reviewWithdrawal(id: number, approve: boolean) {
    return this.currencyService.reviewWithdrawal(id, approve);
  }

  // ===== 系统配置 =====
  async getConfigs() {
    return this.currencyService.getAllConfigs();
  }
  async updateConfig(key: string, value: string) {
    return this.currencyService.updateConfig(key, value);
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

    return {
      list: list.map((m) => ({
        ...m,
        ownerNickname: userMap.get(Number(m.ownerId))?.nickname || '',
        ownerAccount: userMap.get(Number(m.ownerId))?.account || '',
      })),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
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

    return {
      list: list.map((i) => ({
        ...i,
        ownerNickname: userMap.get(Number(i.ownerId))?.nickname || '',
        fromUserNickname: userMap.get(Number(i.fromUserId))?.nickname || '',
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
