import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThan, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHmac } from 'crypto';
import { deflateSync } from 'zlib';
import { existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
import { Meeting } from '../entities/meeting.entity';
import { MeetingParticipant } from '../entities/meeting-participant.entity';
import { MeetingBan } from '../entities/meeting-ban.entity';
import { GroupMeetingRequest } from '../entities/group-meeting-request.entity';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { CurrencyService } from '../currency/currency.service';
import { ServiceNotificationService } from '../notification/service-notification.service';

@Injectable()
export class MeetingService implements OnModuleInit {
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
    @InjectRepository(GroupMeetingRequest)
    private readonly meetingRequestRepo: Repository<GroupMeetingRequest>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly currencyService: CurrencyService,
    private readonly serviceNotificationService: ServiceNotificationService,
  ) {}

  async onModuleInit() {
    await this.ensureMeetingRequestSchema();
    await this.closeLingeringActiveMeetings('service_start');
  }

  async getActiveMeeting(userId: number, groupId: number) {
    await this.ensureGroupMember(userId, groupId);
    const meeting = await this.findUsableActiveMeeting(groupId);
    if (!meeting) return null;
    return this.withParticipants(meeting);
  }

  async startMeeting(
    userId: number,
    groupId: number,
    title?: string,
    _confirmCost = false,
  ) {
    const { conversation, member } = await this.ensureGroupMember(
      userId,
      groupId,
    );
    const active = await this.findUsableActiveMeeting(groupId);
    if (active) return this.withParticipants(active);

    const requester = await this.userRepo.findOne({ where: { id: userId } });
    const isCustomerService = requester?.account?.trim().toLowerCase() === 'admin';
    if (isCustomerService) {
      return this.createMeeting(userId, conversation, title);
    }

    if (!this.isGroupManager(conversation, member, userId)) {
      throw new ForbiddenException('仅群主或管理员可申请发起群会议');
    }

    return this.createMeetingRequest(userId, conversation, title);
  }

  private async createMeeting(
    creatorId: number,
    conversation: Conversation,
    title?: string,
  ) {
    const active = await this.findUsableActiveMeeting(conversation.id);
    if (active) return this.withParticipants(active);
    const meeting = await this.meetingRepo.save(
      this.meetingRepo.create({
        groupId: conversation.id,
        creatorId,
        status: 1,
        title: title || `${conversation.name || '群聊'}的会议`,
      }),
    );
    await this.joinMeeting(creatorId, meeting.id);
    const result = await this.withParticipants(meeting);
    const noticeMessage = await this.createMeetingNoticeMessage(
      creatorId,
      meeting,
      conversation,
    );
    return { ...result, justCreated: true, noticeMessage };
  }

  private async createMeetingRequest(
    requesterId: number,
    conversation: Conversation,
    title?: string,
  ) {
    await this.expirePendingMeetingRequests();
    const existing = await this.meetingRequestRepo.findOne({
      where: { groupId: conversation.id, status: 0 },
      order: { createdAt: 'DESC' },
    });
    if (existing && existing.expiresAt.getTime() > Date.now()) {
      if (Number(existing.requesterId) !== Number(requesterId)) {
        throw new BadRequestException('本群已有待审核的会议申请，请稍后再试');
      }
      return this.meetingRequestResponse(existing, conversation.name || '群聊');
    }

    const request = await this.meetingRequestRepo.save(
      this.meetingRequestRepo.create({
        groupId: conversation.id,
        requesterId,
        reviewerId: null,
        status: 0,
        title: title || `${conversation.name || '群聊'}的会议`,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        reviewedAt: null,
        meetingId: null,
      }),
    );
    const requester = await this.userRepo.findOne({ where: { id: requesterId } });
    const customerService = await this.userRepo.findOne({
      where: { account: 'admin', status: 1 },
    });
    if (customerService) {
      const requesterName =
        requester?.nickname?.trim() || requester?.account?.trim() || `用户${requesterId}`;
      await this.serviceNotificationService.notifyUser({
        recipientId: customerService.id,
        type: 'meeting_request',
        title: '群会议申请',
        content: `${requesterName}申请在「${conversation.name || '群聊'}」发起群会议，请在10分钟内处理`,
        fromUserId: requesterId,
        payload: {
          requestId: request.id,
          groupId: conversation.id,
          groupName: conversation.name || '群聊',
          requesterId,
          status: 0,
          expiresAt: request.expiresAt,
        },
      });
    }
    return this.meetingRequestResponse(request, conversation.name || '群聊');
  }

  async reviewMeetingRequest(
    reviewerId: number,
    requestId: number,
    action: 'approve' | 'reject',
  ) {
    await this.expirePendingMeetingRequests();
    const reviewer = await this.userRepo.findOne({ where: { id: reviewerId } });
    if (reviewer?.account?.trim().toLowerCase() !== 'admin') {
      throw new ForbiddenException('仅客服账号可审批群会议申请');
    }
    const request = await this.meetingRequestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('会议申请不存在');
    if (request.status !== 0) throw new BadRequestException('该会议申请已处理');
    if (request.expiresAt.getTime() <= Date.now()) {
      await this.markMeetingRequestExpired(request);
      throw new BadRequestException('会议申请已超时并自动拒绝');
    }

    const conversation = await this.convRepo.findOne({
      where: { id: request.groupId, type: 2 },
    });
    if (!conversation) throw new NotFoundException('群聊不存在');
    request.reviewerId = reviewerId;
    request.reviewedAt = new Date();

    if (action === 'reject') {
      request.status = 2;
      await this.meetingRequestRepo.save(request);
      await this.updateMeetingRequestNotification(request.id, 2);
      await this.notifyMeetingRequestResult(request, conversation, false);
      return { message: '已拒绝会议申请', requestId: request.id, status: 2 };
    }

    const created = await this.createMeeting(
      request.requesterId,
      conversation,
      request.title,
    );
    request.status = 1;
    request.meetingId = Number((created as any).id || 0) || null;
    await this.meetingRequestRepo.save(request);
    await this.updateMeetingRequestNotification(request.id, 1);
    await this.notifyMeetingRequestResult(request, conversation, true);
    return {
      ...created,
      requestId: request.id,
      requestStatus: 1,
      message: '已同意会议申请',
    };
  }

  async listPendingMeetingRequests(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.account?.trim().toLowerCase() !== 'admin') {
      throw new ForbiddenException('仅客服账号可查看会议申请');
    }
    await this.expirePendingMeetingRequests();
    return this.meetingRequestRepo.find({
      where: { status: 0 },
      order: { createdAt: 'ASC' },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async expirePendingMeetingRequests() {
    const expired = await this.meetingRequestRepo.find({
      where: { status: 0, expiresAt: LessThan(new Date()) },
    });
    for (const request of expired) {
      await this.markMeetingRequestExpired(request);
    }
    return expired.length;
  }

  private async markMeetingRequestExpired(request: GroupMeetingRequest) {
    request.status = 3;
    request.reviewedAt = new Date();
    await this.meetingRequestRepo.save(request);
    await this.updateMeetingRequestNotification(request.id, 3);
    const conversation = await this.convRepo.findOne({
      where: { id: request.groupId, type: 2 },
    });
    if (conversation) await this.notifyMeetingRequestResult(request, conversation, false, true);
  }

  private async updateMeetingRequestNotification(requestId: number, status: number) {
    try {
      await this.meetingRequestRepo.manager.query(
        `UPDATE service_notifications
         SET payload_json = JSON_SET(COALESCE(payload_json, '{}'), '$.status', ?)
         WHERE type = 'meeting_request'
           AND CAST(JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.requestId')) AS UNSIGNED) = ?`,
        [status, requestId],
      );
    } catch (error) {
      this.logger.warn(
        `更新会议申请通知状态失败 request=${requestId}: ${String(error)}`,
      );
    }
  }

  private async notifyMeetingRequestResult(
    request: GroupMeetingRequest,
    conversation: Conversation,
    approved: boolean,
    expired = false,
  ) {
    const content = approved
      ? `客服已同意你在「${conversation.name || '群聊'}」发起群会议`
      : expired
        ? `你在「${conversation.name || '群聊'}」的群会议申请10分钟内未处理，已自动拒绝`
        : `客服已拒绝你在「${conversation.name || '群聊'}」发起群会议`;
    await this.serviceNotificationService.notifyUser({
      recipientId: request.requesterId,
      type: 'meeting_request_result',
      title: approved ? '群会议申请已通过' : '群会议申请未通过',
      content,
      payload: {
        requestId: request.id,
        groupId: request.groupId,
        meetingId: request.meetingId,
        status: request.status,
      },
    });
  }

  private meetingRequestResponse(request: GroupMeetingRequest, groupName: string) {
    return {
      approvalRequired: true,
      requestId: request.id,
      requestStatus: request.status,
      groupId: request.groupId,
      groupName,
      expiresAt: request.expiresAt,
      message: '会议申请已提交，请等待客服审核',
    };
  }

  private async ensureMeetingRequestSchema() {
    await this.meetingRequestRepo.manager.query(`
      CREATE TABLE IF NOT EXISTS group_meeting_requests (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        requester_id INT NOT NULL,
        reviewer_id INT NULL,
        status TINYINT NOT NULL DEFAULT 0 COMMENT '0待处理 1同意 2拒绝 3超时拒绝',
        title VARCHAR(200) NULL,
        expires_at DATETIME NOT NULL,
        reviewed_at DATETIME NULL,
        meeting_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_meeting_request_group (group_id),
        INDEX idx_meeting_request_requester (requester_id),
        INDEX idx_meeting_request_status (status),
        INDEX idx_meeting_request_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
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
      await this.closeMeetingIfEmpty(meetingId);
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
    if (meeting.status !== 1) throw new BadRequestException('会议已结束');
    await this.ensureGroupMember(userId, meeting.groupId);
    const ban = await this.banRepo.findOne({ where: { meetingId, userId } });
    if (ban) throw new ForbiddenException('你已被移出本次会议');

    const storedMediaMode = await this.currencyService.getConfigValue(
      'meeting_media_mode',
      'p2p',
    );
    const environmentMediaMode = (
      process.env.MEETING_MEDIA_MODE || ''
    ).trim();
    const mediaMode = environmentMediaMode || storedMediaMode;
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

    const configuredMode = mediaMode.trim().toLowerCase();
    const normalizedMode =
      configuredMode === 'trtc'
        ? 'trtc'
        : configuredMode === 'sfu'
          ? 'sfu'
          : 'p2p';
    const recording = {
      enabled: recordingEnabled,
      autoRecord,
      url: meeting.recordingUrl || '',
      replayAvailable: !!meeting.recordingUrl?.trim(),
    };

    if (normalizedMode === 'trtc') {
      const sdkAppId = Number(process.env.TENCENT_TRTC_SDK_APP_ID || 0);
      const secretKey = (process.env.TENCENT_TRTC_SECRET_KEY || '').trim();
      const expireSeconds = this.parsePositiveInt(
        process.env.TENCENT_TRTC_USER_SIG_EXPIRE_SECONDS,
        86400,
      );
      if (!Number.isFinite(sdkAppId) || sdkAppId <= 0 || !secretKey) {
        this.logger.error('TRTC config missing: check TENCENT_TRTC_SDK_APP_ID and TENCENT_TRTC_SECRET_KEY');
        throw new BadRequestException('TRTC配置未完成，请联系管理员');
      }
      const trtcUserId = `u_${userId}`;
      const sig = this.createTrtcUserSig({
        sdkAppId,
        secretKey,
        userId: trtcUserId,
        expireSeconds,
      });
      return {
        meetingId,
        mediaMode: normalizedMode,
        iceServers: [],
        trtc: {
          sdkAppId,
          roomId: meetingId,
          strRoomId: `meeting_${meetingId}`,
          userId: trtcUserId,
          userSig: sig.userSig,
          expireAt: sig.expireAt,
        },
        sfu: {
          enabled: false,
          endpoint: '',
        },
        recording,
      };
    }

    return {
      meetingId,
      mediaMode: normalizedMode,
      iceServers,
      sfu: {
        enabled: normalizedMode === 'sfu' && !!sfuEndpoint,
        endpoint: sfuEndpoint,
      },
      recording,
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

  private async closeLingeringActiveMeetings(reason: string) {
    const meetings = await this.meetingRepo.find({ where: { status: 1 } });
    if (meetings.length === 0) return;
    const endedAt = new Date();
    const ids = meetings.map((meeting) => meeting.id);
    await this.participantRepo
      .createQueryBuilder()
      .update()
      .set({ leftAt: endedAt })
      .where('meeting_id IN (:...ids)', { ids })
      .andWhere('left_at IS NULL')
      .execute();
    await this.meetingRepo.update({ id: In(ids) }, { status: 2, endedAt });
    this.logger.warn(
      `Closed ${meetings.length} lingering active meetings, reason=${reason}`,
    );
  }

  private async closeMeetingIfEmpty(meetingId: number) {
    const activeCount = await this.participantRepo.count({
      where: { meetingId, leftAt: IsNull(), isKicked: false },
    });
    if (activeCount > 0) return;
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId, status: 1 },
    });
    if (!meeting) return;
    meeting.status = 2;
    meeting.endedAt = new Date();
    await this.meetingRepo.save(meeting);
  }

  private async findUsableActiveMeeting(groupId: number) {
    const meetings = await this.meetingRepo.find({
      where: { groupId, status: 1 },
      order: { startedAt: 'DESC' },
    });
    for (const meeting of meetings) {
      const activeCount = await this.participantRepo.count({
        where: { meetingId: meeting.id, leftAt: IsNull(), isKicked: false },
      });
      if (activeCount > 0) return meeting;
      await this.closeMeetingIfEmpty(meeting.id);
    }
    return null;
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

  private parsePositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  }

  private createTrtcUserSig(options: {
    sdkAppId: number;
    secretKey: string;
    userId: string;
    expireSeconds: number;
  }) {
    const currentTime = Math.floor(Date.now() / 1000);
    const content =
      `TLS.identifier:${options.userId}\n` +
      `TLS.sdkappid:${options.sdkAppId}\n` +
      `TLS.time:${currentTime}\n` +
      `TLS.expire:${options.expireSeconds}\n`;
    const signature = createHmac('sha256', options.secretKey)
      .update(content)
      .digest('base64');
    const sigDoc = {
      'TLS.ver': '2.0',
      'TLS.identifier': options.userId,
      'TLS.sdkappid': options.sdkAppId,
      'TLS.expire': options.expireSeconds,
      'TLS.time': currentTime,
      'TLS.sig': signature,
    };
    const compressed = deflateSync(Buffer.from(JSON.stringify(sigDoc)));
    return {
      userSig: this.toTencentBase64Url(compressed),
      expireAt: currentTime + options.expireSeconds,
    };
  }

  private toTencentBase64Url(value: Buffer) {
    return value
      .toString('base64')
      .replace(/\+/g, '*')
      .replace(/\//g, '-')
      .replace(/=/g, '_');
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
