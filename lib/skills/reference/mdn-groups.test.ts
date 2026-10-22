import { describe, expect, it } from 'vitest';
import { cssPropertyGroup, cssSelectorName, htmlElementGroup, jsObjectGroup } from './mdn-groups';

describe('cssPropertyGroup', () => {
  it.each([
    ['justify-content', 'Mise en page'],
    ['grid-template-columns', 'Mise en page'],
    ['display', 'Mise en page'],
    ['margin-inline-start', 'Boîte'],
    ['aspect-ratio', 'Boîte'],
    ['font-weight', 'Texte'],
    ['letter-spacing', 'Texte'],
    ['background-color', 'Couleurs et fonds'],
    ['border-radius', 'Bordures'],
    ['box-shadow', 'Effets'],
    ['border-collapse', 'Tableaux'],
    ['transition-duration', 'Animations'],
    ['translate', 'Transformations'],
    ['scroll-snap-type', 'Interaction et défilement'],
    ['stroke-width', 'SVG'],
    ['page-break-after', 'Impression'],
    ['row-rule-color', 'Mise en page'],
    ['made-up-property', 'Autres'],
  ])('%s → %s', (name, group) => {
    expect(cssPropertyGroup(name)).toBe(group);
  });
});

describe('cssSelectorName', () => {
  it('writes selectors as in a stylesheet', () => {
    expect(cssSelectorName('hover')).toBe(':hover');
    expect(cssSelectorName('before')).toBe('::before');
    expect(cssSelectorName('placeholder')).toBe('::placeholder');
    expect(cssSelectorName('class')).toBe('.classe');
    expect(cssSelectorName('child')).toBe('A > B');
    expect(cssSelectorName('view-transition-old')).toBe('::view-transition-old');
  });
});

describe('htmlElementGroup', () => {
  it('groups tags by purpose', () => {
    expect(htmlElementGroup('main')).toBe('Structure');
    expect(htmlElementGroup('input')).toBe('Formulaires');
    expect(htmlElementGroup('dialog')).toBe('Interactif');
    expect(htmlElementGroup('td')).toBe('Tableaux');
    expect(htmlElementGroup('marquee')).toBe('Autres');
  });
});

describe('jsObjectGroup', () => {
  it('groups built-ins by family', () => {
    expect(jsObjectGroup('Array')).toBe('Tableaux');
    expect(jsObjectGroup('Promise')).toBe('Asynchrone');
    expect(jsObjectGroup('TypeError')).toBe('Erreurs');
    expect(jsObjectGroup('Uint8Array')).toBe('Données binaires');
    expect(jsObjectGroup('parseInt')).toBe('Fonctions globales');
  });
});
