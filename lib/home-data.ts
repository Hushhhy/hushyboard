import { nextInFranchise } from '@/lib/games';
import { prisma } from '@/lib/prisma';
import { isoWeekdayInParis, monthRangeInParis, todayInParis } from '@/lib/dates';

// Transfers to and from savings are neither income nor expenses (same rule as monthSummary).
const NOT_SAVINGS = { NOT: { category: { is: { kind: 'SAVINGS' as const } } } };

// Everything the home page needs, fetched in parallel (Promise.all) to keep it fast.
export async function getHomeData(userId: string, now: Date) {
  const today = todayInParis(now);
  const weekday = isoWeekdayInParis(now);
  const month = monthRangeInParis(now);

  const [
    totalXp,
    monthXp,
    currentCourse,
    habits,
    applicationsByStatus,
    pendingOffer,
    pendingOfferCount,
    income,
    expenses,
    currentGame,
    trophyCount,
  ] = await Promise.all([
    prisma.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.xpEvent.aggregate({
      where: { userId, occurredAt: { gte: month.start, lt: month.end } },
      _sum: { amount: true },
    }),
    prisma.course.findFirst({
      where: { userId, status: 'IN_PROGRESS' },
      orderBy: { updatedAt: 'desc' },
      include: { certification: { select: { name: true, totalCourses: true } } },
    }),
    prisma.habit.findMany({
      where: { userId, archivedAt: null },
      orderBy: { position: 'asc' },
      include: { checkIns: { where: { date: today }, take: 1 } },
    }),
    prisma.application.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
    prisma.jobOffer.findFirst({
      where: { userId, decision: 'PENDING' },
      orderBy: { foundAt: 'desc' },
    }),
    prisma.jobOffer.count({ where: { userId, decision: 'PENDING' } }),
    prisma.transaction.aggregate({
      where: {
        userId,
        date: { gte: month.start, lt: month.end },
        amountCents: { gt: 0 },
        ...NOT_SAVINGS,
      },
      _sum: { amountCents: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        date: { gte: month.start, lt: month.end },
        amountCents: { lt: 0 },
        ...NOT_SAVINGS,
      },
      _sum: { amountCents: true },
    }),
    prisma.game.findFirst({ where: { userId, status: 'PLAYING' }, orderBy: { updatedAt: 'desc' } }),
    prisma.trophyUnlock.count({ where: { userId } }),
  ]);

  // Next game in the same franchise, in story order (same rule as /leisure/games).
  const nextGame = currentGame?.franchise
    ? nextInFranchise(
        await prisma.game.findMany({ where: { userId, franchise: currentGame.franchise } }),
        currentGame
      )
    : null;

  // Only habits scheduled today: weekday habits on weekdays, "X times a week" habits every day.
  const todayHabits = habits
    .filter((habit) => habit.timesPerWeek !== null || habit.activeDays.includes(weekday))
    .map((habit) => ({
      id: habit.id,
      name: habit.name,
      unit: habit.unit,
      isDone: habit.checkIns.length > 0,
    }));

  const countByStatus = Object.fromEntries(
    applicationsByStatus.map((group) => [group.status, group._count._all])
  ) as Partial<Record<string, number>>;
  const count = (...statuses: string[]) =>
    statuses.reduce((sum, status) => sum + (countByStatus[status] ?? 0), 0);

  return {
    totalXp: totalXp._sum.amount ?? 0,
    monthXp: monthXp._sum.amount ?? 0,
    currentCourse,
    todayHabits,
    applications: {
      total: count(
        'SENT',
        'WAITING',
        'HR_INTERVIEW',
        'TECH_INTERVIEW',
        'OFFER',
        'REJECTED',
        'NO_RESPONSE'
      ),
      noResponse: count('SENT', 'WAITING', 'NO_RESPONSE'),
      interviews: count('HR_INTERVIEW', 'TECH_INTERVIEW'),
      rejected: count('REJECTED'),
      offers: count('OFFER'),
    },
    pendingOffer,
    pendingOfferCount,
    finance: {
      incomeCents: income._sum.amountCents ?? 0,
      expensesCents: Math.abs(expenses._sum.amountCents ?? 0),
    },
    currentGame,
    nextGame,
    trophyCount,
  };
}

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
