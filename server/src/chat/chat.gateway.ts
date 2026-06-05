import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ServiceNotificationService } from '../notification/service-notification.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);
  // userId -> socketId 集合。同一账号可能同时存在多个窗口/设备连接。
  private onlineUsers = new Map<number, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly serviceNotificationService: ServiceNotificationService,
  ) {}

  /** 注册服务通知实时推送通道 */
  onModuleInit() {
    this.serviceNotificationService.registerPusher((recipientId, payload) => {
      this.notifyUser(Number(recipientId), 'service:notification', payload);
    });
  }

  /** 连接时验证 JWT */
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        this.logger.warn(`Socket 连接被拒绝：无 token，IP: ${client.handshake.address}`);
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      const userId = Number(payload.sub);
      client.data.userId = userId;
      this.addOnlineSocket(userId, client.id);
      this.logger.log(
        `用户 ${userId} 上线: socket=${client.id}, ip=${client.handshake.address}, transport=${client.conn.transport.name}`,
      );
      // 广播上线
      this.server.emit('user:online', { userId });
      // 推送离线消息
      await this.chatService.pushOfflineMessages(userId, client);
    } catch (error) {
      this.logger.warn(`Socket 连接验证失败：${String(error)}, IP: ${client.handshake.address}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Number(client.data.userId);
    if (userId) {
      const stillOnline = this.removeOnlineSocket(userId, client.id);
      this.logger.log(`用户 ${userId} 连接断开: ${client.id}`);
      if (!stillOnline) {
        this.logger.log(`用户 ${userId} 离线`);
        this.server.emit('user:offline', { userId });
      }
    }
  }

  /** 发送消息 */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { conversationId: number; content: string; msgType: number },
  ) {
    const senderId = Number(client.data.userId);

    // 检查是否被禁言
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

  /** 编辑消息 */
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
    // 获取会话成员，推送消息
    const memberIds = await this.chatService.getConversationMemberIds(
      msg.conversationId,
    );
    this.logger.log(
      `推送消息给会话 ${msg.conversationId} 的成员: ${memberIds.join(',')}, 在线用户: ${this.getOnlineUserIds().join(',')}`,
    );
    for (const memberId of memberIds) {
      if (!options.includeSender && Number(memberId) === Number(senderId))
        continue;
      const socketIds = this.getUserSocketIds(Number(memberId));
      this.logger.log(
        `推送给用户 ${memberId}, socketId: ${socketIds.length > 0 ? socketIds.join(',') : '离线'}`,
      );
      if (socketIds.length > 0) {
        const senderInfo = await this.chatService.getUserInfo(msg.senderId);
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
        // 离线消息
        await this.chatService.saveOfflineMessage(Number(memberId), msg.id);
      }
    }
  }

  /** 标记已读 */
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

    // 通知发送者消息已读
    const msg = await this.chatService.getMessageById(data.messageId);
    if (msg) {
      const senderSocketIds = this.getUserSocketIds(Number(msg.senderId));
      for (const senderSocketId of senderSocketIds) {
        this.server.to(senderSocketId).emit('message:status', {
          messageId: data.messageId,
          status: 2, // 已读
        });
      }
    }
  }

  /** 检查用户是否在线 */
  isUserOnline(userId: number): boolean {
    return this.getUserSocketIds(Number(userId)).length > 0;
  }

  /** 向指定用户发送事件通知 */
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
}
