// Video games: franchises in story order, « Ensuite dans la franchise », play time.
// Pure, unit-tested. No XP for leisure.

export type GameStatusKey = 'NOT_STARTED' | 'PLAYING' | 'PAUSED' | 'FINISHED' | 'DROPPED';

export const GAME_STATUS_LABELS: Record<GameStatusKey, string> = {
  NOT_STARTED: 'Pas commencé',
  PLAYING: 'En cours',
  PAUSED: 'En pause',
  FINISHED: 'Terminé',
  DROPPED: 'Abandonné',
};

export const GAME_STATUSES = Object.keys(GAME_STATUS_LABELS) as GameStatusKey[];

export type GameLite = {
  id: string;
  title: string;
  franchise: string | null;
  storyOrder: number | null;
  status: GameStatusKey;
  updatedAt: Date;
};

export const NO_FRANCHISE = 'Sans franchise';

// Chips: franchises by number of games, « Sans franchise » last.
export function franchises(games: GameLite[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const game of games) {
    const name = game.franchise?.trim() || NO_FRANCHISE;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort(
      (a, b) =>
        Number(a.name === NO_FRANCHISE) - Number(b.name === NO_FRANCHISE) ||
        b.count - a.count ||
        a.name.localeCompare(b.name, 'fr')
    );
}

// Story order first (games without a position at the end), then title.
export function storyOrder<T extends GameLite>(games: T[]): T[] {
  return [...games].sort(
    (a, b) =>
      (a.storyOrder ?? Number.POSITIVE_INFINITY) - (b.storyOrder ?? Number.POSITIVE_INFINITY) ||
      a.title.localeCompare(b.title, 'fr')
  );
}

// The game being played: the most recently updated « En cours » one.
export function currentGame<T extends GameLite>(games: T[]): T | null {
  return (
    games
      .filter((game) => game.status === 'PLAYING')
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null
  );
}

// « Ensuite dans la franchise »: the next game in story order not played yet (or paused).
export function nextInFranchise<T extends GameLite>(games: T[], current: T | null): T | null {
  if (!current?.franchise || current.storyOrder === null) return null;
  return (
    storyOrder(
      games.filter(
        (game) =>
          game.id !== current.id &&
          game.franchise === current.franchise &&
          game.storyOrder !== null &&
          game.storyOrder > current.storyOrder! &&
          (game.status === 'NOT_STARTED' || game.status === 'PAUSED')
      )
    )[0] ?? null
  );
}

// "45 min", "22 h", "22 h 30"
export function formatPlayTime(minutes: number | null): string {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
}

// "1 h 30", "90", "1,5" (hours), "45 min" → minutes. Null if not understood.
export function parsePlayTime(input: string): number | null {
  const text = input.trim().toLowerCase().replace(',', '.');
  if (!text) return null;
  const hm = text.match(/^(\d+(?:\.\d+)?)\s*h\s*(\d{1,2})?\s*(?:min)?$/);
  if (hm) return Math.round(Number(hm[1]) * 60 + Number(hm[2] ?? 0));
  const min = text.match(/^(\d+)\s*(?:min|mn|m)$/);
  if (min) return Number(min[1]);
  const plain = text.match(/^(\d+(?:\.\d+)?)$/);
  // A bare number is hours (play time is counted in hours).
  if (plain) return Math.round(Number(plain[1]) * 60);
  return null;
}

// Page title: "En cours : Assassin's Creed IV Black Flag."
export function describeGames(current: { title: string } | null, total: number): string {
  if (current) return `En cours : ${current.title}.`;
  if (total === 0) return 'Aucun jeu pour l’instant.';
  return `${total} jeu${total > 1 ? 'x' : ''}, aucun en cours.`;
}
