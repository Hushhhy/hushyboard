import { describe, expect, it } from 'vitest';
import { isAuthError, mapLimit } from './client';

describe('isAuthError', () => {
  it('spots an expired or revoked token', () => {
    expect(isAuthError({ response: { data: { error: 'invalid_grant' } } })).toBe(true);
    expect(isAuthError(new Error('invalid_grant: Token has been expired or revoked.'))).toBe(true);
    expect(isAuthError({ status: 401 })).toBe(true);
    expect(isAuthError(new Error('Quota exceeded'))).toBe(false);
  });
});

describe('mapLimit', () => {
  it('keeps the order and never runs more than the limit at once', async () => {
    let running = 0;
    let peak = 0;
    const result = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return n * 10;
    });
    expect(result).toEqual([10, 20, 30, 40, 50]);
    expect(peak).toBe(2);
  });
});
