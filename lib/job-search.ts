// Job search rules: follow-ups, filters, XP per status, statistics and page titles.
// Pure functions, unit-tested. Dates are calendar days stored as UTC midnights (Paris day).

import type { ApplicationStatus, XpReason } from '@/generated/prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;

// « Relance proposée 14 jours après l'envoi. »
export const FOLLOW_UP_DAYS = 14;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function followUpDate(from: Date): Date {
  return addDays(from, FOLLOW_UP_DAYS);
}

// Statuses still waiting for the company: a follow-up makes sense.
const WAITING_STATUSES: ApplicationStatus[] = ['SENT', 'WAITING', 'NO_RESPONSE', 'FOLLOWED_UP'];

export function isFollowUpDue(
  application: { status: ApplicationStatus; followUpAt: Date | null },
  today: Date
): boolean {
  return (
    WAITING_STATUSES.includes(application.status) &&
    application.followUpAt !== null &&
    application.followUpAt.getTime() <= today.getTime()
  );
}

// Filter chips of the « Candidatures » tab.
export type ApplicationFilter = 'all' | 'active' | 'followUp' | 'interviews' | 'closed';

const INTERVIEW_STATUSES: ApplicationStatus[] = ['HR_INTERVIEW', 'TECH_INTERVIEW'];
const CLOSED_STATUSES: ApplicationStatus[] = ['OFFER', 'REJECTED', 'NO_RESPONSE'];

export const APPLICATION_FILTERS: { value: ApplicationFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'active', label: 'En cours' },
  { value: 'followUp', label: 'À relancer' },
  { value: 'interviews', label: 'Entretiens' },
  { value: 'closed', label: 'Closes' },
];

export function isApplicationFilter(value: string | undefined): value is ApplicationFilter {
  return APPLICATION_FILTERS.some((filter) => filter.value === value);
}

export function matchesApplicationFilter(
  application: { status: ApplicationStatus; followUpAt: Date | null },
  filter: ApplicationFilter,
  today: Date
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'active':
      return !CLOSED_STATUSES.includes(application.status);
    case 'followUp':
      return isFollowUpDue(application, today);
    case 'interviews':
      return INTERVIEW_STATUSES.includes(application.status);
    case 'closed':
      return CLOSED_STATUSES.includes(application.status);
  }
}

// XP earned when an application reaches a status (once per application and reason).
export function statusXpReason(status: ApplicationStatus): XpReason | null {
  if (status === 'HR_INTERVIEW') return 'HR_INTERVIEW';
  if (status === 'TECH_INTERVIEW') return 'TECH_INTERVIEW';
  if (status === 'OFFER') return 'OFFER_RECEIVED';
  return null;
}

// --- Statistics (« Analyses ») -------------------------------------------------------

// A response comes from the company: an interview, an offer or a refusal.
const RESPONSE_STATUSES: ApplicationStatus[] = [
  'HR_INTERVIEW',
  'TECH_INTERVIEW',
  'OFFER',
  'REJECTED',
];

export type StatsApplication = {
  company: string;
  kind: 'OFFER' | 'SPONTANEOUS';
  source: string | null;
  contractType: string | null;
  status: ApplicationStatus;
  sentAt: Date;
  events: { status: ApplicationStatus; occurredAt: Date }[];
};

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

// ISO 8601 week number of a calendar day (UTC midnight), e.g. 42.
export function isoWeek(day: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  return {
    year: date.getUTCFullYear(),
    week: Math.ceil(((date.getTime() - yearStart) / DAY_MS + 1) / 7),
  };
}

type Ratio = { key: string; label: string; responses: number; total: number };

