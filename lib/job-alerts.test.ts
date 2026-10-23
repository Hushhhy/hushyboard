import { describe, expect, it } from 'vitest';
import {
  alertSource,
  extractLinks,
  keepRealLinks,
  normalizeOfferUrl,
  offerKeys,
  type JobAlertOffer,
} from './job-alerts';

describe('extractLinks', () => {
  it('reads https links with their text, once each', () => {
    const html =
      '<a href="https://www.linkedin.com/comm/jobs/view/123?trk=eml&amp;refId=x"><b>Développeur</b> Full Stack</a>' +
      '<a href="https://www.linkedin.com/comm/jobs/view/123?trk=eml&amp;refId=x">again</a>' +
      '<a href="mailto:x@y.z">mail</a><a href="http://insecure.example">http</a>';
    expect(extractLinks(html)).toEqual([
      {
        text: 'Développeur Full Stack',
        url: 'https://www.linkedin.com/comm/jobs/view/123?trk=eml&refId=x',
      },
    ]);
  });
});

describe('normalizeOfferUrl', () => {
  it('unwraps LinkedIn and Indeed links', () => {
    expect(
      normalizeOfferUrl(
        'https://www.linkedin.com/comm/jobs/view/4012345678/?trackingId=abc&refId=x'
      )
    ).toBe('https://www.linkedin.com/jobs/view/4012345678');
    expect(normalizeOfferUrl('https://fr.indeed.com/rc/clk?jk=abc123&from=ja&tk=zz')).toBe(
      'https://fr.indeed.com/viewjob?jk=abc123'
    );
  });

  it('removes tracking parameters and keeps the others', () => {
    expect(
      normalizeOfferUrl(
        'https://www.welcometothejungle.com/fr/companies/acme/jobs/dev?utm_source=alert&o=12#top'
      )
    ).toBe('https://www.welcometothejungle.com/fr/companies/acme/jobs/dev?o=12');
    expect(normalizeOfferUrl('http://example.com/job')).toBeNull();
    expect(normalizeOfferUrl('not a url')).toBeNull();
  });
});

describe('offerKeys', () => {
  it('matches the same offer seen on two sites by company and title', () => {
    const a = offerKeys({
      url: null,
      company: 'Nova Santé SAS',
      title: 'Développeur Full Stack (H/F)',
    });
    const b = offerKeys({
      url: 'https://www.hellowork.com/fr-fr/emplois/1.html',
      company: 'Nova Santé',
      title: 'Développeur full stack',
    });
    expect(a.some((key) => b.includes(key))).toBe(true);
  });
});

describe('alertSource', () => {
  it('names the job board from the sender domain', () => {
    expect(alertSource({ name: 'LinkedIn Job Alerts', domain: 'linkedin.com' })).toBe('LinkedIn');
    expect(alertSource({ name: 'WTTJ', domain: 'alerts.welcometothejungle.com' })).toBe(
      'Welcome to the Jungle'
    );
    expect(alertSource({ name: 'France Travail', domain: 'info.francetravail.fr' })).toBe(
      'France Travail'
    );
    expect(alertSource({ name: 'Jobs Acme', domain: 'acme.io' })).toBe('Jobs Acme');
  });
});

describe('keepRealLinks', () => {
  it('drops a URL that is not in the mail', () => {
    const offer: JobAlertOffer = {
      title: 'Dev',
      company: 'Acme',
      location: '',
      contractType: 'PERMANENT',
      url: 'https://invented.example/job',
    };
    const real = { ...offer, url: 'https://acme.io/jobs/1' };
    expect(keepRealLinks([offer, real], [{ text: 'Dev', url: 'https://acme.io/jobs/1' }])).toEqual([
      { ...offer, url: '' },
      real,
    ]);
  });
});
