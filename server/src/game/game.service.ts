import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { randomBytes } from 'crypto';
import { Game } from '../entities/game.entity';
import { GameRecord } from '../entities/game-record.entity';
import { FishingSave } from '../entities/fishing-save.entity';
import { SnakeSave } from '../entities/snake-save.entity';
import { HorseRoom } from '../entities/horse-room.entity';
import { HorseBet } from '../entities/horse-bet.entity';
import { LotteryConfig } from '../entities/lottery-config.entity';
import { BackpackItem } from '../entities/backpack-item.entity';
import { User } from '../entities/user.entity';
import { CurrencyService } from '../currency/currency.service';

type LotteryPrize = {
  level: number;
  name: string;
  type: 'none' | 'points' | 'cdk' | 'physical';
  amount: number;
  probabilityText: string;
};

const LOTTERY_TEAM_UNIT_SIZE = 10;
const LOTTERY_MAJOR_INTERVAL = 200;
const HORSE_BET_OPTIONS = [10, 50, 100, 300, 500, 1000];
const XIANQI_STUDY_MAX_LEVEL = 240;
const XIANQI_STUDY_REWARD_STEP = 10;
const DEFAULT_GAME_ENTRIES = [
  {
    name: '象雀对弈',
    description: '象雀双玩，搓麻对弈两不误',
    gameUrl: '/uploads/games/xiangqi/index.html',
    sortOrder: 10,
    orientation: 'portrait',
    keywords: ['蛇', '贪吃蛇', '麻象', '象雀', '对弈', 'snake', 'ssdzz'],
  },
  {
    name: '实况钓鱼',
    description: '沉浸垂钓，轻松上鱼',
    gameUrl: '/uploads/games/fishing/index.html',
    sortOrder: 20,
    orientation: 'landscape',
    keywords: ['实况钓鱼', '钓鱼', '捕鱼', 'fishing', 'skdy'],
  },
  {
    name: '大逃杀',
    description: '卡通乱斗，极速开战',
    gameUrl: '/uploads/games/killer/index.html',
    sortOrder: 30,
    orientation: 'portrait',
    keywords: ['大逃杀', '逃杀', '杀手', 'killer', 'dts'],
  },
  {
    name: '赛马',
    description: '多人在线赛马竞技',
    gameUrl: '/uploads/games/saima2/index.html',
    sortOrder: 40,
    orientation: 'landscape',
    keywords: ['赛马游戏2', '赛马2', 'saima2', 'horse2'],
  },
  {
    name: '幸运转盘',
    description: '幸运抽奖，好礼转出',
    gameUrl: 'lottery://native',
    sortOrder: 50,
    orientation: 'portrait',
    keywords: ['幸运转盘', '转盘', '抽奖', 'lottery', 'wheel', 'xyzp'],
  },
] as const;
const LOTTERY_PRIZES: LotteryPrize[] = [
  { level: 1, name: '沧恒云芯智能AI机器人', type: 'physical', amount: 0, probabilityText: '0%' },
  { level: 2, name: '云芯智慧大屏100寸', type: 'physical', amount: 0, probabilityText: '0%' },
  { level: 3, name: '云芯大屏对开门冰箱', type: 'physical', amount: 0, probabilityText: '0%' },
  { level: 4, name: '激活码', type: 'cdk', amount: 0, probabilityText: '每200抽保底随机二选一' },
  { level: 5, name: '电动自行车一辆', type: 'physical', amount: 0, probabilityText: '每200抽保底随机二选一' },
  { level: 6, name: '1000积分', type: 'points', amount: 1000, probabilityText: '普通抽奖必中随机二选一' },
  { level: 7, name: '500积分', type: 'points', amount: 500, probabilityText: '普通抽奖必中随机二选一' },
];

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game) private readonly gameRepo: Repository<Game>,
    @InjectRepository(GameRecord) private readonly recordRepo: Repository<GameRecord>,
    @InjectRepository(FishingSave) private readonly fishingSaveRepo: Repository<FishingSave>,
    @InjectRepository(SnakeSave) private readonly snakeSaveRepo: Repository<SnakeSave>,
    @InjectRepository(HorseRoom) private readonly roomRepo: Repository<HorseRoom>,
    @InjectRepository(HorseBet) private readonly betRepo: Repository<HorseBet>,
    @InjectRepository(LotteryConfig) private readonly lotteryRepo: Repository<LotteryConfig>,
    @InjectRepository(BackpackItem) private readonly backpackRepo: Repository<BackpackItem>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly currencyService: CurrencyService,
    private readonly dataSource: DataSource,
  ) {}

  private gameSearchText(game?: Partial<Pick<Game, 'name' | 'description' | 'gameUrl'>> | null) {
    return `${game?.name || ''} ${game?.description || ''} ${game?.gameUrl || ''}`.toLowerCase();
  }

  private isXiangqiGame(game?: Partial<Pick<Game, 'name' | 'description' | 'gameUrl'>> | null) {
    const text = this.gameSearchText(game);
    return (
      text.includes('xiangqi') ||
      text.includes('象棋') ||
      text.includes('象雀') ||
      text.includes('对弈')
    );
  }

  private isPlaceholderGameUrl(value?: string | null) {
    const text = String(value || '').trim().toLowerCase();
    return !text || text === '__placeholder__' || text.includes('/__placeholder__');
  }

  private findDefaultGameEntry(game?: Partial<Pick<Game, 'name' | 'description' | 'gameUrl'>> | null) {
    const text = this.gameSearchText(game);
    return DEFAULT_GAME_ENTRIES.find((entry) =>
      entry.keywords.some((keyword) => text.includes(keyword.toLowerCase())),
    );
  }

  private withDefaultGameEntry(game: Game) {
    const entry = this.findDefaultGameEntry(game);
    if (!entry) return game;
    return {
      ...game,
      name: entry.name,
      description: entry.description,
      gameUrl: entry.gameUrl,
      sortOrder: entry.sortOrder,
      orientation: entry.orientation,
    };
  }

  private gameMatchesDefaultEntry(game: Game, entry: (typeof DEFAULT_GAME_ENTRIES)[number]) {
    const text = this.gameSearchText(game);
    return entry.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  }

  private needsDefaultGameRepair(game: Game, entry: (typeof DEFAULT_GAME_ENTRIES)[number]) {
    return (
      game.name !== entry.name ||
      game.description !== entry.description ||
      game.gameUrl !== entry.gameUrl ||
      Number(game.sortOrder) !== entry.sortOrder ||
      game.orientation !== entry.orientation
    );
  }

  private isLegacyHorseGame(game?: Partial<Pick<Game, 'name' | 'description' | 'gameUrl'>> | null) {
    const gameUrl = String(game?.gameUrl || '').toLowerCase();
    if (gameUrl.includes('/uploads/games/saima2/') || gameUrl.includes('\\uploads\\games\\saima2\\')) {
      return false;
    }
    return gameUrl.includes('/uploads/games/saima/') || gameUrl.includes('\\uploads\\games\\saima\\');
  }

  private async ensureDefaultGameEntries() {
    const games = await this.gameRepo.find();
    const repairedIds = new Set<number>();

    for (const entry of DEFAULT_GAME_ENTRIES) {
      const existing = games.find(
        (game) => !repairedIds.has(game.id) && this.gameMatchesDefaultEntry(game, entry),
      );

      if (existing) {
        repairedIds.add(existing.id);
        if (this.needsDefaultGameRepair(existing, entry)) {
          existing.name = entry.name;
          existing.description = entry.description;
          existing.gameUrl = entry.gameUrl;
          existing.sortOrder = entry.sortOrder;
          existing.orientation = entry.orientation;
          await this.gameRepo.save(existing);
        }
        continue;
      }

      const created = await this.gameRepo.save(this.gameRepo.create({
        name: entry.name,
        icon: null,
        description: entry.description,
        gameUrl: entry.gameUrl,
        entryCost: 0,
        status: 1,
        sortOrder: entry.sortOrder,
        orientation: entry.orientation,
      }));
      repairedIds.add(created.id);
    }

    const danglingPlaceholders = games.filter(
      (game) =>
        !repairedIds.has(game.id) &&
        game.status === 1 &&
        this.isPlaceholderGameUrl(game.gameUrl),
    );
    for (const game of danglingPlaceholders) {
      game.status = 2;
      await this.gameRepo.save(game);
    }

    const legacyHorseGames = games.filter(
      (game) =>
        !repairedIds.has(game.id) &&
        game.status === 1 &&
        this.isLegacyHorseGame(game),
    );
    for (const game of legacyHorseGames) {
      game.status = 2;
      await this.gameRepo.save(game);
    }
  }

  /** 游戏列表 */
  async getGameList() {
    await this.ensureDefaultGameEntries();
    const games = await this.gameRepo.find({ where: { status: 1 }, order: { sortOrder: 'ASC' } });
    return games.map((game) => this.withResolvedOrientation(game));
  }

  private async ensureLotteryGameEntry() {
    const existing = await this.gameRepo
      .createQueryBuilder('game')
      .where('game.name LIKE :keyword', { keyword: '%转盘%' })
      .orWhere('game.gameUrl LIKE :lotteryUrl', { lotteryUrl: '%lottery%' })
      .getOne();
    if (existing) return;

    await this.gameRepo.save(this.gameRepo.create({
      name: '转盘游戏',
      icon: null,
      description: '幸运抽奖，好礼转出',
      gameUrl: 'lottery://native',
      entryCost: 0,
      status: 1,
      sortOrder: 50,
      orientation: 'portrait',
    }));
  }

  /** 游戏详情 */
  async getGameDetail(id: number) {
    await this.ensureDefaultGameEntries();
    const game = await this.gameRepo.findOne({ where: { id } });
    if (!game) throw new NotFoundException('游戏不存在');
    return this.withResolvedOrientation(game);
  }

  /** 启动游戏（检查激活+扣入场费+扣下注） */
  async startGame(userId: number, gameId: number, betAmount?: number) {
    await this.ensureDefaultGameEntries();
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user?.isActivated) throw new ForbiddenException('请先激活');

    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException('游戏不存在');
    if (game.status !== 1) throw new BadRequestException('游戏维护中');

    // 扣入场费
    if (Number(game.entryCost) > 0) {
      await this.dataSource.transaction(async (mgr) => {
        const entryCost = Number(game.entryCost);
        const changed = await this.currencyService.changeCurrency(userId, 'points', -entryCost, 'game_entry', `进入${game.name}`, mgr);
        if (!this.isLotteryGame(game)) {
          await this.currencyService.recordGameTurnover({
            userId,
            gameId: game.id,
            sourceType: 'game_entry',
            amount: entryCost,
            currencyLogId: changed.logId,
            description: `进入${game.name}`,
            manager: mgr,
          });
        }
      });
    }

    // 扣下注积分
    if (betAmount && betAmount > 0) {
      await this.dataSource.transaction(async (mgr) => {
        const changed = await this.currencyService.changeCurrency(userId, 'points', -betAmount, 'game_bet', `${game.name}下注`, mgr);
        if (!this.isLotteryGame(game)) {
          await this.currencyService.recordGameTurnover({
            userId,
            gameId: game.id,
            sourceType: 'bet',
            amount: betAmount,
            currencyLogId: changed.logId,
            description: `${game.name}下注`,
            manager: mgr,
          });
        }
      });
    }

    return {
      gameUrl: game.gameUrl,
      gameId: game.id,
      name: game.name,
      orientation: this.resolveGameOrientation(game),
    };
  }

  private resolveGameOrientation(game: Game) {
    const gameUrl = (game.gameUrl || '').toLowerCase();
    if (gameUrl.includes('/killer')) return 'portrait';
    if (gameUrl.includes('/saima')) return 'landscape';
    return game.orientation === 'portrait' ? 'portrait' : 'landscape';
  }

  private withResolvedOrientation(game: Game) {
    const resolvedGame = this.withDefaultGameEntry(game);
    return {
      ...resolvedGame,
      orientation: this.resolveGameOrientation(resolvedGame),
    };
  }

  private isLotteryGame(game?: Pick<Game, 'name' | 'gameUrl'> | null) {
    const name = String(game?.name || '').toLowerCase();
    const gameUrl = String(game?.gameUrl || '').toLowerCase();
    return (
      gameUrl.includes('lottery') ||
      gameUrl.includes('wheel') ||
      name.includes('lottery') ||
      name.includes('wheel') ||
      name.includes('转盘') ||
      name.includes('抽奖')
    );
  }

  private getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private async ensureLotteryTables() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS lottery_accounts (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        activation_chance_granted TINYINT NOT NULL DEFAULT 0,
        team_chance_units INT NOT NULL DEFAULT 0,
        used_chances INT NOT NULL DEFAULT 0,
        total_draws INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_lottery_accounts_user_id (user_id),
        INDEX idx_lottery_accounts_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS lottery_draw_records (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        draw_no INT NOT NULL,
        prize_level INT NOT NULL,
        prize_name VARCHAR(100) NOT NULL,
        prize_type VARCHAR(30) NOT NULL,
        prize_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        prize_payload JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_lottery_draw_user_time (user_id, created_at),
        INDEX idx_lottery_draw_user_no (user_id, draw_no)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  private lotteryPrizeList() {
    return LOTTERY_PRIZES.map((prize) => ({
      level: prize.level,
      name: prize.name,
      type: prize.type,
      amount: prize.amount,
      probabilityText: prize.probabilityText,
    }));
  }

  private async findLotteryReferralChildren(inviterIds: number[], manager: any): Promise<Pick<User, 'id' | 'isActivated'>[]> {
    const uniqueIds = [...new Set(inviterIds.map(Number).filter(Boolean))];
    const children: Pick<User, 'id' | 'isActivated'>[] = [];
    const chunkSize = 200;
    for (let index = 0; index < uniqueIds.length; index += chunkSize) {
      const chunk = uniqueIds.slice(index, index + chunkSize);
      children.push(
        ...(await manager.find(User, {
          where: { invitedBy: In(chunk) },
          select: ['id', 'isActivated'],
        })),
      );
    }
    return children;
  }

  private async getActivatedReferralTeamCount(userId: number, manager: any) {
    const visited = new Set<number>([Number(userId)]);
    let frontier = [Number(userId)];
    let count = 0;

    for (let depth = 0; frontier.length > 0 && depth < 1000; depth += 1) {
      const children = await this.findLotteryReferralChildren(frontier, manager);
      const nextFrontier: number[] = [];
      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        nextFrontier.push(child.id);
        if (child.isActivated === true || Number(child.isActivated) === 1) {
          count += 1;
        }
      }
      frontier = nextFrontier;
    }

    return count;
  }

  private async getLotteryAccount(userId: number, manager: any, lock = false) {
    await manager.query(`INSERT IGNORE INTO lottery_accounts (user_id) VALUES (?)`, [userId]);
    const rows = await manager.query(
      `SELECT * FROM lottery_accounts WHERE user_id = ? ${lock ? 'FOR UPDATE' : ''}`,
      [userId],
    );
    return rows[0];
  }

  private async syncLotteryAccount(userId: number, manager: any, lock = false) {
    const account = await this.getLotteryAccount(userId, manager, lock);
    const user = await manager.findOne(User, {
      where: { id: userId },
      select: ['id', 'isActivated'],
    });
    if (!user) throw new NotFoundException('用户不存在');

    const activationChanceGranted =
      user.isActivated || Number(account.activation_chance_granted) === 1 ? 1 : 0;
    const teamActiveCount = await this.getActivatedReferralTeamCount(userId, manager);
    const earnedTeamUnits = Math.floor(teamActiveCount / LOTTERY_TEAM_UNIT_SIZE);
    const teamChanceUnits = Math.max(Number(account.team_chance_units || 0), earnedTeamUnits);

    if (
      Number(account.activation_chance_granted) !== activationChanceGranted ||
      Number(account.team_chance_units) !== teamChanceUnits
    ) {
      await manager.query(
        `UPDATE lottery_accounts
         SET activation_chance_granted = ?, team_chance_units = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [activationChanceGranted, teamChanceUnits, userId],
      );
      account.activation_chance_granted = activationChanceGranted;
      account.team_chance_units = teamChanceUnits;
    }

    const usedChances = Number(account.used_chances || 0);
    const totalDraws = Number(account.total_draws || 0);
    const totalEarnedChances = activationChanceGranted + teamChanceUnits;
    const remainingChances = Math.max(0, totalEarnedChances - usedChances);
    const nextTeamChanceNeed =
      LOTTERY_TEAM_UNIT_SIZE - (teamActiveCount % LOTTERY_TEAM_UNIT_SIZE || LOTTERY_TEAM_UNIT_SIZE);
    const drawsUntilGuaranteedMajor =
      LOTTERY_MAJOR_INTERVAL - (totalDraws % LOTTERY_MAJOR_INTERVAL || 0);

    return {
      userId,
      activationChanceGranted,
      teamActiveCount,
      teamChanceUnits,
      usedChances,
      totalDraws,
      totalEarnedChances,
      remainingChances,
      nextTeamChanceNeed: nextTeamChanceNeed === 0 ? LOTTERY_TEAM_UNIT_SIZE : nextTeamChanceNeed,
      guaranteeInterval: LOTTERY_MAJOR_INTERVAL,
      drawsUntilGuaranteedMajor:
        drawsUntilGuaranteedMajor === 0 ? LOTTERY_MAJOR_INTERVAL : drawsUntilGuaranteedMajor,
    };
  }

  private parseLotteryPayload(value: any) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (_) {
      return null;
    }
  }

  private mapLotteryRecord(row: any) {
    return {
      id: Number(row.id),
      userId: Number(row.user_id ?? row.userId),
      drawNo: Number(row.draw_no ?? row.drawNo),
      prizeLevel: Number(row.prize_level ?? row.prizeLevel),
      prizeName: row.prize_name ?? row.prizeName,
      prizeType: row.prize_type ?? row.prizeType,
      prizeAmount: Number(row.prize_amount ?? row.prizeAmount ?? 0),
      prizePayload: this.parseLotteryPayload(row.prize_payload ?? row.prizePayload),
      createdAt: row.created_at ?? row.createdAt,
    };
  }

  private async getLotteryRecordList(userId: number, limit = 20) {
    await this.ensureLotteryTables();
    const rows = await this.dataSource.query(
      `SELECT id, user_id, draw_no, prize_level, prize_name, prize_type, prize_amount, prize_payload, created_at
       FROM lottery_draw_records
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT ?`,
      [userId, limit],
    );
    return rows.map((row: any) => this.mapLotteryRecord(row));
  }

  private async ensureLotteryCdkType(manager: any) {
    const rows = await manager.query(`SELECT id FROM cdk_types WHERE name = ? LIMIT 1`, ['转盘激活码']);
    if (rows.length > 0) return Number(rows[0].id);
    const result = await manager.query(
      `INSERT INTO cdk_types (name, description, created_at) VALUES (?, ?, NOW())`,
      ['转盘激活码', '转盘四等奖生成的激活码'],
    );
    return Number(result.insertId);
  }

  private async createLotteryActivationCode(manager: any) {
    const cdkTypeId = await this.ensureLotteryCdkType(manager);
    for (let i = 0; i < 20; i += 1) {
      const code = randomBytes(8).toString('hex').toUpperCase();
      const existing = await manager.query(`SELECT id FROM cdks WHERE code = ? LIMIT 1`, [code]);
      if (existing.length > 0) continue;
      await manager.query(
        `INSERT INTO cdks (code, cdk_type_id, items_json, status, created_at)
         VALUES (?, ?, NULL, 0, NOW())`,
        [code, cdkTypeId],
      );
      return code;
    }
    throw new BadRequestException('激活码生成失败，请稍后再试');
  }

  private pickLotteryPrize(drawNo: number): LotteryPrize {
    if (drawNo > 0 && drawNo % LOTTERY_MAJOR_INTERVAL === 0) {
      return Math.random() < 0.5 ? LOTTERY_PRIZES[3] : LOTTERY_PRIZES[4];
    }
    return Math.random() < 0.5 ? LOTTERY_PRIZES[5] : LOTTERY_PRIZES[6];
  }

  private async issueLotteryPrize(userId: number, prize: LotteryPrize, manager: any) {
    if (prize.type === 'points' && prize.amount > 0) {
      const changed = await this.currencyService.changeCurrency(
        userId,
        'points',
        prize.amount,
        'lottery_win',
        `转盘抽中${prize.name}`,
        manager,
      );
      return { balance: changed.after, payload: null };
    }

    if (prize.type === 'cdk') {
      const code = await this.createLotteryActivationCode(manager);
      return { balance: null, payload: { code } };
    }

    if (prize.type === 'physical') {
      return { balance: null, payload: { status: 'pending_claim' } };
    }

    return { balance: null, payload: null };
  }

  private async ensureFishingSavesTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS fishing_saves (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        game_id INT NOT NULL,
        save_data JSON NOT NULL,
        last_daily_reward_date VARCHAR(10) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_fishing_saves_user_game (user_id, game_id),
        INDEX idx_fishing_saves_user (user_id),
        INDEX idx_fishing_saves_game (game_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  private parseFishingSaveData(value: any) {
    const raw = value?.saveData ?? value?.save_data ?? value;
    let saveData = raw;
    if (typeof saveData === 'string') {
      try {
        saveData = JSON.parse(saveData);
      } catch (_) {
        throw new BadRequestException('Fishing save data is not valid JSON');
      }
    }
    if (!saveData || typeof saveData !== 'object' || Array.isArray(saveData)) {
      throw new BadRequestException('Fishing save data is required');
    }
    return JSON.parse(JSON.stringify(saveData));
  }

  private normalizeFishingSaveData(saveData: Record<string, any>, balance: number, dailyClaimed: boolean) {
    const normalized = JSON.parse(JSON.stringify(saveData || {}));
    const today = this.getTodayString();
    normalized.gold = Math.max(0, Math.floor(Number(balance) || 0));
    normalized.isGetGold = dailyClaimed;
    if (dailyClaimed) {
      normalized.fishingDailyRewardDate = today;
    } else if (normalized.fishingDailyRewardDate !== today) {
      normalized.isGetGold = false;
    }
    this.normalizeFishingSaveFishPrices(normalized);
    return normalized;
  }

  private scaleFishingRewardValue(value: any) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return 0;
    const maxReward = 500;
    if (num < 1000) return Math.min(maxReward, Math.floor(num));
    if (num >= 10000) return Math.min(maxReward, Math.max(100, Math.floor(num / 100)));
    return Math.min(maxReward, Math.max(10, Math.floor(num / 10)));
  }

  private normalizeFishingSaveFishPrices(saveData: Record<string, any>) {
    const items = saveData?.fishBoxInfo?.items;
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (item && typeof item === 'object' && item.price !== undefined) {
        item.price = this.scaleFishingRewardValue(item.price);
      }
    }
  }

  private shouldPreserveFishingLevelField(key: string) {
    const normalized = String(key || '').toLowerCase();
    return (
      /(^|_)(skill|bait|net|craft|rod|hook|rope).*(_|)(lv|level)$/.test(normalized) ||
      /(skill|bait|net|craft|rod|hook|rope).*(lv|level)/.test(normalized) ||
      /^lv(el)?$/.test(normalized)
    );
  }

  private mergeFishingProgress(prev: any, next: any, key = ''): any {
    if (Array.isArray(prev) && Array.isArray(next)) {
      return next.map((item, index) => this.mergeFishingProgress(prev[index], item, key));
    }

    if (
      prev &&
      next &&
      typeof prev === 'object' &&
      typeof next === 'object' &&
      !Array.isArray(prev) &&
      !Array.isArray(next)
    ) {
      const merged = { ...next };
      for (const childKey of Object.keys(prev)) {
        if (Object.prototype.hasOwnProperty.call(next, childKey)) {
          merged[childKey] = this.mergeFishingProgress(prev[childKey], next[childKey], childKey);
        }
      }
      return merged;
    }

    if (this.shouldPreserveFishingLevelField(key)) {
      const prevNumber = Number(prev);
      const nextNumber = Number(next);
      if (Number.isFinite(prevNumber) && Number.isFinite(nextNumber) && prevNumber > nextNumber) {
        return prev;
      }
    }

    return next;
  }

  private async touchFishingDailyReward(userId: number, gameId: number, manager?: any) {
    if (!manager) {
      await this.ensureFishingSavesTable();
    }
    const mgr = manager || this.dataSource.manager;
    const save = await mgr.findOne(FishingSave, { where: { userId, gameId } });
    if (!save) return;
    const today = this.getTodayString();
    save.lastDailyRewardDate = today;
    if (save.saveData && typeof save.saveData === 'object') {
      save.saveData = {
        ...save.saveData,
        isGetGold: true,
        fishingDailyRewardDate: today,
      };
    }
    await mgr.save(FishingSave, save);
  }

  private async hasDailyFishingReward(userId: number, gameId: number) {
    const { start, end } = this.getTodayRange();
    const existing = await this.recordRepo
      .createQueryBuilder('record')
      .where('record.userId = :userId', { userId })
      .andWhere('record.gameId = :gameId', { gameId })
      .andWhere('record.result = :result', { result: 'fishing_daily_login' })
      .andWhere('record.createdAt >= :start', { start })
      .andWhere('record.createdAt < :end', { end })
      .getOne();
    return !!existing;
  }

  async getGameSave(userId: number, gameId: number) {
    await this.ensureFishingSavesTable();
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    const [save, balance, dailyClaimed] = await Promise.all([
      this.fishingSaveRepo.findOne({ where: { userId, gameId } }),
      this.currencyService.getBalance(userId),
      this.hasDailyFishingReward(userId, gameId),
    ]);

    const points = Number(balance.points);
    const saveData = save?.saveData
      ? this.normalizeFishingSaveData(save.saveData, points, dailyClaimed)
      : null;

    return {
      hasSave: !!saveData,
      saveData,
      points,
      balance: points,
      dailyClaimed,
      today: this.getTodayString(),
    };
  }

  async saveGameSave(userId: number, gameId: number, data: { saveData?: any; save_data?: any }) {
    await this.ensureFishingSavesTable();
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    const rawSaveData = this.parseFishingSaveData(data);
    const balance = await this.currencyService.getBalance(userId);
    const dailyClaimed = await this.hasDailyFishingReward(userId, gameId);

    const saved = await this.dataSource.transaction(async (mgr) => {
      let save = await mgr.findOne(FishingSave, { where: { userId, gameId } });
      const mergedRawSaveData = save?.saveData
        ? this.mergeFishingProgress(save.saveData, rawSaveData)
        : rawSaveData;
      const saveData = this.normalizeFishingSaveData(mergedRawSaveData, Number(balance.points), dailyClaimed);
      if (!save) {
        save = mgr.create(FishingSave, {
          userId,
          gameId,
          saveData,
          lastDailyRewardDate: dailyClaimed ? this.getTodayString() : null,
        });
      } else {
        save.saveData = saveData;
        save.lastDailyRewardDate = dailyClaimed ? this.getTodayString() : save.lastDailyRewardDate;
      }
      return mgr.save(FishingSave, save);
    });

    return {
      id: saved.id,
      saveData: saved.saveData,
      points: Number(balance.points),
      balance: Number(balance.points),
      dailyClaimed,
      today: this.getTodayString(),
      updatedAt: saved.updatedAt,
    };
  }

  /** 游戏结算回调 */
  private async ensureSnakeSavesTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS snake_saves (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        game_id INT NOT NULL,
        save_data JSON NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_snake_saves_user_game (user_id, game_id),
        INDEX idx_snake_saves_user (user_id),
        INDEX idx_snake_saves_game (game_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  private parseSnakeSaveData(value: any) {
    const raw = value?.saveData ?? value?.save_data ?? value;
    let saveData = raw;
    if (typeof saveData === 'string') {
      try {
        saveData = JSON.parse(saveData);
      } catch (_) {
        throw new BadRequestException('Snake save data is not valid JSON');
      }
    }
    if (!saveData || typeof saveData !== 'object' || Array.isArray(saveData)) {
      throw new BadRequestException('Snake save data is required');
    }
    return JSON.parse(JSON.stringify(saveData));
  }

  private normalizeSnakePoints(value: any) {
    const points = Number(value);
    if (!Number.isFinite(points)) return 0;
    return Math.max(0, Math.round((points + Number.EPSILON) * 1_000_000) / 1_000_000);
  }

  private formatSnakePoints(value: any) {
    const points = this.normalizeSnakePoints(value);
    if (Math.abs(points - Math.round(points)) < 0.000001) {
      return String(Math.round(points));
    }
    return String(points).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  private normalizeSnakeSaveData(saveData: Record<string, any>, balance: number) {
    const normalized = JSON.parse(JSON.stringify(saveData || {}));
    const storage =
      normalized.storage && typeof normalized.storage === 'object' && !Array.isArray(normalized.storage)
        ? { ...normalized.storage }
        : {};

    for (const key of Object.keys(normalized)) {
      if (key.startsWith('tcs_') && typeof normalized[key] !== 'object') {
        storage[key] = String(normalized[key]);
      }
    }

    const points = this.normalizeSnakePoints(balance);
    storage.tcs_gold = this.formatSnakePoints(points);
    if (!storage.tcs_skinIndex) storage.tcs_skinIndex = '0';
    if (!storage.tcs_skinlist) storage.tcs_skinlist = '{"skin_list":[1]}';
    if (typeof storage.tcs_diamond === 'undefined') storage.tcs_diamond = '0';

    normalized.storage = storage;
    normalized.points = points;
    normalized.balance = points;
    return normalized;
  }

  async getSnakeGameSave(userId: number, gameId: number) {
    await this.ensureSnakeSavesTable();
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    const [save, balance] = await Promise.all([
      this.snakeSaveRepo.findOne({ where: { userId, gameId } }),
      this.currencyService.getBalance(userId),
    ]);
    const points = Number(balance.points);
    const saveData = save?.saveData
      ? this.normalizeSnakeSaveData(save.saveData, points)
      : this.normalizeSnakeSaveData({ storage: {} }, points);

    return {
      hasSave: !!save,
      saveData,
      points,
      balance: points,
      updatedAt: save?.updatedAt ?? null,
    };
  }

  async saveSnakeGameSave(userId: number, gameId: number, data: { saveData?: any; save_data?: any }) {
    await this.ensureSnakeSavesTable();
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException('Game not found');

    const rawSaveData = this.parseSnakeSaveData(data);
    const balance = await this.currencyService.getBalance(userId);
    const saveData = this.normalizeSnakeSaveData(rawSaveData, Number(balance.points));

    const saved = await this.dataSource.transaction(async (mgr) => {
      let save = await mgr.findOne(SnakeSave, { where: { userId, gameId } });
      if (!save) {
        save = mgr.create(SnakeSave, { userId, gameId, saveData });
      } else {
        save.saveData = saveData;
      }
      return mgr.save(SnakeSave, save);
    });

    return {
      id: saved.id,
      saveData: saved.saveData,
      points: Number(balance.points),
      balance: Number(balance.points),
      updatedAt: saved.updatedAt,
    };
  }

  async settleGame(userId: number, gameId: number, data: { rank?: number; pointsEarned?: number; items?: any[] }) {
    const pointsEarned = Number(data.pointsEarned || 0);
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    await this.dataSource.transaction(async (mgr) => {
      const gameRecord = await mgr.save(GameRecord, mgr.create(GameRecord, {
        userId, gameId, result: `rank_${data.rank || 0}`,
        pointsEarned: Number.isFinite(pointsEarned) && pointsEarned > 0 ? pointsEarned : 0, pointsSpent: 0,
      }));

      // 发放积分
      if (Number.isFinite(pointsEarned) && pointsEarned > 0) {
        const changed = await this.currencyService.changeCurrency(userId, 'points', pointsEarned, 'game_earn', '游戏奖励', mgr);
        if (!this.isLotteryGame(game)) {
          const sourceType = this.isXiangqiGame(game) ? 'xiangqi_settle' : 'game_settle';
          await this.currencyService.recordGameTurnover({
            userId,
            gameId,
            sourceType,
            amount: pointsEarned,
            currencyLogId: changed.logId,
            bizId: `game_record:${gameRecord.id}:earned`,
            description: '游戏奖励',
            manager: mgr,
          });
        }
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
    });

    return { message: '结算成功' };
  }

  private parseSnakeSkinId(value: any) {
    const skinId = Math.floor(Number(value));
    return Number.isFinite(skinId) && skinId > 0 && skinId <= 16 ? skinId : 0;
  }

  private resolveTurnoverSource(recordResult: string, amount: number, game?: Pick<Game, 'name' | 'gameUrl'> | null): string | null {
    if (this.isLotteryGame(game)) return null;

    const result = String(recordResult || '').toLowerCase();
    const xiangqiSource = this.resolveXiangqiTurnoverSource(result, amount, game);
    if (xiangqiSource) return xiangqiSource;

    const excludedKeywords = [
      'lottery',
      'wheel',
      'lucky',
      'draw',
      'prize',
      '转盘',
      '抽奖',
      'skin',
      'buy_skin',
      'snake_skin_buy',
      'buy',
      'purchase',
      '购买',
      'skill',
      'upgrade',
      'level',
      'rod',
      'bait',
      'net',
      'shop',
      'daily_login',
      'login_reward',
      'daily',
      'login',
    ];
    if (excludedKeywords.some((keyword) => result.includes(keyword))) return null;

    if (
      result.includes('fish_sell') ||
      result.includes('sell_fish') ||
      result.includes('fishing_sell') ||
      result.includes('sell_garbage') ||
      result.includes('卖鱼') ||
      result.includes('售鱼')
    ) {
      return amount > 0 ? 'fish_sell' : null;
    }
    if (result.includes('revive') || result.includes('resurrect') || result.includes('复活')) {
      return amount < 0 ? 'revive' : null;
    }
    if (
      result.includes('bet') ||
      result.includes('stake') ||
      result.includes('wager') ||
      result.includes('下注') ||
      result.includes('投注')
    ) {
      return amount < 0 ? 'bet' : null;
    }
    if (result.includes('entry') || result.includes('入场')) {
      return amount < 0 ? 'game_entry' : null;
    }
    if (
      result.includes('settle') ||
      result.includes('win') ||
      result.includes('reward') ||
      result.includes('earn') ||
      result.includes('结算') ||
      result.includes('获胜') ||
      result.includes('奖励') ||
      result.includes('收益')
    ) {
      return amount > 0 ? 'game_settle' : null;
    }
    return amount > 0 ? 'game_settle' : 'game_spend';
  }

  private resolveXiangqiTurnoverSource(
    normalizedResult: string,
    amount: number,
    game?: Pick<Game, 'name' | 'gameUrl'> | null,
  ): string | null {
    const isXiangqi =
      this.isXiangqiGame(game) ||
      normalizedResult.includes('xiangqi') ||
      normalizedResult.includes('象棋') ||
      normalizedResult.includes('象雀');
    if (!isXiangqi) return null;

    if (amount < 0) {
      if (
        normalizedResult.includes('retract') ||
        normalizedResult.includes('undo') ||
        normalizedResult.includes('悔棋')
      ) {
        return 'xiangqi_retract';
      }
      if (
        normalizedResult.includes('hint') ||
        normalizedResult.includes('tips') ||
        normalizedResult.includes('提示')
      ) {
        return 'xiangqi_hint';
      }
      if (normalizedResult.includes('entry') || normalizedResult.includes('入场')) {
        return 'xiangqi_entry';
      }
      if (
        normalizedResult.includes('bet') ||
        normalizedResult.includes('stake') ||
        normalizedResult.includes('wager') ||
        normalizedResult.includes('下注') ||
        normalizedResult.includes('投注')
      ) {
        return 'xiangqi_bet';
      }
      return 'xiangqi_spend';
    }

    if (amount > 0) {
      if (normalizedResult.includes('study') || normalizedResult.includes('canju')) {
        return 'xiangqi_study_level';
      }
      if (
        normalizedResult.includes('settle') ||
        normalizedResult.includes('win') ||
        normalizedResult.includes('reward') ||
        normalizedResult.includes('earn') ||
        normalizedResult.includes('结算') ||
        normalizedResult.includes('获胜') ||
        normalizedResult.includes('奖励') ||
        normalizedResult.includes('收益')
      ) {
        return 'xiangqi_settle';
      }
      return 'xiangqi_earn';
    }

    return null;
  }

  private describeGamePointsChange(
    game: Pick<Game, 'name' | 'gameUrl'> | null,
    amount: number,
    reason: string,
  ) {
    const normalizedReason = reason.toLowerCase();
    const gameName = game?.name || (this.isXiangqiGame(game) ? '象棋' : '游戏');
    if (normalizedReason.includes('saima2') || normalizedReason.includes('horse2')) {
      if (normalizedReason.includes('bet') || normalizedReason.includes('stake') || normalizedReason.includes('wager')) {
        return '赛马下注';
      }
      if (
        normalizedReason.includes('settle') ||
        normalizedReason.includes('win') ||
        normalizedReason.includes('reward') ||
        normalizedReason.includes('earn')
      ) {
        return '赛马获胜派奖';
      }
      return amount < 0 ? '赛马积分消费' : '赛马积分奖励';
    }
    if (this.isXiangqiGame(game) || normalizedReason.includes('xiangqi')) {
      if (normalizedReason.includes('study') || normalizedReason.includes('canju')) return '象棋名局研习奖励';
      if (normalizedReason.includes('retract') || normalizedReason.includes('undo')) return '象棋悔棋';
      if (normalizedReason.includes('hint') || normalizedReason.includes('tips')) return '象棋提示';
      if (normalizedReason.includes('settle') || normalizedReason.includes('win')) return '象棋结算奖励';
      if (normalizedReason.includes('reward') || normalizedReason.includes('earn')) return '象棋奖励';
      return amount < 0 ? '象棋积分消费' : '象棋积分奖励';
    }
    return reason || `${gameName}${amount < 0 ? '消费' : '获得'}积分`;
  }

  private async ensureXiangqiStudyRewardsTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS xiangqi_study_rewards (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        game_id INT NOT NULL COMMENT '游戏ID',
        level_no INT NOT NULL COMMENT '象棋名局研习关卡，1-240',
        reward_amount DECIMAL(18, 6) NOT NULL COMMENT '首次通关奖励积分',
        currency_log_id BIGINT NULL COMMENT '对应currency_logs.id',
        game_record_id BIGINT NULL COMMENT '对应game_records.id',
        turnover_id BIGINT NULL COMMENT '对应game_turnover_records.id',
        request_id VARCHAR(100) NULL COMMENT '客户端请求ID',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_xiangqi_study_reward_user_game_level (user_id, game_id, level_no),
        INDEX idx_xiangqi_study_reward_user (user_id, game_id),
        INDEX idx_xiangqi_study_reward_currency_log (currency_log_id),
        INDEX idx_xiangqi_study_reward_game_record (game_record_id),
        INDEX idx_xiangqi_study_reward_turnover (turnover_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='象棋名局研习首次通关奖励';
    `);
  }

  private async ensureGamePointsChangeRequestsTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS game_points_change_requests (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        game_id INT NOT NULL COMMENT '游戏ID',
        request_id VARCHAR(128) NOT NULL COMMENT '客户端请求ID',
        amount DECIMAL(18, 6) NOT NULL COMMENT '请求积分变动',
        reason VARCHAR(100) NULL COMMENT '请求原因',
        currency_log_id BIGINT NULL COMMENT '对应currency_logs.id',
        game_record_id BIGINT NULL COMMENT '对应game_records.id',
        turnover_id BIGINT NULL COMMENT '对应game_turnover_records.id',
        balance DECIMAL(18, 6) NULL COMMENT '处理后余额',
        response_amount DECIMAL(18, 6) NULL COMMENT '实际返回变动',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_game_points_change_request (user_id, game_id, request_id),
        INDEX idx_game_points_change_request_user (user_id, game_id),
        INDEX idx_game_points_change_request_currency_log (currency_log_id),
        INDEX idx_game_points_change_request_game_record (game_record_id),
        INDEX idx_game_points_change_request_turnover (turnover_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='H5游戏积分变动幂等请求';
    `);
  }

  private resolveXiangqiStudyLevel(
    data: { amount?: number; reason?: string; [key: string]: any },
    game?: Partial<Pick<Game, 'name' | 'description' | 'gameUrl'>> | null,
  ) {
    const reason = String(data.reason || '').trim();
    const normalizedReason = reason.toLowerCase();
    const normalizedModule = String(data.module || data.mode || '').trim().toLowerCase();
    const explicitLevel = Number(data.levelNo ?? data.studyLevel ?? data.level);
    const reasonMatch =
      normalizedReason.match(/xiangqi_(?:study|canju)_level[_:-]?(\d+)/) ||
      normalizedReason.match(/xiangqi_(?:study|canju)[_:-]?(\d+)/) ||
      normalizedReason.match(/(?:study|canju)_level[_:-]?(\d+)/);
    const isStudyReward =
      normalizedReason.includes('xiangqi_study') ||
      normalizedReason.includes('xiangqi_canju') ||
      (normalizedReason.includes('xiangqi') && normalizedReason.includes('study')) ||
      normalizedModule === 'study' ||
      normalizedModule === 'canju' ||
      !!reasonMatch;

    if (!isStudyReward) return null;
    if (!this.isXiangqiGame(game) && !normalizedReason.includes('xiangqi')) return null;

    const rawLevel = Number.isFinite(explicitLevel) && explicitLevel > 0
      ? explicitLevel
      : reasonMatch
        ? Number(reasonMatch[1])
        : NaN;
    const level = Math.floor(rawLevel);
    if (!Number.isFinite(level) || level < 1 || level > XIANQI_STUDY_MAX_LEVEL) {
      throw new BadRequestException('名局研习关卡不正确');
    }
    return level;
  }

  private async awardXiangqiStudyLevel(
    userId: number,
    gameId: number,
    level: number,
    data: { amount?: number; reason?: string; [key: string]: any },
  ) {
    await this.ensureXiangqiStudyRewardsTable();

    const amount = level * XIANQI_STUDY_REWARD_STEP;
    const recordResult = `xiangqi_study_level_${level}`;
    const description = `象棋名局研习第${level}关首次通关奖励`;
    const requestId = data.requestId || data.roundId || recordResult;
    let balance = 0;
    let duplicate = false;

    await this.dataSource.transaction(async (mgr) => {
      await mgr.query(
        `INSERT IGNORE INTO xiangqi_study_rewards
           (user_id, game_id, level_no, reward_amount, request_id)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, gameId, level, amount, String(requestId || '').slice(0, 100)],
      );

      const rows = await mgr.query(
        `SELECT id, currency_log_id AS currencyLogId
         FROM xiangqi_study_rewards
         WHERE user_id = ? AND game_id = ? AND level_no = ?
         LIMIT 1
         FOR UPDATE`,
        [userId, gameId, level],
      );
      const rewardRow = rows?.[0];
      if (!rewardRow) {
        throw new BadRequestException('名局研习奖励记录不可用');
      }

      if (rewardRow.currencyLogId) {
        duplicate = true;
        return;
      }

      const changed = await this.currencyService.changeCurrency(
        userId,
        'points',
        amount,
        'game_earn',
        description,
        mgr,
      );
      balance = changed.after;

      const gameRecord = await mgr.save(GameRecord, mgr.create(GameRecord, {
        userId,
        gameId,
        result: recordResult,
        pointsEarned: amount,
        pointsSpent: 0,
      }));

      const turnover = await this.currencyService.recordGameTurnover({
        userId,
        gameId,
        sourceType: 'xiangqi_study_level',
        amount,
        currencyLogId: changed.logId,
        bizId: `xiangqi_study:${userId}:${gameId}:${level}`,
        description,
        manager: mgr,
      });

      await mgr.query(
        `UPDATE xiangqi_study_rewards
         SET currency_log_id = ?, game_record_id = ?, turnover_id = ?, reward_amount = ?, request_id = ?
         WHERE id = ?`,
        [
          changed.logId,
          gameRecord.id,
          turnover?.turnoverId || null,
          amount,
          String(requestId || '').slice(0, 100),
          rewardRow.id,
        ],
      );
    });

    if (duplicate) {
      const current = await this.currencyService.getBalance(userId);
      balance = current.points;
    }

    return {
      message: duplicate ? '名局研习该关奖励已领取' : '积分变动成功',
      points: balance,
      balance,
      amount: duplicate ? 0 : amount,
      duplicate,
      studyLevel: level,
      rewardAmount: amount,
    };
  }

  private mergeSnakeSkinList(rawSkinList: any, skinId: number) {
    const owned = new Set<number>([1]);
    if (typeof rawSkinList === 'string' && rawSkinList.trim()) {
      try {
        rawSkinList = JSON.parse(rawSkinList);
      } catch (_) {
        rawSkinList = null;
      }
    }
    const list = Array.isArray(rawSkinList?.skin_list)
      ? rawSkinList.skin_list
      : Array.isArray(rawSkinList)
        ? rawSkinList
        : [];
    for (const item of list) {
      const id = this.parseSnakeSkinId(item);
      if (id) owned.add(id);
    }
    owned.add(skinId);
    return Array.from(owned).sort((a, b) => a - b);
  }

  private async persistSnakeSkinPurchase(
    userId: number,
    gameId: number,
    skinId: number,
    balance: number,
    manager: any,
  ) {
    let save = await manager.findOne(SnakeSave, { where: { userId, gameId } });
    const currentSaveData =
      save?.saveData && typeof save.saveData === 'object'
        ? JSON.parse(JSON.stringify(save.saveData))
        : { storage: {} };
    const storage =
      currentSaveData.storage && typeof currentSaveData.storage === 'object' && !Array.isArray(currentSaveData.storage)
        ? currentSaveData.storage
        : {};
    storage.tcs_skinlist = JSON.stringify({
      skin_list: this.mergeSnakeSkinList(storage.tcs_skinlist, skinId),
    });
    if (!storage.tcs_skinIndex) storage.tcs_skinIndex = '0';
    if (typeof storage.tcs_diamond === 'undefined') storage.tcs_diamond = '0';
    storage.tcs_gold = this.formatSnakePoints(balance);
    currentSaveData.storage = storage;

    const saveData = this.normalizeSnakeSaveData(currentSaveData, balance);
    if (!save) {
      save = manager.create(SnakeSave, { userId, gameId, saveData });
    } else {
      save.saveData = saveData;
    }
    await manager.save(SnakeSave, save);
  }

  /** H5 game points change. Negative amount spends points, positive amount earns points. */
  async changeGamePoints(userId: number, gameId: number, data: { amount?: number; reason?: string; [key: string]: any }) {
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      throw new BadRequestException('积分变动金额不正确');
    }

    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) throw new NotFoundException('游戏不存在');
    if (game.status !== 1) throw new BadRequestException('游戏维护中');

    const xiangqiStudyLevel = amount > 0 ? this.resolveXiangqiStudyLevel(data, game) : null;
    if (xiangqiStudyLevel) {
      return this.awardXiangqiStudyLevel(userId, gameId, xiangqiStudyLevel, data);
    }

    const logType = amount < 0 ? 'game_spend' : 'game_earn';
    const reason = String(data.reason || '').trim();
    const recordResult = (reason || logType).slice(0, 50);
    const description = this.describeGamePointsChange(game, amount, reason);
    const requestId = String(data.requestId || '').trim().slice(0, 128);

    const snakeSkinId = this.parseSnakeSkinId(data.skinId);
    const shouldPersistSnakeSkin =
      amount < 0 &&
      snakeSkinId > 0 &&
      (recordResult === 'snake_skin_buy' || recordResult.startsWith('buy_skin'));

    if (shouldPersistSnakeSkin) {
      await this.ensureSnakeSavesTable();
    }

    if (requestId) {
      await this.ensureGamePointsChangeRequestsTable();
    }

    if (amount > 0 && recordResult === 'fishing_daily_login') {
      await this.ensureFishingSavesTable();
      const alreadyClaimed = await this.hasDailyFishingReward(userId, gameId);
      if (alreadyClaimed) {
        const current = await this.currencyService.getBalance(userId);
        return {
          message: '今日实况钓鱼登录奖励已领取',
          points: current.points,
          balance: current.points,
          amount: 0,
          duplicate: true,
          requestId: requestId || undefined,
        };
      }
    }

    let balance = 0;
    let duplicate = false;
    let responseAmount = amount;
    await this.dataSource.transaction(async (mgr) => {
      let requestRow: any = null;
      if (requestId) {
        await mgr.query(
          `INSERT IGNORE INTO game_points_change_requests
             (user_id, game_id, request_id, amount, reason)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, gameId, requestId, amount, recordResult],
        );

        const rows = await mgr.query(
          `SELECT id,
                  amount,
                  currency_log_id AS currencyLogId,
                  balance,
                  response_amount AS responseAmount
           FROM game_points_change_requests
           WHERE user_id = ? AND game_id = ? AND request_id = ?
           LIMIT 1
           FOR UPDATE`,
          [userId, gameId, requestId],
        );
        requestRow = rows?.[0];
        if (!requestRow) {
          throw new BadRequestException('积分请求记录不可用');
        }

        const existingAmount = Number(requestRow.amount);
        if (Number.isFinite(existingAmount) && Math.abs(existingAmount - amount) > 0.000001) {
          throw new BadRequestException('重复请求的积分金额不一致');
        }

        if (requestRow.currencyLogId) {
          duplicate = true;
          responseAmount = Number(requestRow.responseAmount ?? requestRow.amount ?? amount);
          const storedBalance = Number(requestRow.balance);
          if (Number.isFinite(storedBalance)) {
            balance = storedBalance;
          }
          return;
        }
      }

      const changed = await this.currencyService.changeCurrency(
        userId,
        'points',
        amount,
        logType,
        description,
        mgr,
      );
      balance = changed.after;

      const gameRecord = await mgr.save(GameRecord, mgr.create(GameRecord, {
        userId,
        gameId,
        result: recordResult,
        pointsEarned: amount > 0 ? amount : 0,
        pointsSpent: amount < 0 ? Math.abs(amount) : 0,
      }));

      if (amount > 0 && recordResult === 'fishing_daily_login') {
        await this.touchFishingDailyReward(userId, gameId, mgr);
      }

      if (shouldPersistSnakeSkin) {
        await this.persistSnakeSkinPurchase(userId, gameId, snakeSkinId, balance, mgr);
      }

      const turnoverSource = this.resolveTurnoverSource(recordResult, amount, game);
      let turnoverId: number | null = null;
      if (turnoverSource) {
        const actionSide = amount > 0 ? 'earned' : 'spent';
        const providedBizId = data.requestId || data.roundId || data.roomId;
        const turnover = await this.currencyService.recordGameTurnover({
          userId,
          gameId,
          sourceType: turnoverSource,
          amount: Math.abs(amount),
          currencyLogId: changed.logId,
          bizId: providedBizId
            ? `${turnoverSource}:${providedBizId}:${actionSide}`
            : `game_record:${gameRecord.id}:${actionSide}`,
          description,
          manager: mgr,
        });
        turnoverId = turnover?.turnoverId ? Number(turnover.turnoverId) : null;
      }

      if (requestId && requestRow) {
        await mgr.query(
          `UPDATE game_points_change_requests
           SET currency_log_id = ?,
               game_record_id = ?,
               turnover_id = ?,
               balance = ?,
               response_amount = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [changed.logId, gameRecord.id, turnoverId, balance, responseAmount, requestRow.id],
        );
      }
    });

    if (duplicate && !Number.isFinite(balance)) {
      const current = await this.currencyService.getBalance(userId);
      balance = current.points;
    }

    return {
      message: duplicate ? '积分变动已处理' : '积分变动成功',
      points: balance,
      balance,
      amount: responseAmount,
      duplicate,
      requestId: requestId || undefined,
    };
  }

  /** 赛马 - 创建房间 */
  async createHorseRoom() {
    const room = await this.roomRepo.save(this.roomRepo.create({ status: 1, horseCount: 6, totalPool: 0 }));
    return { roomId: room.id };
  }

  private normalizeHorseNumber(value: unknown) {
    const horseNumber = Math.floor(Number(value) || 0);
    if (!Number.isFinite(horseNumber) || horseNumber < 1 || horseNumber > 6) {
      throw new BadRequestException('赛马编号不正确');
    }
    return horseNumber;
  }

  private normalizeHorseBetAmount(value: unknown) {
    const amount = Math.floor(Number(value) || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('投注积分不正确');
    }
    if (!HORSE_BET_OPTIONS.includes(amount)) {
      throw new BadRequestException(`投注积分只能选择：${HORSE_BET_OPTIONS.join('、')}`);
    }
    return amount;
  }

  /** 赛马 - 创建房间并批量投注，用于 WebSocket 实时赛马 */
  async createHorseRoomWithBets(
    bets: Array<{ userId: number; horseNumber: number; amount: number }>,
  ) {
    const validBets = bets
      .map((bet) => ({
        userId: Number(bet.userId),
        horseNumber: this.normalizeHorseNumber(bet.horseNumber),
        amount: this.normalizeHorseBetAmount(bet.amount),
      }))
      .filter((bet) => bet.userId > 0);

    if (validBets.length === 0) {
      throw new BadRequestException('请先选择投入积分');
    }

    return this.dataSource.transaction(async (mgr) => {
      const room = await mgr.save(
        HorseRoom,
        mgr.create(HorseRoom, { status: 2, horseCount: 6, totalPool: 0 }),
      );

      let totalPool = 0;
      for (const bet of validBets) {
        const changed = await this.currencyService.changeCurrency(
          bet.userId,
          'points',
          -bet.amount,
          'horse_bet',
          '赛马投注',
          mgr,
        );
        await mgr.save(
          HorseBet,
          mgr.create(HorseBet, {
            roomId: room.id,
            userId: bet.userId,
            horseNumber: bet.horseNumber,
            betAmount: bet.amount,
          }),
        );
        await this.currencyService.recordGameTurnover({
          userId: bet.userId,
          gameId: null,
          sourceType: 'bet',
          amount: bet.amount,
          currencyLogId: changed.logId,
          bizId: room.id,
          description: '赛马投注',
          manager: mgr,
        });
        totalPool += bet.amount;
      }

      room.totalPool = totalPool;
      await mgr.save(HorseRoom, room);
      return { roomId: room.id, totalPool };
    });
  }

  /** 赛马 - 投注 */
  async horseBet(userId: number, roomId: number, horseNumber: number, amount: number) {
    const safeRoomId = Math.floor(Number(roomId) || 0);
    const safeHorseNumber = this.normalizeHorseNumber(horseNumber);
    const safeAmount = this.normalizeHorseBetAmount(amount);
    if (safeRoomId <= 0) throw new BadRequestException('房间编号不正确');

    const room = await this.roomRepo.findOne({ where: { id: safeRoomId } });
    if (!room) throw new NotFoundException('房间不存在');
    if (room.status !== 1) throw new BadRequestException('房间已开赛或已结算');

    await this.dataSource.transaction(async (mgr) => {
      const changed = await this.currencyService.changeCurrency(userId, 'points', -safeAmount, 'horse_bet', '赛马投注', mgr);
      await mgr.save(
        HorseBet,
        mgr.create(HorseBet, {
          roomId: safeRoomId,
          userId,
          horseNumber: safeHorseNumber,
          betAmount: safeAmount,
        }),
      );
      await this.currencyService.recordGameTurnover({
        userId,
        gameId: null,
        sourceType: 'bet',
        amount: safeAmount,
        currencyLogId: changed.logId,
        bizId: safeRoomId,
        description: '赛马投注',
        manager: mgr,
      });
      room.totalPool = Number(room.totalPool) + safeAmount;
      await mgr.save(HorseRoom, room);
    });

    return { message: '投注成功' };
  }

  /** 赛马 - 结算 */
  async horseSettle(roomId: number, winnerHorse: number) {
    const safeRoomId = Math.floor(Number(roomId) || 0);
    const safeWinnerHorse = this.normalizeHorseNumber(winnerHorse);
    if (safeRoomId <= 0) throw new BadRequestException('房间编号不正确');

    const room = await this.roomRepo.findOne({ where: { id: safeRoomId } });
    if (!room) throw new NotFoundException('房间不存在');
    if (room.status === 3) throw new BadRequestException('已结算');

    const bets = await this.betRepo.find({ where: { roomId: safeRoomId } });
    const winnerBets = bets.filter((b) => b.horseNumber === safeWinnerHorse);
    const loserBets = bets.filter((b) => b.horseNumber !== safeWinnerHorse);
    const loserTotal = loserBets.reduce((sum, b) => sum + Number(b.betAmount), 0);
    const winnerTotal = winnerBets.reduce((sum, b) => sum + Number(b.betAmount), 0);
    const results = bets.map((bet) => ({
      userId: bet.userId,
      horseNumber: bet.horseNumber,
      betAmount: Number(bet.betAmount),
      rewardAmount: 0,
      profitAmount: -Number(bet.betAmount),
      isWinner: bet.horseNumber === safeWinnerHorse,
    }));

    await this.dataSource.transaction(async (mgr) => {
      for (const wb of winnerBets) {
        const ratio = winnerTotal > 0 ? Number(wb.betAmount) / winnerTotal : 0;
        const reward = Number((loserTotal * ratio).toFixed(2));
        const total = Number((Number(wb.betAmount) + reward).toFixed(2));
        wb.rewardAmount = total;
        await mgr.save(HorseBet, wb);
        const changed = await this.currencyService.changeCurrency(wb.userId, 'points', total, 'horse_win', '赛马获胜', mgr);
        await this.currencyService.recordGameTurnover({
          userId: wb.userId,
          gameId: null,
          sourceType: 'game_settle',
          amount: total,
          currencyLogId: changed.logId,
          bizId: safeRoomId,
          description: '赛马获胜',
          manager: mgr,
        });
        const result = results.find((item) => item.userId === wb.userId && item.horseNumber === wb.horseNumber);
        if (result) {
          result.rewardAmount = total;
          result.profitAmount = reward;
        }
      }
      room.status = 3;
      room.winnerHorse = safeWinnerHorse;
      room.settledAt = new Date();
      await mgr.save(HorseRoom, room);
    });

    return {
      roomId: safeRoomId,
      winnerHorse: safeWinnerHorse,
      winnerCount: winnerBets.length,
      winnerTotal,
      loserTotal,
      totalPool: Number(room.totalPool),
      results,
    };
  }

  /** 转盘抽奖 */
  async lotteryDraw(userId: number) {
    await this.ensureLotteryTables();
    const result = await this.dataSource.transaction(async (mgr) => {
      const status = await this.syncLotteryAccount(userId, mgr, true);
      if (status.remainingChances <= 0) {
        throw new BadRequestException('暂无抽奖机会');
      }

      const drawNo = status.totalDraws + 1;
      const prize = this.pickLotteryPrize(drawNo);
      const issued = await this.issueLotteryPrize(userId, prize, mgr);
      const payload = issued.payload;

      await mgr.query(
        `UPDATE lottery_accounts
         SET used_chances = used_chances + 1, total_draws = total_draws + 1, updated_at = NOW()
         WHERE user_id = ?`,
        [userId],
      );

      const insertResult = await mgr.query(
        `INSERT INTO lottery_draw_records
          (user_id, draw_no, prize_level, prize_name, prize_type, prize_amount, prize_payload, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          userId,
          drawNo,
          prize.level,
          prize.name,
          prize.type,
          prize.amount,
          payload ? JSON.stringify(payload) : null,
        ],
      );

      return {
        record: {
          id: Number(insertResult.insertId),
          userId,
          drawNo,
          prizeLevel: prize.level,
          prizeName: prize.name,
          prizeType: prize.type,
          prizeAmount: prize.amount,
          prizePayload: payload,
          createdAt: new Date(),
        },
        prize: {
          level: prize.level,
          name: prize.name,
          type: prize.type,
          amount: prize.amount,
          payload,
        },
        balance: issued.balance,
      };
    });

    const status = await this.getLotteryStatus(userId);
    return { ...result, status };
  }

  /** 获取转盘配置 */
  async getLotteryConfig() {
    return this.lotteryPrizeList();
  }

  async getLotteryStatus(userId: number) {
    await this.ensureLotteryTables();
    const status = await this.syncLotteryAccount(userId, this.dataSource.manager);
    const records = await this.getLotteryRecordList(userId, 10);
    return {
      ...status,
      prizes: this.lotteryPrizeList(),
      records,
    };
  }

  async getLotteryRecords(userId: number) {
    return this.getLotteryRecordList(userId, 50);
  }

  /** 赛马房间详情 */
  async getHorseRoom(roomId: number) {
    const room = await this.roomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new NotFoundException('房间不存在');
    const bets = await this.betRepo.find({ where: { roomId } });
    return { ...room, bets };
  }
}
