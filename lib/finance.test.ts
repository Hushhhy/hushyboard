import { describe, expect, it } from 'vitest';
import { formatEuros, parseEurosToCents } from './finance';

describe('parseEurosToCents', () => {
  it('parses French and English decimal separators', () => {
    expect(parseEurosToCents('49,99')).toBe(4999);
    expect(parseEurosToCents('49.99')).toBe(4999);
    expect(parseEurosToCents('12,5')).toBe(1250);
    expect(parseEurosToCents('300')).toBe(30000);
  });

  it('ignores spaces and the euro sign', () => {
    expect(parseEurosToCents('1 234,56 €')).toBe(123456);
    expect(parseEurosToCents('1 234,56 €')).toBe(123456);
  });

  it('is exact where floats are not', () => {
    // 0.29 * 100 = 28.999999999999996 in floating point.
    expect(parseEurosToCents('0,29')).toBe(29);
  });

  it('handles negative amounts and rejects anything else', () => {
    expect(parseEurosToCents('-12,30')).toBe(-1230);
    for (const input of ['', 'abc', '12,345', '1,2,3', '12.']) {
      expect(parseEurosToCents(input)).toBeNull();
    }
  });
});

describe('formatEuros', () => {
  it('formats cents in French', () => {
    expect(formatEuros(123456).replace(/\s/g, ' ')).toBe('1 234,56 €');
  });
});
