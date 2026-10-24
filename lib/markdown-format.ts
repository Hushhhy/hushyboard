// Toolbar of the note editor: inserts the Markdown syntax around the selected text. Pure,
// unit-tested; the result gives the new text and the selection to restore.

export type Edit = { text: string; start: number; end: number };

// "**" + selection + "**"; with nothing selected, a placeholder is inserted and selected.
export function wrapSelection(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string
): Edit {
  const inner = text.slice(start, end) || placeholder;
  const next = text.slice(0, start) + before + inner + after + text.slice(end);
  return { text: next, start: start + before.length, end: start + before.length + inner.length };
}

// A block (callout, collapsible) on its own lines, separated by a blank line from the text
// around, so it is never read as part of a paragraph.
function insertBlock(
  text: string,
  start: number,
  end: number,
  block: string,
  selectFrom: number,
  selectLength: number
): Edit {
  const beforeText = text.slice(0, start);
  const afterText = text.slice(end);
  const lead =
    beforeText === '' || beforeText.endsWith('\n\n')
      ? ''
      : beforeText.endsWith('\n')
        ? '\n'
        : '\n\n';
  const trail =
    afterText === '' || afterText.startsWith('\n\n')
      ? ''
      : afterText.startsWith('\n')
        ? '\n'
        : '\n\n';
  const offset = beforeText.length + lead.length;
  return {
    text: beforeText + lead + block + trail + afterText,
    start: offset + selectFrom,
    end: offset + selectFrom + selectLength,
  };
}

export const CALLOUT_OPTIONS = [
  { value: 'NOTE', label: 'Note' },
  { value: 'ASTUCE', label: 'Astuce' },
  { value: 'ATTENTION', label: 'Attention' },
  { value: 'IMPORTANT', label: 'Important' },
];

// > [!ASTUCE]
// > each selected line…
export function insertCallout(text: string, start: number, end: number, type: string): Edit {
  const body = text.slice(start, end).trim() || 'Ton texte';
  const head = `> [!${type}]\n`;
  const block =
    head +
    body
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
  // The first line of the body is selected, ready to be typed over.
  return insertBlock(text, start, end, block, head.length + 2, body.split('\n')[0].length);
}

// +++ Titre
// selection…
// +++
export function insertDetails(text: string, start: number, end: number): Edit {
  const body = text.slice(start, end).trim() || 'Contenu caché';
  const title = 'Voir la suite';
  return insertBlock(text, start, end, `+++ ${title}\n${body}\n+++`, 4, title.length);
}
