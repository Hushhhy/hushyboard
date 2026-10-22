import { ApiError, GoogleGenAI, type Part } from '@google/genai';
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

// Maps any SDK or network error to a French message for Alex.
export function toAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  const status = error instanceof ApiError ? error.status : undefined;
  const message = error instanceof Error ? error.message : '';
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(message)) {
    return new AiError(/PerDay/.test(message) ? AI_DAILY_QUOTA_MESSAGE : AI_QUOTA_MESSAGE);
  }
  if (status === 503 || /UNAVAILABLE|overloaded|high demand/i.test(message)) {
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
  usage: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined
) {
  await prisma.aiUsage.create({
    data: {
      userId,
      feature,
      model: env.GEMINI_MODEL,
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
  let raw: string | undefined;
  try {
    const response = await withRetry(() =>
      getClient().models.generateContent({
        model: env.GEMINI_MODEL,
        contents: contents(prompt, files),
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: toGeminiSchema(schema),
          temperature: 0.2,
        },
      })
    );
    await logUsage(userId, feature, response.usageMetadata);
    raw = response.text;
  } catch (error) {
    throw toAiError(error);
  }
  return parseJsonAnswer(raw, schema);
}

// Free text (cover letter).
export async function generateText(
  userId: string,
  feature: AiFeature,
  prompt: string
): Promise<string> {
  try {
    const response = await withRetry(() =>
      getClient().models.generateContent({
        model: env.GEMINI_MODEL,
        contents: contents(prompt, []),
        config: { temperature: 0.6 },
      })
    );
    await logUsage(userId, feature, response.usageMetadata);
    const text = response.text?.trim();
    if (!text) throw new AiError(AI_INVALID_MESSAGE);
    return text;
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
