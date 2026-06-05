import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserCurrency } from '../entities/user-currency.entity';
import { CurrencyLog } from '../entities/currency-log.entity';
import { UserActivity } from '../entities/user-activity.entity';
import { BackpackItem } from '../entities/backpack-item.entity';
import { SystemSwitch } from '../entities/system-switch.entity';
import { LotteryConfig } from '../entities/lottery-config.entity';
import { Cdk } from '../entities/cdk.entity';
import { CdkType } from '../entities/cdk-type.entity';
import { Withdrawal } from '../entities/withdrawal.entity';
import { Agent } from '../entities/agent.entity';
import { Matrix } from '../entities/matrix.entity';
import { MatrixSlot } from '../entities/matrix-slot.entity';
import { MatrixIncome } from '../entities/matrix-income.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
import { Message } from '../entities/message.entity';
import { Meeting } from '../entities/meeting.entity';
import { MeetingParticipant } from '../entities/meeting-participant.entity';
import { MeetingBan } from '../entities/meeting-ban.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CurrencyModule } from '../currency/currency.module';
import { ChatModule } from '../chat/chat.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, UserCurrency, CurrencyLog, UserActivity, BackpackItem,
      SystemSwitch, LotteryConfig, Cdk, CdkType, Withdrawal, Agent,
      Matrix, MatrixSlot, MatrixIncome,
      Conversation, ConversationMember, Message,
      Meeting, MeetingParticipant, MeetingBan,
    ]),
    CurrencyModule,
    ChatModule,
    NotificationModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
