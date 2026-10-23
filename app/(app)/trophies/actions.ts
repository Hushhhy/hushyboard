'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

// Called once the toast has shown these trophies, so they are announced only once.
export async function markTrophiesSeen(ids: string[]): Promise<void> {
  const user = await requireUser();
  const parsed = z.array(z.string().max(40)).max(100).safeParse(ids);
  if (!parsed.success) return;
  await prisma.trophyUnlock.updateMany({
    where: { userId: user.id, id: { in: parsed.data }, seenAt: null },
    data: { seenAt: new Date() },
  });
}
