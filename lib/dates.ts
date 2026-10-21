// All "calendar" logic uses the Paris time zone: the Vercel server runs in UTC,
// so without this, "today" would switch at 2 a.m. instead of midnight.
const TIME_ZONE = 'Europe/Paris';

const ymdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  weekday: 'short',
});

const longDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const monthFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, month: 'long' });

// Today's date in Paris, as a UTC midnight Date (the format Prisma uses for @db.Date columns).
export function todayInParis(now: Date): Date {
  return new Date(`${ymdFormatter.format(now)}T00:00:00.000Z`);
}

// ISO weekday in Paris: 1 = Monday … 7 = Sunday (same convention as Habit.activeDays).
export function isoWeekdayInParis(now: Date): number {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.indexOf(weekdayFormatter.format(now)) + 1;
}

// First day of the current month and first day of the next one (end excluded).
export function monthRangeInParis(now: Date): { start: Date; end: Date } {
  const [year, month] = ymdFormatter.format(now).split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

// "mercredi 15 octobre"
export function formatLongDate(now: Date): string {
  return longDateFormatter.format(now);
}

// "octobre"
export function formatMonth(now: Date): string {
  return monthFormatter.format(now);
}

// Months are passed around as "YYYY-MM" keys (URL ?month=2026-10, month picker).
const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

const monthYearFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
});
const monthNameFormatter = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', month: 'long' });

// "2026-10" for the current month in Paris.
export function monthKeyInParis(now: Date): string {
  return ymdFormatter.format(now).slice(0, 7);
}

export function isMonthKey(value: string): boolean {
  return MONTH_KEY.test(value);
}

// "2026-10" + 3 → "2027-01"; "2026-01" − 1 → "2025-12".
export function shiftMonthKey(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

// Start of the month and start of the next one (end excluded), as UTC midnights.
export function monthKeyRange(key: string): { start: Date; end: Date } {
  const start = new Date(`${key}-01T00:00:00.000Z`);
  return { start, end: new Date(`${shiftMonthKey(key, 1)}-01T00:00:00.000Z`) };
}

// "octobre 2026"
export function formatMonthKey(key: string): string {
  return monthYearFormatter.format(new Date(`${key}-01T00:00:00.000Z`));
}

// "septembre" (used in "Mois précédent : septembre")
export function formatMonthKeyName(key: string): string {
  return monthNameFormatter.format(new Date(`${key}-01T00:00:00.000Z`));
}
