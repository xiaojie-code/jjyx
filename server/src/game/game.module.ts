import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Game } from '../entities/game.entity';
import { GameRecord } from '../entities/game-record.entity';
import { HorseRoom } from '../entities/horse-room.entity';
import { HorseBet } from '../entities/horse-bet.entity';
import { HorseRaceMatch } from '../entities/horse-race-match.entity';
import { HorseRacePlayer } from '../entities/horse-race-player.entity';
import { LotteryConfig } from '../entities/lottery-config.entity';
import { BackpackItem } from '../entities/backpack-item.entity';
import { User } from '../entities/user.entity';
import { GameController } from './game.controller';
import { BackpackController } from './backpack.controller';
import { GameService } from './game.service';
import { HorseRaceGateway } from './horse-race.gateway';
import { CurrencyModule } from '../currency/currency.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Game,
      GameRecord,
      HorseRoom,
      HorseBet,
      HorseRaceMatch,
      HorseRacePlayer,
      LotteryConfig,
      BackpackItem,
      User,
    ]),
    CurrencyModule,
    AuthModule,
  ],
  controllers: [GameController, BackpackController],
  providers: [GameService, HorseRaceGateway],
  exports: [GameService],
})
export class GameModule {}
