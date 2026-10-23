// Habits: schedules, streaks, rates, heatmap, milestones, goal progress. Pure, unit-tested.
// Days are "YYYY-MM-DD" keys of the Paris calendar (check-ins are stored as @db.Date).
// Nothing here is stored: streaks and rates are always computed from check-ins and pauses.

export type DayKey = string;

export type HabitRule = {
  id: string;
  // ISO weekdays, 1 = Monday … 7 = Sunday.
  activeDays: number[];
  // "N times a week": any day counts, the week succeeds at N check-ins.
  timesPerWeek: number | null;
  createdAt: Date;
};

export type PauseRange = { habitId: string | null; startDate: Date; endDate: Date };

export type DayStatus = 'done' | 'missed' | 'rest' | 'paused' | 'todo' | 'free' | 'future';

export const toDayKey = (date: Date): DayKey => date.toISOString().slice(0, 10);

export function shiftDay(key: DayKey, days: number): DayKey {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toDayKey(date);
}

export function isoWeekday(key: DayKey): number {
  return new Date(`${key}T00:00:00.000Z`).getUTCDay() || 7;
}

// Monday of the week of a day.
export const weekStart = (key: DayKey): DayKey => shiftDay(key, 1 - isoWeekday(key));

export function isPaused(habitId: string, key: DayKey, pauses: PauseRange[]): boolean {
  return pauses.some(
    (pause) =>
      (pause.habitId === null || pause.habitId === habitId) &&
      toDayKey(pause.startDate) <= key &&
      key <= toDayKey(pause.endDate)
  );
}

const isWeekly = (habit: HabitRule) => habit.timesPerWeek !== null;

// Scheduled = expected that day (weekday habits). "N times a week" habits can be done any day.
export function isScheduled(habit: HabitRule, key: DayKey): boolean {
  return isWeekly(habit) || habit.activeDays.includes(isoWeekday(key));
}

export function dayStatus(
  habit: HabitRule,
  key: DayKey,
  done: Set<DayKey>,
  pauses: PauseRange[],
  today: DayKey
): DayStatus {
  if (key > today) return 'future';
  if (done.has(key)) return 'done';
  if (isPaused(habit.id, key, pauses)) return 'paused';
  if (key < toDayKey(habit.createdAt)) return 'rest';
  if (isWeekly(habit)) return key === today ? 'todo' : 'free';
  if (!habit.activeDays.includes(isoWeekday(key))) return 'rest';
  return key === today ? 'todo' : 'missed';
}

export type Streak = { current: number; best: number; unit: 'days' | 'weeks' };

// Weekday habits: consecutive scheduled days done. Rest days and pauses neither count nor
// break; today not done yet does not break either.
function dailyStreak(habit: HabitRule, done: Set<DayKey>, pauses: PauseRange[], today: DayKey) {
  const first = [toDayKey(habit.createdAt), ...[...done].sort()].sort()[0];
  let best = 0;
  let run = 0;
  for (let key = first; key <= today; key = shiftDay(key, 1)) {
    const status = dayStatus(habit, key, done, pauses, today);
    if (status === 'done') run += 1;
    else if (status === 'missed') run = 0;
    best = Math.max(best, run);
  }
  return { current: run, best };
}

// "N times a week": consecutive weeks with N check-ins (fewer when the week is partly paused).
// The current week counts once reached, and does not break while in progress.
function weeklyStreak(habit: HabitRule, done: Set<DayKey>, pauses: PauseRange[], today: DayKey) {
  const first = weekStart([toDayKey(habit.createdAt), ...[...done].sort()].sort()[0]);
  const thisWeek = weekStart(today);
  let best = 0;
  let run = 0;
  for (let week = first; week <= thisWeek; week = shiftDay(week, 7)) {
    const days = Array.from({ length: 7 }, (_, index) => shiftDay(week, index));
    const open = days.filter((key) => !isPaused(habit.id, key, pauses)).length;
    const target = Math.min(habit.timesPerWeek ?? 1, open);
    const count = days.filter((key) => done.has(key)).length;
    if (target === 0) continue;
    if (count >= target) run += 1;
    else if (week !== thisWeek) run = 0;
    best = Math.max(best, run);
  }
  return { current: run, best };
}

export function streak(
  habit: HabitRule,
  done: Set<DayKey>,
  pauses: PauseRange[],
  today: DayKey
): Streak {
  return isWeekly(habit)
    ? { ...weeklyStreak(habit, done, pauses, today), unit: 'weeks' }
    : { ...dailyStreak(habit, done, pauses, today), unit: 'days' };
}

// Streak in days, for milestones and trophies (a week of a weekly habit = 7 days).
export const streakDays = (value: Streak) =>
  value.unit === 'weeks' ? value.current * 7 : value.current;

// "5 j", "6 sem."
export function formatStreak(value: number, unit: Streak['unit']): string {
  return unit === 'weeks' ? `${value} sem.` : `${value} j`;
}

