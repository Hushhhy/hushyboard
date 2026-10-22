import { ApiError, GoogleGenAI, type GenerateContentResponse, type Part } from '@google/genai';
import type { z } from 'zod';
import { env } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { toGeminiSchema } from './json-schema';

// Single entry point to Gemini (free tier). Every call logs an AiUsage row (metadata only).
// Callers must call requireUser() first and pass the user id.
// Never send finance data, habits, or mails that do not match an application.

export type AiFeature =
  | 'offer-extract'
  | 'cv-import'
  | 'cv-analysis'
  | 'cv-adapt'
  | 'cover-letter'
  | 'mail-classify'
  | 'skill-roadmap'
  | 'notion-sheet'
  | 'reference-list'
  | 'reference-entry';

// Two free-tier models. "main" (GEMINI_MODEL) for reasoning and writing that Alex rereads;
// "lite" (GEMINI_MODEL_LITE) for extraction, classification and short descriptions.
export type ModelTier = 'main' | 'lite';

export const FEATURE_TIERS: Record<AiFeature, ModelTier> = {
  'cv-import': 'main',
  'cv-analysis': 'main',
  'cv-adapt': 'main',
  'cover-letter': 'main',
  'skill-roadmap': 'main',
  'notion-sheet': 'main',
  // Created once and defines the whole list.
  'reference-list': 'main',
  'reference-entry': 'lite',
  'offer-extract': 'lite',
  'mail-classify': 'lite',
};

// Models to try, in order (each has its own daily quota): a main task goes through the main
// models, then the lite ones; a lite task uses only the lite models (their quota is large).
export function modelChain(
  feature: AiFeature,
  models: { main: string[]; lite: string[] } = {
    main: env.GEMINI_MODEL,
    lite: env.GEMINI_MODEL_LITE,
  }
): string[] {
  const chain = FEATURE_TIERS[feature] === 'lite' ? models.lite : [...models.main, ...models.lite];
  return [...new Set(chain)];
}

// French message shown persistently (never as a toast).
export class AiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiError';
  }
}

export const AI_QUOTA_MESSAGE = 'Limite gratuite de l’IA atteinte. Réessaie dans une minute.';
// The free tier also caps requests per day and per model; it resets at midnight Pacific time.
export const AI_DAILY_QUOTA_MESSAGE =
  'Limite gratuite du jour atteinte pour l’IA. Elle revient demain matin.';
export const AI_BUSY_MESSAGE =
  'L’IA est surchargée pour le moment. Réessaie dans quelques minutes.';
export const AI_FAILURE_MESSAGE =
  'L’IA n’a pas pu répondre. Réessaie, ou remplis les champs à la main.';
export const AI_INVALID_MESSAGE =
  'La réponse de l’IA était incomplète. Réessaie, ou remplis les champs à la main.';

export function isQuotaError(error: unknown): boolean {
  const status = error instanceof ApiError ? error.status : undefined;
  const message = error instanceof Error ? error.message : '';
  return status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(message);
}

// A model over its quota sometimes hangs instead of answering 429: each attempt gets a time
// limit, so a slow model gives way to the next one well within the 60 s of a Vercel function.
export const ATTEMPT_TIMEOUT_MS = 20_000;

export function isTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === 'TimeoutError' ||
      error.name === 'AbortError' ||
      /aborted|timed? ?out/i.test(error.message))
  );
}

// Maps any SDK or network error to a French message for Alex.
export function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  const status = error instanceof ApiError ? error.status : undefined;
  const message = error instanceof Error ? error.message : '';
  if (isQuotaError(error)) {
    return new AiError(/PerDay/.test(message) ? AI_DAILY_QUOTA_MESSAGE : AI_QUOTA_MESSAGE);
  }
  if (status === 503 || isTimeout(error) || /UNAVAILABLE|overloaded|high demand/i.test(message)) {
    return new AiError(AI_BUSY_MESSAGE);
  }
  return new AiError(AI_FAILURE_MESSAGE);
}

// Free-tier models are often briefly overloaded (503): retry once. Failed attempts count
// against the daily quota, so no more. Quota errors (429) are never retried.
export function isRetryable(error: unknown): boolean {
  const status = error instanceof ApiError ? error.status : undefined;
  return status === 500 || status === 503;
}

const RETRY_DELAYS_MS = [3000];

