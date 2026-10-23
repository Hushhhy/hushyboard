'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { disconnectGmail } from '@/app/(app)/mail/actions';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const DELETE_CONFIRMATION = 'SUPPRIMER';

// « Supprimer toutes mes données »: revokes Gmail at Google, signs out, then deletes the user
// row, which deletes every row of every area (all relations cascade). Cannot be undone; the
// next GitHub sign-in starts an empty Hushyboard.
export async function deleteAllData(confirmation: string): Promise<{ error?: string }> {
  const user = await requireUser();
  if (confirmation.trim() !== DELETE_CONFIRMATION) {
    return { error: `Écris ${DELETE_CONFIRMATION} pour confirmer.` };
  }
  await disconnectGmail();
  await auth.api.signOut({ headers: await headers() });
  await prisma.user.delete({ where: { id: user.id } });
  redirect('/login');
}
