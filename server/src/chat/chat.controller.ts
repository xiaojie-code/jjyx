import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { PaginationDto } from '../common/dto/pagination.dto';

function chatUploadOptions(
  folder: string,
  allowedExts: string[],
  maxSize: number,
) {
  return diskStorage({
    destination: (_req, _file, cb) => {
      const dir = join(process.cwd(), 'uploads', 'chat', folder);
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${suffix}${extname(file.originalname || '')}`);
    },
  });
}

function uploadOptions(folder: string, allowedExts: string[], maxSize: number) {
  return {
    storage: chatUploadOptions(folder, allowedExts, maxSize),
    limits: { fileSize: maxSize },
    fileFilter: (
      _req: any,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      const ext = extname(file.originalname || '').toLowerCase();
      if (!allowedExts.includes(ext)) {
        cb(
          new BadRequestException(`仅支持 ${allowedExts.join('/')} 文件`),
          false,
        );
        return;
      }
      cb(null, true);
    },
  };
}

@Controller('social')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  async getConversations(@CurrentUser('id') userId: number) {
    return this.chatService.getConversations(userId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id', ParseIntPipe) conversationId: number,
    @CurrentUser('id') userId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatService.getMessages(userId, conversationId, pagination);
  }

  @Delete('messages/:id')
  async deleteMessage(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) messageId: number,
  ) {
    await this.chatService.deleteMessage(userId, messageId);
    return { message: '删除成功' };
  }

  @Post('messages/:id/recall')
  async recallMessage(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) messageId: number,
  ) {
    const result = await this.chatService.recallMessage(userId, messageId);
    // 通过 Socket 通知会话内所有人消息已撤回
    await this.chatGateway.notifyConversationMessage(userId, {
      id: result.messageId,
      conversationId: result.conversationId,
      senderId: userId,
      content: JSON.stringify({ kind: 'recalled' }),
      msgType: 6,
      createdAt: new Date(),
    } as any, { includeSender: true });
    return { message: '已撤回' };
  }

  @Put('messages/:id')
  async updateMessage(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) messageId: number,
    @Body('content') content: string,
  ) {
    const msg = await this.chatService.updateMessage(
      userId,
      messageId,
      content,
    );
    await this.chatGateway.broadcastMessageUpdate(msg);
    return {
      id: msg.id,
      conversationId: msg.conversationId,
      content: msg.content,
    };
  }

  @Delete('conversations/:id/messages')
  async clearConversation(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
  ) {
    await this.chatService.clearConversation(userId, conversationId);
    return { message: '已清空' };
  }

  @Get('messages/search')
  async searchMessages(
    @CurrentUser('id') userId: number,
    @Query('keyword') keyword: string,
  ) {
    return this.chatService.searchMessages(userId, keyword);
  }

  /** 语音消息上传 */
  @Post('messages/voice')
  @UseInterceptors(
    FileInterceptor(
      'voice',
      uploadOptions(
        'voice',
        ['.mp3', '.aac', '.m4a', '.amr', '.wav', '.ogg', '.webm'],
        10 * 1024 * 1024,
      ),
    ),
  )
  async uploadVoice(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('conversationId') conversationId: string,
    @Body('durationMs') durationMs?: string,
  ) {
    if (!file) throw new BadRequestException('请上传语音文件');
    const voicePath = `/uploads/chat/voice/${file.filename}`;
    const duration = Number(durationMs || 0);
    const content =
      Number.isFinite(duration) && duration > 0
        ? JSON.stringify({ url: voicePath, durationMs: duration })
        : voicePath;
    const msg = await this.chatService.sendVoiceMessage(
      userId,
      Number(conversationId),
      content,
    );
    await this.chatGateway.notifyConversationMessage(userId, msg);
    return msg;
  }

  /** 图片消息上传 */
  @Post('messages/image')
  @UseInterceptors(
    FileInterceptor(
      'image',
      uploadOptions(
        'images',
        ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
        8 * 1024 * 1024,
      ),
    ),
  )
  async uploadImage(
    @CurrentUser('id') userId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('conversationId') conversationId: string,
  ) {
    if (!file) throw new BadRequestException('请上传图片文件');
    const imagePath = `/uploads/chat/images/${file.filename}`;
    const msg = await this.chatService.sendImageMessage(
      userId,
      Number(conversationId),
      imagePath,
    );
    await this.chatGateway.notifyConversationMessage(userId, msg);
    return msg;
  }

  /** 会话置顶/取消置顶 */
  @Put('conversations/:id/pin')
  async pinConversation(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
    @Body('isPinned') isPinned: boolean,
  ) {
    return this.chatService.pinConversation(userId, conversationId, isPinned);
  }

  /** 不显示会话（不删除聊天记录） */
  @Put('conversations/:id/hide')
  async hideConversation(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
  ) {
    return this.chatService.hideConversation(userId, conversationId);
  }

  /** 删除会话（删除聊天记录） */
  @Delete('conversations/:id')
  async deleteConversation(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
  ) {
    return this.chatService.deleteConversation(userId, conversationId);
  }

  /** 获取与指定用户的会话（用于从联系人进入聊天） */
  @Get('conversations/with/:userId')
  async getConversationWith(
    @CurrentUser('id') userId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ) {
    return this.chatService.getConversationWith(userId, targetUserId);
  }

  /** 获取用户设置 */
  @Get('settings')
  async getSettings(@CurrentUser('id') userId: number) {
    return this.chatService.getUserSettings(userId);
  }

  /** 更新用户设置 */
  @Put('settings')
  async updateSettings(
    @CurrentUser('id') userId: number,
    @Body() data: { notificationEnabled?: boolean },
  ) {
    return this.chatService.updateUserSettings(userId, data);
  }

  /** AI 智能体聊天 */
  @Post('ai/chat')
  async aiChat(
    @CurrentUser('id') userId: number,
    @Body('message') message: string,
  ) {
    return this.chatService.aiChat(userId, message);
  }

  /** AI 聊天历史记录 */
  @Get('ai/history')
  async getAiHistory(@CurrentUser('id') userId: number) {
    return this.chatService.getAiHistory(userId);
  }

  /** 获取未读角标数据 */
  @Get('badges')
  async getBadges(@CurrentUser('id') userId: number) {
    return this.chatService.getBadges(userId);
  }

  /** 禁言/解除禁言 */
  @Put('groups/:id/mute')
  async muteUser(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() data: { targetUserId: number; mute: boolean },
  ) {
    return this.chatService.muteUser(
      userId,
      conversationId,
      data.targetUserId,
      data.mute,
    );
  }

  /** 退出群聊 */
  @Post('groups/:id/leave')
  async leaveGroup(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) conversationId: number,
  ) {
    return this.chatService.leaveGroup(userId, conversationId);
  }
}
