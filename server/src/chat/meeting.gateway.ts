import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { MeetingService } from './meeting.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/meeting',
})
export class MeetingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MeetingGateway.name);
  private readonly userSockets = new Map<number, Set<string>>();
  private readonly socketMeetingIds = new Map<string, number>();
  private readonly meetingMuteStates = new Map<number, boolean>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly meetingService: MeetingService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      client.data.userId = Number(payload.sub);
      this.addUserSocket(client.data.userId, client.id);
      this.logger.log(
        `会议信令用户 ${client.data.userId} 已连接: socket=${client.id}, ip=${client.handshake.address}, transport=${client.conn.transport.name}`,
      );
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.removeUserSocket(Number(client.data.userId), client.id);
    this.socketMeetingIds.delete(client.id);
    const meetingId = client.data.meetingId;
    if (meetingId) {
      await this.markLeft(client, meetingId);
      client
        .to(`meeting:${meetingId}`)
        .emit('meeting:user-left', { userId: client.data.userId });
      client.to(`meeting:${meetingId}`).emit('meeting:participant-refresh', {
        meetingId,
        reason: 'disconnect',
        userId: client.data.userId,
      });
    }
  }

  @SubscribeMessage('meeting:join')
  async joinMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: number },
  ) {
    const meetingId = Number(data.meetingId);
    const userId = Number(client.data.userId);
    try {
      await this.meetingService.joinMeeting(userId, meetingId);
    } catch (error) {
      client.emit('meeting:join-error', { message: String(error) });
      return { error: 'join_failed' };
    }
    client.data.meetingId = meetingId;
    this.socketMeetingIds.set(client.id, meetingId);
    client.join(`meeting:${meetingId}`);
    this.logger.log(
      `用户 ${userId} 加入会议信令: meeting=${meetingId}, socket=${client.id}`,
    );
    client
      .to(`meeting:${meetingId}`)
      .emit('meeting:user-joined', { userId: client.data.userId });
    client.to(`meeting:${meetingId}`).emit('meeting:participant-refresh', {
      meetingId,
      reason: 'join',
      userId: client.data.userId,
    });
    const muted = this.meetingMuteStates.get(meetingId) === true;
    if (muted) {
      client.emit('meeting:mute-all', { meetingId, operatorId: 0, muted });
    }
    return { meetingId, userId: client.data.userId };
  }

  @SubscribeMessage('meeting:leave')
  async leaveMeeting(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: number },
  ) {
    const meetingId = Number(data.meetingId || client.data.meetingId);
    await this.markLeft(client, meetingId);
    client.leave(`meeting:${meetingId}`);
    client
      .to(`meeting:${meetingId}`)
      .emit('meeting:user-left', { userId: client.data.userId });
    client.to(`meeting:${meetingId}`).emit('meeting:participant-refresh', {
      meetingId,
      reason: 'leave',
      userId: client.data.userId,
    });
    this.socketMeetingIds.delete(client.id);
    client.data.meetingId = null;
    return { meetingId };
  }

  @SubscribeMessage('meeting:signal')
  relaySignal(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      meetingId: number;
      targetUserId?: number;
      type: string;
      payload: any;
    },
  ) {
    const meetingId = Number(data.meetingId || client.data.meetingId);
    const userId = Number(client.data.userId);
    if (!meetingId || Number(client.data.meetingId) !== meetingId) {
      this.logger.warn(
        `拒绝未入会信令: user=${userId}, socket=${client.id}, meeting=${meetingId}, joined=${client.data.meetingId}`,
      );
      return { error: 'not_joined' };
    }
    const signal = {
      meetingId,
      fromUserId: userId,
      targetUserId: data.targetUserId,
      type: data.type,
      payload: data.payload,
    };
    this.logger.log(
      `转发会议信令: meeting=${meetingId}, from=${userId}, to=${data.targetUserId || 'room'}, type=${data.type}`,
    );
    if (data.targetUserId) {
      const socketIds = this.getUserSocketIds(
        Number(data.targetUserId),
        meetingId,
      );
      if (socketIds.length === 0) {
        this.logger.warn(
          `会议信令目标离线: meeting=${meetingId}, from=${userId}, to=${data.targetUserId}, type=${data.type}`,
        );
      }
      for (const socketId of socketIds) {
        this.server.to(socketId).emit('meeting:signal', signal);
      }
    } else {
      client.to(`meeting:${meetingId}`).emit('meeting:signal', signal);
    }
    return { ok: true };
  }

  @SubscribeMessage('meeting:media-status')
  updateMediaStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { meetingId: number; micOn?: boolean; cameraOn?: boolean },
  ) {
    const meetingId = Number(data.meetingId || client.data.meetingId);
    const payload = {
      meetingId,
      userId: client.data.userId,
      micOn: data.micOn === true,
      cameraOn: data.cameraOn === true,
    };
    this.server
      .to(`meeting:${meetingId}`)
      .emit('meeting:media-status', payload);
    return payload;
  }

  notifyMeeting(meetingId: number, event: string, data: any) {
    if (event === 'meeting:ended') this.meetingMuteStates.delete(meetingId);
    this.server.to(`meeting:${meetingId}`).emit(event, data);
  }

  setMeetingMuteState(meetingId: number, muted: boolean, operatorId: number) {
    if (muted) {
      this.meetingMuteStates.set(meetingId, true);
    } else {
      this.meetingMuteStates.delete(meetingId);
    }
    this.notifyMeeting(meetingId, 'meeting:mute-all', {
      meetingId,
      operatorId,
      muted,
    });
  }

  private async markLeft(client: Socket, meetingId: number) {
    const userId = Number(client.data.userId);
    if (!meetingId || !userId) return;
    try {
      await this.meetingService.leaveMeeting(userId, meetingId);
    } catch (error) {
      this.logger.warn(
        `标记会议离开失败 meeting=${meetingId} user=${userId}: ${String(error)}`,
      );
    }
  }

  private addUserSocket(userId: number, socketId: string) {
    if (!userId) return;
    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.userSockets.set(userId, sockets);
  }

  private removeUserSocket(userId: number, socketId: string) {
    if (!userId) return;
    const sockets = this.userSockets.get(userId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) this.userSockets.delete(userId);
  }

  private getUserSocketIds(userId: number, meetingId?: number) {
    return Array.from(this.userSockets.get(userId) ?? []).filter((socketId) => {
      if (!meetingId) return true;
      return this.socketMeetingIds.get(socketId) === meetingId;
    });
  }
}
