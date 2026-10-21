import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

const valid = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  BETTER_AUTH_URL: 'http://localhost:3000',
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  ALLOWED_GITHUB_ID: '123456',
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

  it('rejects a non-numeric GitHub id', () => {
    expect(() => parseEnv({ ...valid, ALLOWED_GITHUB_ID: 'Hushhhy' })).toThrow(/ALLOWED_GITHUB_ID/);
  });
});
