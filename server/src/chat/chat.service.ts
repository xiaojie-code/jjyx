import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Socket } from 'socket.io';
import { Message } from '../entities/message.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
import { OfflineMessage } from '../entities/offline-message.entity';
import { UserSetting } from '../entities/user-setting.entity';
import { FriendRequest } from '../entities/friend-request.entity';
import { User } from '../entities/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(ConversationMember)
    private readonly memberRepo: Repository<ConversationMember>,
    @InjectRepository(OfflineMessage)
    private readonly offlineRepo: Repository<OfflineMessage>,
    @InjectRepository(UserSetting)
    private readonly settingRepo: Repository<UserSetting>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepo: Repository<FriendRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** 发送消息 */
  async sendMessage(
    senderId: number,
    conversationId: number,
    content: string,
    msgType: number,
  ) {
    const member = await this.ensureConversationMember(
      senderId,
      conversationId,
    );
    if (member.isMuted)
      throw new ForbiddenException('你已被禁言，无法发送消息');
    if (!content?.trim()) throw new BadRequestException('消息内容不能为空');
    const msg = this.msgRepo.create({
      conversationId,
      senderId,
      content,
      msgType,
      status: 1,
    });
    const saved = await this.msgRepo.save(msg);

    // 更新会话成员未读数
    await this.memberRepo
      .createQueryBuilder()
      .update()
      .set({ unreadCount: () => 'unread_count + 1' })
      .where('conversation_id = :cid AND user_id != :uid', {
        cid: conversationId,
        uid: senderId,
      })
      .execute();

    return saved;
  }

  /** 获取会话成员ID列表 */
  async getConversationMemberIds(conversationId: number): Promise<number[]> {
    const members = await this.memberRepo.find({ where: { conversationId } });
    return members.map((m) => Number(m.userId));
  }

  /** 保存离线消息 */
  async saveOfflineMessage(userId: number, messageId: number) {
    await this.offlineRepo.save(this.offlineRepo.create({ userId, messageId }));
  }

  /** 推送离线消息 */
  async pushOfflineMessages(userId: number, client: Socket) {
    const offlines = await this.offlineRepo.find({
      where: { userId, isPushed: false },
      order: { createdAt: 'ASC' },
    });

    for (const off of offlines) {
      const msg = await this.msgRepo.findOne({ where: { id: off.messageId } });
      if (msg) {
        client.emit('message:receive', {
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          content: msg.content,
          msgType: msg.msgType,
          createdAt: msg.createdAt,
          senderNickname: await this.getUserNickname(msg.senderId),
        });
      }
      off.isPushed = true;
      await this.offlineRepo.save(off);
    }
  }

  /** 标记已读 */
  async markAsRead(userId: number, conversationId: number, messageId: number) {
    // 更新该会话中所有未读消息的状态为已读
    await this.msgRepo
      .createQueryBuilder()
      .update()
      .set({ status: 2 })
      .where('conversation_id = :cid AND sender_id != :uid AND status = 1', {
        cid: conversationId,
        uid: userId,
      })
      .execute();
    // 清零未读数
    await this.memberRepo.update(
      { conversationId, userId },
      { unreadCount: 0 },
    );
  }

  /** 获取消息 */
  async getMessageById(id: number) {
    return this.msgRepo.findOne({ where: { id } });
  }

  /** 获取会话列表 */
  async getConversations(userId: number) {
    const members = await this.memberRepo.find({
      where: { userId },
      order: { isPinned: 'DESC' },
    });

    const result = [];
    for (const m of members) {
      const conv = await this.convRepo.findOne({
        where: { id: m.conversationId },
      });
      if (!conv) continue; // 会话不存在则跳过
      // 群聊未审核通过的不显示（status=0待审核，status=2拒绝）
      if (conv.type === 2 && conv.status !== 1) continue;

      const lastMsg = await this.msgRepo.findOne({
        where: { conversationId: m.conversationId },
        order: { createdAt: 'DESC' },
      });

      // 获取对方用户信息（单聊时）
      let peerUser: {
        id: number;
        nickname: string;
        avatar: string;
        account: string;
      } | null = null;
      if (conv.type === 1) {
        // 使用 QueryBuilder 精确查找对方成员（排除自己）
        const otherMemberRecord = await this.memberRepo
          .createQueryBuilder('cm')
          .where('cm.conversation_id = :convId AND cm.user_id != :userId', {
            convId: m.conversationId,
            userId: userId,
          })
          .getOne();

        if (otherMemberRecord) {
          const user = await this.userRepo.findOne({
            where: { id: otherMemberRecord.userId },
            select: ['id', 'nickname', 'avatar', 'account'],
          });
          if (user) {
            peerUser = {
              id: user.id,
              nickname: user.nickname,
              avatar: user.avatar,
              account: user.account,
            };
          }
        }
      }

      result.push({
        conversationId: m.conversationId,
        type: conv.type,
        name: conv.name,
        isPinned: m.isPinned,
        unreadCount: m.unreadCount,
        peerUser,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              conversationId: lastMsg.conversationId,
              senderId: lastMsg.senderId,
              content: lastMsg.content,
              msgType: lastMsg.msgType,
              status: lastMsg.status,
              createdAt: lastMsg.createdAt,
            }
          : null,
      });
    }
    // 按置顶优先、最新消息时间降序排列
    result.sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aTime = a.lastMessage?.createdAt || '';
      const bTime = b.lastMessage?.createdAt || '';
      return bTime > aTime ? 1 : bTime < aTime ? -1 : 0;
    });
    return result;
  }

  /** 获取历史消息 */
  async getMessages(
    userId: number,
    conversationId: number,
    pagination: PaginationDto,
  ) {
    await this.ensureConversationMember(userId, conversationId);
    const [list, total] = await this.msgRepo.findAndCount({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    // 附加发送者信息
    const messagesWithUser = await Promise.all(
      list.map(async (msg) => {
        const sender = await this.userRepo.findOne({
          where: { id: msg.senderId },
          select: ['id', 'nickname', 'avatar', 'account'],
        });
        return {
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          content: msg.content,
          msgType: msg.msgType,
          status: msg.status,
          createdAt: msg.createdAt,
          sender: sender
            ? {
                id: sender.id,
                nickname: sender.nickname,
                avatar: sender.avatar,
                account: sender.account,
              }
            : null,
        };
      }),
    );

    return {
      list: messagesWithUser.reverse(),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  /** 删除单条消息 */
  async deleteMessage(userId: number, messageId: number) {
    const msg = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('消息不存在');
    if (Number(msg.senderId) !== Number(userId))
      throw new ForbiddenException('只能删除自己的消息');
    await this.msgRepo.remove(msg);
  }

  /** 撤回消息（2分钟内） */
  async recallMessage(userId: number, messageId: number) {
    const msg = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('消息不存在');
    if (Number(msg.senderId) !== Number(userId))
      throw new ForbiddenException('只能撤回自己的消息');
    // 检查是否在2分钟内
    const now = Date.now();
    const msgTime = new Date(msg.createdAt).getTime();
    if (now - msgTime > 2 * 60 * 1000) {
      throw new BadRequestException('超过2分钟，无法撤回');
    }
    // 将消息内容改为撤回标记
    msg.content = JSON.stringify({ kind: 'recalled', originalMsgType: msg.msgType });
    msg.msgType = 6; // 6=撤回消息
    await this.msgRepo.save(msg);
    return { conversationId: msg.conversationId, messageId: msg.id };
  }

  /** 编辑自己发送的文字消息 */
  async updateMessage(userId: number, messageId: number, content: string) {
    const msg = await this.msgRepo.findOne({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('消息不存在');
    if (Number(msg.senderId) !== Number(userId))
      throw new ForbiddenException('只能修改自己的消息');
    if (Number(msg.msgType) !== 1)
      throw new BadRequestException('只能修改文字消息');
    if (!content?.trim()) throw new BadRequestException('消息内容不能为空');
    msg.content = content.trim();
    return this.msgRepo.save(msg);
  }

  /** 清空会话消息 */
  async clearConversation(userId: number, conversationId: number) {
    await this.ensureConversationMember(userId, conversationId);
    await this.msgRepo.delete({ conversationId });
    await this.memberRepo.update(
      { conversationId, userId },
      { unreadCount: 0 },
    );
  }

  /** 搜索聊天记录 */
  async searchMessages(userId: number, keyword: string) {
    const trimmedKeyword = keyword?.trim();
    if (!trimmedKeyword) return [];
    const memberConvs = await this.memberRepo.find({ where: { userId } });
    const convIds = memberConvs.map((m) => m.conversationId);
    if (convIds.length === 0) return [];

    const messages = await this.msgRepo
      .createQueryBuilder('msg')
      .where('msg.conversation_id IN (:...convIds)', { convIds })
      .andWhere('msg.content LIKE :keyword', { keyword: `%${trimmedKeyword}%` })
      .orderBy('msg.created_at', 'DESC')
      .limit(50)
      .getMany();

    // 附加发送者昵称
    const senderIds = [...new Set(messages.map(m => Number(m.senderId)))];
    const users = senderIds.length > 0
      ? await this.userRepo.createQueryBuilder('u').where('u.id IN (:...ids)', { ids: senderIds }).getMany()
      : [];
    const userMap = new Map(users.map(u => [Number(u.id), u]));

    return messages.map(m => ({
      ...m,
      senderNickname: userMap.get(Number(m.senderId))?.nickname || '',
    }));
  }

  /** 发送语音消息 */
  async sendVoiceMessage(
    senderId: number,
    conversationId: number,
    voicePath: string,
  ) {
    return this.sendMessage(senderId, conversationId, voicePath, 2);
  }

  /** 发送图片消息 */
  async sendImageMessage(
    senderId: number,
    conversationId: number,
    imagePath: string,
  ) {
    return this.sendMessage(senderId, conversationId, imagePath, 4);
  }

  /** 会话置顶/取消置顶 */
  async pinConversation(
    userId: number,
    conversationId: number,
    isPinned: boolean,
  ) {
    await this.memberRepo.update({ conversationId, userId }, { isPinned });
    return { message: isPinned ? '已置顶' : '已取消置顶' };
  }

  /** 获取与指定用户的单聊会话（不存在则自动创建） */
  async getConversationWith(userId: number, targetUserId: number) {
    if (Number(userId) === Number(targetUserId))
      throw new BadRequestException('不能和自己创建会话');
    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId },
    });
    if (!targetUser) throw new NotFoundException('用户不存在');
    // 查找两人共同的单聊会话
    const myConvs = await this.memberRepo.find({ where: { userId } });
    for (const mc of myConvs) {
      const conv = await this.convRepo.findOne({
        where: { id: mc.conversationId, type: 1 },
      });
      if (conv) {
        const otherMember = await this.memberRepo.findOne({
          where: { conversationId: mc.conversationId, userId: targetUserId },
        });
        if (otherMember) {
          return { conversationId: mc.conversationId };
        }
      }
    }
    // 没有找到会话，自动创建一个单聊会话
    const conv = await this.convRepo.save(
      this.convRepo.create({ type: 1, creatorId: userId }),
    );
    await this.memberRepo.save([
      this.memberRepo.create({ conversationId: conv.id, userId, role: 1 }),
      this.memberRepo.create({
        conversationId: conv.id,
        userId: targetUserId,
        role: 1,
      }),
    ]);
    return { conversationId: conv.id };
  }

  /** 获取用户设置 */
  async getUserSettings(userId: number) {
    let setting = await this.settingRepo.findOne({ where: { userId } });
    if (!setting) {
      setting = await this.settingRepo.save(
        this.settingRepo.create({ userId, notificationEnabled: true }),
      );
    }
    return { notificationEnabled: setting.notificationEnabled };
  }

  /** 更新用户设置 */
  async updateUserSettings(
    userId: number,
    data: { notificationEnabled?: boolean },
  ) {
    let setting = await this.settingRepo.findOne({ where: { userId } });
    if (!setting) {
      setting = this.settingRepo.create({ userId });
    }
    if (data.notificationEnabled !== undefined) {
      setting.notificationEnabled = data.notificationEnabled;
    }
    await this.settingRepo.save(setting);
    return {
      message: '设置已更新',
      notificationEnabled: setting.notificationEnabled,
    };
  }

  /** AI 智能体聊天（支持联网搜索） */
  async aiChat(userId: number, message: string) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.siliconflow.cn/v1';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-V3';
    // 每个用户独立的AI会话ID（用负数避免和正常会话冲突）
    const aiConvId = -userId;

    // 保存用户消息
    await this.msgRepo.save(this.msgRepo.create({
      conversationId: aiConvId,
      senderId: userId,
      content: message,
      msgType: 5,
      status: 1,
    }));

    if (!apiKey) {
      const reply = 'AI 服务未配置，请联系管理员';
      await this.msgRepo.save(this.msgRepo.create({
        conversationId: aiConvId,
        senderId: 0,
        content: reply,
        msgType: 5,
        status: 1,
      }));
      return { reply, timestamp: new Date().toISOString() };
    }

    try {
      // 判断是否需要搜索（包含搜索关键词或时效性问题）
      const needSearch = this.shouldSearch(message);
      let searchContext = '';
      if (needSearch) {
        searchContext = await this.webSearch(message);
      }

      // 获取该用户最近10条对话作为上下文
      const recentMessages = await this.msgRepo.find({
        where: { conversationId: aiConvId, msgType: 5 },
        order: { createdAt: 'DESC' },
        take: 20,
      });
      const context = recentMessages
        .reverse()
        .slice(-10)
        .map(m => ({
          role: Number(m.senderId) === 0 ? 'assistant' as const : 'user' as const,
          content: m.content,
        }));

      // 构建 system prompt
      let systemPrompt = '你是一个友好的AI助手，具备联网搜索能力。回答简洁明了，使用中文回复。如果用户问的是需要最新信息的问题，你会先搜索互联网再回答。';
      if (searchContext) {
        systemPrompt += `\n\n【以下是刚从互联网搜索到的最新信息，请基于这些信息回答用户的问题，不要说你无法联网】：\n${searchContext}`;
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...context,
          ],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI API 错误: ${response.status} ${errText}`);
      }

      const data = await response.json() as any;
      let reply = data.choices?.[0]?.message?.content || '抱歉，AI 暂时无法回复';
      if (needSearch && searchContext) {
        reply = '🔍 ' + reply;
      }

      // 保存AI回复
      await this.msgRepo.save(this.msgRepo.create({
        conversationId: aiConvId,
        senderId: 0,
        content: reply,
        msgType: 5,
        status: 1,
      }));

      return { reply, timestamp: new Date().toISOString() };
    } catch (error) {
      const reply = `AI 回复失败：${String(error)}`;
      await this.msgRepo.save(this.msgRepo.create({
        conversationId: aiConvId,
        senderId: 0,
        content: reply,
        msgType: 5,
        status: 1,
      }));
      return { reply, timestamp: new Date().toISOString() };
    }
  }

  /** 判断是否需要联网搜索 */
  private shouldSearch(message: string): boolean {
    const searchKeywords = [
      '搜索', '查一下', '查询', '最新', '今天', '现在', '新闻',
      '天气', '股票', '价格', '多少钱', '怎么样了', '发生了什么',
      '最近', '热点', '排行', '榜单', '发布了', '上市',
    ];
    return searchKeywords.some(kw => message.includes(kw));
  }

  /** 联网搜索（抓取 Bing 搜索结果） */
  private async webSearch(query: string): Promise<string> {
    try {
      const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return '';
      const html = await response.text();

      // 提取 Bing 搜索结果摘要（在 <p class="b_lineclamp..."> 或 <span class="..."> 中）
      const results: string[] = [];
      // Bing 的摘要通常在 b_caption > p 中
      const captionRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let match: RegExpExecArray | null;
      while ((match = captionRegex.exec(html)) !== null && results.length < 8) {
        const text = match[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&[^;]+;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (text.length > 40 && !text.includes('javascript') && !text.includes('cookie')) {
          results.push(text.slice(0, 300));
        }
      }

      return results.length > 0
        ? `以下是从网络搜索到的信息（${new Date().toLocaleDateString('zh-CN')}）：\n${results.slice(0, 5).join('\n\n')}`
        : '';
    } catch {
      return '';
    }
  }

  /** 获取AI聊天历史 */
  async getAiHistory(userId: number) {
    const aiConvId = -userId;
    const messages = await this.msgRepo.find({
      where: { conversationId: aiConvId, msgType: 5 },
      order: { createdAt: 'ASC' },
      take: 100,
    });
    return messages.map(m => ({
      id: m.id,
      content: m.content,
      isUser: Number(m.senderId) !== 0,
      createdAt: m.createdAt,
    }));
  }

  /** 检查用户是否被禁言 */
  async isUserMuted(userId: number, conversationId: number): Promise<boolean> {
    const member = await this.memberRepo.findOne({
      where: { conversationId, userId },
    });
    return member?.isMuted ?? false;
  }

  /** 获取用户昵称 */
  async getUserNickname(userId: number): Promise<string> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['nickname', 'account'],
    });
    return user?.nickname || user?.account || `用户${userId}`;
  }

  private async ensureConversationMember(
    userId: number,
    conversationId: number,
  ) {
    const member = await this.memberRepo.findOne({
      where: { conversationId, userId },
    });
    if (!member) throw new ForbiddenException('你不在该会话中');
    return member;
  }

  /** 禁言/解除禁言 */
  async muteUser(
    operatorId: number,
    conversationId: number,
    targetUserId: number,
    mute: boolean,
  ) {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, type: 2 },
    });
    if (!conv) throw new NotFoundException('群聊不存在');
    const operator = await this.memberRepo.findOne({
      where: { conversationId, userId: operatorId },
    });
    const operatorIsOwner = Number(conv.creatorId) === Number(operatorId);
    if (!operator || (!operatorIsOwner && Number(operator.role) < 2)) {
      throw new ForbiddenException('仅群主或管理员可操作禁言');
    }
    if (Number(targetUserId) === Number(conv.creatorId))
      throw new BadRequestException('不能禁言群主');
    const target = await this.memberRepo.findOne({
      where: { conversationId, userId: targetUserId },
    });
    if (!target) throw new NotFoundException('成员不存在');
    await this.memberRepo.update(
      { conversationId, userId: targetUserId },
      { isMuted: mute },
    );
    return { message: mute ? '已禁言' : '已解除禁言' };
  }

  /** 退出群聊 */
  async leaveGroup(userId: number, conversationId: number) {
    const conv = await this.convRepo.findOne({
      where: { id: conversationId, type: 2 },
    });
    if (!conv) throw new NotFoundException('群聊不存在');
    if (Number(conv.creatorId) === Number(userId))
      throw new ForbiddenException('群主不能退出，请先转让或解散');
    await this.memberRepo.delete({ conversationId, userId });
    return { message: '已退出群聊' };
  }

  /** 获取未读角标数据 */
  async getBadges(userId: number) {
    // 未读消息总数
    const members = await this.memberRepo.find({ where: { userId } });
    const unreadMessages = members.reduce(
      (sum, m) => sum + (m.unreadCount || 0),
      0,
    );

    // 待处理好友申请数
    const pendingRequests = await this.friendRequestRepo.count({
      where: { toUserId: userId, status: 0 },
    });

    return { unreadMessages, pendingRequests };
  }
}
