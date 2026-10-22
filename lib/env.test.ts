import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  ALLOWED_GITHUB_ID: '123456',
  GEMINI_API_KEY: 'test-gemini-key-0000000000',
};

describe('parseEnv', () => {
  it('accepts a complete environment and defaults NODE_ENV', () => {
    expect(parseEnv(valid).NODE_ENV).toBe('development');
  });

  it('names every missing variable without printing values', () => {
    const withoutSecret = { ...valid, GITHUB_CLIENT_SECRET: undefined };
    expect(() => parseEnv({ ...withoutSecret, BETTER_AUTH_SECRET: 'short' })).toThrow(
      /GITHUB_CLIENT_SECRET[\s\S]*BETTER_AUTH_SECRET|BETTER_AUTH_SECRET[\s\S]*GITHUB_CLIENT_SECRET/
    );
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: 'short' })).not.toThrow(/short/);
  });

  it('defaults the Gemini models to free-tier Flash and Flash Lite', () => {
    expect(parseEnv(valid).GEMINI_MODEL).toEqual(['gemini-3.8-flash', 'gemini-3.6-flash']);
    expect(parseEnv(valid).GEMINI_MODEL_LITE).toEqual([
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
    ]);
  });

  it('reads a comma-separated list of models', () => {
    expect(parseEnv({ ...valid, GEMINI_MODEL: ' a , b,, ' }).GEMINI_MODEL).toEqual(['a', 'b']);
    expect(() => parseEnv({ ...valid, GEMINI_MODEL_LITE: ' , ' })).toThrow(/GEMINI_MODEL_LITE/);
  });

  it('rejects a non-numeric GitHub id', () => {
    expect(() => parseEnv({ ...valid, ALLOWED_GITHUB_ID: 'Hushhhy' })).toThrow(/ALLOWED_GITHUB_ID/);
  });
});
