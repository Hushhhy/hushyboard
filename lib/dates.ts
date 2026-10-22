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

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// "22 oct. 2026"
export function formatShortDate(date: Date): string {
  return shortDateFormatter.format(date);
}

// <input type="date"> value ("2026-10-22") → calendar day as a UTC midnight Date. Null if invalid.
export function parseDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

// Date → value for <input type="date">, read as a Paris calendar day.
export function toDateInputValue(date: Date | null | undefined): string {
  return date ? ymdFormatter.format(date) : '';
}

// Whole days between two instants, counted on the Paris calendar (0 = same day).
export function daysBetweenInParis(earlier: Date, later: Date): number {
  const day = 24 * 60 * 60 * 1000;
  return Math.round((todayInParis(later).getTime() - todayInParis(earlier).getTime()) / day);
}

// "aujourd'hui", "hier", "il y a 4 jours", then a short date after a month.
export function formatRelativeDay(date: Date, now: Date): string {
  const days = daysBetweenInParis(date, now);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  if (days < 31) return `il y a ${days} jours`;
  return `le ${formatShortDate(date)}`;
}

// "à l'instant", "il y a 4 min", "il y a 2 h", then the day ("hier", "il y a 4 jours"…).
export function formatRelativeTime(date: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 24 * 60 && daysBetweenInParis(date, now) === 0) {
    return `il y a ${Math.floor(minutes / 60)} h`;
  }
  return formatRelativeDay(date, now);
}

const dayMonthFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
});

// "15/10" (tables)
export function formatDayMonth(date: Date): string {
  return dayMonthFormatter.format(date);
}
