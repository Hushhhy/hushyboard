import { timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { gmail } from '@googleapis/gmail';
import { encryptToken } from '@/lib/crypto';
import { env } from '@/lib/env';
import { GMAIL_SCOPE, gmailConfig, oauthClient } from '@/lib/gmail/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const STATE_COOKIE = 'gmail_oauth_state';

const back = (error?: string) =>
  NextResponse.redirect(new URL(error ? `/mail?error=${error}` : '/mail', env.BETTER_AUTH_URL));

function sameState(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// GET /api/gmail/callback: checks the state, exchanges the code, stores the refresh token
// encrypted, then goes back to /mail. Errors come back as ?error=… (shown as a banner).
export async function GET(request: NextRequest) {
  const user = await requireUser();
  const config = gmailConfig();
  if (!config) return back('config');

  const store = await cookies();
  const expected = store.get(STATE_COOKIE)?.value ?? '';
  store.delete({ name: STATE_COOKIE, path: '/api/gmail/callback' });
  const params = request.nextUrl.searchParams;
  if (params.get('error')) return back('denied');
  const code = params.get('code');
  if (!code || !expected || !sameState(params.get('state') ?? '', expected)) return back('state');

  try {
    const client = oauthClient(config);
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) return back('refresh');
    if (!(tokens.scope ?? '').split(' ').includes(GMAIL_SCOPE)) return back('scope');
    client.setCredentials(tokens);
    const { data } = await gmail({ version: 'v1', auth: client }).users.getProfile({
      userId: 'me',
    });
    const encrypted = encryptToken(tokens.refresh_token, config.encryptionKey);
    await prisma.gmailConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        email: data.emailAddress ?? '',
        encryptedRefreshToken: encrypted,
        scope: GMAIL_SCOPE,
      },
      update: {
        email: data.emailAddress ?? '',
        encryptedRefreshToken: encrypted,
        scope: GMAIL_SCOPE,
        connectedAt: new Date(),
        lastErrorAt: null,
      },
    });
  } catch {
    return back('exchange');
  }
  return back();
}
