import type { XpReason } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { toDateInputValue } from '@/lib/dates';
import { applicationXpAllowance, detectLevelUp, XP_REWARDS, type LevelUp } from '@/lib/xp';

async function totalXp(userId: string): Promise<number> {
  const result = await prisma.xpEvent.aggregate({ where: { userId }, _sum: { amount: true } });
  return result._sum.amount ?? 0;
}

// Grants the XP of one action, once: XpEvent is unique on (reason, sourceId), so granting
// again (double click, re-completing a course) does nothing. Returns the level-up, if any.
export async function grantXp(
  userId: string,
  reason: XpReason,
  sourceId: string,
  label: string
): Promise<LevelUp | null> {
  const before = await totalXp(userId);
  const result = await prisma.xpEvent.createMany({
    data: [{ userId, reason, sourceId, label, amount: XP_REWARDS[reason] }],
    skipDuplicates: true,
  });
  if (result.count === 0) return null;
  return detectLevelUp(before, before + XP_REWARDS[reason]);
}

// Undoing an action removes its XP (e.g. a course marked completed by mistake).
export async function revokeXp(userId: string, reason: XpReason, sourceId: string) {
  await prisma.xpEvent.deleteMany({ where: { userId, reason, sourceId } });
}

// APPLICATION_SENT, within the daily cap (75 XP a Paris day): the 6th application of the
// day still counts, it just earns nothing. Only call it when a resume is attached.
export async function grantApplicationXp(
  userId: string,
  applicationId: string,
  label: string,
  now = new Date()
): Promise<LevelUp | null> {
  const recent = await prisma.xpEvent.findMany({
    where: {
      userId,
      reason: 'APPLICATION_SENT',
      occurredAt: { gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
    },
    select: { amount: true, occurredAt: true },
  });
  const today = toDateInputValue(now);
  const earnedToday = recent
    .filter((event) => toDateInputValue(event.occurredAt) === today)
    .reduce((sum, event) => sum + event.amount, 0);
  const amount = applicationXpAllowance(earnedToday);
  if (amount === 0) return null;

  const before = await totalXp(userId);
  const result = await prisma.xpEvent.createMany({
    data: [{ userId, reason: 'APPLICATION_SENT', sourceId: applicationId, label, amount }],
    skipDuplicates: true,
  });
  if (result.count === 0) return null;
  return detectLevelUp(before, before + amount);
}
