import type { XpReason } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { detectLevelUp, XP_REWARDS, type LevelUp } from '@/lib/xp';

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