export async function withRetry<T>(
  call: () => Promise<T>,
  delays: number[] = RETRY_DELAYS_MS
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      if (attempt >= delays.length || !isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

// Models that just ran out of quota or hung are skipped for a while (per server instance),
// so the next requests go straight to a model that answers.
const SKIP_MS = 10 * 60 * 1000;
const skippedUntil = new Map<string, number>();

// Whole chain budget: a Vercel function stops at 60 s.
const CHAIN_DEADLINE_MS = 50_000;

// Tries each model of the chain; moves to the next one when a model is out of quota or too slow.
export async function withFallback<T>(
  models: string[],
  call: (model: string) => Promise<T>,
  now: () => number = Date.now
): Promise<{ result: T; model: string }> {
  const start = now();
  const available = models.filter((model) => (skippedUntil.get(model) ?? 0) <= start);
  // Every model skipped: try them all again rather than fail without a call.
  const chain = available.length > 0 ? available : models;
  for (let index = 0; ; index += 1) {
    const model = chain[index];
    try {
      return { result: await withRetry(() => call(model)), model };
    } catch (error) {
      const moveOn = isQuotaError(error) || isTimeout(error);
      if (moveOn) skippedUntil.set(model, now() + SKIP_MS);
      const last = index >= chain.length - 1;
      const outOfTime = now() - start > CHAIN_DEADLINE_MS - ATTEMPT_TIMEOUT_MS;
      // Server log only (model and reason, never content), to follow the free quotas.
      console.warn(
        `[gemini] ${model} failed (${isTimeout(error) ? 'timeout' : isQuotaError(error) ? 'quota' : 'error'})${moveOn && !last && !outOfTime ? ', trying the next model' : ''}`
      );
      if (!moveOn || last || outOfTime) throw error;
    }
  }
}

// Tests only: forget the skipped models.
export function resetSkippedModels() {
  skippedUntil.clear();
}

// A file sent inline (base64), e.g. the CV PDF. Never stored.
export type InlineFile = { mimeType: string; data: Buffer };

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

async function logUsage(
  userId: string,
  feature: AiFeature,
  model: string,
  usage: GenerateContentResponse['usageMetadata']
) {
  await prisma.aiUsage.create({
    data: {
      userId,
      feature,
      model,
      inputTokens: usage?.promptTokenCount ?? null,
      outputTokens: usage?.candidatesTokenCount ?? null,
    },
  });
}

function contents(prompt: string, files: InlineFile[]): Part[] {
  return [
    ...files.map((file) => ({
      inlineData: { mimeType: file.mimeType, data: file.data.toString('base64') },
    })),
    { text: prompt },
  ];
}

// Structured output: Gemini answers in JSON following the Zod schema, then the answer is validated.
export async function generateJson<T>(
  userId: string,
  feature: AiFeature,
  prompt: string,
  schema: z.ZodType<T>,
  files: InlineFile[] = []
): Promise<T> {
  return (await generateJsonWithModel(userId, feature, prompt, schema, files)).data;
}

// Same, plus the model that answered (shown under generated content).
export async function generateJsonWithModel<T>(
  userId: string,
  feature: AiFeature,
  prompt: string,
  schema: z.ZodType<T>,
  files: InlineFile[] = []
): Promise<{ data: T; model: string }> {
  let raw: string | undefined;
  let usedModel: string;
  try {
    const { result: response, model } = await withFallback(modelChain(feature), (model) =>
      getClient().models.generateContent({
        model,
        contents: contents(prompt, files),
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: toGeminiSchema(schema),
          temperature: 0.2,
          abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        },
      })
    );
    await logUsage(userId, feature, model, response.usageMetadata);
    raw = response.text;
    usedModel = model;
  } catch (error) {
    throw toAiError(error);
  }
  return { data: parseJsonAnswer(raw, schema), model: usedModel };
}

// Free text (cover letter).
export async function generateText(
  userId: string,
  feature: AiFeature,
  prompt: string
): Promise<string> {
  return (await generateTextWithModel(userId, feature, prompt)).text;
}

export async function generateTextWithModel(
  userId: string,
  feature: AiFeature,
  prompt: string
): Promise<{ text: string; model: string }> {
  try {
    const { result: response, model } = await withFallback(modelChain(feature), (model) =>
      getClient().models.generateContent({
        model,
        contents: contents(prompt, []),
        config: { temperature: 0.6, abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) },
      })
    );
    await logUsage(userId, feature, model, response.usageMetadata);
    const text = response.text?.trim();
    if (!text) throw new AiError(AI_INVALID_MESSAGE);
    return { text, model };
  } catch (error) {
    throw toAiError(error);
  }
}

// Exported for tests: parses and validates a JSON answer.
export function parseJsonAnswer<T>(raw: string | undefined, schema: z.ZodType<T>): T {
  if (!raw) throw new AiError(AI_INVALID_MESSAGE);
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new AiError(AI_INVALID_MESSAGE);
  }
  const result = schema.safeParse(data);
  if (!result.success) throw new AiError(AI_INVALID_MESSAGE);
  return result.data;
}