// Done / expected between two days (included), pauses and rest days excluded. Today counts
// only once done, so the rate does not drop in the morning.
export function completion(
  habit: HabitRule,
  done: Set<DayKey>,
  pauses: PauseRange[],
  from: DayKey,
  today: DayKey
): { done: number; expected: number } {
  const start = [from, toDayKey(habit.createdAt)].sort()[1];
  let doneCount = 0;
  let expected = 0;
  if (isWeekly(habit)) {
    for (let week = weekStart(start); week <= today; week = shiftDay(week, 7)) {
      const days = Array.from({ length: 7 }, (_, index) => shiftDay(week, index)).filter(
        (key) => key >= start && key <= today
      );
      const open = days.filter((key) => !isPaused(habit.id, key, pauses));
      const count = days.filter((key) => done.has(key)).length;
      // Expected in proportion to the days of the week elapsed.
      const target = Math.min(
        open.length,
        Math.ceil(((habit.timesPerWeek ?? 1) * open.length) / 7)
      );
      expected += target;
      doneCount += Math.min(count, target);
    }
    return { done: doneCount, expected };
  }
  for (let key = start; key <= today; key = shiftDay(key, 1)) {
    const status = dayStatus(habit, key, done, pauses, today);
    if (status === 'done' && isScheduled(habit, key)) {
      doneCount += 1;
      expected += 1;
    } else if (status === 'missed') expected += 1;
  }
  return { done: doneCount, expected };
}

export function rate({ done, expected }: { done: number; expected: number }): number | null {
  return expected === 0 ? null : Math.round((done / expected) * 100);
}

export type HeatCell = {
  key: DayKey;
  level: 0 | 1 | 2 | 3 | 4;
  done: number;
  expected: number;
  rest: boolean;
};

// The last `weeks` weeks, Monday first: per day, the share of the scheduled habits done.
// A "N times a week" habit only adds to a day when it was done that day.
export function heatmap(
  habits: { rule: HabitRule; done: Set<DayKey> }[],
  pauses: PauseRange[],
  today: DayKey,
  weeks = 12
): HeatCell[] {
  const start = shiftDay(weekStart(today), -7 * (weeks - 1));
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const key = shiftDay(start, index);
    let done = 0;
    let expected = 0;
    for (const { rule, done: days } of habits) {
      const status = dayStatus(rule, key, days, pauses, today);
      if (status === 'done') {
        done += 1;
        expected += 1;
      } else if (status === 'missed') expected += 1;
    }
    const share = expected === 0 ? 0 : done / expected;
    const level = (done === 0 ? 0 : Math.max(1, Math.ceil(share * 4))) as HeatCell['level'];
    return { key, level, done, expected, rest: expected === 0 && key <= today };
  });
}

// Streak milestones (days). Trophies are unlocked at 7, 30 and 100.
export const MILESTONES = [7, 14, 30, 100];
export const TROPHY_MILESTONES = [7, 30, 100];

export function nextMilestone(
  days: number
): { target: number; left: number; progress: number } | null {
  const target = MILESTONES.find((milestone) => milestone > days);
  if (!target) return null;
  return { target, left: target - days, progress: days / target };
}

// Trophy keys reached by a streak, e.g. ["habit-streak-7"].
export function streakTrophies(days: number): string[] {
  return TROPHY_MILESTONES.filter((milestone) => days >= milestone).map(
    (milestone) => `habit-streak-${milestone}`
  );
}

// --- Goals -----------------------------------------------------------------------------

export type GoalInput = {
  target: number | null;
  unit: string | null;
  manualProgress: number;
  steps: { doneAt: Date | null }[];
  // Sum of the linked habit's quantities (or its check-ins without a unit), when linked.
  habitTotal: number | null;
};

// Steps win; else the linked habit; else the manual value.
export function goalProgress(goal: GoalInput): {
  value: number;
  target: number;
  unit: string;
  ratio: number;
  achieved: boolean;
} {
  if (goal.steps.length > 0) {
    const value = goal.steps.filter((step) => step.doneAt).length;
    const target = goal.steps.length;
    return { value, target, unit: 'étapes', ratio: value / target, achieved: value >= target };
  }
  const target = goal.target ?? 0;
  const value = goal.habitTotal ?? goal.manualProgress;
  return {
    value,
    target,
    unit: goal.unit ?? '',
    ratio: target > 0 ? Math.min(1, value / target) : 0,
    achieved: target > 0 && value >= target,
  };
}

// --- Page titles -----------------------------------------------------------------------

export function describeToday(left: number, scheduled: number): string {
  if (scheduled === 0) return 'Aucune habitude prévue aujourd’hui.';
  if (left === 0) return 'Toutes les habitudes du jour sont faites.';
  return left === 1
    ? 'Il reste 1 habitude aujourd’hui.'
    : `Il reste ${left} habitudes aujourd’hui.`;
}

export function describeHistory(weeks: number, rateValue: number | null): string {
  if (rateValue === null) return `${weeks} semaines : rien de prévu pour l’instant.`;
  return `${weeks} semaines : ${rateValue} % des jours prévus faits.`;
}

export function describeGoals(active: number, achievedThisMonth: number): string {
  if (active === 0 && achievedThisMonth === 0) return 'Aucun objectif pour l’instant.';
  const head = `${active} objectif${active > 1 ? 's' : ''} actif${active > 1 ? 's' : ''}`;
  if (achievedThisMonth === 0) return `${head}.`;
  return `${head}, ${achievedThisMonth} atteint${achievedThisMonth > 1 ? 's' : ''} ce mois-ci.`;
}

// "Tous les jours", "Lun–ven", "Lun, mer, ven", "3 fois par semaine".
const DAY_NAMES = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
export function describeSchedule(habit: Pick<HabitRule, 'activeDays' | 'timesPerWeek'>): string {
  if (habit.timesPerWeek !== null) {
    return `${habit.timesPerWeek} fois par semaine`;
  }
  const days = [...new Set(habit.activeDays)].sort((a, b) => a - b);
  if (days.length === 7) return 'Tous les jours';
  if (days.join() === '1,2,3,4,5') return 'Lun–ven';
  if (days.join() === '6,7') return 'Le week-end';
  const text = days.map((day) => DAY_NAMES[day - 1]).join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
