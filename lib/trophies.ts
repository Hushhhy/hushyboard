import type { Domain } from '@/components/ui/domain';

// Trophy catalogue (every area, no XP). Unlocks are stored in TrophyUnlock by key and never
// taken back. Pure: the counts come from lib/trophies-data.ts.

export type TrophyDefinition = {
  name: string;
  domain: Domain;
  // Shown on a locked trophy.
  condition: string;
  // Shown on an unlocked trophy and in its toast.
  feat: string;
};

// What the conditions are checked against.
export type TrophyStats = {
  applications: number;
  interviews: number;
  techInterviews: number;
  offers: number;
  coursesCompleted: number;
  certificationsObtained: number;
  level: number;
  goalsAchieved: number;
  gamesFinished: number;
  // Franchises of at least 2 games, all finished.
  franchisesCompleted: number;
  csvImports: number;
  // Months with at least one transaction.
  trackedMonths: number;
  // Months with at least 10 transactions, all of them categorized.
  sortedMonths: number;
};

type Entry = TrophyDefinition & { earned?: (stats: TrophyStats) => boolean };

const CATALOGUE = {
  // Career
  'first-application': {
    name: 'Premier pas',
    domain: 'career',
    condition: 'Suis ta première candidature.',
    feat: 'Première candidature suivie.',
    earned: (s) => s.applications >= 1,
  },
  'applications-10': {
    name: 'Fil d’Ariane',
    domain: 'career',
    condition: 'Suis 10 candidatures.',
    feat: '10 candidatures suivies.',
    earned: (s) => s.applications >= 10,
  },
  'applications-50': {
    name: 'Travaux d’Hercule',
    domain: 'career',
    condition: 'Suis 50 candidatures.',
    feat: '50 candidatures suivies.',
    earned: (s) => s.applications >= 50,
  },
  'first-interview': {
    name: 'Voix de l’oracle',
    domain: 'career',
    condition: 'Décroche un premier entretien.',
    feat: 'Premier entretien décroché.',
    earned: (s) => s.interviews >= 1,
  },
  'first-tech-interview': {
    name: 'Épreuve du labyrinthe',
    domain: 'career',
    condition: 'Passe un premier entretien technique.',
    feat: 'Premier entretien technique.',
    earned: (s) => s.techInterviews >= 1,
  },
  'first-offer': {
    name: 'Toison d’or',
    domain: 'career',
    condition: 'Décroche une première offre.',
    feat: 'Première offre décrochée.',
    earned: (s) => s.offers >= 1,
  },
  'first-course': {
    name: 'Disciple d’Athéna',
    domain: 'career',
    condition: 'Termine un premier cours.',
    feat: 'Premier cours terminé.',
    earned: (s) => s.coursesCompleted >= 1,
  },
  'courses-10': {
    name: 'Bibliothèque d’Alexandrie',
    domain: 'career',
    condition: 'Termine 10 cours.',
    feat: '10 cours terminés.',
    earned: (s) => s.coursesCompleted >= 10,
  },
  'first-certification': {
    name: 'Couronne de laurier',
    domain: 'career',
    condition: 'Obtiens une première certification.',
    feat: 'Première certification obtenue.',
    earned: (s) => s.certificationsObtained >= 1,
  },
  'level-5': {
    name: 'À bord de l’Argo',
    domain: 'career',
    condition: 'Atteins le niveau 5, Argonaute.',
    feat: 'Niveau 5 atteint.',
    earned: (s) => s.level >= 5,
  },
  // Habits: the streak trophies are checked when a habit is ticked (lib/habits).
  'habit-streak-7': {
    name: 'Semaine tenue',
    domain: 'habits',
    condition: 'Tiens une habitude 7 jours de suite.',
    feat: 'Une habitude tenue 7 jours de suite.',
  },
  'habit-streak-30': {
    name: 'Mois tenu',
    domain: 'habits',
    condition: 'Tiens une habitude 30 jours de suite.',
    feat: 'Une habitude tenue 30 jours de suite.',
  },
  'habit-streak-100': {
    name: 'Centurion',
    domain: 'habits',
    condition: 'Tiens une habitude 100 jours de suite.',
    feat: 'Une habitude tenue 100 jours de suite.',
  },
  'first-goal': {
    name: 'Cap tenu',
    domain: 'habits',
    condition: 'Atteins un premier objectif.',
    feat: 'Premier objectif atteint.',
    earned: (s) => s.goalsAchieved >= 1,
  },
  'goals-5': {
    name: 'Constellation',
    domain: 'habits',
    condition: 'Atteins 5 objectifs.',
    feat: '5 objectifs atteints.',
    earned: (s) => s.goalsAchieved >= 5,
  },
  // Leisure
  'first-game-finished': {
    name: 'Fin de quête',
    domain: 'leisure',
    condition: 'Termine un premier jeu.',
    feat: 'Premier jeu terminé.',
    earned: (s) => s.gamesFinished >= 1,
  },
  'games-finished-10': {
    name: 'Odyssée',
    domain: 'leisure',
    condition: 'Termine 10 jeux.',
    feat: '10 jeux terminés.',
    earned: (s) => s.gamesFinished >= 10,
  },
  'franchise-completed': {
    name: 'Saga complète',
    domain: 'leisure',
    condition: 'Termine tous les jeux d’une franchise (au moins 2).',
    feat: 'Une franchise terminée en entier.',
    earned: (s) => s.franchisesCompleted >= 1,
  },
  // Finance
  'first-import': {
    name: 'Premier relevé',
    domain: 'finance',
    condition: 'Importe un premier relevé bancaire.',
    feat: 'Premier relevé importé.',
    earned: (s) => s.csvImports >= 1,
  },
  'months-3': {
    name: 'Trésor de Crésus',
    domain: 'finance',
    condition: 'Suis tes comptes sur 3 mois.',
    feat: '3 mois de comptes suivis.',
    earned: (s) => s.trackedMonths >= 3,
  },
  'month-sorted': {
    name: 'Balance de Thémis',
    domain: 'finance',
    condition: 'Classe toutes les transactions d’un mois (au moins 10).',
    feat: 'Un mois entièrement classé.',
    earned: (s) => s.sortedMonths >= 1,
  },
} satisfies Record<string, Entry>;

