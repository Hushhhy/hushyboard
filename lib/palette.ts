// ⌘K palette: commands and accent-insensitive search. Pure, unit-tested.

export type PaletteLink = { label: string; href: string; keywords?: string[] };

// « Aller à … »
export const PALETTE_PAGES: PaletteLink[] = [
  { label: 'Accueil', href: '/' },
  { label: 'Mails', href: '/mail', keywords: ['gmail', 'boîte'] },
  { label: 'Profil', href: '/career/profile', keywords: ['compétences', 'skills'] },
  { label: 'Projets', href: '/career/projects', keywords: ['github'] },
  { label: 'CV', href: '/career/resume', keywords: ['resume'] },
  { label: 'Certifications', href: '/career/certifications' },
  { label: 'Cours', href: '/career/courses' },
  { label: 'Candidatures', href: '/career/job-search', keywords: ['recherches pro'] },
  { label: 'Veille', href: '/career/job-search/watch', keywords: ['offres'] },
  { label: 'Candidatures spontanées', href: '/career/job-search/spontaneous' },
  { label: 'Analyses des candidatures', href: '/career/job-search/analytics' },
  { label: 'Progression', href: '/career/progress', keywords: ['xp', 'niveau'] },
  { label: 'Habitudes', href: '/habits' },
  { label: 'Historique des habitudes', href: '/habits/history' },
  { label: 'Objectifs', href: '/habits/goals' },
  { label: 'Jeux vidéo', href: '/leisure/games', keywords: ['loisirs'] },
  { label: 'Finances', href: '/finance', keywords: ['budget', 'mois'] },
  { label: 'Transactions', href: '/finance/transactions' },
  { label: 'Import CSV', href: '/finance/import', keywords: ['relevé', 'banque'] },
  { label: 'Vitrine', href: '/trophies', keywords: ['trophées'] },
  { label: 'Mentions légales', href: '/legal' },
];

// « Ajouter … »: each one opens the side panel of its page.
export const PALETTE_ADD: PaletteLink[] = [
  { label: 'Ajouter une dépense', href: '/finance?panel=transaction-new', keywords: ['revenu'] },
  { label: 'Ajouter une offre', href: '/career/job-search/watch?panel=offer-new' },
  { label: 'Ajouter une candidature', href: '/career/job-search?panel=application-new' },
  { label: 'Nouvelle habitude', href: '/habits?panel=habit-new' },
  { label: 'Nouvel objectif', href: '/habits/goals?panel=goal-new' },
  { label: 'Ajouter un cours', href: '/career/courses?panel=course-new' },
  { label: 'Ajouter une certification', href: '/career/certifications?panel=certification-new' },
  { label: 'Ajouter un jeu', href: '/leisure/games?panel=game-new' },
];

// "Dépense" → "depense".
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// cmdk filter: 1 when every word of the search starts a word of the command (or its
// keywords), 0.5 when it appears inside one, 0 otherwise. "dep" finds « Ajouter une dépense ».
export function paletteScore(value: string, search: string, keywords: string[] = []): number {
  const words = normalizeSearch(search).split(' ').filter(Boolean);
  if (words.length === 0) return 1;
  const haystack = normalizeSearch([value, ...keywords].join(' '));
  const starts = haystack.split(' ');
  let score = 1;
  for (const word of words) {
    if (starts.some((part) => part.startsWith(word))) continue;
    if (haystack.includes(word)) score = Math.min(score, 0.5);
    else return 0;
  }
  return score;
}
