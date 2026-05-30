import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '../entities/game.entity';
import { GameRecord } from '../entities/game-record.entity';
import { HorseRoom } from '../entities/horse-room.entity';
import { HorseBet } from '../entities/horse-bet.entity';
import { LotteryConfig } from '../entities/lottery-config.entity';
import { BackpackItem } from '../entities/backpack-item.entity';
import { User } from '../entities/user.entity';
import { GameController } from './game.controller';
import { BackpackController } from './backpack.controller';
import { GameService } from './game.service';
import { CurrencyModule } from '../currency/currency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Game, GameRecord, HorseRoom, HorseBet, LotteryConfig, BackpackItem, User]),
    CurrencyModule,
  ],
  controllers: [GameController, BackpackController],
  providers: [GameService],
  exports: [GameService],
})
export class GameModule {}
