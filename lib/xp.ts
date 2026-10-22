import type { XpReason } from '@/generated/prisma/client';

// XP earned per action (Career only). Values validated on 16/10/2026.
export const XP_REWARDS: Record<XpReason, number> = {
  APPLICATION_SENT: 15, // only when a resume version is attached ("qualified" application)
  HR_INTERVIEW: 40,
  TECH_INTERVIEW: 60,
  COURSE_COMPLETED: 60,
  CERTIFICATION_OBTAINED: 200,
  OFFER_RECEIVED: 300,
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
