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
