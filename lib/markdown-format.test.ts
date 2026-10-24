import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';
import { insertCallout, insertDetails, wrapSelection } from './markdown-format';

describe('wrapSelection', () => {
  it('wraps the selection and keeps it selected', () => {
    const edit = wrapSelection('un mot ici', 3, 6, '[', ']{rouge}', 'texte');
    expect(edit.text).toBe('un [mot]{rouge} ici');
    expect(edit.text.slice(edit.start, edit.end)).toBe('mot');
  });

  it('inserts and selects a placeholder when nothing is selected', () => {
    const edit = wrapSelection('ab', 1, 1, '**', '**', 'gras');
    expect(edit.text).toBe('a**gras**b');
    expect(edit.text.slice(edit.start, edit.end)).toBe('gras');
  });
});

describe('insertCallout and insertDetails', () => {
  it('puts the callout on its own lines, each selected line quoted', () => {
    const text = 'Avant.\nligne 1\nligne 2\nAprès.';
    const edit = insertCallout(text, 7, 22, 'ASTUCE');
    expect(edit.text).toBe('Avant.\n\n> [!ASTUCE]\n> ligne 1\n> ligne 2\n\nAprès.');
    expect(edit.text.slice(edit.start, edit.end)).toBe('ligne 1');
    expect(renderMarkdown(edit.text)).toContain('md-callout-tip');
  });

  it('inserts a collapsible block with its title selected', () => {
    const edit = insertDetails('', 0, 0);
    expect(edit.text).toBe('+++ Voir la suite\nContenu caché\n+++');
    expect(edit.text.slice(edit.start, edit.end)).toBe('Voir la suite');
    expect(renderMarkdown(edit.text)).toContain('<details><summary>Voir la suite</summary>');
  });
});
