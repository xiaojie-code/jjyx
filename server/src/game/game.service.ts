import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Game } from '../entities/game.entity';
import { GameRecord } from '../entities/game-record.entity';
import { HorseRoom } from '../entities/horse-room.entity';
import { HorseBet } from '../entities/horse-bet.entity';
import { LotteryConfig } from '../entities/lottery-config.entity';
import { BackpackItem } from '../entities/backpack-item.entity';
import { User } from '../entities/user.entity';
import { CurrencyService } from '../currency/currency.service';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game) private readonly gameRepo: Repository<Game>,
    @InjectRepository(GameRecord) private readonly recordRepo: Repository<GameRecord>,
    @InjectRepository(HorseRoom) private readonly roomRepo: Repository<HorseRoom>,
    @InjectRepository(HorseBet) private readonly betRepo: Repository<HorseBet>,
    @InjectRepository(LotteryConfig) private readonly lotteryRepo: Repository<LotteryConfig>,
    @InjectRepository(BackpackItem) private readonly backpackRepo: Repository<BackpackItem>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly currencyService: CurrencyService,
    private readonly dataSource: DataSource,
  ) {}

  /** 游戏列表 */
  async getGameList() {
    return this.gameRepo.find({ where: { status: 1 }, order: { sortOrder: 'ASC' } });
  }

  /** 游戏详情 */
  async getGameDetail(id: number) {
    const game = await this.gameRepo.findOne({ where: { id } });
    if (!game) throw new NotFoundException('游戏不存在');
    return game;
  }

  /** 启动游戏（检查激活+扣入场费+扣下注） */
  async startGame(userId: number, gameId: number, betAmount?: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.isActivated) throw new ForbiddenException('请先激活游戏');

    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException('游戏不存在');
    if (game.status !== 1) throw new BadRequestException('游戏维护中');

    // 扣入场费
    if (Number(game.entryCost) > 0) {
      await this.dataSource.transaction(async (mgr) => {
        await this.currencyService.changeCurrency(userId, 'points', -Number(game.entryCost), 'game_entry', `进入${game.name}`, mgr);
      });
    }

    // 扣下注积分
    if (betAmount && betAmount > 0) {
      await this.dataSource.transaction(async (mgr) => {
        await this.currencyService.changeCurrency(userId, 'points', -betAmount, 'game_bet', `${game.name}下注`, mgr);
      });
    }

    return { gameUrl: game.gameUrl, gameId: game.id, name: game.name, orientation: game.orientation || 'landscape' };
  }

  /** 游戏结算回调 */
  async settleGame(userId: number, gameId: number, data: { rank?: number; pointsEarned?: number; items?: any[] }) {
    await this.dataSource.transaction(async (mgr) => {
      // 发放积分
      if (data.pointsEarned && data.pointsEarned > 0) {
        await this.currencyService.changeCurrency(userId, 'points', data.pointsEarned, 'game_earn', '游戏奖励', mgr);
      }
      // 发放物品到背包
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const existing = await mgr.findOne(BackpackItem, { where: { userId, itemConstId: item.itemConstId } });
          if (existing) {
            existing.quantity += item.quantity || 1;
            await mgr.save(BackpackItem, existing);
          } else {
            await mgr.save(BackpackItem, mgr.create(BackpackItem, {
              userId, itemType: 'game_reward', itemConstId: item.itemConstId, quantity: item.quantity || 1,
            }));
          }
        }
      }
      // 记录游戏记录
      await mgr.save(GameRecord, mgr.create(GameRecord, {
        userId, gameId, result: `rank_${data.rank || 0}`,
        pointsEarned: data.pointsEarned || 0, pointsSpent: 0,
      }));
    });

    return { message: '结算成功' };
  }

  /** 赛马 - 创建房间 */
  async createHorseRoom() {
    const room = await this.roomRepo.save(this.roomRepo.create({ status: 1, horseCount: 6, totalPool: 0 }));
    return { roomId: room.id };
  }

  /** 赛马 - 投注 */
  async horseBet(userId: number, roomId: number, horseNumber: number, amount: number) {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('房间不存在');
    if (room.status !== 1) throw new BadRequestException('房间已开赛或已结算');

    await this.dataSource.transaction(async (mgr) => {
      await this.currencyService.changeCurrency(userId, 'points', -amount, 'horse_bet', '赛马投注', mgr);
      await mgr.save(HorseBet, mgr.create(HorseBet, { roomId, userId, horseNumber, betAmount: amount }));
      room.totalPool = Number(room.totalPool) + amount;
      await mgr.save(HorseRoom, room);
    });

    return { message: '投注成功' };
  }

  /** 赛马 - 结算 */
  async horseSettle(roomId: number, winnerHorse: number) {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('房间不存在');
    if (room.status === 3) throw new BadRequestException('已结算');

    const bets = await this.betRepo.find({ where: { roomId } });
    const winnerBets = bets.filter((b) => b.horseNumber === winnerHorse);
    const loserBets = bets.filter((b) => b.horseNumber !== winnerHorse);
    const loserTotal = loserBets.reduce((sum, b) => sum + Number(b.betAmount), 0);
    const winnerTotal = winnerBets.reduce((sum, b) => sum + Number(b.betAmount), 0);

    await this.dataSource.transaction(async (mgr) => {
      for (const wb of winnerBets) {
        const ratio = winnerTotal > 0 ? Number(wb.betAmount) / winnerTotal : 0;
        const reward = loserTotal * ratio;
        const total = Number(wb.betAmount) + reward;
        wb.rewardAmount = total;
        await mgr.save(HorseBet, wb);
        await this.currencyService.changeCurrency(wb.userId, 'points', total, 'horse_win', '赛马获胜', mgr);
      }
      room.status = 3;
      room.winnerHorse = winnerHorse;
      room.settledAt = new Date();
      await mgr.save(HorseRoom, room);
    });

    return { winnerHorse, winnerCount: winnerBets.length, loserTotal };
  }

  /** 转盘抽奖 */
  async lotteryDraw(userId: number) {
    const configs = await this.lotteryRepo.find();
    if (configs.length === 0) throw new BadRequestException('转盘未配置');

    // 扣除消耗（取第一个配置的消耗）
    const costType = configs[0].costType as any;
    const costAmount = Number(configs[0].costAmount);
    if (costAmount > 0) {
      await this.dataSource.transaction(async (mgr) => {
        await this.currencyService.changeCurrency(userId, costType, -costAmount, 'lottery', '转盘抽奖消耗', mgr);
      });
    }

    // 概率抽奖
    const rand = Math.random();
    let cumulative = 0;
    let winner = configs[0];
    for (const c of configs) {
      cumulative += Number(c.probability);
      if (rand <= cumulative) { winner = c; break; }
    }

    // 发放奖励
    if (Number(winner.prizeAmount) > 0) {
      await this.dataSource.transaction(async (mgr) => {
        await this.currencyService.changeCurrency(userId, winner.prizeType as any, Number(winner.prizeAmount), 'lottery_win', `转盘获得${winner.prizeName}`, mgr);
      });
    }

    return { prize: { name: winner.prizeName, type: winner.prizeType, amount: Number(winner.prizeAmount) } };
  }

  /** 获取转盘配置 */
  async getLotteryConfig() {
    return this.lotteryRepo.find({ order: { slotIndex: 'ASC' } });
  }

  /** 赛马房间详情 */
  async getHorseRoom(roomId: number) {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('房间不存在');
    const bets = await this.betRepo.find({ where: { roomId } });
    return { ...room, bets };
  }
}
