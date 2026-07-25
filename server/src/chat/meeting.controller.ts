import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MeetingService } from './meeting.service';
import { MeetingGateway } from './meeting.gateway';
import { ChatGateway } from './chat.gateway';

@Controller('social')
export class MeetingController {
  constructor(
    private readonly meetingService: MeetingService,
    private readonly meetingGateway: MeetingGateway,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('groups/:id/meetings/active')
  getActiveMeeting(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) groupId: number,
  ) {
    return this.meetingService.getActiveMeeting(userId, groupId);
  }

  @Post('groups/:id/meetings')
  async startMeeting(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) groupId: number,
    @Body('title') title?: string,
    @Body('confirmCost') confirmCost?: unknown,
  ) {
    const costConfirmed =
      confirmCost === true || confirmCost === 'true' || confirmCost === 1 || confirmCost === '1';
    const result = (await this.meetingService.startMeeting(
      userId,
      groupId,
      title,
      costConfirmed,
    )) as Awaited<ReturnType<MeetingService['startMeeting']>> & {
      noticeMessage?: unknown;
    };
    if (result.noticeMessage) {
      await this.chatGateway.notifyConversationMessage(
        userId,
        result.noticeMessage,
        { includeSender: true },
      );
    }
    return result;
  }

  @Get('meeting-requests/pending')
  listPendingMeetingRequests(@CurrentUser('id') userId: number) {
    return this.meetingService.listPendingMeetingRequests(userId);
  }

  @Post('meeting-requests/:id/review')
  async reviewMeetingRequest(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) requestId: number,
    @Body('action') action: 'approve' | 'reject',
  ) {
    if (action !== 'approve' && action !== 'reject') {
      throw new BadRequestException('无效的审批操作');
    }
    const result = (await this.meetingService.reviewMeetingRequest(
      userId,
      requestId,
      action,
    )) as any;
    if (result.noticeMessage) {
      await this.chatGateway.notifyConversationMessage(
        Number(result.creatorId || userId),
        result.noticeMessage,
        { includeSender: true },
      );
    }
    return result;
  }

  @Post('meetings/:id/join')
  async joinMeeting(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) meetingId: number,
  ) {
    const result = await this.meetingService.joinMeeting(userId, meetingId);
    this.meetingGateway.notifyMeeting(
      meetingId,
      'meeting:participant-refresh',
      {
        meetingId,
        reason: 'join',
        userId,
      },
    );
    return result;
  }

  @Post('meetings/:id/leave')
  async leaveMeeting(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) meetingId: number,
  ) {
    const result = await this.meetingService.leaveMeeting(userId, meetingId);
    this.meetingGateway.notifyMeeting(
      meetingId,
      'meeting:participant-refresh',
      {
        meetingId,
        reason: 'leave',
        userId,
      },
    );
    return result;
  }

  @Post('meetings/:id/end')
  async endMeeting(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) meetingId: number,
  ) {
    const result = await this.meetingService.endMeeting(userId, meetingId);
    this.meetingGateway.notifyMeeting(meetingId, 'meeting:ended', {
      meetingId,
      operatorId: userId,
      force: false,
    });
    return result;
  }

  @Post('meetings/:id/kick')
  async kickParticipant(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) meetingId: number,
    @Body('targetUserId') targetUserId: number,
  ) {
    const result = await this.meetingService.kickParticipant(
      userId,
      meetingId,
      targetUserId,
    );
    this.meetingGateway.notifyMeeting(meetingId, 'meeting:kicked', {
      meetingId,
      operatorId: userId,
      targetUserId,
    });
    this.meetingGateway.notifyMeeting(
      meetingId,
      'meeting:participant-refresh',
      {
        meetingId,
        reason: 'kick',
        userId: targetUserId,
      },
    );
    return result;
  }

  @Post('meetings/:id/mute-all')
  async muteAllParticipants(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) meetingId: number,
    @Body('muted') muted?: boolean,
  ) {
    const nextMuted = muted !== false;
    const result = await this.meetingService.muteAllParticipants(
      userId,
      meetingId,
      nextMuted,
    );
    this.meetingGateway.setMeetingMuteState(meetingId, nextMuted, userId);
    return result;
  }

  @Post('meetings/:id/media-control')
  async controlParticipantMedia(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) meetingId: number,
    @Body()
    data: { targetUserId: number; micOn?: boolean; cameraOn?: boolean },
  ) {
    const result = await this.meetingService.controlParticipantMedia(
      userId,
      meetingId,
      data.targetUserId,
      { micOn: data.micOn, cameraOn: data.cameraOn },
    );
    this.meetingGateway.notifyMeeting(meetingId, 'meeting:media-control', {
      meetingId,
      operatorId: userId,
      ...result,
    });
    return result;
  }

  @Get('meetings/:id/participants')
  getParticipants(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) meetingId: number,
  ) {
    return this.meetingService.getParticipants(userId, meetingId);
  }

  @Get('meetings/:id/media-config')
  getMediaConfig(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) meetingId: number,
  ) {
    return this.meetingService.getMediaConfig(userId, meetingId);
  }
}
