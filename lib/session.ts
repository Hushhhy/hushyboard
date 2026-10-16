import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

// Returns the signed-in user, or sends the visitor to /login.
// cache() makes several calls during the same request (layout + page) hit the database only once.
export const requireUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  return session.user;
});
