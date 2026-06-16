import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
import { Meeting } from '../entities/meeting.entity';
import { MeetingParticipant } from '../entities/meeting-participant.entity';
import { MeetingBan } from '../entities/meeting-ban.entity';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { CurrencyService } from '../currency/currency.service';

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepo: Repository<ConversationMember>,
    @InjectRepository(Meeting)
    private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingParticipant)
    private readonly participantRepo: Repository<MeetingParticipant>,
    @InjectRepository(MeetingBan)
    private readonly banRepo: Repository<MeetingBan>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly currencyService: CurrencyService,
  ) {}

  async getActiveMeeting(userId: number, groupId: number) {
    await this.ensureGroupMember(userId, groupId);
    const meeting = await this.meetingRepo.findOne({
      where: { groupId, status: 1 },
      order: { startedAt: 'DESC' },
    });
    if (!meeting) return null;
    return this.withParticipants(meeting);
  }

  async startMeeting(
    userId: number,
    groupId: number,
    title?: string,
    confirmCost = false,
  ) {
    const { conversation, member } = await this.ensureGroupMember(
      userId,
      groupId,
    );
    const active = await this.meetingRepo.findOne({
      where: { groupId, status: 1 },
    });
    if (active) return this.withParticipants(active);

    const isManager = this.isGroupManager(conversation, member, userId);
    // 普通成员发起会议需要消耗积分，群主/管理员免费
    if (!isManager) {
      const costStr = await this.currencyService.getConfigValue('meeting_start_cost', '10000');
      const cost = Number(costStr);
      if (cost > 0) {
        if (!confirmCost) {
          throw new ForbiddenException(`发起群会议需要${cost}积分，请确认后再发起`);
        }
        try {
          await this.currencyService.changeCurrency(
            userId, 'points', -cost, 'meeting_start', `发起群会议消耗${cost}积分`,
          );
        } catch {
          throw new ForbiddenException(`积分不足，发起会议需要${cost}积分`);
        }
      }
    }

    const meeting = await this.meetingRepo.save(
      this.meetingRepo.create({
        groupId,
        creatorId: userId,
        status: 1,
        title: title || `${conversation.name || '群聊'}的会议`,
      }),
    );
    await this.joinMeeting(userId, meeting.id);
    const result = await this.withParticipants(meeting);
    const noticeMessage = await this.createMeetingNoticeMessage(
      userId,
      meeting,
      conversation,
    );
    return { ...result, justCreated: true, noticeMessage };
  }

  async joinMeeting(userId: number, meetingId: number) {
    const meeting = await this.getMeetingOrFail(meetingId);
    if (meeting.status !== 1) throw new BadRequestException('会议已结束');
    await this.ensureGroupMember(userId, meeting.groupId);
    const ban = await this.banRepo.findOne({ where: { meetingId, userId } });
    if (ban) throw new ForbiddenException('你已被移出本次会议');

    const existing = await this.participantRepo.findOne({
      where: { meetingId, userId },
    });
    if (existing) {
      existing.leftAt = null;
      existing.isKicked = false;
      await this.participantRepo.save(existing);
      return this.withParticipants(meeting);
    }

    await this.participantRepo.save(
      this.participantRepo.create({ meetingId, userId }),
    );
    return this.withParticipants(meeting);
  }

  async leaveMeeting(userId: number, meetingId: number) {
    const participant = await this.participantRepo.findOne({
      where: { meetingId, userId },
    });
    if (participant) {
      participant.leftAt = new Date();
      await this.participantRepo.save(participant);
    }
    return { message: '已离开会议' };
  }

  async endMeeting(userId: number, meetingId: number, force = false) {
    const meeting = await this.getMeetingOrFail(meetingId);
    if (meeting.status !== 1) return this.withParticipants(meeting);
    if (!force) {
      const { conversation, member } = await this.ensureGroupMember(
        userId,
        meeting.groupId,
      );
      // 群主、管理员、会议创建者都可以结束会议
      const isCreator = Number(meeting.creatorId) === Number(userId);
      if (!isCreator && !this.isGroupManager(conversation, member, userId)) {
        throw new ForbiddenException('仅群主、管理员或会议发起人可结束会议');
      }
    }
    meeting.status = 2;
    meeting.endedAt = new Date();
    await this.meetingRepo.save(meeting);
    await this.participantRepo.update(
      { meetingId, leftAt: IsNull() },
      { leftAt: new Date() },
    );
    return this.withParticipants(meeting);
  }

  async kickParticipant(
    operatorId: number,
    meetingId: number,
    targetUserId: number,
  ) {
    const meeting = await this.getMeetingOrFail(meetingId);
    const { conversation, member } = await this.ensureGroupMember(
      operatorId,
      meeting.groupId,
    );
    if (!this.isGroupManager(conversation, member, operatorId)) {
      throw new ForbiddenException('仅群主或管理员可移出会议成员');
    }
    await this.ensureOrdinaryMember(meeting.groupId, targetUserId);
    const participant = await this.participantRepo.findOne({
      where: { meetingId, userId: targetUserId },
    });
    if (participant) {
      participant.leftAt = new Date();
      participant.isKicked = true;
      await this.participantRepo.save(participant);
    }
    const existingBan = await this.banRepo.findOne({
      where: { meetingId, userId: targetUserId },
    });
    if (!existingBan) {
      await this.banRepo.save(
        this.banRepo.create({ meetingId, userId: targetUserId }),
      );
    }
    return { message: '已移出会议' };
  }

  async muteAllParticipants(
    operatorId: number,
    meetingId: number,
    muted = true,
  ) {
    const meeting = await this.getMeetingOrFail(meetingId);
    if (meeting.status !== 1) throw new BadRequestException('会议已结束');
    const { conversation, member } = await this.ensureGroupMember(
      operatorId,
      meeting.groupId,
    );
    // 群主、管理员、会议创建者都可以全员静音
    const isCreator = Number(meeting.creatorId) === Number(operatorId);
    if (!isCreator && !this.isGroupManager(conversation, member, operatorId)) {
      throw new ForbiddenException('仅群主、管理员或会议发起人可全员静音');
    }
    return { message: muted ? '已开启全员静音' : '已解除全员静音', muted };
  }

  async controlParticipantMedia(
    operatorId: number,
    meetingId: number,
    targetUserId: number,
    media: { micOn?: boolean; cameraOn?: boolean },
  ) {
    const meeting = await this.getMeetingOrFail(meetingId);
    if (meeting.status !== 1) throw new BadRequestException('会议已结束');
    const { conversation, member } = await this.ensureGroupMember(
      operatorId,
      meeting.groupId,
    );
    if (!this.isGroupManager(conversation, member, operatorId)) {
      throw new ForbiddenException('仅群主或管理员可控制成员麦克风或摄像头');
    }
    if (Number(operatorId) === Number(targetUserId)) {
      throw new BadRequestException('请直接操作自己的麦克风或摄像头');
    }
    await this.ensureOrdinaryMember(meeting.groupId, targetUserId);
    const participant = await this.participantRepo.findOne({
      where: {
        meetingId,
        userId: targetUserId,
        leftAt: IsNull(),
        isKicked: false,
      },
    });
    if (!participant) throw new NotFoundException('该成员不在会议中');
    const micOn = media.micOn === false ? false : undefined;
    const cameraOn = media.cameraOn === false ? false : undefined;
    if (micOn !== false && cameraOn !== false) {
      throw new BadRequestException('只能关闭普通成员的麦克风或摄像头');
    }
    return { targetUserId, micOn, cameraOn };
  }

  async getParticipants(userId: number, meetingId: number) {
    const meeting = await this.getMeetingOrFail(meetingId);
    await this.ensureGroupMember(userId, meeting.groupId);
    return this.getParticipantList(meetingId, true);
  }

  async getMediaConfig(userId: number, meetingId: number) {
    const meeting = await this.getMeetingOrFail(meetingId);
    await this.ensureGroupMember(userId, meeting.groupId);

    const mediaMode = await this.currencyService.getConfigValue(
      'meeting_media_mode',
      'p2p',
    );
    const sfuEndpoint = (
      await this.currencyService.getConfigValue('meeting_sfu_endpoint', '')
    ).trim();
    const turnUrls = this.parseConfigList(
      await this.currencyService.getConfigValue('meeting_turn_urls', ''),
    );
    const turnUsername = (
      await this.currencyService.getConfigValue('meeting_turn_username', '')
    ).trim();
    const turnCredential = (
      await this.currencyService.getConfigValue('meeting_turn_credential', '')
    ).trim();
    const recordingEnabled = this.configEnabled(
      await this.currencyService.getConfigValue(
        'meeting_recording_enabled',
        'false',
      ),
    );
    const autoRecord = this.configEnabled(
      await this.currencyService.getConfigValue(
        'meeting_recording_auto',
        'false',
      ),
    );

    const iceServers: Array<Record<string, unknown>> = [
      { urls: 'stun:stun.l.google.com:19302' },
    ];
    if (turnUrls.length > 0) {
      const turnServer: Record<string, unknown> = { urls: turnUrls };
      if (turnUsername) turnServer.username = turnUsername;
      if (turnCredential) turnServer.credential = turnCredential;
      iceServers.push(turnServer);
    }

    const normalizedMode = mediaMode.trim().toLowerCase() === 'sfu' ? 'sfu' : 'p2p';
    return {
      meetingId,
      mediaMode: normalizedMode,
      iceServers,
      sfu: {
        enabled: normalizedMode === 'sfu' && !!sfuEndpoint,
        endpoint: sfuEndpoint,
      },
      recording: {
        enabled: recordingEnabled,
        autoRecord,
        url: meeting.recordingUrl || '',
        replayAvailable: !!meeting.recordingUrl?.trim(),
      },
    };
  }

  async adminListMeetings(query: any) {
    const qb = this.meetingRepo
      .createQueryBuilder('m')
      .orderBy('m.created_at', 'DESC');
    if (query.status)
      qb.andWhere('m.status = :status', { status: Number(query.status) });
    if (query.groupId)
      qb.andWhere('m.group_id = :groupId', { groupId: Number(query.groupId) });

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const total = await qb.getCount();
    const meetings = await qb.skip((page - 1) * pageSize).take(pageSize).getMany();
    const list = await Promise.all(meetings.map((m) => this.withParticipants(m)));
    return { list, total, page, pageSize };
  }

  async adminEndMeeting(meetingId: number) {
    return this.endMeeting(0, meetingId, true);
  }

  async adminUpdateRecording(meetingId: number, recordingUrl: string) {
    await this.meetingRepo.update(meetingId, {
      recordingUrl: recordingUrl?.trim() || null,
    });
    const meeting = await this.getMeetingOrFail(meetingId);
    return this.withParticipants(meeting);
  }

  async adminListMessages(query: any) {
    const qb = this.messageRepo
      .createQueryBuilder('msg')
      .orderBy('msg.created_at', 'DESC');
    if (query.conversationId)
      qb.andWhere('msg.conversation_id = :conversationId', {
        conversationId: Number(query.conversationId),
      });
    if (query.userId)
      qb.andWhere('msg.sender_id = :userId', { userId: Number(query.userId) });
    if (query.keyword)
      qb.andWhere('msg.content LIKE :keyword', {
        keyword: `%${query.keyword}%`,
      });
    if (query.msgType)
      qb.andWhere('msg.msg_type = :msgType', { msgType: Number(query.msgType) });
    if (query.startDate)
      qb.andWhere('msg.created_at >= :startDate', { startDate: `${query.startDate} 00:00:00` });
    if (query.endDate)
      qb.andWhere('msg.created_at <= :endDate', { endDate: `${query.endDate} 23:59:59` });

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 30;
    const total = await qb.getCount();
    const list = await qb.skip((page - 1) * pageSize).take(pageSize).getMany();

    const senderIds = [...new Set(list.map((m) => Number(m.senderId)))];
    const users =
      senderIds.length > 0
        ? await this.userRepo
            .createQueryBuilder('u')
            .where('u.id IN (:...ids)', { ids: senderIds })
            .getMany()
        : [];
    const userMap = new Map(users.map((u) => [Number(u.id), u]));
    return {
      list: list.map((m) => ({
        ...m,
        senderNickname: userMap.get(Number(m.senderId))?.nickname || '',
        senderAccount: userMap.get(Number(m.senderId))?.account || '',
      })),
      total,
      page,
      pageSize,
    };
  }

  async adminDeleteMessage(messageId: number) {
    await this.messageRepo.delete(messageId);
    return { message: '已删除' };
  }

  async adminCleanExpired(days?: number) {
    const configuredDays = Number(
      await this.currencyService.getConfigValue('data_retention_days', '7'),
    );
    const retentionDays = Number(days || configuredDays);
    if (
      !Number.isFinite(retentionDays) ||
      retentionDays <= 0 ||
      retentionDays > 365
    ) {
      throw new BadRequestException('保留天数必须在 1 到 365 之间');
    }
    const cutoff = new Date(Date.now() - retentionDays * 86400000);
    let deletedFiles = 0;
    const expiredMessages = await this.messageRepo.find({
      where: { createdAt: LessThan(cutoff) },
    });
    for (const msg of expiredMessages) {
      if (this.deleteLocalUpload(msg.content)) deletedFiles += 1;
    }
    if (expiredMessages.length > 0)
      await this.messageRepo.remove(expiredMessages);

    const expiredMeetings = await this.meetingRepo.find({
      where: { status: 2, endedAt: LessThan(cutoff) },
    });
    const meetingIds = expiredMeetings.map((meeting) => meeting.id);
    for (const meeting of expiredMeetings) {
      if (this.deleteLocalUpload(meeting.recordingUrl)) deletedFiles += 1;
    }
    if (meetingIds.length > 0) {
      await this.banRepo.delete({ meetingId: In(meetingIds) });
      await this.participantRepo.delete({ meetingId: In(meetingIds) });
      await this.meetingRepo.remove(expiredMeetings);
    }
    return {
      retentionDays,
      messages: expiredMessages.length,
      meetings: expiredMeetings.length,
      files: deletedFiles,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanExpiredData() {
    const result = await this.adminCleanExpired();
    this.logger.log(
      `已清理过期社交数据: messages=${result.messages}, meetings=${result.meetings}`,
    );
  }

  private async getMeetingOrFail(meetingId: number) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
    });
    if (!meeting) throw new NotFoundException('会议不存在');
    return meeting;
  }

  private async ensureGroupMember(userId: number, groupId: number) {
    const conversation = await this.convRepo.findOne({
      where: { id: groupId, type: 2 },
    });
    if (!conversation) throw new NotFoundException('群聊不存在');
    const member = await this.memberRepo.findOne({
      where: { conversationId: groupId, userId },
    });
    if (!member) throw new ForbiddenException('你不是该群成员');
    return { conversation, member };
  }

  private isGroupManager(
    conversation: Conversation,
    member: ConversationMember,
    userId: number,
  ) {
    return (
      Number(conversation.creatorId) === Number(userId) ||
      Number(member.role) >= 2
    );
  }

  private async ensureOrdinaryMember(groupId: number, targetUserId: number) {
    const conversation = await this.convRepo.findOne({
      where: { id: groupId, type: 2 },
    });
    if (!conversation) throw new NotFoundException('群聊不存在');
    const target = await this.memberRepo.findOne({
      where: { conversationId: groupId, userId: targetUserId },
    });
    if (!target) throw new NotFoundException('成员不存在');
    if (
      Number(conversation.creatorId) === Number(targetUserId) ||
      Number(target.role) >= 2
    ) {
      throw new BadRequestException('只能操作普通成员');
    }
    return target;
  }

  private async createMeetingNoticeMessage(
    userId: number,
    meeting: Meeting,
    conversation: Conversation,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const starterName =
      user?.nickname?.trim() || user?.account?.trim() || `用户${userId}`;
    const msg = await this.messageRepo.save(
      this.messageRepo.create({
        conversationId: meeting.groupId,
        senderId: userId,
        msgType: 3,
        status: 1,
        content: JSON.stringify({
          kind: 'group_meeting',
          meetingId: Number(meeting.id),
          groupId: Number(meeting.groupId),
          title: meeting.title || `${conversation.name || '群聊'}的会议`,
          starterId: Number(userId),
          starterName,
          text: `${starterName}发起了群会议`,
          actionText: '点击进入会议',
        }),
      }),
    );
    await this.memberRepo
      .createQueryBuilder()
      .update()
      .set({ unreadCount: () => 'unread_count + 1' })
      .where('conversation_id = :conversationId AND user_id != :userId', {
        conversationId: meeting.groupId,
        userId,
      })
      .execute();
    return msg;
  }

  private async withParticipants(meeting: Meeting) {
    return {
      ...meeting,
      recordingAvailable: !!meeting.recordingUrl?.trim(),
      participants: await this.getParticipantList(meeting.id),
    };
  }

  private parseConfigList(value: string) {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private configEnabled(value: string) {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }

  private async getParticipantList(meetingId: number, activeOnly = false) {
    const participants = await this.participantRepo.find({
      where: activeOnly
        ? { meetingId, leftAt: IsNull(), isKicked: false }
        : { meetingId },
      order: { joinedAt: 'ASC' },
    });
    const userIds = [...new Set(participants.map((p) => Number(p.userId)))];
    const users =
      userIds.length > 0
        ? await this.userRepo
            .createQueryBuilder('u')
            .where('u.id IN (:...ids)', { ids: userIds })
            .getMany()
        : [];
    const userMap = new Map(users.map((u) => [Number(u.id), u]));
    const meeting = await this.getMeetingOrFail(meetingId);
    const conversation = await this.convRepo.findOne({
      where: { id: meeting.groupId },
    });
    const members = await this.memberRepo.find({
      where: { conversationId: meeting.groupId },
    });
    const memberMap = new Map(members.map((m) => [Number(m.userId), m]));
    return participants.map((p) => ({
      ...p,
      nickname: userMap.get(Number(p.userId))?.nickname || '',
      account: userMap.get(Number(p.userId))?.account || '',
      avatar: userMap.get(Number(p.userId))?.avatar || '',
      role: memberMap.get(Number(p.userId))?.role || 1,
      isOwner: Number(conversation?.creatorId) === Number(p.userId),
      isCreator: Number(meeting.creatorId) === Number(p.userId),
      isOnline: !p.leftAt && !p.isKicked,
    }));
  }

  private deleteLocalUpload(fileUrl?: string) {
    if (!fileUrl) return false;
    if (fileUrl.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(fileUrl) as { url?: string };
        return this.deleteLocalUpload(parsed.url);
      } catch {
        return false;
      }
    }
    if (!fileUrl.startsWith('/uploads/')) return false;
    try {
      const cleanUrl = fileUrl.split('?')[0];
      const uploadRoot = resolve(process.cwd(), 'uploads');
      const filePath = resolve(process.cwd(), cleanUrl.replace(/^\//, ''));
      if (!filePath.startsWith(uploadRoot)) return false;
      if (!existsSync(filePath)) return false;
      unlinkSync(filePath);
      return true;
    } catch (error) {
      this.logger.warn(`删除本地上传文件失败: ${fileUrl} ${String(error)}`);
      return false;
    }
  }
}
