import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ServiceNotificationService } from '../notification/service-notification.service';
import { PushService } from '../push/push.service';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly onlineUsers = new Map<number, Set<string>>();
  private readonly foregroundSockets = new Set<string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly serviceNotificationService: ServiceNotificationService,
    private readonly pushService: PushService,
  ) {}

  onModuleInit() {
    this.serviceNotificationService.registerPusher((recipientId, payload) => {
      const userId = Number(recipientId);
      this.notifyUser(userId, 'service:notification', payload);
      const socketIds = this.getUserSocketIds(userId);
      if (socketIds.length === 0 || !this.hasForegroundSocket(socketIds)) {
        void this.pushService
          .sendToUser(userId, {
            title: payload?.title?.toString() || '服务通知',
            body: payload?.content?.toString() || '你收到了一条新的服务通知',
            data: {
              type: 'service_notification',
              notificationId: Number(payload?.id || 0),
              route: 'service_notifications',
            },
          })
          .catch((error) =>
            this.logger.warn(`Service notification push failed: ${String(error)}`),
          );
      }
    });
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.toString().replace('Bearer ', '');
      if (!token) {
        this.logger.warn(
          `Socket rejected: no token, ip=${client.handshake.address}`,
        );
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = Number(payload.sub);
      client.data.userId = userId;
      client.data.isForeground = true;
      this.addOnlineSocket(userId, client.id);
      this.foregroundSockets.add(client.id);

      this.logger.log(
        `User ${userId} online: socket=${client.id}, ip=${client.handshake.address}, transport=${client.conn.transport.name}`,
      );
      this.server.emit('user:online', { userId });
      await this.chatService.pushOfflineMessages(userId, client);
    } catch (error) {
      this.logger.warn(
        `Socket auth failed: ${String(error)}, ip=${client.handshake.address}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Number(client.data.userId);
    this.foregroundSockets.delete(client.id);
    if (!userId) return;

    const stillOnline = this.removeOnlineSocket(userId, client.id);
    this.logger.log(`User ${userId} disconnected: ${client.id}`);
    if (!stillOnline) {
      this.logger.log(`User ${userId} offline`);
      this.server.emit('user:offline', { userId });
    }
  }

  @SubscribeMessage('client:state')
  handleClientState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { foreground?: boolean },
  ) {
    const isForeground = data?.foreground !== false;
    client.data.isForeground = isForeground;
    if (isForeground) {
      this.foregroundSockets.add(client.id);
    } else {
      this.foregroundSockets.delete(client.id);
    }
    return { foreground: isForeground };
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { conversationId: number; content: string; msgType: number },
  ) {
    const senderId = Number(client.data.userId);
    const isMuted = await this.chatService.isUserMuted(
      senderId,
      data.conversationId,
    );
    if (isMuted) {
      return { error: '你已被禁言，无法发送消息' };
    }

    const msg = await this.chatService.sendMessage(
      senderId,
      data.conversationId,
      data.content,
      data.msgType,
    );
    await this.notifyConversationMessage(senderId, msg);

    return { id: msg.id, createdAt: msg.createdAt };
  }

  @SubscribeMessage('message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: number; content: string },
  ) {
    const senderId = Number(client.data.userId);
    const msg = await this.chatService.updateMessage(
      senderId,
      data.messageId,
      data.content,
    );
    await this.broadcastMessageUpdate(msg);

    return { id: msg.id, content: msg.content };
  }

  async broadcastMessageUpdate(msg: {
    id: number;
    conversationId: number;
    content: string;
  }) {
    const memberIds = await this.chatService.getConversationMemberIds(
      msg.conversationId,
    );
    for (const memberId of memberIds) {
      for (const socketId of this.getUserSocketIds(Number(memberId))) {
        this.server.to(socketId).emit('message:update', {
          id: msg.id,
          conversationId: msg.conversationId,
          content: msg.content,
        });
      }
    }
  }

  async notifyConversationMessage(
    senderId: number,
    msg: any,
    options: { includeSender?: boolean } = {},
  ) {
    const memberIds = await this.chatService.getConversationMemberIds(
      msg.conversationId,
    );
    const senderInfo = await this.chatService.getUserInfo(msg.senderId);
    this.logger.log(
      `Notify conversation ${msg.conversationId}; members=${memberIds.join(',')}; online=${this.getOnlineUserIds().join(',')}`,
    );

    for (const memberId of memberIds) {
      const recipientId = Number(memberId);
      if (!options.includeSender && recipientId === Number(senderId)) continue;

      const socketIds = this.getUserSocketIds(recipientId);
      if (socketIds.length > 0) {
        for (const socketId of socketIds) {
          this.server.to(socketId).emit('message:receive', {
            id: msg.id,
            conversationId: msg.conversationId,
            senderId: msg.senderId,
            content: msg.content,
            msgType: msg.msgType,
            createdAt: msg.createdAt,
            senderNickname: senderInfo.nickname,
            senderAvatar: senderInfo.avatar,
          });
        }
      } else {
        await this.chatService.saveOfflineMessage(recipientId, msg.id);
      }

      if (socketIds.length === 0 || !this.hasForegroundSocket(socketIds)) {
        await this.pushService.sendChatMessageNotification({
          recipientId,
          senderName: senderInfo.nickname,
          messageId: Number(msg.id),
          conversationId: Number(msg.conversationId),
          senderId: Number(msg.senderId),
          msgType: Number(msg.msgType),
          content: msg.content || '',
        });
      }
    }
  }

  @SubscribeMessage('message:read')
  async handleReadMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; messageId: number },
  ) {
    const userId = Number(client.data.userId);
    await this.chatService.markAsRead(
      userId,
      data.conversationId,
      data.messageId,
    );

    const msg = await this.chatService.getMessageById(data.messageId);
    if (!msg) return;

    for (const senderSocketId of this.getUserSocketIds(Number(msg.senderId))) {
      this.server.to(senderSocketId).emit('message:status', {
        messageId: data.messageId,
        status: 2,
      });
    }
  }

  isUserOnline(userId: number): boolean {
    return this.getUserSocketIds(Number(userId)).length > 0;
  }

  notifyUser(userId: number, event: string, data: any): void {
    for (const socketId of this.getUserSocketIds(Number(userId))) {
      this.server.to(socketId).emit(event, data);
    }
  }

  private addOnlineSocket(userId: number, socketId: string): void {
    const socketIds = this.onlineUsers.get(userId) ?? new Set<string>();
    socketIds.add(socketId);
    this.onlineUsers.set(userId, socketIds);
  }

  private removeOnlineSocket(userId: number, socketId: string): boolean {
    const socketIds = this.onlineUsers.get(userId);
    if (!socketIds) return false;

    socketIds.delete(socketId);
    if (socketIds.size === 0) {
      this.onlineUsers.delete(userId);
      return false;
    }
    return true;
  }

  private getUserSocketIds(userId: number): string[] {
    return [...(this.onlineUsers.get(userId) ?? [])];
  }

  private getOnlineUserIds(): number[] {
    return [...this.onlineUsers.keys()];
  }

  private hasForegroundSocket(socketIds: string[]): boolean {
    return socketIds.some((socketId) => this.foregroundSockets.has(socketId));
  }
}
