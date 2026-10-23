import { gmail, type gmail_v1 } from '@googleapis/gmail';
import { OAuth2Client } from 'google-auth-library';
import { decryptToken } from '@/lib/crypto';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

// Gmail access for one user, from the encrypted refresh token of GmailConnection.
// Server only. Mail content goes through memory only: never stored, never logged.

export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

export type GmailConfig = { clientId: string; clientSecret: string; encryptionKey: string };

// Null until Alex adds the three variables (see docs/claude-code/06-alex-actions.md).
export function gmailConfig(): GmailConfig | null {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, TOKEN_ENCRYPTION_KEY } = env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !TOKEN_ENCRYPTION_KEY) return null;
  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    encryptionKey: TOKEN_ENCRYPTION_KEY,
  };
}

export function gmailRedirectUri(): string {
  return new URL('/api/gmail/callback', env.BETTER_AUTH_URL).toString();
}

export function oauthClient(config: GmailConfig): OAuth2Client {
  return new OAuth2Client({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: gmailRedirectUri(),
  });
}

// Google refused the refresh token (expired after 7 days in Testing mode, or revoked).
export class GmailExpiredError extends Error {
  constructor() {
    super('Gmail connection expired');
    this.name = 'GmailExpiredError';
  }
}

export function isAuthError(error: unknown): boolean {
  const data = (error as { response?: { data?: { error?: string } }; status?: number }) ?? {};
  const message = error instanceof Error ? error.message : '';
  return (
    data.response?.data?.error === 'invalid_grant' ||
    data.status === 401 ||
    /invalid_grant|invalid_token|unauthorized_client/i.test(message)
  );
}

export type GmailSession = { gmail: gmail_v1.Gmail; email: string };

// The Gmail API for this user, or null when Gmail is not configured or not connected.
export async function getGmail(userId: string): Promise<GmailSession | null> {
  const config = gmailConfig();
  if (!config) return null;
  const connection = await prisma.gmailConnection.findUnique({ where: { userId } });
  if (!connection) return null;
  const client = oauthClient(config);
  client.setCredentials({
    refresh_token: decryptToken(connection.encryptedRefreshToken, config.encryptionKey),
  });
  return { gmail: gmail({ version: 'v1', auth: client }), email: connection.email };
}

// Runs Gmail calls; an auth failure marks the connection expired (« Reconnecter ») and throws
// GmailExpiredError, a success clears a previous error.
export async function withGmail<T>(
  userId: string,
  run: (session: GmailSession) => Promise<T>
): Promise<T> {
  const session = await getGmail(userId);
  if (!session) throw new GmailExpiredError();
  try {
    const result = await run(session);
    await prisma.gmailConnection.updateMany({
      where: { userId, lastErrorAt: { not: null } },
      data: { lastErrorAt: null },
    });
    return result;
  } catch (error) {
    if (isAuthError(error)) {
      await prisma.gmailConnection.updateMany({
        where: { userId },
        data: { lastErrorAt: new Date() },
      });
      throw new GmailExpiredError();
    }
    throw error;
  }
}

// Runs async work with at most `limit` calls at a time (Gmail rate limits).
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  run: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
