import {
  CurrencyService,
  WEEKLY_POINT_RETURN_ALWAYS_ELIGIBLE_LOG_TYPES,
  WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES,
} from './currency.service';

describe('CurrencyService weekly point return consumption', () => {
  it('always includes the daily fishing game entry deduction', async () => {
    const query = jest
      .fn()
      .mockResolvedValue([
        { userId: 1, eligibleConsumed: 500, excludedConsumed: 0 },
      ]);
    const service: any = Object.create(CurrencyService.prototype);
    service.dataSource = { query };

    await service.getWeeklyPointReturnConsumeRows(
      new Date(2026, 6, 20, 0, 0, 0),
      new Date(2026, 6, 26, 23, 59, 59),
    );

    const [sql, params] = query.mock.calls[0];
    expect(WEEKLY_POINT_RETURN_ALWAYS_ELIGIBLE_LOG_TYPES).toContain(
      'game_entry',
    );
    expect(WEEKLY_POINT_RETURN_EXCLUDED_LOG_TYPES).not.toContain('game_entry');
    expect(sql).toContain('OR log_type NOT IN');
    expect(
      params.filter((value: unknown) => value === 'game_entry'),
    ).toHaveLength(2);
  });
});
