import { describe, expect, it } from 'vitest';
import { XP_REWARDS } from './xp';
import {
  adjacentItems,
  computeProgress,
  isQuizPassed,
  nextItem,
  QUIZ_PASS_SCORE,
} from './course-progress';

const done = { completedAt: new Date('2026-10-20T10:00:00Z') };
const todo = { completedAt: null };

describe('computeProgress', () => {
  it('counts finished items over all items', () => {
    expect(computeProgress([done, done, todo, todo])).toEqual({ done: 2, total: 4, percent: 50 });
  });

  it('rounds to a whole percent', () => {
    expect(computeProgress([done, todo, todo]).percent).toBe(33);
  });

  it('is 0 % for a course without items', () => {
    expect(computeProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

describe('isQuizPassed', () => {
  it('needs the quiz done with a score of at least 70 %', () => {
    expect(QUIZ_PASS_SCORE).toBe(70);
    expect(isQuizPassed({ ...done, score: 70 })).toBe(true);
    expect(isQuizPassed({ ...done, score: 85 })).toBe(true);
    expect(isQuizPassed({ ...done, score: 69 })).toBe(false);
    expect(isQuizPassed({ ...done, score: null })).toBe(false);
    expect(isQuizPassed({ ...todo, score: 90 })).toBe(false);
  });
});

describe('nextItem', () => {
  it('returns the first unfinished item in plan order', () => {
    const modules = [
      {
        items: [
          { id: 'a', ...done },
          { id: 'b', ...done },
        ],
      },
      {
        items: [
          { id: 'c', ...done },
          { id: 'd', ...todo },
          { id: 'e', ...todo },
        ],
      },
    ];
    expect(nextItem(modules)?.id).toBe('d');
  });

  it('returns null when everything is done', () => {
    expect(nextItem([{ items: [done] }])).toBeNull();
  });
});

describe('XP table', () => {
  it('rewards a passed quiz and a finished solo project', () => {
    expect(XP_REWARDS.QUIZ_PASSED).toBe(10);
    expect(XP_REWARDS.SOLO_PROJECT_COMPLETED).toBe(30);
  });
});

describe('adjacentItems', () => {
  const modules = [{ items: [{ id: 'a' }, { id: 'b' }] }, { items: [] }, { items: [{ id: 'c' }] }];

  it('crosses module boundaries, skipping empty modules', () => {
    expect(adjacentItems(modules, 'b')).toEqual({ previous: { id: 'a' }, next: { id: 'c' } });
  });

  it('has no previous at the start and no next at the end', () => {
    expect(adjacentItems(modules, 'a').previous).toBeNull();
    expect(adjacentItems(modules, 'c').next).toBeNull();
  });

  it('returns nothing for an unknown item', () => {
    expect(adjacentItems(modules, 'z')).toEqual({ previous: null, next: null });
  });
});
