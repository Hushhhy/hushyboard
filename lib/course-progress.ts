import type { CourseItemKind } from '@/generated/prisma/client';

// A quiz earns its XP from this score (percent).
export const QUIZ_PASS_SCORE = 70;

export const COURSE_ITEM_LABELS: Record<CourseItemKind, string> = {
  PART: 'Partie',
  QUIZ: 'Quiz',
  SOLO_PROJECT: 'Solo project',
};

type ProgressItem = { completedAt: Date | null };

export type CourseProgress = { done: number; total: number; percent: number };

// Progress of a course or a module: finished items / all items. Never stored.
export function computeProgress(items: ProgressItem[]): CourseProgress {
  const total = items.length;
  const done = items.filter((item) => item.completedAt !== null).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

// A quiz earns XP only once done with a score of at least 70 %.
export function isQuizPassed(item: { completedAt: Date | null; score: number | null }): boolean {
  return item.completedAt !== null && item.score !== null && item.score >= QUIZ_PASS_SCORE;
}

// Next item to do, in module then item order (for "Reprendre" and the home page).
export function nextItem<T extends ProgressItem>(modules: { items: T[] }[]): T | null {
  for (const courseModule of modules) {
    const item = courseModule.items.find((candidate) => candidate.completedAt === null);
    if (item) return item;
  }
  return null;
}