function ratios(
  applications: StatsApplication[],
  keyOf: (application: StatsApplication) => string,
  responded: (application: StatsApplication) => boolean
): Ratio[] {
  const map = new Map<string, Ratio>();
  for (const application of applications) {
    const key = keyOf(application);
    const row = map.get(key) ?? { key, label: key, responses: 0, total: 0 };
    row.total += 1;
    if (responded(application)) row.responses += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export function jobSearchStats(applications: StatsApplication[], today: Date, weeks = 8) {
  const firstResponse = (application: StatsApplication) =>
    application.events
      .filter((event) => RESPONSE_STATUSES.includes(event.status))
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())[0];
  const responded = (application: StatsApplication) =>
    RESPONSE_STATUSES.includes(application.status) || firstResponse(application) !== undefined;
  const reached = (application: StatsApplication, statuses: ApplicationStatus[]) =>
    statuses.includes(application.status) ||
    application.events.some((event) => statuses.includes(event.status));

  const responses = applications.filter(responded);
  const interviewed = applications.filter((a) => reached(a, INTERVIEW_STATUSES));
  const delays = applications
    .map((application) => {
      const event = firstResponse(application);
      return event
        ? Math.max(
            0,
            Math.round((event.occurredAt.getTime() - application.sentAt.getTime()) / DAY_MS)
          )
        : null;
    })
    .filter((days): days is number => days !== null);

  const monthStart = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1);
  const perWeek = Array.from({ length: weeks }, (_, index) => {
    const day = addDays(today, -7 * (weeks - 1 - index));
    const { year, week } = isoWeek(day);
    return { key: `${year}-${week}`, label: `S${week}`, value: 0, current: index === weeks - 1 };
  });
  for (const application of applications) {
    const { year, week } = isoWeek(application.sentAt);
    const bucket = perWeek.find((row) => row.key === `${year}-${week}`);
    if (bucket) bucket.value += 1;
  }

  return {
    total: applications.length,
    responses: responses.length,
    responseRate: applications.length
      ? Math.round((responses.length / applications.length) * 100)
      : 0,
    medianDelay: median(delays),
    interviews: interviewed.length,
    interviewCompanies: [...new Set(interviewed.map((application) => application.company))],
    thisMonth: applications.filter((a) => a.sentAt.getTime() >= monthStart).length,
    funnel: {
      sent: applications.length,
      responses: responses.length,
      interviews: interviewed.length,
      offers: applications.filter((a) => reached(a, ['OFFER'])).length,
    },
    bySource: ratios(applications, (a) => a.source?.trim() || 'Non précisée', responded),
    byContract: ratios(applications, (a) => a.contractType ?? 'OTHER', responded),
    byKind: ratios(applications, (a) => a.kind, responded),
    perWeek,
  };
}

// --- Page titles ---------------------------------------------------------------------

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

// « 20 candidatures, 2 entretiens en cours. »
export function describeApplications(total: number, interviewsInProgress: number): string {
  if (total === 0) return 'Aucune candidature pour l’instant.';
  const head = plural(total, 'candidature', 'candidatures');
  if (interviewsInProgress === 0) return `${head}, aucun entretien en cours.`;
  return `${head}, ${plural(interviewsInProgress, 'entretien', 'entretiens')} en cours.`;
}

// « 4 nouvelles offres à trier. »
export function describeWatch(toSort: number): string {
  if (toSort === 0) return 'Aucune offre à trier.';
  return toSort === 1 ? '1 nouvelle offre à trier.' : `${toSort} nouvelles offres à trier.`;
}

// « 7 sites carrière suivis, 2 relances à faire. »
export function describeSpontaneous(sites: number, due: number): string {
  if (sites === 0) return 'Aucune candidature spontanée pour l’instant.';
  const head = plural(sites, 'site carrière suivi', 'sites carrière suivis');
  if (due === 0) return `${head}, aucune relance à faire.`;
  return `${head}, ${plural(due, 'relance', 'relances')} à faire.`;
}

// « 5 réponses sur 20, en 9 jours en médiane. »
export function describeStats(total: number, responses: number, medianDelay: number | null) {
  if (total === 0) return 'Pas encore de candidature à analyser.';
  const head = `${plural(responses, 'réponse', 'réponses')} sur ${total}`;
  if (medianDelay === null) return `${head}.`;
  return `${head}, en ${plural(medianDelay, 'jour', 'jours')} en médiane.`;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// "https://www.qonto.com/careers" → "qonto.com/careers" (shown under a company name).
export function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, '');
    return `${parsed.hostname.replace(/^www\./, '')}${path}`;
  } catch {
    return url;
  }
}

// --- Watch freshness -------------------------------------------------------------------

// The watch only shows offers of the last 7 days (Alex's rule, 23/10/2026): an offer not
// applied to is deleted after that. The age counts from foundAt (the alert mail's date for
// an imported offer, the day it was added otherwise).
export const OFFER_MAX_AGE_DAYS = 7;

export function offerCutoff(now: Date): Date {
  return new Date(now.getTime() - OFFER_MAX_AGE_DAYS * DAY_MS);
}

export function isOfferExpired(
  offer: { decision: 'PENDING' | 'APPLIED' | 'DISMISSED'; foundAt: Date },
  now: Date
): boolean {
  return offer.decision !== 'APPLIED' && offer.foundAt.getTime() < offerCutoff(now).getTime();
}
