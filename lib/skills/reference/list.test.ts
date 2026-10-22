import { describe, expect, it } from 'vitest';
import { docLink } from './labels';
import { groupReference, matchesReference, normalizeSearch, type ReferenceRow } from './list';

const row = (overrides: Partial<ReferenceRow>): ReferenceRow => ({
  id: overrides.name ?? 'x',
  name: 'display',
  group: 'Mise en page',
  summary: null,
  isCommon: false,
  isDeprecated: false,
  known: false,
  favorite: false,
  ...overrides,
});

const options = { query: '', filter: 'all' as const, showDeprecated: false };

describe('normalizeSearch', () => {
  it('ignores case and accents', () => {
    expect(normalizeSearch('  Élément ÉCRAN ')).toBe('element ecran');
  });
});

describe('matchesReference', () => {
  it('searches the name and the summary without accents', () => {
    const entry = row({ name: 'justify-content', summary: 'Alignement sur l’axe' });
    expect(matchesReference(entry, { ...options, query: 'JUSTIFY' })).toBe(true);
    expect(matchesReference(entry, { ...options, query: 'axe' })).toBe(true);
    expect(matchesReference(row({ summary: 'Écran' }), { ...options, query: 'ecran' })).toBe(true);
    expect(matchesReference(entry, { ...options, query: 'grid' })).toBe(false);
  });

  it('applies the filter chips', () => {
    expect(matchesReference(row({ isCommon: true }), { ...options, filter: 'common' })).toBe(true);
    expect(matchesReference(row({}), { ...options, filter: 'common' })).toBe(false);
    expect(matchesReference(row({ known: true }), { ...options, filter: 'unknown' })).toBe(false);
    expect(matchesReference(row({ favorite: true }), { ...options, filter: 'favorites' })).toBe(
      true
    );
  });

  it('hides deprecated entries unless asked', () => {
    expect(matchesReference(row({ isDeprecated: true }), options)).toBe(false);
    expect(
      matchesReference(row({ isDeprecated: true }), { ...options, showDeprecated: true })
    ).toBe(true);
  });
});

describe('groupReference', () => {
  const rows = [
    row({ name: 'gap', isCommon: true, known: true }),
    row({ name: 'display', isCommon: true }),
    row({ name: 'order' }),
    row({ name: 'margin', group: 'Boîte', known: true }),
    row({ name: 'zoom', group: 'Autres' }),
    row({ name: 'zoom', group: 'Autres' }),
    row({ name: 'zoom', group: 'Autres' }),
    row({ name: 'old', group: 'Boîte', isDeprecated: true, known: true }),
  ];

  it('counts known / total over the whole group, not only the visible rows', () => {
    const groups = groupReference(rows, { ...options, filter: 'common' });
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ name: 'Mise en page', known: 1, total: 3 });
    expect(groups[0].rows.map((item) => item.name)).toEqual(['display', 'gap']);
  });

  it('orders groups by size, fallback groups last', () => {
    expect(groupReference(rows, options).map((group) => group.name)).toEqual([
      'Mise en page',
      'Boîte',
      'Autres',
    ]);
  });

  it('counts deprecated entries only when they are shown', () => {
    const box = (showDeprecated: boolean) =>
      groupReference(rows, { ...options, showDeprecated }).find((group) => group.name === 'Boîte');
    expect(box(false)).toMatchObject({ known: 1, total: 1 });
    expect(box(true)).toMatchObject({ known: 2, total: 2 });
  });
});

describe('docLink', () => {
  it('labels MDN links and rejects other protocols', () => {
    expect(docLink('https://developer.mozilla.org/fr/docs/Web/CSS/gap')?.label).toBe('MDN');
    expect(docLink('https://git-scm.com/docs/git-rebase')?.label).toBe('Documentation');
    expect(docLink('javascript:alert(1)')).toBeNull();
    expect(docLink('not a url')).toBeNull();
    expect(docLink('')).toBeNull();
  });
});
