import { describe, expect, it } from 'vitest';
import { buildMdnEntries } from './mdn';

describe('buildMdnEntries (real MDN data)', () => {
  it('lists standard CSS properties with groups and MDN links', () => {
    const css = buildMdnEntries('css');
    const properties = css.filter((entry) => entry.kind === 'PROPERTY');
    expect(properties.length).toBeGreaterThan(400);
    const justify = css.find((entry) => entry.name === 'justify-content');
    expect(justify).toMatchObject({ kind: 'PROPERTY', group: 'Mise en page', isCommon: true });
    expect(justify?.docUrl).toContain('developer.mozilla.org');
    expect(css.some((entry) => entry.name === '@media' && entry.kind === 'AT_RULE')).toBe(true);
    expect(css.some((entry) => entry.name === ':hover' && entry.kind === 'SELECTOR')).toBe(true);
    // The hand-written rules must cover most properties.
    const others = properties.filter((entry) => entry.group === 'Autres').length;
    expect(others / properties.length).toBeLessThan(0.1);
  });

  it('lists HTML elements and global attributes', () => {
    const html = buildMdnEntries('html');
    expect(html.find((entry) => entry.name === '<dialog>')).toMatchObject({
      kind: 'ELEMENT',
      group: 'Interactif',
    });
    expect(html.some((entry) => entry.name === 'class' && entry.kind === 'ATTRIBUTE')).toBe(true);
  });

  it('names JS instance and static methods like the docs', () => {
    const js = buildMdnEntries('javascript');
    expect(js.find((entry) => entry.name === 'Array.prototype.map')).toMatchObject({
      kind: 'METHOD',
      group: 'Tableaux',
      isCommon: true,
    });
    expect(js.some((entry) => entry.name === 'Array.from')).toBe(true);
    expect(js.some((entry) => entry.name === 'Document.querySelector')).toBe(true);
  });

  it('has no duplicate name within a kind', () => {
    for (const skill of ['html', 'css', 'javascript'] as const) {
      const keys = buildMdnEntries(skill).map((entry) => `${entry.kind}:${entry.name}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
