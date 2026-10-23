import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { GMAIL_SCOPE, gmailConfig, oauthClient } from '@/lib/gmail/client';
import { requireUser } from '@/lib/session';

const STATE_COOKIE = 'gmail_oauth_state';

// GET /api/gmail/connect: sends Alex to Google's consent screen (offline access, so a refresh
// token comes back). The random state, kept in an httpOnly cookie, is checked by the callback.
export async function GET() {
  await requireUser();
  const config = gmailConfig();
  if (!config) return NextResponse.redirect(new URL('/mail', env.BETTER_AUTH_URL));

  const state = randomBytes(24).toString('base64url');
  (await cookies()).set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/gmail/callback',
    maxAge: 600,
  });
  const url = oauthClient(config).generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GMAIL_SCOPE],
    state,
  });
  return NextResponse.redirect(url);
}
