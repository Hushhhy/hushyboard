import { prisma } from '@/lib/prisma';
import { toDayKey, type DayKey, type HabitRule, type PauseRange } from './habits';

// Reads of the « Habitudes & objectifs » pages. Check-ins are few (one per habit and day),
// so the whole history is read: streak records need it.

export async function getHabitsData(userId: string) {
  const [habits, pauses, archived] = await Promise.all([
    prisma.habit.findMany({
      where: { userId, archivedAt: null },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: { checkIns: { select: { date: true, quantity: true }, orderBy: { date: 'asc' } } },
    }),
    prisma.habitPause.findMany({ where: { userId }, orderBy: { startDate: 'asc' } }),
    prisma.habit.findMany({
      where: { userId, archivedAt: { not: null } },
      orderBy: { archivedAt: 'desc' },
      select: { id: true, name: true },
    }),
  ]);
  return {
    habits: habits.map((habit) => ({
      ...habit,
      rule: habitRule(habit),
      done: new Set<DayKey>(habit.checkIns.map((checkIn) => toDayKey(checkIn.date))),
      quantities: new Map(
        habit.checkIns.map((checkIn) => [toDayKey(checkIn.date), checkIn.quantity])
      ),
    })),
    pauses: pauses as (PauseRange & {
      id: string;
      reason: string | null;
      habitId: string | null;
    })[],
    archived,
  };
}
export type HabitsData = Awaited<ReturnType<typeof getHabitsData>>;

export function habitRule(habit: {
  id: string;
  activeDays: number[];
  timesPerWeek: number | null;
  createdAt: Date;
}): HabitRule {
  return {
    id: habit.id,
    activeDays: habit.activeDays,
    timesPerWeek: habit.timesPerWeek,
    createdAt: habit.createdAt,
  };
}

export async function getGoalsData(userId: string) {
  const [goals, habits] = await Promise.all([
    prisma.goal.findMany({
      where: { userId },
      orderBy: [{ achievedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
      include: {
        steps: { orderBy: { position: 'asc' } },
        habit: { select: { id: true, name: true, unit: true } },
      },
    }),
    prisma.habit.findMany({
      where: { userId, archivedAt: null },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, unit: true },
    }),
  ]);
  // A linked habit fills the goal: sum of its quantities (or its check-ins without a unit)
  // from the goal's creation to its deadline.
  const totals = await Promise.all(
    goals.map(async (goal) => {
      if (!goal.habitId) return null;
      const where = {
        habitId: goal.habitId,
        date: {
          gte: new Date(`${toDayKey(goal.createdAt)}T00:00:00.000Z`),
          ...(goal.deadline ? { lte: goal.deadline } : {}),
        },
      };
      if (goal.habit?.unit) {
        const sum = await prisma.habitCheckIn.aggregate({ where, _sum: { quantity: true } });
        return sum._sum.quantity ?? 0;
      }
      return prisma.habitCheckIn.count({ where });
    })
  );
  return {
    goals: goals.map((goal, index) => ({ ...goal, habitTotal: totals[index] })),
    habits,
  };
}
export type GoalsData = Awaited<ReturnType<typeof getGoalsData>>;
