import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from '@/lib/prisma';

const allowedGithubId = process.env.ALLOWED_GITHUB_ID;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  user: {
    validateUserInfo: ({ source }) => {
      const githubId = String(source.oauth?.profile?.id ?? '');
      if (
        source.oauth?.providerId !== 'github' ||
        !allowedGithubId ||
        githubId !== allowedGithubId
      ) {
        return { error: 'access_denied', errorDescription: 'Accès réservé.' };
      }
    },
  },
  plugins: [nextCookies()],
});