export type TrophyKey = keyof typeof CATALOGUE;

export const TROPHIES: Record<string, TrophyDefinition> = CATALOGUE;
export const TROPHY_KEYS = Object.keys(CATALOGUE) as TrophyKey[];

// Keys whose condition is met, in catalogue order (habit streaks excluded: see above).
export function earnedTrophies(stats: TrophyStats): TrophyKey[] {
  return TROPHY_KEYS.filter((key) => {
    const entry: Entry = CATALOGUE[key];
    return entry.earned?.(stats) ?? false;
  });
}

// Franchises of at least 2 games that can end, all finished.
export function completedFranchises(
  games: { franchise: string | null; status: string; endless?: boolean }[]
): number {
  const byFranchise = new Map<string, { total: number; finished: number }>();
  for (const game of games) {
    const name = game.franchise?.trim().toLowerCase();
    // An endless game (MMO) cannot be finished: it does not block the franchise.
    if (!name || game.endless) continue;
    const entry = byFranchise.get(name) ?? { total: 0, finished: 0 };
    entry.total += 1;
    if (game.status === 'FINISHED') entry.finished += 1;
    byFranchise.set(name, entry);
  }
  return [...byFranchise.values()].filter((item) => item.total >= 2 && item.finished === item.total)
    .length;
}

// Month counts from transactions counted per day (a database group by, not every line):
// tracked months, and months fully sorted (10+ lines, none uncategorized).
export function financeMonths(days: { date: Date; count: number; uncategorized: number }[]): {
  trackedMonths: number;
  sortedMonths: number;
} {
  const months = new Map<string, { total: number; uncategorized: number }>();
  for (const day of days) {
    const key = day.date.toISOString().slice(0, 7);
    const entry = months.get(key) ?? { total: 0, uncategorized: 0 };
    entry.total += day.count;
    entry.uncategorized += day.uncategorized;
    months.set(key, entry);
  }
  return {
    trackedMonths: months.size,
    sortedMonths: [...months.values()].filter((m) => m.total >= 10 && m.uncategorized === 0).length,
  };
}
