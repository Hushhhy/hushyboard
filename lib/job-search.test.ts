import { describe, expect, it } from 'vitest';
import {
  countWords,
  describeApplications,
  describeSpontaneous,
  describeStats,
  describeWatch,
  displayUrl,
  followUpDate,
  isFollowUpDue,
  isOfferExpired,
  isoWeek,
  jobSearchStats,
  matchesApplicationFilter,
  median,
  offerCutoff,
  statusXpReason,
  type StatsApplication,
} from './job-search';

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe('follow-ups', () => {
  it('proposes a follow-up 14 days after sending', () => {
    expect(followUpDate(day('2026-10-08'))).toEqual(day('2026-10-22'));
    expect(followUpDate(day('2026-12-25'))).toEqual(day('2027-01-08'));
  });

  it('is due on the day itself and after, only while waiting for the company', () => {
    const today = day('2026-10-22');
    expect(isFollowUpDue({ status: 'SENT', followUpAt: day('2026-10-22') }, today)).toBe(true);
    expect(isFollowUpDue({ status: 'NO_RESPONSE', followUpAt: day('2026-10-01') }, today)).toBe(
      true
    );
    expect(isFollowUpDue({ status: 'FOLLOWED_UP', followUpAt: day('2026-10-23') }, today)).toBe(
      false
    );
    expect(isFollowUpDue({ status: 'REJECTED', followUpAt: day('2026-10-01') }, today)).toBe(false);
    expect(isFollowUpDue({ status: 'HR_INTERVIEW', followUpAt: day('2026-10-01') }, today)).toBe(
      false
    );
    expect(isFollowUpDue({ status: 'SENT', followUpAt: null }, today)).toBe(false);
  });
});

describe('matchesApplicationFilter', () => {
  const today = day('2026-10-22');
  const sent = { status: 'SENT' as const, followUpAt: day('2026-10-20') };
  const interview = { status: 'TECH_INTERVIEW' as const, followUpAt: null };
  const rejected = { status: 'REJECTED' as const, followUpAt: null };

  it('splits active, interviews and closed applications', () => {
    expect(matchesApplicationFilter(sent, 'active', today)).toBe(true);
    expect(matchesApplicationFilter(interview, 'active', today)).toBe(true);
    expect(matchesApplicationFilter(rejected, 'active', today)).toBe(false);
    expect(matchesApplicationFilter(interview, 'interviews', today)).toBe(true);
    expect(matchesApplicationFilter(rejected, 'closed', today)).toBe(true);
    expect(matchesApplicationFilter(sent, 'followUp', today)).toBe(true);
    expect(matchesApplicationFilter(rejected, 'all', today)).toBe(true);
  });
});

describe('statusXpReason', () => {
  it('rewards interviews and offers only', () => {
    expect(statusXpReason('HR_INTERVIEW')).toBe('HR_INTERVIEW');
    expect(statusXpReason('TECH_INTERVIEW')).toBe('TECH_INTERVIEW');
    expect(statusXpReason('OFFER')).toBe('OFFER_RECEIVED');
    expect(statusXpReason('REJECTED')).toBeNull();
    expect(statusXpReason('FOLLOWED_UP')).toBeNull();
  });
});

describe('median and isoWeek', () => {
  it('computes a median', () => {
    expect(median([])).toBeNull();
    expect(median([9, 1, 4])).toBe(4);
    expect(median([2, 4, 6, 9])).toBe(5);
  });

  it('numbers ISO weeks, including across the new year', () => {
    expect(isoWeek(day('2026-10-22'))).toEqual({ year: 2026, week: 43 });
    expect(isoWeek(day('2027-01-01'))).toEqual({ year: 2026, week: 53 });
    expect(isoWeek(day('2026-01-01'))).toEqual({ year: 2026, week: 1 });
  });
});

