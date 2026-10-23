import type { XpReason } from '@/generated/prisma/client';

// XP earned per action (Career only). Values validated on 16/10/2026.
export const XP_REWARDS: Record<XpReason, number> = {
  APPLICATION_SENT: 15, // only when a resume version is attached ("qualified" application)
  HR_INTERVIEW: 40,
  TECH_INTERVIEW: 60,
  COURSE_COMPLETED: 60,
  CERTIFICATION_OBTAINED: 200,
  OFFER_RECEIVED: 300,
  QUIZ_PASSED: 10, // only when the score is at least QUIZ_PASS_SCORE (validated on 22/10/2026)
  SOLO_PROJECT_COMPLETED: 30,
};

// Daily cap, applied to applications only (5 qualified applications per day).
export const DAILY_APPLICATION_XP_CAP = 75;

// XP granted for one more application, given the application XP already earned today (Paris day).
// Once the cap is reached the application still counts, it just earns 0 XP.
export function applicationXpAllowance(earnedToday: number): number {
  const left = Math.max(0, DAILY_APPLICATION_XP_CAP - earnedToday);
  return Math.min(XP_REWARDS.APPLICATION_SENT, left);
}

// Level titles: the road of the Argonauts. Displayed text, so in French.
export const LEVEL_TITLES = [
  'Mousse',
  'Rameur',
  'Vigie',
  'Timonier',
  'Argonaute',
  'Héros',
  'Demi-dieu',
  'Olympien',
] as const;

// Progressive curve: each level needs 150 XP more than the previous one.
// Level 1 → 2: 50 XP, 2 → 3: 200, 3 → 4: 350, 4 → 5: 500, 5 → 6: 650…
const FIRST_STEP = 50;
const STEP_INCREASE = 150;

export function xpToNextLevel(level: number): number {
  return FIRST_STEP + STEP_INCREASE * (level - 1);
}

export type LevelInfo = {
  level: number;
  title: string;
  xpIntoLevel: number; // XP earned since the start of the current level
  xpForLevel: number; // XP needed to go from this level to the next
};

// Turns a total XP amount into a level, e.g. 790 XP → level 4 "Timonier", 190 / 500.
export function getLevelInfo(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, totalXp);
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level);
    level += 1;
  }
  const title = LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1];
  return { level, title, xpIntoLevel: remaining, xpForLevel: xpToNextLevel(level) };
}

export type LevelUp = { level: number; title: string; nextTitle: string | null; xpToNext: number };

// The level reached when the total goes from `before` to `after`, or null if the level did not change.
export function detectLevelUp(before: number, after: number): LevelUp | null {
  const previous = getLevelInfo(before);
  const next = getLevelInfo(after);
  if (next.level <= previous.level) return null;
  return {
    level: next.level,
    title: next.title,
    nextTitle: LEVEL_TITLES[next.level] ?? null,
    xpToNext: next.xpForLevel - next.xpIntoLevel,
  };
}

export type XpEntry = { amount: number; occurredAt: Date };

// The day each level was reached, from the XP journal (oldest first). Level 1 is the start.
export function levelHistory(
  events: XpEntry[]
): { level: number; title: string; reachedAt: Date }[] {
  const sorted = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const reached: { level: number; title: string; reachedAt: Date }[] = [];
  let total = 0;
  for (const event of sorted) {
    const before = getLevelInfo(total).level;
    total += event.amount;
    const after = getLevelInfo(total);
    for (let level = before + 1; level <= after.level; level += 1) {
      reached.push({
        level,
        title: LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1],
        reachedAt: event.occurredAt,
      });
    }
  }
  return reached;
}

// Total XP needed to reach a level: level 1 = 0, level 2 = 50, level 3 = 250…
export function xpForLevel(level: number): number {
  let total = 0;
  for (let current = 1; current < level; current += 1) total += xpToNextLevel(current);
  return total;
}

// ISO week number of a "YYYY-MM-DD" day (S42…).
export function isoWeekNumber(dayKey: string): number {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  const weekday = date.getUTCDay() || 7;
  // The Thursday of the same week decides the year of the week.
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

// XP earned per week (Monday to Sunday, Paris days), oldest first, ending with this week.
export function weeklyXp(
  events: XpEntry[],
  todayKey: string,
  weeks: number,
  dayKeyOf: (date: Date) => string
): { week: number; start: string; xp: number }[] {
  const shift = (key: string, days: number) => {
    const date = new Date(`${key}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const monday = shift(todayKey, 1 - (today.getUTCDay() || 7));
  const result = Array.from({ length: weeks }, (_, index) => {
    const start = shift(monday, -7 * (weeks - 1 - index));
    return { week: isoWeekNumber(start), start, xp: 0 };
  });
  for (const event of events) {
    const day = dayKeyOf(event.occurredAt);
    for (let index = result.length - 1; index >= 0; index -= 1) {
      if (day >= result[index].start) {
        if (index < result.length - 1 || day <= shift(monday, 6)) result[index].xp += event.amount;
        break;
      }
    }
  }
  return result;
}
