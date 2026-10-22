import { z } from 'zod';

// Every environment variable the server reads, checked once at startup.
// A missing or malformed value stops the app with a clear message instead of failing later.
// "a, b" → ["a", "b"]
const modelList = (fallback: string) =>
  z
    .string()
    .default(fallback)
    .transform((value) =>
      value
        .split(',')
        .map((model) => model.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string()).min(1, 'Indique au moins un modèle.'));

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
  // Free-tier models, comma-separated, tried in order: each model has its own daily quota.
  // See the rate limits in AI Studio. Main: complex tasks (Flash, about 20 requests a day
  // each). Lite: simple tasks, and the fallback when every main model is out of quota
  // (Flash Lite, about 500 a day each). Reorder or swap them freely.
  GEMINI_MODEL: modelList('gemini-3.8-flash,gemini-3.6-flash'),
  GEMINI_MODEL_LITE: modelList('gemini-3.5-flash-lite,gemini-3.1-flash-lite'),
  // Fine-grained token, read-only (Metadata + Contents), to list and read Alex's repos.
  // Optional: without it, only /career/projects shows how to create one.
  GITHUB_TOKEN: z.string().min(20).optional(),
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
