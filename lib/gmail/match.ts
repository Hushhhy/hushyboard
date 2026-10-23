// Recruiter replies: does a mail come from a company Alex applied to? Pure, unit-tested.

export type Sender = { name: string; email: string; domain: string };

// "Nova Santé · Recrutement <jobs@nova-sante.fr>" → name, email, domain.
export function parseSender(from: string | null | undefined): Sender {
  const value = (from ?? '').trim();
  const bracket = value.match(/^(.*)<([^>]+)>\s*$/);
  const email = (bracket ? bracket[2] : value).trim().toLowerCase();
  const name = (bracket ? bracket[1] : '').trim().replace(/^"|"$/g, '').trim();
  const domain = email.includes('@') ? email.split('@')[1] : '';
  return { name: name || email, email, domain };
}

const LEGAL_SUFFIXES = new Set([
  'sas',
  'sasu',
  'sa',
  'sarl',
  'eurl',
  'inc',
  'ltd',
  'llc',
  'gmbh',
  'bv',
  'ag',
  'plc',
  'corp',
  'co',
]);

// "Société Générale SA" → ["societe", "generale"].
export function companyWords(company: string): string[] {
  return company
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !LEGAL_SUFFIXES.has(word));
}

// Mailboxes and job boards: their domain says nothing about the employer.
const SHARED_DOMAINS = [
  'gmail',
  'googlemail',
  'outlook',
  'hotmail',
  'live',
  'yahoo',
  'icloud',
  'orange',
  'free',
  'laposte',
  'protonmail',
  'linkedin',
  'indeed',
  'welcometothejungle',
  'hellowork',
  'francetravail',
  'apec',
  'jobteaser',
  'greenhouse',
  'lever',
  'workable',
  'teamtailor',
  'smartrecruiters',
  'myworkday',
];

function domainLabels(domain: string): string[] {
  const parts = domain.split('.').filter(Boolean);
  // Drop the TLD ("fr", "com", "co.uk" keeps "co", harmless).
  return parts.slice(0, -1).map((part) => part.replace(/[^a-z0-9]/g, ''));
}

export function matchesCompany(sender: Sender, company: string): boolean {
  const words = companyWords(company);
  const compact = words.join('');
  if (compact.length < 3) return false;

  const labels = domainLabels(sender.domain);
  const shared = labels.some((label) => SHARED_DOMAINS.includes(label));
  if (!shared && labels.includes(compact)) return true;

  // Whole words in the display name: "Alan" matches "Alan · Recrutement", not "Alana".
  const nameWords = ` ${companyWords(sender.name).join(' ')} `;
  return nameWords.includes(` ${words.join(' ')} `);
}

// The application a mail answers: the most recent one with a matching company.
export function findApplication<T extends { company: string; sentAt: Date }>(
  sender: Sender,
  applications: T[]
): T | null {
  return (
    applications
      .filter((application) => matchesCompany(sender, application.company))
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0] ?? null
  );
}
