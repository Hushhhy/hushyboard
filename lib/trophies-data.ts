import { prisma } from '@/lib/prisma';
import {
  completedFranchises,
  earnedTrophies,
  financeMonths,
  TROPHIES,
  type TrophyStats,
} from '@/lib/trophies';
import { getLevelInfo } from '@/lib/xp';

// Counts the trophy conditions are checked against (small queries, run in parallel; the
// transactions are counted per day by the database, never loaded one by one).
export async function getTrophyStats(userId: string): Promise<TrophyStats> {
  const eventCount = (status: 'HR_INTERVIEW' | 'TECH_INTERVIEW' | 'OFFER') =>
    prisma.applicationEvent.count({ where: { status, application: { userId } } });
  const [
    applications,
    hrInterviews,
    techInterviews,
    offers,
    coursesCompleted,
    certificationsObtained,
    xp,
    goalsAchieved,
    games,
    csvImports,
    days,
    uncategorizedDays,
  ] = await Promise.all([
    prisma.application.count({ where: { userId } }),
    eventCount('HR_INTERVIEW'),
    eventCount('TECH_INTERVIEW'),
    eventCount('OFFER'),
    prisma.course.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.certification.count({ where: { userId, status: 'OBTAINED' } }),
    prisma.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.goal.count({ where: { userId, achievedAt: { not: null } } }),
    prisma.game.findMany({
      where: { userId },
      select: { franchise: true, status: true, endless: true },
    }),
    prisma.csvImport.count({ where: { userId } }),
    prisma.transaction.groupBy({ by: ['date'], where: { userId }, _count: { _all: true } }),
    prisma.transaction.groupBy({
      by: ['date'],
      where: { userId, categoryId: null },
      _count: { _all: true },
    }),
  ]);
  const uncategorized = new Map(
    uncategorizedDays.map((day) => [day.date.getTime(), day._count._all])
  );
  return {
    applications,
    interviews: hrInterviews + techInterviews,
    techInterviews,
    offers,
    coursesCompleted,
    certificationsObtained,
    level: getLevelInfo(xp._sum.amount ?? 0).level,
    goalsAchieved,
    gamesFinished: games.filter((game) => game.status === 'FINISHED').length,
    franchisesCompleted: completedFranchises(games),
    csvImports,
    ...financeMonths(
      days.map((day) => ({
        date: day.date,
        count: day._count._all,
        uncategorized: uncategorized.get(day.date.getTime()) ?? 0,
      }))
    ),
  };
}

// Unlocks every trophy whose condition is met (idempotent, never takes one back) and returns
// those the toast has not announced yet. Runs on each page render: it only writes when a new
// trophy is earned.
export async function syncTrophies(userId: string) {
  const [stats, unlocks] = await Promise.all([
    getTrophyStats(userId),
    prisma.trophyUnlock.findMany({
      where: { userId },
      select: { id: true, trophyKey: true, seenAt: true, unlockedAt: true },
    }),
  ]);
  const owned = new Set(unlocks.map((unlock) => unlock.trophyKey));
  const fresh = earnedTrophies(stats).filter((key) => !owned.has(key));
  let all = unlocks;
  if (fresh.length > 0) {
    await prisma.trophyUnlock.createMany({
      data: fresh.map((trophyKey) => ({ userId, trophyKey })),
      skipDuplicates: true,
    });
    all = await prisma.trophyUnlock.findMany({
      where: { userId },
      select: { id: true, trophyKey: true, seenAt: true, unlockedAt: true },
    });
  }
  return all
    .filter((unlock) => !unlock.seenAt && TROPHIES[unlock.trophyKey])
    .sort((a, b) => a.unlockedAt.getTime() - b.unlockedAt.getTime())
    .map((unlock) => ({
      id: unlock.id,
      name: TROPHIES[unlock.trophyKey].name,
      domain: TROPHIES[unlock.trophyKey].domain,
      text: TROPHIES[unlock.trophyKey].feat,
    }));
}
