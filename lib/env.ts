import { z } from 'zod';

// Every environment variable the server reads, checked once at startup.
// A missing or malformed value stops the app with a clear message instead of failing later.
const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  // Numeric id of the only GitHub account allowed to sign in.
  ALLOWED_GITHUB_ID: z.string().regex(/^\d+$/),
  // Google AI Studio key (free tier). Content sent on the free tier may be used by Google.
  GEMINI_API_KEY: z.string().min(20),
  // A free-tier Flash model, see https://ai.google.dev/gemini-api/docs/models
  GEMINI_MODEL: z.string().min(1).default('gemini-3.8-flash'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Only variable names and reasons are printed, never the values.
    const problems = result.error.issues.map(
      (issue) => `  ${issue.path.join('.')}: ${issue.message}`
    );
    throw new Error(`Invalid environment variables:\n${problems.join('\n')}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
