import { z } from 'zod';
import { companyWords } from '@/lib/gmail/match';
import { CONTRACT_TYPES } from '@/lib/job-search-schemas';

// « Veille automatique »: job offers read from job-alert mails (LinkedIn, Welcome to the
// Jungle, HelloWork, Indeed, France Travail, APEC…). Pure, unit-tested.

export type MailLink = { text: string; url: string };

const decode = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

// The links of a mail with their text, for Gemini to pick each offer's own link.
export function extractLinks(html: string, max = 150): MailLink[] {
  const seen = new Set<string>();
  const links: MailLink[] = [];
  for (const match of html.matchAll(
    /<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  )) {
    const url = decode(match[1].trim());
    if (!/^https:\/\//i.test(url) || seen.has(url)) continue;
    const text = decode(match[2].replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    seen.add(url);
    links.push({ text: text.slice(0, 160), url });
    if (links.length >= max) break;
  }
  return links;
}

// Tracking parameters added by job boards and mailers.
const TRACKING =
  /^(utm_|trk|tracking|ref|lipi|midtoken|midsig|eid|otptoken|ssid|mc_|_hs|fbclid|gclid|from|src|campaign|alert|origin|position|pagenum|xid)/i;

// Same offer, same URL: tracking removed, LinkedIn's « comm » redirect pages unwrapped,
// Indeed reduced to its job key. Null when not a usable https link.
export function normalizeOfferUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  url.hash = '';
  const host = url.hostname.replace(/^www\./, '');
  if (host.endsWith('linkedin.com')) {
    const id = url.pathname.match(/\/jobs\/view\/(?:[^/]*?-)?(\d+)/)?.[1];
    if (id) return `https://www.linkedin.com/jobs/view/${id}`;
  }
  if (host.includes('indeed.')) {
    const key = url.searchParams.get('jk') ?? url.searchParams.get('vjk');
    if (key) return `https://${url.hostname}/viewjob?jk=${key}`;
  }
  for (const name of [...url.searchParams.keys()]) {
    if (TRACKING.test(name)) url.searchParams.delete(name);
  }
  url.searchParams.sort();
  return url.toString().replace(/\?$/, '').replace(/\/$/, '');
}

// Duplicate check across sites: the clean URL, else company and title.
export function offerKeys(offer: { url: string | null; company: string; title: string }): string[] {
  const keys: string[] = [];
  const url = normalizeOfferUrl(offer.url);
  if (url) keys.push(url);
  const words = (text: string) => companyWords(text).join(' ');
  const company = words(offer.company);
  const title = words(offer.title.replace(/\((h\/f|f\/h|m\/f|f\/m)\)/gi, ''));
  if (company && title) keys.push(`${company}|${title}`);
  return keys;
}

const SOURCES: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)(welcometothejungle\.com|wttj\.co)$/, 'Welcome to the Jungle'],
  [/(^|\.)hellowork\.(com|fr)$/, 'HelloWork'],
  [/(^|\.)indeed\.(com|fr)$/, 'Indeed'],
  [/(^|\.)(francetravail\.fr|pole-emploi\.fr)$/, 'France Travail'],
  [/(^|\.)apec\.fr$/, 'APEC'],
  [/(^|\.)jobteaser\.com$/, 'JobTeaser'],
  [/(^|\.)glassdoor\.(com|fr)$/, 'Glassdoor'],
  [/(^|\.)monster\.(com|fr)$/, 'Monster'],
  [/(^|\.)cadremploi\.fr$/, 'Cadremploi'],
];

// The site an alert comes from, by the sender's domain; else the sender's name.
export function alertSource(sender: { name: string; domain: string }): string {
  return SOURCES.find(([pattern]) => pattern.test(sender.domain))?.[1] ?? sender.name;
}

// What Gemini returns for one alert mail.
export const jobAlertSchema = z.object({
  offers: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160).describe('Job title as written'),
        company: z.string().trim().min(1).max(120).describe('Hiring company, never the job board'),
        location: z.string().trim().max(120).describe('City or area, empty if absent'),
        contractType: z
          .enum(CONTRACT_TYPES)
          .describe(
            'INTERNSHIP = stage, APPRENTICESHIP = alternance, PERMANENT = CDI, FIXED_TERM = CDD, VIE, FREELANCE, OTHER if unclear'
          ),
        url: z
          .string()
          .trim()
          .max(2000)
          .describe('The offer link, copied exactly from the list of links; empty if none'),
      })
    )
    .max(40),
});
export type JobAlertOffer = z.infer<typeof jobAlertSchema>['offers'][number];

const MAX_TEXT = 12_000;

export function jobAlertPrompt(input: {
  from: string;
  subject: string;
  text: string;
  links: MailLink[];
}) {
  return `This mail is a job alert from a job board. List the job offers it contains.
Rules:
- Only real job offers listed in the mail. Ignore ads, courses, articles, "jobs you may like" banners
  without a company, and the settings or unsubscribe links.
- Copy title, company and location as written; the company is the employer, not the job board.
- For each offer, "url" is the link of that offer copied exactly from the list below, or empty.
  Never build or change a URL.

From: ${input.from}
Subject: ${input.subject}
Text:
"""
${input.text.slice(0, MAX_TEXT)}
"""
Links (text → URL):
${input.links.map((link, index) => `${index + 1}. ${link.text || '(sans texte)'} → ${link.url}`).join('\n')}`;
}

// Keeps what Gemini returned only if its link really is in the mail (no invented URL).
export function keepRealLinks(offers: JobAlertOffer[], links: MailLink[]): JobAlertOffer[] {
  const urls = new Set(links.map((link) => link.url));
  return offers.map((offer) => ({ ...offer, url: urls.has(offer.url) ? offer.url : '' }));
}
