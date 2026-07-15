import { CurrencyService } from './currency.service';

describe('CurrencyService game duration copper rewards', () => {
  it('counts only new session seconds and rewards each threshold once', async () => {
    const session = { durationSeconds: 0, copperReward: 0 };
    const daily = { id: 1, totalSeconds: 0, rewardedCopper: 0 };

    const manager = {
      query: jest.fn(async (sql: string, params: any[] = []) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        if (normalized.startsWith('INSERT IGNORE INTO game_play_sessions')) {
          return { affectedRows: session.durationSeconds === 0 ? 1 : 0 };
        }
        if (normalized.startsWith('SELECT duration_seconds AS durationSeconds')) {
          return [{ ...session }];
        }
        if (normalized.startsWith('INSERT IGNORE INTO game_play_time_daily')) {
          return { affectedRows: 1 };
        }
        if (normalized.startsWith('SELECT id, total_seconds AS totalSeconds')) {
          return [{ ...daily }];
        }
        if (normalized.startsWith('UPDATE game_play_time_daily')) {
          daily.totalSeconds = Number(params[0]);
          daily.rewardedCopper = Number(params[1]);
          return { affectedRows: 1 };
        }
        if (normalized.startsWith('UPDATE game_play_sessions')) {
          session.durationSeconds = Number(params[0]);
          session.copperReward += Number(params[1]);
          return { affectedRows: 1 };
        }
        throw new Error(`Unexpected query: ${normalized}`);
      }),
    };

    const service: any = Object.create(CurrencyService.prototype);
    service.dataSource = {
      transaction: async (callback: (mgr: any) => Promise<any>) => callback(manager),
    };
    service.ensureGameDurationCopperTables = jest.fn().mockResolvedValue(undefined);
    service.getGameCopperConfig = jest.fn().mockResolvedValue({
      minutesPerCoin: 15,
      dailyMax: 2,
    });
    service.changeCurrency = jest.fn().mockResolvedValue({ logId: 1001 });

    const report = (durationSeconds: number) =>
      service.recordGamePlayDuration(98, 2, {
        sessionId: 'duration-heartbeat-test',
        durationSeconds,
      });

    await expect(report(30)).resolves.toMatchObject({
      countedDurationSeconds: 30,
      totalSecondsToday: 30,
      copperReward: 0,
    });
    await expect(report(60)).resolves.toMatchObject({
      countedDurationSeconds: 30,
      totalSecondsToday: 60,
      copperReward: 0,
    });
    await expect(report(60)).resolves.toMatchObject({
      counted: false,
      duplicate: true,
      countedDurationSeconds: 0,
      copperReward: 0,
    });
    await expect(report(900)).resolves.toMatchObject({
      totalSecondsToday: 900,
      copperReward: 1,
      rewardedCopperToday: 1,
    });
    await expect(report(1800)).resolves.toMatchObject({
      totalSecondsToday: 1800,
      copperReward: 1,
      rewardedCopperToday: 2,
    });
    await expect(report(3600)).resolves.toMatchObject({
      totalSecondsToday: 3600,
      copperReward: 0,
      rewardedCopperToday: 2,
    });

    expect(daily.totalSeconds).toBe(3600);
    expect(daily.rewardedCopper).toBe(2);
    expect(session.durationSeconds).toBe(3600);
    expect(session.copperReward).toBe(2);
    expect(service.changeCurrency).toHaveBeenCalledTimes(2);
  });
});
