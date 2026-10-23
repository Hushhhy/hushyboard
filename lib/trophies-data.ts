import { prisma } from '@/lib/prisma';
import {
  completedFranchises,
  earnedTrophies,
  financeMonths,
  TROPHIES,
  type TrophyStats,
} from '@/lib/trophies';
import { getLevelInfo } from '@/lib/xp';

// Counts the trophy conditions are checked against (a few small queries, run in parallel).
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
    transactions,
  ] = await Promise.all([
    prisma.application.count({ where: { userId } }),
    eventCount('HR_INTERVIEW'),
    eventCount('TECH_INTERVIEW'),
    eventCount('OFFER'),
    prisma.course.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.certification.count({ where: { userId, status: 'OBTAINED' } }),
    prisma.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.goal.count({ where: { userId, achievedAt: { not: null } } }),
    prisma.game.findMany({ where: { userId }, select: { franchise: true, status: true } }),
    prisma.csvImport.count({ where: { userId } }),
    prisma.transaction.findMany({ where: { userId }, select: { date: true, categoryId: true } }),
  ]);
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
    ...financeMonths(transactions),
  };
}

// Unlocks every trophy whose condition is met (idempotent, never takes one back).
export async function syncTrophies(userId: string): Promise<void> {
  const keys = earnedTrophies(await getTrophyStats(userId));
  if (keys.length === 0) return;
  await prisma.trophyUnlock.createMany({
    data: keys.map((trophyKey) => ({ userId, trophyKey })),
    skipDuplicates: true,
  });
}

// Unlocked trophies the toast has not announced yet.
export async function getUnseenTrophies(userId: string) {
  const unlocks = await prisma.trophyUnlock.findMany({
    where: { userId, seenAt: null },
    orderBy: { unlockedAt: 'asc' },
    select: { id: true, trophyKey: true },
  });
  return unlocks
    .filter((unlock) => TROPHIES[unlock.trophyKey])
    .map((unlock) => ({
      id: unlock.id,
      name: TROPHIES[unlock.trophyKey].name,
      domain: TROPHIES[unlock.trophyKey].domain,
      text: TROPHIES[unlock.trophyKey].feat,
    }));
}
