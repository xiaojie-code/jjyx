import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { FriendRequest } from '../entities/friend-request.entity';
import { Friendship } from '../entities/friendship.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ContactService implements OnModuleInit {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectRepository(FriendRequest)
    private readonly requestRepo: Repository<FriendRequest>,
    @InjectRepository(Friendship)
    private readonly friendRepo: Repository<Friendship>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepo: Repository<ConversationMember>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly chatGateway: ChatGateway,
  ) {}

  /** 启动时自动创建系统总群，并把已激活用户加入 */
  async onModuleInit() {
    try {
      let systemGroup = await this.convRepo.findOne({ where: { isSystem: true, type: 2 } });
      if (!systemGroup) {
        systemGroup = await this.convRepo.save(
          this.convRepo.create({ type: 2, name: '沧恒云芯', creatorId: 0, status: 1, isSystem: true }),
        );
        this.logger.log(`系统总群"沧恒云芯"已自动创建，ID=${systemGroup.id}`);
      }
      // 把所有已激活用户加入系统总群
      const activatedUsers = await this.userRepo.find({ where: { isActivated: true } });
      for (const user of activatedUsers) {
        const existing = await this.memberRepo.findOne({
          where: { conversationId: systemGroup.id, userId: user.id },
        });
        if (!existing) {
          await this.memberRepo.save(this.memberRepo.create({
            conversationId: systemGroup.id,
            userId: user.id,
            role: 1,
          }));
        }
      }
      this.logger.log(`系统总群成员同步完成，当前已激活用户${activatedUsers.length}人`);
    } catch (e) {
      this.logger.error('系统总群初始化失败', e);
    }
  }

  /** 发送好友申请 */
  async sendRequest(fromId: number, toAccount: string) {
    const toUser = await this.userRepo.findOne({
      where: { account: toAccount },
    });
    if (!toUser) throw new BadRequestException('账号不存在，请核对后重试');
    if (Number(toUser.id) === Number(fromId))
      throw new BadRequestException('不能添加自己');

    const existing = await this.friendRepo.findOne({
      where: { userId: fromId, friendId: toUser.id },
    });
    if (existing) throw new BadRequestException('已经是好友了');

    const pending = await this.requestRepo.findOne({
      where: { fromUserId: fromId, toUserId: toUser.id, status: 0 },
    });
    if (pending) throw new BadRequestException('已发送过申请，请等待对方处理');

    await this.requestRepo.save(
      this.requestRepo.create({
        fromUserId: fromId,
        toUserId: toUser.id,
        status: 0,
      }),
    );

    // 实时通知目标用户有新的好友申请
    this.chatGateway.notifyUser(Number(toUser.id), 'friend:request', {
      fromUserId: fromId,
      fromAccount: (await this.userRepo.findOne({ where: { id: fromId } }))
        ?.account,
    });

    return { message: '申请已发送' };
  }

  /** 处理好友申请 */
  async handleRequest(userId: number, requestId: number, accept: boolean) {
    const req = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!req) throw new NotFoundException('申请不存在');
    if (Number(req.toUserId) !== Number(userId))
      throw new ForbiddenException('无权操作');
    if (Number(req.status) !== 0) throw new BadRequestException('该申请已处理');

    if (accept) {
      await this.dataSource.transaction(async (mgr) => {
        // 更新申请状态
        await mgr.update(FriendRequest, requestId, { status: 1 });
        // 双向添加好友
        await mgr.save(Friendship, [
          mgr.create(Friendship, {
            userId: req.fromUserId,
            friendId: req.toUserId,
          }),
          mgr.create(Friendship, {
            userId: req.toUserId,
            friendId: req.fromUserId,
          }),
        ]);
        // 创建单聊会话
        const conv = await mgr.save(
          Conversation,
          mgr.create(Conversation, { type: 1, creatorId: req.fromUserId }),
        );
        await mgr.save(ConversationMember, [
          mgr.create(ConversationMember, {
            conversationId: conv.id,
            userId: req.fromUserId,
            role: 1,
          }),
          mgr.create(ConversationMember, {
            conversationId: conv.id,
            userId: req.toUserId,
            role: 1,
          }),
        ]);
      });

      // 通知双方有新会话创建，触发会话列表刷新
      this.chatGateway.notifyUser(Number(req.fromUserId), 'conversation:new', {
        fromUserId: req.toUserId,
      });
      this.chatGateway.notifyUser(Number(req.toUserId), 'conversation:new', {
        fromUserId: req.fromUserId,
      });
    } else {
      await this.requestRepo.update(requestId, { status: 2 });
    }
    return { message: accept ? '已同意' : '已拒绝' };
  }

  /** 联系人列表 */
  /** 联系人列表 */
  async getContacts(userId: number) {
    const friends = await this.friendRepo.find({ where: { userId } });
    const result = [];
    for (const f of friends) {
      const user = await this.userRepo.findOne({ where: { id: f.friendId } });
      if (user) {
        result.push({
          friendshipId: f.id,
          userId: user.id,
          nickname: user.nickname,
          avatar: user.avatar,
          remark: f.remark,
          status: user.status,
        });
      }
    }
    return result;
  }

  /** 获取收到的好友申请 */
  async getRequests(userId: number) {
    const requests = await this.requestRepo.find({
      where: { toUserId: userId },
      order: { createdAt: 'DESC' },
    });
    const result = [];
    for (const r of requests) {
      const fromUser = await this.userRepo.findOne({
        where: { id: r.fromUserId },
      });
      result.push({
        id: r.id,
        fromUserId: r.fromUserId,
        fromNickname: fromUser?.nickname,
        fromAccount: fromUser?.account,
        status: r.status,
        createdAt: r.createdAt,
      });
    }
    return result;
  }

  /** 获取发送的好友申请 */
  async getSentRequests(userId: number) {
    const requests = await this.requestRepo.find({
      where: { fromUserId: userId },
      order: { createdAt: 'DESC' },
    });
    const result = [];
    for (const r of requests) {
      const toUser = await this.userRepo.findOne({ where: { id: r.toUserId } });
      result.push({
        id: r.id,
        toUserId: r.toUserId,
        toNickname: toUser?.nickname,
        toAccount: toUser?.account,
        status: r.status,
        createdAt: r.createdAt,
      });
    }
    return result;
  }

  /** 搜索联系人 */
  async searchContacts(keyword: string) {
    return this.userRepo
      .createQueryBuilder('u')
      .where('u.nickname LIKE :kw OR u.account LIKE :kw', {
        kw: `%${keyword}%`,
      })
      .select(['u.id', 'u.nickname', 'u.avatar', 'u.account'])
      .limit(20)
      .getMany();
  }

  /** 修改备注 */
  async updateRemark(userId: number, friendId: number, remark: string) {
    await this.friendRepo.update({ userId, friendId }, { remark });
    return { message: '备注已更新' };
  }

  /** 删除联系人（双向删除+清聊天记录） */
  async deleteContact(userId: number, friendId: number) {
    await this.dataSource.transaction(async (mgr) => {
      // 删除双向好友关系
      await mgr.delete(Friendship, { userId, friendId });
      await mgr.delete(Friendship, { userId: friendId, friendId: userId });
      // 找到单聊会话并删除
      const myConvs = await mgr.find(ConversationMember, { where: { userId } });
      for (const mc of myConvs) {
        const otherMember = await mgr.findOne(ConversationMember, {
          where: { conversationId: mc.conversationId, userId: friendId },
        });
        if (otherMember) {
          const conv = await mgr.findOne(Conversation, {
            where: { id: mc.conversationId, type: 1 },
          });
          if (conv) {
            await mgr.delete(Message, { conversationId: conv.id });
            await mgr.delete(ConversationMember, { conversationId: conv.id });
            await mgr.remove(Conversation, conv);
          }
        }
      }
    });
    return { message: '已删除' };
  }

  /** 创建群聊 */
  async createGroup(creatorId: number, name: string, memberIds: number[]) {
    const groupName = name?.trim();
    if (!groupName) throw new BadRequestException('群名称不能为空');
    const allIds = [
      creatorId,
      ...new Set(
        (memberIds || [])
          .map((id) => Number(id))
          .filter((id) => id > 0 && id !== Number(creatorId)),
      ),
    ];
    const existingUsers = await this.userRepo
      .createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: allIds })
      .getMany();
    if (existingUsers.length !== allIds.length)
      throw new BadRequestException('部分成员不存在');

    // 用户建群需要审核，status=0 待审核
    const conv = await this.convRepo.save(
      this.convRepo.create({ type: 2, name: groupName, creatorId, status: 0 }),
    );
    const members = allIds.map((uid) =>
      this.memberRepo.create({
        conversationId: conv.id,
        userId: uid,
        role: Number(uid) === Number(creatorId) ? 2 : 1,
      }),
    );
    await this.memberRepo.save(members);

    return { conversationId: conv.id, name: groupName, message: '建群申请已提交，等待管理员审核' };
  }

  /** 编辑群聊 */
  async updateGroup(userId: number, conversationId: number, name: string) {
    const groupName = name?.trim();
    if (!groupName) throw new BadRequestException('群名称不能为空');
    const member = await this.memberRepo.findOne({
      where: { conversationId, userId },
    });
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, type: 2 },
    });
    if (!conv) throw new NotFoundException('群聊不存在');
    if (
      !member ||
      (Number(member.role) < 2 && Number(conv.creatorId) !== Number(userId))
    )
      throw new ForbiddenException('仅群主或管理员可编辑');
    await this.convRepo.update(conversationId, { name: groupName });
    return { message: '群名已更新' };
  }

  /** 获取群聊详细信息 */
  async getGroupInfo(userId: number, conversationId: number) {
    const conv = await this.convRepo.findOne({ where: { id: conversationId, type: 2 } });
    if (!conv) throw new NotFoundException('群聊不存在');
    const member = await this.memberRepo.findOne({ where: { conversationId, userId } });
    if (!member) throw new ForbiddenException('你不是该群成员');
    return {
      id: conv.id,
      name: conv.name,
      announcement: conv.announcement || '',
      avatar: conv.avatar || '',
      myGroupNickname: member.groupNickname || '',
      creatorId: conv.creatorId,
    };
  }

  /** 更新群公告 */
  async updateAnnouncement(userId: number, conversationId: number, announcement: string) {
    const member = await this.memberRepo.findOne({ where: { conversationId, userId } });
    const conv = await this.convRepo.findOne({ where: { id: conversationId, type: 2 } });
    if (!conv) throw new NotFoundException('群聊不存在');
    if (!member || (Number(member.role) < 2 && Number(conv.creatorId) !== Number(userId))) {
      throw new ForbiddenException('仅群主或管理员可编辑群公告');
    }
    await this.convRepo.update(conversationId, { announcement: announcement?.trim() || '' });
    return { message: '群公告已更新' };
  }

  /** 更新我在本群的昵称 */
  async updateMyGroupNickname(userId: number, conversationId: number, nickname: string) {
    const member = await this.memberRepo.findOne({ where: { conversationId, userId } });
    if (!member) throw new ForbiddenException('你不是该群成员');
    await this.memberRepo.update(member.id, { groupNickname: nickname?.trim() || null });
    return { message: '群昵称已更新' };
  }

  /** 解散群聊 */
  async deleteGroup(userId: number, conversationId: number) {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, type: 2 },
    });
    if (!conv) throw new NotFoundException('群聊不存在');
    if (Number(conv.creatorId) !== Number(userId))
      throw new ForbiddenException('仅创建者可解散');

    await this.dataSource.transaction(async (mgr) => {
      await mgr.delete(Message, { conversationId });
      await mgr.delete(ConversationMember, { conversationId });
      await mgr.remove(Conversation, conv);
    });
    return { message: '群聊已解散' };
  }

  /** 添加群成员 */
  async addGroupMember(
    userId: number,
    conversationId: number,
    memberId: number,
  ) {
    const member = await this.memberRepo.findOne({
      where: { conversationId, userId },
    });
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, type: 2 },
    });
    if (!conv) throw new NotFoundException('群聊不存在');
    if (!member) throw new ForbiddenException('你不是该群成员');
    const exists = await this.memberRepo.findOne({
      where: { conversationId, userId: memberId },
    });
    if (exists) throw new BadRequestException('该用户已在群中');
    const user = await this.userRepo.findOne({ where: { id: memberId } });
    if (!user) throw new NotFoundException('用户不存在');
    await this.memberRepo.save(
      this.memberRepo.create({ conversationId, userId: memberId, role: 1 }),
    );

    // 通知新成员有新会话
    this.chatGateway.notifyUser(Number(memberId), 'conversation:new', {
      conversationId,
    });

    // 发送入群通知消息（系统消息 msgType=3）
    const inviter = await this.userRepo.findOne({ where: { id: userId } });
    const inviterName = inviter?.nickname?.trim() || inviter?.account?.trim() || `用户${userId}`;
    const newMemberName = user.nickname?.trim() || user.account?.trim() || `用户${memberId}`;
    const noticeMsg = await this.msgRepo.save(this.msgRepo.create({
      conversationId,
      senderId: userId,
      msgType: 3,
      status: 1,
      content: JSON.stringify({
        kind: 'member_join',
        inviterId: Number(userId),
        inviterName,
        memberId: Number(memberId),
        memberName: newMemberName,
        text: `${inviterName}邀请${newMemberName}加入了群聊`,
      }),
    }));

    // 通过 Socket 推送给群内所有人
    await this.chatGateway.notifyConversationMessage(userId, noticeMsg, { includeSender: true });

    return { message: '已添加' };
  }

  /** 移除群成员 */
  async removeGroupMember(
    userId: number,
    conversationId: number,
    memberId: number,
  ) {
    const admin = await this.memberRepo.findOne({
      where: { conversationId, userId },
    });
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, type: 2 },
    });
    if (!conv) throw new NotFoundException('群聊不存在');
    if (
      !admin ||
      (Number(admin.role) < 2 && Number(conv.creatorId) !== Number(userId))
    )
      throw new ForbiddenException('仅群主或管理员可移除成员');
    if (Number(memberId) === Number(conv.creatorId))
      throw new BadRequestException('不能移除群主');
    await this.memberRepo.delete({ conversationId, userId: memberId });
    return { message: '已移除' };
  }

  /** 设置/取消管理员 */
  async setGroupAdmin(
    userId: number,
    conversationId: number,
    memberId: number,
    role: number,
  ) {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, type: 2 },
    });
    if (!conv) throw new NotFoundException('群聊不存在');
    if (Number(conv.creatorId) !== Number(userId))
      throw new ForbiddenException('仅群主可设置管理员');
    if (Number(memberId) === Number(conv.creatorId))
      throw new BadRequestException('群主无需设置管理员');
    const target = await this.memberRepo.findOne({
      where: { conversationId, userId: memberId },
    });
    if (!target) throw new NotFoundException('成员不存在');
    target.role = Number(role) === 2 ? 2 : 1;
    await this.memberRepo.save(target);
    return { message: target.role === 2 ? '已设为管理员' : '已取消管理员' };
  }

  /** 获取群成员列表 */
  async getGroupMembers(conversationId: number) {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, type: 2 },
    });
    if (!conv) throw new NotFoundException('群聊不存在');
    const members = await this.memberRepo.find({ where: { conversationId } });
    const result = [];
    for (const m of members) {
      const user = await this.userRepo.findOne({ where: { id: m.userId } });
      if (user) {
        result.push({
          userId: user.id,
          nickname: user.nickname,
          account: user.account,
          avatar: user.avatar,
          role: m.role,
          isMuted: m.isMuted,
          isOwner: Number(user.id) === Number(conv.creatorId),
        });
      }
    }
    return result;
  }
}
