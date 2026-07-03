import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { UserCurrency } from '../entities/user-currency.entity';
import { Cdk } from '../entities/cdk.entity';
import { CdkType } from '../entities/cdk-type.entity';
import { SystemSwitch } from '../entities/system-switch.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMember } from '../entities/conversation-member.entity';
import { Friendship } from '../entities/friendship.entity';
import { Message } from '../entities/message.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from '../auth/auth.module';
import { MatrixModule } from '../matrix/matrix.module';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserCurrency, Cdk, CdkType, SystemSwitch, Conversation, ConversationMember, Friendship, Message]),
    AuthModule,
    CurrencyModule,
    forwardRef(() => MatrixModule),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
