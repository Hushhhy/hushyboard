import { describe, expect, it } from 'vitest';
import { normalizeSearch, PALETTE_ADD, PALETTE_PAGES, paletteScore } from './palette';

describe('normalizeSearch', () => {
  it('drops accents, case and apostrophes', () => {
    expect(normalizeSearch('  Dépense d’Élan ')).toBe('depense d elan');
  });
});

describe('paletteScore', () => {
  it('ignores accents (« depense » finds « dépense »)', () => {
    expect(paletteScore('Ajouter une dépense', 'depense')).toBe(1);
    expect(paletteScore('Ajouter une dépense', 'DÉP')).toBe(1);
  });

  it('needs every word, and ranks word starts above inner matches', () => {
    expect(paletteScore('Cocher Sport', 'cocher sp')).toBe(1);
    expect(paletteScore('Cocher Sport', 'port')).toBe(0.5);
    expect(paletteScore('Cocher Sport', 'cocher lecture')).toBe(0);
  });

  it('searches the keywords too, and keeps everything for an empty search', () => {
    expect(paletteScore('Vitrine', 'troph', ['trophées'])).toBe(1);
    expect(paletteScore('Vitrine', '  ')).toBe(1);
  });
});

describe('palette commands', () => {
  it('has unique labels and internal links', () => {
    const all = [...PALETTE_PAGES, ...PALETTE_ADD];
    expect(new Set(all.map((item) => item.label)).size).toBe(all.length);
    for (const item of all) expect(item.href.startsWith('/')).toBe(true);
  });
});
