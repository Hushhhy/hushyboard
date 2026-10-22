import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@google/genai';
import { z } from 'zod';
import { resumeContentSchema, EMPTY_RESUME } from '@/lib/resume/schema';
import {
  AI_BUSY_MESSAGE,
  AI_DAILY_QUOTA_MESSAGE,
  AI_FAILURE_MESSAGE,
  AI_INVALID_MESSAGE,
  AI_QUOTA_MESSAGE,
  AiError,
  FEATURE_TIERS,
  isTimeout,
  modelChain,
  parseJsonAnswer,
  resetSkippedModels,
  toAiError,
  withFallback,
  withRetry,
} from './gemini';

describe('toAiError', () => {
  it('maps a 429 to the persistent quota message', () => {
    const error = toAiError(new ApiError({ message: 'Too many requests', status: 429 }));
    expect(error).toBeInstanceOf(AiError);
    expect(error.message).toBe(AI_QUOTA_MESSAGE);
  });

  it('maps a RESOURCE_EXHAUSTED message to the quota message', () => {
    expect(toAiError(new Error('got RESOURCE_EXHAUSTED from server')).message).toBe(
      AI_QUOTA_MESSAGE
    );
  });

  it('maps the per-day free-tier quota to the "tomorrow" message', () => {
    const daily = new ApiError({
      message: 'Quota exceeded, quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier',
      status: 429,
    });
    expect(toAiError(daily).message).toBe(AI_DAILY_QUOTA_MESSAGE);
  });

  it('maps an overloaded model (503) to the busy message', () => {
    expect(toAiError(new ApiError({ message: 'high demand', status: 503 })).message).toBe(
      AI_BUSY_MESSAGE
    );
  });

  it('maps anything else to the generic failure message', () => {
    expect(toAiError(new ApiError({ message: 'boom', status: 500 })).message).toBe(
      AI_FAILURE_MESSAGE
    );
    expect(toAiError('weird').message).toBe(AI_FAILURE_MESSAGE);
  });

  it('keeps an AiError as is', () => {
    const original = new AiError('déjà traduit');
    expect(toAiError(original)).toBe(original);
  });
});

describe('parseJsonAnswer', () => {
  const schema = z.object({ title: z.string().min(1) });

  it('parses a valid answer', () => {
    expect(parseJsonAnswer('{"title":"Dev"}', schema)).toEqual({ title: 'Dev' });
  });

  it('rejects empty, malformed or off-schema answers with a French message', () => {
    for (const raw of [undefined, '', 'not json', '{"title":""}', '{"other":1}']) {
      expect(() => parseJsonAnswer(raw, schema)).toThrow(AI_INVALID_MESSAGE);
    }
  });
});

describe('resume JSON schema sent to Gemini', () => {
  it('is generated from the Zod schema with descriptions', () => {
    const json = z.toJSONSchema(resumeContentSchema, { target: 'draft-7', io: 'input' });
    const text = JSON.stringify(json);
    expect(text).toContain('"experiences"');
    expect(text).toContain('Target job title');
  });

  it('accepts the empty resume and rejects a missing name', () => {
    expect(resumeContentSchema.safeParse(EMPTY_RESUME).success).toBe(false);
    const named = { ...EMPTY_RESUME, header: { ...EMPTY_RESUME.header, fullName: 'Alexis' } };
    expect(resumeContentSchema.safeParse(named).success).toBe(true);
  });
});

describe('withRetry', () => {
  it('retries a 503 then succeeds', async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls += 1;
      if (calls < 3) throw new ApiError({ message: 'busy', status: 503 });
      return 'ok';
    }, [0, 0]);
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('gives up after the last delay', async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls += 1;
        throw new ApiError({ message: 'busy', status: 503 });
      }, [0, 0])
    ).rejects.toThrow('busy');
    expect(calls).toBe(3);
  });

  it('never retries a quota error', async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls += 1;
        throw new ApiError({ message: 'quota', status: 429 });
      }, [0, 0])
    ).rejects.toThrow('quota');
    expect(calls).toBe(1);
  });
});

