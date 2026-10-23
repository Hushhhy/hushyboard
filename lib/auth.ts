import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  // The session is also kept 5 min in a signed cookie: the proxy and the pages read it without
  // a database round trip. Signing out clears it; a session revoked from elsewhere stays valid
  // up to those 5 minutes.
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  user: {
    validateUserInfo: ({ source }) => {
      const githubId = String(source.oauth?.profile?.id ?? '');
      if (source.oauth?.providerId !== 'github' || githubId !== env.ALLOWED_GITHUB_ID) {
        return { error: 'access_denied', errorDescription: 'Accès réservé.' };
      }
    },
  },
  plugins: [nextCookies()],
});
