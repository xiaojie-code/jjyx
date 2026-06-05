import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { HorseRaceMatch } from '../entities/horse-race-match.entity';
import { HorseRacePlayer } from '../entities/horse-race-player.entity';

type HorseMode = 'ai' | 'pvp';
type MatchStatus = 'confirming' | 'countdown' | 'racing' | 'finished' | 'cancelled';

interface HorseInfo {
  id: number;
  name: string;
  color: string;
  speed: number;
  stamina: number;
  burst: number;
  trait: string;
}

interface QueueEntry {
  userId: number;
  socketId: string;
  displayName: string;
  avatar?: string;
  horseId: number;
  joinedAt: number;
}

interface LivePlayer {
  recordId?: number;
  userId?: number;
  socketId?: string;
  displayName: string;
  avatar?: string;
  horseId: number;
  horseName: string;
  isBot: boolean;
  confirmed: boolean;
  lane: number;
  finishTimeMs?: number;
  placement?: number;
  isWinner?: boolean;
}

interface LiveMatch {
  id: string;
  mode: HorseMode;
  status: MatchStatus;
  players: LivePlayer[];
  createdAt: number;
  confirmTimer?: NodeJS.Timeout;
  countdownTimer?: NodeJS.Timeout;
  raceTimer?: NodeJS.Timeout;
  raceStartedAt?: number;
  raceDurationMs?: number;
}

const HORSES: HorseInfo[] = [
  { id: 1, name: '赤焰', color: '#ef4444', speed: 8, stamina: 6, burst: 9, trait: '末段冲刺强' },
  { id: 2, name: '青岚', color: '#14b8a6', speed: 7, stamina: 8, burst: 7, trait: '节奏稳定' },
  { id: 3, name: '星河', color: '#6366f1', speed: 9, stamina: 5, burst: 8, trait: '起跑快' },
  { id: 4, name: '墨影', color: '#334155', speed: 6, stamina: 9, burst: 6, trait: '耐力充足' },
  { id: 5, name: '金羽', color: '#f59e0b', speed: 8, stamina: 7, burst: 6, trait: '中段加速' },
  { id: 6, name: '雪魄', color: '#38bdf8', speed: 7, stamina: 7, burst: 8, trait: '均衡灵活' },
];