describe('modelChain', () => {
  const models = { main: ['flash', 'flash-2'], lite: ['lite', 'lite-2'] };

  it('tries the main models, then the lite ones, for complex tasks', () => {
    expect(modelChain('notion-sheet', models)).toEqual(['flash', 'flash-2', 'lite', 'lite-2']);
    expect(modelChain('cv-adapt', models)).toEqual(['flash', 'flash-2', 'lite', 'lite-2']);
  });

  it('uses only the lite models for simple tasks', () => {
    expect(modelChain('reference-entry', models)).toEqual(['lite', 'lite-2']);
    expect(modelChain('mail-classify', models)).toEqual(['lite', 'lite-2']);
  });

  it('tries a model once when both lists name it', () => {
    expect(modelChain('notion-sheet', { main: ['same'], lite: ['same', 'other'] })).toEqual([
      'same',
      'other',
    ]);
  });

  it('gives every feature a tier', () => {
    expect(Object.values(FEATURE_TIERS).every((tier) => tier === 'main' || tier === 'lite')).toBe(
      true
    );
  });
});

describe('withFallback', () => {
  beforeEach(() => {
    resetSkippedModels();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('moves to the next model when the first one is out of quota', async () => {
    const tried: string[] = [];
    const { result, model } = await withFallback(['flash', 'flash-lite'], async (name) => {
      tried.push(name);
      if (name === 'flash') throw new ApiError({ message: 'quota PerDay', status: 429 });
      return 'ok';
    });
    expect({ result, model, tried }).toEqual({
      result: 'ok',
      model: 'flash-lite',
      tried: ['flash', 'flash-lite'],
    });
  });

  it('does not switch model on other errors', async () => {
    const tried: string[] = [];
    await expect(
      withFallback(['flash', 'flash-lite'], async (name) => {
        tried.push(name);
        throw new ApiError({ message: 'bad request', status: 400 });
      })
    ).rejects.toThrow('bad request');
    expect(tried).toEqual(['flash']);
  });

  it('throws the quota error when every model is out of quota', async () => {
    await expect(
      withFallback(['flash', 'flash-lite'], async () => {
        throw new ApiError({ message: 'quota PerDay', status: 429 });
      })
    ).rejects.toThrow('quota');
  });
});

describe('withFallback and slow models', () => {
  beforeEach(() => {
    resetSkippedModels();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('moves to the next model when one times out', async () => {
    const tried: string[] = [];
    const { model } = await withFallback(['flash', 'flash-lite'], async (name) => {
      tried.push(name);
      if (name === 'flash') throw new DOMException('The operation timed out.', 'TimeoutError');
      return 'ok';
    });
    expect(model).toBe('flash-lite');
    expect(tried).toEqual(['flash', 'flash-lite']);
  });

  it('says the AI is busy after a timeout', () => {
    expect(toAiError(new DOMException('aborted', 'TimeoutError')).message).toBe(AI_BUSY_MESSAGE);
    expect(isTimeout(new Error('bad request'))).toBe(false);
  });
});

describe('withFallback memory and deadline', () => {
  beforeEach(() => {
    resetSkippedModels();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  const quota = () => {
    throw new ApiError({ message: 'quota PerDay', status: 429 });
  };

  it('skips a model that just ran out of quota', async () => {
    await withFallback(['flash', 'lite'], async (name) => (name === 'flash' ? quota() : 'ok'));
    const tried: string[] = [];
    await withFallback(['flash', 'lite'], async (name) => {
      tried.push(name);
      return 'ok';
    });
    expect(tried).toEqual(['lite']);
  });

  it('tries every model again when all are skipped', async () => {
    await expect(withFallback(['flash', 'lite'], async () => quota())).rejects.toThrow('quota');
    const tried: string[] = [];
    await withFallback(['flash', 'lite'], async (name) => {
      tried.push(name);
      return 'ok';
    });
    expect(tried).toEqual(['flash']);
  });

  it('gives each attempt the time left, and stops before the function time limit', async () => {
    let clock = 0;
    const tried: string[] = [];
    await expect(
      withFallback(
        ['a', 'b', 'c', 'd'],
        async (name, timeoutMs) => {
          tried.push(`${name}:${timeoutMs}`);
          clock += name === 'a' ? 25_000 : 18_000;
          throw new DOMException('timed out', 'TimeoutError');
        },
        () => clock
      )
    ).rejects.toThrow('timed out');
    // 50 s budget: a gets 25 s, b 25 s, c the 7 s left; nothing left for d.
    expect(tried).toEqual(['a:25000', 'b:25000', 'c:7000']);
  });
});
