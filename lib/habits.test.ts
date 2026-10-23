import { describe, expect, it } from 'vitest';
import {
  completion,
  dayStatus,
  describeGoals,
  describeHistory,
  describeSchedule,
  describeToday,
  goalProgress,
  heatmap,
  isoWeekday,
  nextMilestone,
  rate,
  streak,
  streakTrophies,
  weekStart,
  type HabitRule,
  type PauseRange,
} from './habits';

const day = (key: string) => new Date(`${key}T00:00:00.000Z`);
const days = (...keys: string[]) => new Set(keys);
// 2026-10-12 is a Monday, 2026-10-22 a Thursday.
const TODAY = '2026-10-22';

const everyDay: HabitRule = {
  id: 'read',
  activeDays: [1, 2, 3, 4, 5, 6, 7],
  timesPerWeek: null,
  createdAt: day('2026-10-01'),
};
const weekdays: HabitRule = { ...everyDay, id: 'offers', activeDays: [1, 2, 3, 4, 5] };
const threeAWeek: HabitRule = { ...everyDay, id: 'gym', activeDays: [], timesPerWeek: 3 };

describe('calendar helpers', () => {
  it('knows weekdays and Mondays', () => {
    expect(isoWeekday('2026-10-12')).toBe(1);
    expect(isoWeekday('2026-10-18')).toBe(7);
    expect(weekStart('2026-10-22')).toBe('2026-10-19');
  });
});

describe('dayStatus', () => {
  const done = days('2026-10-20');
  it('tells done, missed, rest, paused, today and future apart', () => {
    expect(dayStatus(weekdays, '2026-10-20', done, [], TODAY)).toBe('done');
    expect(dayStatus(weekdays, '2026-10-21', done, [], TODAY)).toBe('missed');
    expect(dayStatus(weekdays, '2026-10-18', done, [], TODAY)).toBe('rest');
    expect(dayStatus(weekdays, TODAY, done, [], TODAY)).toBe('todo');
    expect(dayStatus(weekdays, '2026-10-23', done, [], TODAY)).toBe('future');
    const pause: PauseRange = {
      habitId: null,
      startDate: day('2026-10-21'),
      endDate: day('2026-10-21'),
    };
    expect(dayStatus(weekdays, '2026-10-21', done, [pause], TODAY)).toBe('paused');
  });

  it('never marks a day missed for a "N times a week" habit', () => {
    expect(dayStatus(threeAWeek, '2026-10-21', days(), [], TODAY)).toBe('free');
  });
});

describe('streak', () => {
  it('counts consecutive days, and today not done yet does not break it', () => {
    const done = days('2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21');
    expect(streak(everyDay, done, [], TODAY)).toMatchObject({ current: 4, unit: 'days' });
  });

  it('breaks on a missed day and keeps the record', () => {
    const done = days(
      '2026-10-10',
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-15',
      '2026-10-21'
    );
    expect(streak(everyDay, done, [], TODAY)).toMatchObject({ current: 1, best: 4 });
  });

  it('skips rest days: the week-end does not break a weekday habit', () => {
    const done = days('2026-10-15', '2026-10-16', '2026-10-19', '2026-10-20', '2026-10-21');
    expect(streak(weekdays, done, [], TODAY).current).toBe(5);
  });

  it('freezes during a pause, for one habit or for all', () => {
    const done = days('2026-10-14', '2026-10-15', '2026-10-21');
    const holidays: PauseRange = {
      habitId: null,
      startDate: day('2026-10-16'),
      endDate: day('2026-10-20'),
    };
    expect(streak(everyDay, done, [holidays], TODAY).current).toBe(3);
    const otherHabit: PauseRange = { ...holidays, habitId: 'other' };
    expect(streak(everyDay, done, [otherHabit], TODAY).current).toBe(1);
  });

  it('counts weeks for a "N times a week" habit, the current week only once reached', () => {
    const done = days(
      '2026-10-05',
      '2026-10-07',
      '2026-10-09', // week 41: 3
      '2026-10-12',
      '2026-10-14',
      '2026-10-16', // week 42: 3
      '2026-10-19' // week 43 in progress: 1
    );
    expect(streak(threeAWeek, done, [], TODAY)).toMatchObject({
      current: 2,
      best: 2,
      unit: 'weeks',
    });
    const short = days('2026-10-05', '2026-10-07', '2026-10-12', '2026-10-14', '2026-10-16');
    expect(streak(threeAWeek, short, [], TODAY).current).toBe(1);
  });
});

