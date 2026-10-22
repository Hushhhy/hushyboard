// Search, filters and groups of the « Référence » tab. Pure, unit-tested, used client side.

export type ReferenceFilter = 'all' | 'common' | 'unknown' | 'favorites';

export const REFERENCE_FILTERS: { value: ReferenceFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'common', label: 'Courantes' },
  { value: 'unknown', label: 'Non connues' },
  { value: 'favorites', label: 'Favoris' },
];

export type ReferenceRow = {
  id: string;
  name: string;
  group: string;
  summary: string | null;
  isCommon: boolean;
  isDeprecated: boolean;
  known: boolean;
  favorite: boolean;
};

// Lower case, without accents: « Écran » matches « ecran ».
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function matchesReference(
  row: ReferenceRow,
  options: { query: string; filter: ReferenceFilter; showDeprecated: boolean }
): boolean {
  if (row.isDeprecated && !options.showDeprecated) return false;
  if (options.filter === 'common' && !row.isCommon) return false;
  if (options.filter === 'unknown' && row.known) return false;
  if (options.filter === 'favorites' && !row.favorite) return false;
  const query = normalizeSearch(options.query);
  if (!query) return true;
  return normalizeSearch(`${row.name} ${row.summary ?? ''}`).includes(query);
}

export type ReferenceGroup<T extends ReferenceRow> = {
  name: string;
  // Counts over the whole group (deprecated entries only when shown), not just the visible rows.
  known: number;
  total: number;
  rows: T[];
};

// Fallback groups go last; the others by size, largest first.
const LAST_GROUPS = new Set(['Autres', 'Fonctions globales']);

export function groupReference<T extends ReferenceRow>(
  rows: T[],
  options: { query: string; filter: ReferenceFilter; showDeprecated: boolean }
): ReferenceGroup<T>[] {
  const groups = new Map<string, ReferenceGroup<T>>();
  for (const row of rows) {
    if (row.isDeprecated && !options.showDeprecated) continue;
    let group = groups.get(row.group);
    if (!group) {
      group = { name: row.group, known: 0, total: 0, rows: [] };
      groups.set(row.group, group);
    }
    group.total += 1;
    if (row.known) group.known += 1;
    if (matchesReference(row, options)) group.rows.push(row);
  }
  for (const group of groups.values()) {
    group.rows.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }
  return [...groups.values()]
    .filter((group) => group.rows.length > 0)
    .sort((a, b) => {
      const last = Number(LAST_GROUPS.has(a.name)) - Number(LAST_GROUPS.has(b.name));
      return last || b.total - a.total || a.name.localeCompare(b.name, 'fr');
    });
}
