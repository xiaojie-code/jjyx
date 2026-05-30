import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../entities/message.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
import { OfflineMessage } from '../entities/offline-message.entity';
import { FriendRequest } from '../entities/friend-request.entity';
import { Friendship } from '../entities/friendship.entity';
import { User } from '../entities/user.entity';
import { UserSetting } from '../entities/user-setting.entity';
import { Meeting } from '../entities/meeting.entity';
import { MeetingParticipant } from '../entities/meeting-participant.entity';
import { MeetingBan } from '../entities/meeting-ban.entity';
import { ChatGateway } from './chat.gateway';
import { MeetingGateway } from './meeting.gateway';
import { ChatService } from './chat.service';
import { MeetingService } from './meeting.service';
import { ChatController } from './chat.controller';
import { MeetingController } from './meeting.controller';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { AuthModule } from '../auth/auth.module';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      Conversation,
      ConversationMember,
      OfflineMessage,
      FriendRequest,
      Friendship,
      User,
      UserSetting,
      Meeting,
      MeetingParticipant,
      MeetingBan,
    ]),
    AuthModule,
    CurrencyModule,
  ],
  controllers: [ChatController, ContactController, MeetingController],
  providers: [
    ChatGateway,
    MeetingGateway,
    ChatService,
    ContactService,
    MeetingService,
  ],
  exports: [ChatService, MeetingService, MeetingGateway],
})
export class ChatModule {}
