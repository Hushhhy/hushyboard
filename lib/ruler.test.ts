import { describe, expect, it } from 'vitest';
import { barWidthPercent, segmentFills } from './ruler';

describe('segmentFills', () => {
  it('fills whole segments then a partial one', () => {
    const fills = segmentFills(7, 10, 4);
    expect(fills.map((fill) => Math.round(fill * 100) / 100)).toEqual([1, 1, 0.8, 0]);
  });

  it('is empty at 0 and full at max', () => {
    expect(segmentFills(0, 500, 10)).toEqual(Array(10).fill(0));
    expect(segmentFills(500, 500, 10)).toEqual(Array(10).fill(1));
  });

  it('clamps values outside 0..max', () => {
    expect(segmentFills(-5, 10, 2)).toEqual([0, 0]);
    expect(segmentFills(30, 10, 2)).toEqual([1, 1]);
  });

  it('treats a max of 0 as empty', () => {
    expect(segmentFills(3, 0, 3)).toEqual([0, 0, 0]);
  });

  it('maps one segment per item (habits of the day)', () => {
    expect(segmentFills(2, 3, 3)).toEqual([1, 1, 0]);
  });
});

describe('barWidthPercent', () => {
  it('scales against the largest value', () => {
    expect(barWidthPercent(5, 20)).toBe(25);
    expect(barWidthPercent(20, 20)).toBe(100);
  });

  it('returns 0 for an empty chart and clamps', () => {
    expect(barWidthPercent(4, 0)).toBe(0);
    expect(barWidthPercent(-1, 10)).toBe(0);
    expect(barWidthPercent(12, 10)).toBe(100);
  });
});