describe('completion and rate', () => {
  it('counts scheduled days only, pauses excluded, today only once done', () => {
    const done = days('2026-10-19', '2026-10-20');
    const pause: PauseRange = {
      habitId: null,
      startDate: day('2026-10-21'),
      endDate: day('2026-10-21'),
    };
    expect(completion(weekdays, done, [pause], '2026-10-19', TODAY)).toEqual({
      done: 2,
      expected: 2,
    });
    expect(completion(weekdays, done, [], '2026-10-19', TODAY)).toEqual({ done: 2, expected: 3 });
    expect(rate({ done: 2, expected: 3 })).toBe(67);
    expect(rate({ done: 0, expected: 0 })).toBeNull();
  });
});

describe('heatmap', () => {
  it('gives 12 weeks from a Monday, with levels by share of habits done', () => {
    const cells = heatmap(
      [
        { rule: everyDay, done: days('2026-10-21') },
        { rule: weekdays, done: days('2026-10-21', '2026-10-20') },
      ],
      [],
      TODAY
    );
    expect(cells).toHaveLength(84);
    expect(isoWeekday(cells[0].key)).toBe(1);
    expect(cells.find((cell) => cell.key === '2026-10-21')).toMatchObject({
      done: 2,
      expected: 2,
      level: 4,
    });
    expect(cells.find((cell) => cell.key === '2026-10-20')).toMatchObject({
      done: 1,
      expected: 2,
      level: 2,
    });
    expect(cells.find((cell) => cell.key === '2026-09-01')).toMatchObject({ rest: true });
  });
});

describe('milestones and trophies', () => {
  it('points to the next milestone', () => {
    expect(nextMilestone(5)).toEqual({ target: 7, left: 2, progress: 5 / 7 });
    expect(nextMilestone(12)?.target).toBe(14);
    expect(nextMilestone(100)).toBeNull();
  });

  it('unlocks streak trophies at 7, 30 and 100 days', () => {
    expect(streakTrophies(6)).toEqual([]);
    expect(streakTrophies(30)).toEqual(['habit-streak-7', 'habit-streak-30']);
  });
});

describe('goalProgress', () => {
  it('uses steps first, then the linked habit, then the manual value', () => {
    expect(
      goalProgress({
        target: null,
        unit: null,
        manualProgress: 0,
        steps: [{ doneAt: day('2026-10-01') }, { doneAt: null }],
        habitTotal: null,
      })
    ).toMatchObject({ value: 1, target: 2, unit: 'étapes', achieved: false });
    expect(
      goalProgress({ target: 20, unit: 'h', manualProgress: 3, steps: [], habitTotal: 14 })
    ).toMatchObject({ value: 14, ratio: 0.7, achieved: false });
    expect(
      goalProgress({
        target: 10,
        unit: 'tractions',
        manualProgress: 10,
        steps: [],
        habitTotal: null,
      })
    ).toMatchObject({ achieved: true, ratio: 1 });
  });
});

describe('titles', () => {
  it('describes each tab', () => {
    expect(describeToday(2, 4)).toBe('Il reste 2 habitudes aujourd’hui.');
    expect(describeToday(0, 4)).toBe('Toutes les habitudes du jour sont faites.');
    expect(describeToday(0, 0)).toBe('Aucune habitude prévue aujourd’hui.');
    expect(describeHistory(12, 81)).toBe('12 semaines : 81 % des jours prévus faits.');
    expect(describeGoals(3, 1)).toBe('3 objectifs actifs, 1 atteint ce mois-ci.');
    expect(describeSchedule(everyDay)).toBe('Tous les jours');
    expect(describeSchedule(weekdays)).toBe('Lun–ven');
    expect(describeSchedule({ activeDays: [1, 3, 5], timesPerWeek: null })).toBe('Lun, mer, ven');
    expect(describeSchedule(threeAWeek)).toBe('3 fois par semaine');
  });
});
