import { describe, expect, it } from 'vitest';
import {
  completedFranchises,
  earnedTrophies,
  financeMonths,
  TROPHIES,
  TROPHY_KEYS,
  type TrophyStats,
} from './trophies';

const NONE: TrophyStats = {
  applications: 0,
  interviews: 0,
  techInterviews: 0,
  offers: 0,
  coursesCompleted: 0,
  certificationsObtained: 0,
  level: 1,
  goalsAchieved: 0,
  gamesFinished: 0,
  franchisesCompleted: 0,
  csvImports: 0,
  trackedMonths: 0,
  sortedMonths: 0,
};

describe('earnedTrophies', () => {
  it('earns nothing at the start', () => {
    expect(earnedTrophies(NONE)).toEqual([]);
  });

  it('earns each threshold once it is reached', () => {
    expect(earnedTrophies({ ...NONE, applications: 10, interviews: 1 })).toEqual([
      'first-application',
      'applications-10',
      'first-interview',
    ]);
    expect(earnedTrophies({ ...NONE, level: 5, csvImports: 1, trackedMonths: 3 })).toEqual([
      'level-5',
      'first-import',
      'months-3',
    ]);
  });

  it('never returns the habit streak trophies (checked when a habit is ticked)', () => {
    const all = Object.fromEntries(Object.keys(NONE).map((key) => [key, 1000])) as TrophyStats;
    expect(earnedTrophies(all)).not.toContain('habit-streak-7');
    expect(earnedTrophies(all)).toHaveLength(TROPHY_KEYS.length - 3);
  });

  it('describes every trophy in French, with a condition and a feat', () => {
    for (const key of TROPHY_KEYS) {
      expect(TROPHIES[key].condition).toMatch(/\.$/);
      expect(TROPHIES[key].feat).toMatch(/\.$/);
    }
  });
});

describe('completedFranchises', () => {
  it('counts franchises of 2+ games, all finished, ignoring case', () => {
    expect(
      completedFranchises([
        { franchise: 'Mass Effect', status: 'FINISHED' },
        { franchise: 'mass effect ', status: 'FINISHED' },
        { franchise: 'Zelda', status: 'FINISHED' },
        { franchise: 'Halo', status: 'FINISHED' },
        { franchise: 'Halo', status: 'PLAYING' },
        { franchise: null, status: 'FINISHED' },
      ])
    ).toBe(1);
  });
});

describe('financeMonths', () => {
  it('counts tracked months and fully sorted months of 10+ lines', () => {
    const day = (date: string, count: number, uncategorized = 0) => ({
      date: new Date(`${date}T00:00:00.000Z`),
      count,
      uncategorized,
    });
    const october = [day('2026-10-01', 6), day('2026-10-15', 4)];
    const september = [day('2026-09-05', 10), day('2026-09-06', 1, 1)];
    const august = [day('2026-08-02', 3)];
    expect(financeMonths([...october, ...september])).toEqual({
      trackedMonths: 2,
      sortedMonths: 1,
    });
    // Fewer than 10 lines: tracked, not counted as sorted.
    expect(financeMonths(august)).toEqual({ trackedMonths: 1, sortedMonths: 0 });
  });
});