const BOT_NAMES = ['云骑士', '银铃', '快步星', '南风', '月影', '红鬃'];

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/horse',
})
export class HorseRaceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(HorseRaceGateway.name);
  private readonly queue = new Map<number, QueueEntry>();
  private readonly matches = new Map<string, LiveMatch>();
  private queueTimer?: NodeJS.Timeout;

  private readonly targetPlayers = 4;
  private readonly minPlayers = 2;
  private readonly queueWaitMs = 12000;
  private readonly confirmWaitMs = 15000;
  private readonly countdownSeconds = 5;

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(HorseRaceMatch)
    private readonly matchRepo: Repository<HorseRaceMatch>,
    @InjectRepository(HorseRacePlayer)
    private readonly playerRepo: Repository<HorseRacePlayer>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.readToken(client);
      if (!token) throw new Error('missing token');
      const payload = this.jwtService.verify(token);
      const user = await this.userRepo.findOne({ where: { id: Number(payload.sub) } });
      if (!user || user.status !== 1 || !user.isActivated) {
        throw new Error('inactive user');
      }
      client.data.user = user;
      client.emit('horse:catalog', { horses: HORSES });
      this.logger.log(`horse socket connected user=${user.id} socket=${client.id}`);
    } catch (error) {
      client.emit('horse:error', { message: '请先登录并激活账号' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Number(client.data.user?.id);
    if (userId) this.leaveQueue(userId);
    for (const match of this.matches.values()) {
      const player = match.players.find((p) => p.socketId === client.id);
      if (
        player &&
        match.mode === 'pvp' &&
        (match.status === 'confirming' || match.status === 'countdown')
      ) {
        this.cancelMatch(match, '有玩家离开，匹配已取消');
      }
    }
  }

  @SubscribeMessage('horse:ai:start')
  async startAiRace(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { horseId?: number },
  ) {
    const user = client.data.user as User;
    if (this.findUserActiveMatch(user.id)) {
      client.emit('horse:error', { message: '当前已有进行中的赛马对局' });
      return { ok: false };
    }
    const selected = this.getHorse(data?.horseId);
    const bots = this.createBots(selected.id);
    const match = await this.createMatch('ai', [
      this.createPlayerFromUser(user, client.id, selected, 0, true),
      ...bots,
    ]);
    await client.join(this.roomName(match.id));
    client.emit('horse:match:found', this.matchPayload(match));
    this.startCountdown(match);
    return { ok: true, matchId: match.id };
  }

  @SubscribeMessage('horse:match:join')
  async joinPvpQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { horseId?: number },
  ) {
    const user = client.data.user as User;
    if (this.findUserActiveMatch(user.id)) {
      client.emit('horse:error', { message: '当前已有进行中的赛马对局' });
      return { ok: false };
    }
    const horse = this.getHorse(data?.horseId);
    this.leaveQueue(user.id);
    this.queue.set(user.id, {
      userId: user.id,
      socketId: client.id,
      displayName: this.displayName(user),
      avatar: user.avatar || '',
      horseId: horse.id,
      joinedAt: Date.now(),
    });
    client.emit('horse:queue:update', {
      queued: this.queue.size,
      target: this.targetPlayers,
      minPlayers: this.minPlayers,
      message: '正在匹配真人玩家',
    });
    this.broadcastQueueState();
    this.tryCreatePvpMatch(false);
    this.ensureQueueTimer();
    return { ok: true };
  }

  @SubscribeMessage('horse:match:leave')
  async leavePvpQueue(@ConnectedSocket() client: Socket) {
    const user = client.data.user as User;
    if (user) {
      const pendingMatch = this.findUserMatch(user.id, ['confirming']);
      if (pendingMatch && pendingMatch.status === 'confirming') {
        await this.cancelMatch(pendingMatch, '有玩家主动退出，本局匹配已取消');
        return { ok: true };
      }
      this.leaveQueue(user.id);
    }
    client.emit('horse:queue:left');
    this.broadcastQueueState();
    return { ok: true };
  }

  @SubscribeMessage('horse:match:confirm')
  async confirmPvpMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { matchId?: string },
  ) {
    const user = client.data.user as User;
    const match = data?.matchId ? this.matches.get(data.matchId) : undefined;
    if (!match || match.status !== 'confirming') {
      client.emit('horse:error', { message: '对局不存在或已开始' });
      return { ok: false };
    }
    const player = match.players.find((p) => p.userId === user.id);
    if (!player) {
      client.emit('horse:error', { message: '你不在当前对局中' });
      return { ok: false };
    }
    player.confirmed = true;
    if (player.recordId) {
      await this.playerRepo.update(player.recordId, { confirmed: true });
    }
    this.server.to(this.roomName(match.id)).emit('horse:player:confirmed', {
      matchId: match.id,
      players: match.players.map((p) => this.publicPlayer(p)),
    });
    if (match.players.every((p) => p.confirmed)) {
      if (match.confirmTimer) clearTimeout(match.confirmTimer);
      this.startCountdown(match);
    }
    return { ok: true };
  }

  private readToken(client: Socket): string {
    const header = client.handshake.headers?.authorization;
    return (
      client.handshake.auth?.token ||
      client.handshake.query?.token ||
      (typeof header === 'string' ? header.replace('Bearer ', '') : '')
    );
  }

  private getHorse(horseId: unknown): HorseInfo {
    const id = Number(horseId);
    return HORSES.find((horse) => horse.id === id) ?? HORSES[0];
  }

  private createPlayerFromUser(
    user: User,
    socketId: string,
    horse: HorseInfo,
    lane: number,
    confirmed = false,
  ): LivePlayer {
    return {
      userId: user.id,
      socketId,
      displayName: this.displayName(user),
      avatar: user.avatar || '',
      horseId: horse.id,
      horseName: horse.name,
      isBot: false,
      confirmed,
      lane,
    };
  }

  private createBots(selectedHorseId: number): LivePlayer[] {
    const pool = HORSES.filter((horse) => horse.id !== selectedHorseId);
    return pool.slice(0, 5).map((horse, index) => ({
      displayName: BOT_NAMES[index] ?? `AI-${index + 1}`,
      horseId: horse.id,
      horseName: horse.name,
      isBot: true,
      confirmed: true,
      lane: index + 1,
    }));
  }

  private displayName(user: User): string {
    return user.nickname || user.account || `用户${user.id}`;
  }

  private leaveQueue(userId: number) {
    this.queue.delete(userId);
    if (this.queue.size === 0 && this.queueTimer) {
      clearTimeout(this.queueTimer);
      this.queueTimer = undefined;
    }
  }

  private findUserActiveMatch(userId: number): LiveMatch | undefined {
    return this.findUserMatch(userId, ['confirming', 'countdown', 'racing']);
  }

  private findUserMatch(userId: number, statuses?: MatchStatus[]): LiveMatch | undefined {
    for (const match of this.matches.values()) {
      if (statuses && !statuses.includes(match.status)) continue;
      if (match.players.some((player) => player.userId === userId)) {
        return match;
      }
    }
    return undefined;
  }

  private broadcastQueueState() {
    const payload = {
      queued: this.queue.size,
      target: this.targetPlayers,
      minPlayers: this.minPlayers,
      message: this.queue.size >= this.minPlayers ? '人数足够，准备成局' : '等待更多玩家加入',
    };
    for (const entry of this.queue.values()) {
      this.server.to(entry.socketId).emit('horse:queue:update', payload);
    }
  }

  private ensureQueueTimer() {
    if (this.queueTimer) return;
    this.queueTimer = setTimeout(() => {
      this.queueTimer = undefined;
      this.tryCreatePvpMatch(true);
      if (this.queue.size > 0) this.ensureQueueTimer();
    }, this.queueWaitMs);
  }

  private async tryCreatePvpMatch(force: boolean) {
    const entries = [...this.queue.values()].sort((a, b) => a.joinedAt - b.joinedAt);
    const canStart =
      entries.length >= this.targetPlayers || (force && entries.length >= this.minPlayers);
    if (!canStart) return;

    const selected = entries.slice(0, this.targetPlayers);
    for (const entry of selected) this.queue.delete(entry.userId);
    const players: LivePlayer[] = selected.map((entry, index) => {
      const horse = this.getHorse(entry.horseId);
      return {
        userId: entry.userId,
        socketId: entry.socketId,
        displayName: entry.displayName,
        avatar: entry.avatar,
        horseId: horse.id,
        horseName: horse.name,
        isBot: false,
        confirmed: false,
        lane: index,
      };
    });

    const match = await this.createMatch('pvp', players);
    for (const player of match.players) {
      if (player.socketId) this.server.in(player.socketId).socketsJoin(this.roomName(match.id));
    }
    this.server.to(this.roomName(match.id)).emit('horse:match:found', this.matchPayload(match));
    match.confirmTimer = setTimeout(() => {
      if (match.status === 'confirming') {
        this.cancelMatch(match, '有玩家未确认，匹配已取消');
      }
    }, this.confirmWaitMs);
    this.broadcastQueueState();
  }

  private async createMatch(mode: HorseMode, players: LivePlayer[]): Promise<LiveMatch> {
    const match: LiveMatch = {
      id: randomUUID(),
      mode,
      status: 'confirming',
      players,
      createdAt: Date.now(),
    };
    this.matches.set(match.id, match);
    await this.matchRepo.save(
      this.matchRepo.create({
        id: match.id,
        mode,
        status: 'confirming',
        playerCount: players.length,
      }),
    );
    const records = await this.playerRepo.save(
      players.map((player) =>
        this.playerRepo.create({
          matchId: match.id,
          userId: player.userId,
          displayName: player.displayName,
          avatar: player.avatar || '',
          horseId: player.horseId,
          horseName: player.horseName,
          isBot: player.isBot,
          confirmed: player.confirmed,
        }),
      ),
    );
    records.forEach((record, index) => {
      players[index].recordId = record.id;
    });
    return match;
  }

  private async startCountdown(match: LiveMatch) {
    match.status = 'countdown';
    await this.matchRepo.update(match.id, { status: 'countdown' });
    const room = this.roomName(match.id);
    this.server.to(room).emit('horse:match:ready', this.matchPayload(match));

    let seconds = this.countdownSeconds;
    this.server.to(room).emit('horse:countdown', { matchId: match.id, seconds });
    match.countdownTimer = setInterval(() => {
      seconds -= 1;
      this.server.to(room).emit('horse:countdown', { matchId: match.id, seconds });
      if (seconds <= 0) {
        if (match.countdownTimer) clearInterval(match.countdownTimer);
        this.startRace(match);
      }
    }, 1000);
  }

  private async startRace(match: LiveMatch) {
    match.status = 'racing';
    match.raceStartedAt = Date.now();
    this.calculateFinishTimes(match);
    match.raceDurationMs = Math.max(...match.players.map((p) => p.finishTimeMs ?? 0)) + 900;
    await this.matchRepo.update(match.id, {
      status: 'racing',
      startedAt: new Date(),
      raceDurationMs: match.raceDurationMs,
    });
    const room = this.roomName(match.id);
    this.server.to(room).emit('horse:race:start', {
      matchId: match.id,
      mode: match.mode,
      durationMs: match.raceDurationMs,
      players: match.players.map((p) => this.publicPlayer(p)),
      horses: HORSES,
    });

    match.raceTimer = setInterval(() => {
      const elapsedMs = Date.now() - (match.raceStartedAt ?? Date.now());
      this.server.to(room).emit('horse:race:tick', {
        matchId: match.id,
        elapsedMs,
        positions: match.players.map((player) => ({
          userId: player.userId,
          displayName: player.displayName,
          lane: player.lane,
          horseId: player.horseId,
          position: this.positionFor(player, elapsedMs),
        })),
      });
      if (elapsedMs >= (match.raceDurationMs ?? 0)) {
        if (match.raceTimer) clearInterval(match.raceTimer);
        this.finishRace(match);
      }
    }, 250);
  }

  private calculateFinishTimes(match: LiveMatch) {
    const sorted = match.players
      .map((player) => {
        const horse = this.getHorse(player.horseId);
        const jitter = Math.floor(Math.random() * 1400) - 550;
        const finishTimeMs = Math.max(
          7600,
          Math.min(13800, 11900 - horse.speed * 330 - horse.burst * 115 - horse.stamina * 80 + jitter),
        );
        player.finishTimeMs = finishTimeMs;
        return player;
      })
      .sort((a, b) => (a.finishTimeMs ?? 0) - (b.finishTimeMs ?? 0));

    sorted.forEach((player, index) => {
      player.placement = index + 1;
      player.isWinner = index === 0;
    });
  }

  private positionFor(player: LivePlayer, elapsedMs: number): number {
    const finish = player.finishTimeMs || 1;
    const raw = Math.min(1, elapsedMs / finish);
    const eased = raw < 0.7 ? raw * 0.86 : 0.602 + (raw - 0.7) * 1.326;
    return Math.max(0, Math.min(100, Math.round(eased * 1000) / 10));
  }

  private async finishRace(match: LiveMatch) {
    match.status = 'finished';
    const standings = [...match.players]
      .sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
      .map((player) => this.publicPlayer(player));
    const winners = standings.filter((player) => player.isWinner);

    await this.matchRepo.update(match.id, {
      status: 'finished',
      endedAt: new Date(),
      standingsJson: JSON.stringify(standings),
      winnersJson: JSON.stringify(winners),
    });
    await Promise.all(
      match.players.map((player) =>
        player.recordId
          ? this.playerRepo.update(player.recordId, {
              placement: player.placement,
              finishTimeMs: player.finishTimeMs,
              isWinner: Boolean(player.isWinner),
            })
          : Promise.resolve(),
      ),
    );

    this.server.to(this.roomName(match.id)).emit('horse:race:finish', {
      matchId: match.id,
      winners,
      standings,
    });
    setTimeout(() => this.matches.delete(match.id), 60000);
  }

  private async cancelMatch(match: LiveMatch, reason: string) {
    match.status = 'cancelled';
    if (match.confirmTimer) clearTimeout(match.confirmTimer);
    if (match.countdownTimer) clearInterval(match.countdownTimer);
    if (match.raceTimer) clearInterval(match.raceTimer);
    await this.matchRepo.update(match.id, { status: 'cancelled', endedAt: new Date() });
    this.server.to(this.roomName(match.id)).emit('horse:match:cancelled', {
      matchId: match.id,
      reason,
    });
    this.matches.delete(match.id);
  }

  private matchPayload(match: LiveMatch) {
    return {
      matchId: match.id,
      mode: match.mode,
      status: match.status,
      confirmWaitMs: this.confirmWaitMs,
      countdownSeconds: this.countdownSeconds,
      players: match.players.map((player) => this.publicPlayer(player)),
      horses: HORSES,
    };
  }

  private publicPlayer(player: LivePlayer) {
    const horse = this.getHorse(player.horseId);
    return {
      userId: player.userId,
      displayName: player.displayName,
      avatar: player.avatar || '',
      horseId: player.horseId,
      horseName: player.horseName,
      horseColor: horse.color,
      horseTrait: horse.trait,
      isBot: player.isBot,
      confirmed: player.confirmed,
      lane: player.lane,
      placement: player.placement,
      finishTimeMs: player.finishTimeMs,
      isWinner: Boolean(player.isWinner),
    };
  }

  private roomName(matchId: string): string {
    return `horse:${matchId}`;
  }
}
