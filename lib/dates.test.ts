import { describe, expect, it } from 'vitest';
import {
  formatLongDate,
  formatMonth,
  isoWeekdayInParis,
  monthRangeInParis,
  todayInParis,
} from './dates';

describe('todayInParis', () => {
  it('returns the Paris day as a UTC midnight date', () => {
    expect(todayInParis(new Date('2026-10-22T10:00:00Z')).toISOString()).toBe(
      '2026-10-22T00:00:00.000Z'
    );
  });

  it('switches day at Paris midnight, not UTC midnight (summer time, UTC+2)', () => {
    // 22:30 UTC on 21 Oct = 00:30 on 22 Oct in Paris.
    expect(todayInParis(new Date('2026-10-21T22:30:00Z')).toISOString()).toBe(
      '2026-10-22T00:00:00.000Z'
    );
    expect(todayInParis(new Date('2026-10-21T21:59:00Z')).toISOString()).toBe(
      '2026-10-21T00:00:00.000Z'
    );
  });

  it('uses UTC+1 in winter', () => {
    // 23:30 UTC on 14 Jan = 00:30 on 15 Jan in Paris.
    expect(todayInParis(new Date('2027-01-14T23:30:00Z')).toISOString()).toBe(
      '2027-01-15T00:00:00.000Z'
    );
    expect(todayInParis(new Date('2027-01-14T22:30:00Z')).toISOString()).toBe(
      '2027-01-14T00:00:00.000Z'
    );
  });
});

describe('isoWeekdayInParis', () => {
  it('returns 1 for Monday and 7 for Sunday', () => {
    expect(isoWeekdayInParis(new Date('2026-10-19T12:00:00Z'))).toBe(1);
    expect(isoWeekdayInParis(new Date('2026-10-22T12:00:00Z'))).toBe(4);
    expect(isoWeekdayInParis(new Date('2026-10-25T12:00:00Z'))).toBe(7);
  });

  it('follows the Paris day near midnight', () => {
    // Sunday 25 Oct, 23:30 UTC = Monday 00:30 in Paris (back to UTC+1 that day).
    expect(isoWeekdayInParis(new Date('2026-10-25T23:30:00Z'))).toBe(1);
  });
});

describe('monthRangeInParis', () => {
  it('returns the first day of the month and of the next one', () => {
    const { start, end } = monthRangeInParis(new Date('2026-10-22T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });

  it('rolls over to the next year in December', () => {
    const { start, end } = monthRangeInParis(new Date('2026-12-15T12:00:00Z'));
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('uses the Paris month on the last evening of a month', () => {
    // 31 Oct, 23:30 UTC = 1 Nov, 00:30 in Paris.
    const { start } = monthRangeInParis(new Date('2026-10-31T23:30:00Z'));
    expect(start.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });
});

describe('French formatting', () => {
  it('formats a long date and a month name', () => {
    expect(formatLongDate(new Date('2026-10-22T12:00:00Z'))).toBe('jeudi 22 octobre');
    expect(formatMonth(new Date('2026-10-22T12:00:00Z'))).toBe('octobre');
  });
});
