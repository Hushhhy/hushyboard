import { describe, expect, it } from 'vitest';
import { isoWeekNumber, levelHistory, weeklyXp, xpForLevel } from './xp';

const at = (day: string, amount: number) => ({ amount, occurredAt: new Date(`${day}T10:00:00Z`) });

describe('levelHistory', () => {
  it('dates each level reached, several at once when a big gain skips levels', () => {
    expect(
      levelHistory([at('2026-10-02', 200), at('2026-10-01', 40), at('2026-10-03', 15)]).map(
        (item) => [item.level, item.title, item.reachedAt.toISOString().slice(0, 10)]
      )
    ).toEqual([
      [2, 'Rameur', '2026-10-02'],
      [3, 'Vigie', '2026-10-03'],
    ]);
  });
});

describe('xpForLevel', () => {
  it('sums the steps of the previous levels', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 50, 250, 600, 1100]);
  });
});

describe('isoWeekNumber', () => {
  it('follows ISO weeks, including year boundaries', () => {
    expect(isoWeekNumber('2026-10-19')).toBe(43);
    expect(isoWeekNumber('2026-10-25')).toBe(43);
    expect(isoWeekNumber('2027-01-01')).toBe(53);
    expect(isoWeekNumber('2026-01-01')).toBe(1);
  });
});

describe('weeklyXp', () => {
  it('sums XP per Monday-to-Sunday week, ending with this week', () => {
    const dayKey = (date: Date) => date.toISOString().slice(0, 10);
    const weeks = weeklyXp(
      [at('2026-10-21', 15), at('2026-10-19', 60), at('2026-10-18', 40), at('2026-09-01', 200)],
      '2026-10-22',
      3,
      dayKey
    );
    expect(weeks).toEqual([
      { week: 41, start: '2026-10-05', xp: 0 },
      { week: 42, start: '2026-10-12', xp: 40 },
      { week: 43, start: '2026-10-19', xp: 75 },
    ]);
  });
});
