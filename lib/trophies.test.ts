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
    const october = Array.from({ length: 10 }, (_, index) => ({
      date: new Date(`2026-10-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`),
      categoryId: 'c',
    }));
    const september = [
      ...october.map((line) => ({ ...line, date: new Date('2026-09-05T00:00:00.000Z') })),
      { date: new Date('2026-09-06T00:00:00.000Z'), categoryId: null },
    ];
    expect(financeMonths([...october, ...september])).toEqual({
      trackedMonths: 2,
      sortedMonths: 1,
    });
  });
});
