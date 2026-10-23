import { describe, expect, it } from 'vitest';
import { companyWords, findApplication, matchesCompany, parseSender } from './match';

describe('parseSender', () => {
  it('reads a display name and an address', () => {
    expect(parseSender('Nova Santé · Recrutement <jobs@nova-sante.fr>')).toEqual({
      name: 'Nova Santé · Recrutement',
      email: 'jobs@nova-sante.fr',
      domain: 'nova-sante.fr',
    });
    expect(parseSender('"Qonto" <Talent@Qonto.com>')).toMatchObject({
      name: 'Qonto',
      email: 'talent@qonto.com',
    });
    expect(parseSender('noreply@alan.com')).toMatchObject({ name: 'noreply@alan.com' });
  });
});

describe('companyWords', () => {
  it('drops accents, case and legal suffixes', () => {
    expect(companyWords('Société Générale SA')).toEqual(['societe', 'generale']);
    expect(companyWords('Back Market SAS')).toEqual(['back', 'market']);
  });
});

describe('matchesCompany', () => {
  it('matches the company domain', () => {
    expect(matchesCompany(parseSender('Jobs <jobs@nova-sante.fr>'), 'Nova Santé')).toBe(true);
    expect(matchesCompany(parseSender('<rh@careers.qonto.com>'), 'Qonto')).toBe(true);
    expect(matchesCompany(parseSender('<team@backmarket.com>'), 'Back Market')).toBe(true);
  });

  it('matches whole words of the display name, even from a job board', () => {
    expect(
      matchesCompany(
        parseSender('Doctolib via Welcome to the Jungle <no-reply@wttj.co>'),
        'Doctolib'
      )
    ).toBe(true);
    expect(matchesCompany(parseSender('Alana <alana@gmail.com>'), 'Alan')).toBe(false);
  });

  it('ignores shared mailboxes and too-short names', () => {
    expect(matchesCompany(parseSender('Bob <bob@gmail.com>'), 'Gmail')).toBe(false);
    expect(matchesCompany(parseSender('<a@ab.com>'), 'AB')).toBe(false);
  });
});

describe('findApplication', () => {
  it('returns the most recent matching application', () => {
    const applications = [
      { id: 'old', company: 'Qonto', sentAt: new Date('2026-09-01') },
      { id: 'new', company: 'Qonto', sentAt: new Date('2026-10-01') },
      { id: 'other', company: 'Alan', sentAt: new Date('2026-10-10') },
    ];
    expect(findApplication(parseSender('<rh@qonto.com>'), applications)?.id).toBe('new');
    expect(findApplication(parseSender('<x@unknown.io>'), applications)).toBeNull();
  });
});
