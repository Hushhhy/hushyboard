import { describe, expect, it } from 'vitest';
import {
  daysBetweenInParis,
  formatLongDate,
  formatMonth,
  formatMonthKey,
  formatMonthKeyName,
  formatRelativeDay,
  formatRelativeTime,
  formatShortDate,
  isMonthKey,
  isoWeekdayInParis,
  monthKeyInParis,
  monthKeyRange,
  monthRangeInParis,
  parseDateInput,
  shiftMonthKey,
  todayInParis,
  toDateInputValue,
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

describe('month keys', () => {
  it('reads the current Paris month', () => {
    expect(monthKeyInParis(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11');
    expect(monthKeyInParis(new Date('2026-10-22T12:00:00Z'))).toBe('2026-10');
  });

  it('validates keys', () => {
    expect(isMonthKey('2026-10')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-1')).toBe(false);
    expect(isMonthKey('octobre')).toBe(false);
  });

  it('shifts across years', () => {
    expect(shiftMonthKey('2026-10', 3)).toBe('2027-01');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-10', 0)).toBe('2026-10');
  });

  it('gives the month range with the end excluded', () => {
    const { start, end } = monthKeyRange('2026-12');
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('formats in French', () => {
    expect(formatMonthKey('2026-10')).toBe('octobre 2026');
    expect(formatMonthKeyName('2026-09')).toBe('septembre');
  });
});

describe('formatShortDate', () => {
  it('formats a short French date in Paris time', () => {
    expect(formatShortDate(new Date('2026-10-22T10:00:00Z'))).toBe('22 oct. 2026');
    // 23:30 UTC on 31 Dec = 1 Jan in Paris.
    expect(formatShortDate(new Date('2026-12-31T23:30:00Z'))).toBe('1 janv. 2027');
  });
});

describe('date inputs', () => {
  it('parses a calendar day', () => {
    expect(parseDateInput('2026-10-22')?.toISOString()).toBe('2026-10-22T00:00:00.000Z');
  });

  it('rejects invalid days', () => {
    for (const value of ['', '22/10/2026', '2026-02-30', '2026-13-01']) {
      expect(parseDateInput(value)).toBeNull();
    }
  });

  it('round-trips through the input value', () => {
    expect(toDateInputValue(parseDateInput('2026-12-31'))).toBe('2026-12-31');
    expect(toDateInputValue(null)).toBe('');
  });
});

describe('relative days', () => {
  const now = new Date('2026-10-22T10:00:00Z');

  it('counts Paris calendar days, not 24-hour blocks', () => {
    // 21 Oct 23:30 in Paris (21:30 UTC) is "yesterday" even if less than 24 h ago.
    expect(daysBetweenInParis(new Date('2026-10-21T21:30:00Z'), now)).toBe(1);
    expect(daysBetweenInParis(new Date('2026-10-22T00:30:00Z'), now)).toBe(0);
  });

  it('formats in French', () => {
    expect(formatRelativeDay(new Date('2026-10-22T08:00:00Z'), now)).toBe('aujourd’hui');
    expect(formatRelativeDay(new Date('2026-10-21T08:00:00Z'), now)).toBe('hier');
    expect(formatRelativeDay(new Date('2026-10-18T08:00:00Z'), now)).toBe('il y a 4 jours');
    expect(formatRelativeDay(new Date('2026-08-01T08:00:00Z'), now)).toBe('le 1 août 2026');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-22T10:00:00Z');

  it('uses minutes, then hours within the same Paris day, then days', () => {
    expect(formatRelativeTime(new Date('2026-10-22T09:59:40Z'), now)).toBe('à l’instant');
    expect(formatRelativeTime(new Date('2026-10-22T09:56:00Z'), now)).toBe('il y a 4 min');
    expect(formatRelativeTime(new Date('2026-10-22T07:30:00Z'), now)).toBe('il y a 2 h');
    expect(formatRelativeTime(new Date('2026-10-21T20:00:00Z'), now)).toBe('hier');
  });
});