describe('jobSearchStats', () => {
  const app = (overrides: Partial<StatsApplication>): StatsApplication => ({
    company: 'Acme',
    kind: 'OFFER',
    source: 'LinkedIn',
    contractType: 'APPRENTICESHIP',
    status: 'SENT',
    sentAt: day('2026-10-01'),
    events: [],
    ...overrides,
  });
  const applications = [
    app({
      company: 'Qonto',
      status: 'TECH_INTERVIEW',
      events: [
        { status: 'SENT', occurredAt: day('2026-10-01') },
        { status: 'HR_INTERVIEW', occurredAt: day('2026-10-10') },
        { status: 'TECH_INTERVIEW', occurredAt: day('2026-10-15') },
      ],
    }),
    app({
      company: 'Alan',
      status: 'REJECTED',
      source: 'Site carrière',
      sentAt: day('2026-10-05'),
      events: [{ status: 'REJECTED', occurredAt: day('2026-10-08') }],
    }),
    app({ company: 'Doctolib', kind: 'SPONTANEOUS', source: null, sentAt: day('2026-10-20') }),
    app({ company: 'Ubisoft', sentAt: day('2026-09-10'), status: 'NO_RESPONSE' }),
  ];
  const stats = jobSearchStats(applications, day('2026-10-22'));

  it('counts responses, interviews and the response delay', () => {
    expect(stats.total).toBe(4);
    expect(stats.responses).toBe(2);
    expect(stats.responseRate).toBe(50);
    expect(stats.medianDelay).toBe(6);
    expect(stats.interviews).toBe(1);
    expect(stats.interviewCompanies).toEqual(['Qonto']);
    expect(stats.thisMonth).toBe(3);
    expect(stats.funnel).toEqual({ sent: 4, responses: 2, interviews: 1, offers: 0 });
  });

  it('groups by source, contract and kind', () => {
    expect(stats.bySource[0]).toMatchObject({ label: 'LinkedIn', responses: 1, total: 2 });
    expect(stats.bySource.find((row) => row.label === 'Non précisée')?.total).toBe(1);
    expect(stats.byKind.find((row) => row.key === 'SPONTANEOUS')?.total).toBe(1);
  });

  it('counts applications per ISO week, the current week last', () => {
    expect(stats.perWeek).toHaveLength(8);
    expect(stats.perWeek.at(-1)).toMatchObject({ label: 'S43', current: true, value: 1 });
    expect(stats.perWeek.find((row) => row.label === 'S40')?.value).toBe(1);
  });
});

describe('page titles', () => {
  it('describes each tab in one sentence', () => {
    expect(describeApplications(20, 2)).toBe('20 candidatures, 2 entretiens en cours.');
    expect(describeApplications(1, 0)).toBe('1 candidature, aucun entretien en cours.');
    expect(describeApplications(0, 0)).toBe('Aucune candidature pour l’instant.');
    expect(describeWatch(4)).toBe('4 nouvelles offres à trier.');
    expect(describeWatch(1)).toBe('1 nouvelle offre à trier.');
    expect(describeSpontaneous(7, 2)).toBe('7 sites carrière suivis, 2 relances à faire.');
    expect(describeSpontaneous(1, 0)).toBe('1 site carrière suivi, aucune relance à faire.');
    expect(describeStats(20, 5, 9)).toBe('5 réponses sur 20, en 9 jours en médiane.');
    expect(describeStats(3, 0, null)).toBe('0 réponse sur 3.');
  });

  it('counts words of a letter', () => {
    expect(countWords('Bonjour,\n\nJe vous  écris.')).toBe(4);
  });
});

describe('displayUrl', () => {
  it('shortens a careers page link', () => {
    expect(displayUrl('https://www.qonto.com/careers/')).toBe('qonto.com/careers');
    expect(displayUrl('https://alan.com')).toBe('alan.com');
    expect(displayUrl('not a url')).toBe('not a url');
  });
});

describe('offer freshness', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  it('expires offers older than 7 days unless applied to', () => {
    expect(offerCutoff(now).toISOString()).toBe('2026-10-16T12:00:00.000Z');
    const old = new Date('2026-10-16T11:59:00Z');
    const recent = new Date('2026-10-16T12:01:00Z');
    expect(isOfferExpired({ decision: 'PENDING', foundAt: old }, now)).toBe(true);
    expect(isOfferExpired({ decision: 'DISMISSED', foundAt: old }, now)).toBe(true);
    expect(isOfferExpired({ decision: 'APPLIED', foundAt: old }, now)).toBe(false);
    expect(isOfferExpired({ decision: 'PENDING', foundAt: recent }, now)).toBe(false);
  });
});
