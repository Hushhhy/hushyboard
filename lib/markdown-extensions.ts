import type { TokenizerAndRendererExtension, Tokens } from 'marked';

// Markdown extensions of the course notes: colors, fonts and sizes from a fixed list (the
// theme tokens, readable on the dark background), highlight, underline, sub/superscript,
// keyboard keys, callouts and collapsible blocks. Every style is a class from these lists:
// the sanitizer keeps nothing else (see markdown.ts).

// French words typed by Alex → CSS classes (globals.css, section 4).
export const STYLE_CLASSES: Record<string, string> = {
  or: 'md-color-gold',
  bleu: 'md-color-blue',
  vert: 'md-color-green',
  orange: 'md-color-orange',
  rouge: 'md-color-red',
  rose: 'md-color-pink',
  violet: 'md-color-violet',
  gris: 'md-color-gray',
  titre: 'md-font-display',
  code: 'md-font-mono',
  petit: 'md-size-small',
  grand: 'md-size-large',
};

// Callout types, French and GitHub names → kind and title.
const CALLOUTS: Record<string, { kind: string; title: string }> = {
  note: { kind: 'note', title: 'Note' },
  astuce: { kind: 'tip', title: 'Astuce' },
  tip: { kind: 'tip', title: 'Astuce' },
  attention: { kind: 'warning', title: 'Attention' },
  warning: { kind: 'warning', title: 'Attention' },
  important: { kind: 'important', title: 'Important' },
  caution: { kind: 'important', title: 'Important' },
};

export const CALLOUT_KINDS = ['note', 'tip', 'warning', 'important'];

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// An inline extension "<open>text<close>" rendered as <tag>…</tag> (inline Markdown inside).
function wrapper(
  name: string,
  marker: string,
  pattern: RegExp,
  tag: string
): TokenizerAndRendererExtension {
  return {
    name,
    level: 'inline',
    start: (src) => {
      const index = src.indexOf(marker);
      return index === -1 ? undefined : index;
    },
    tokenizer(src) {
      const match = pattern.exec(src);
      if (!match) return undefined;
      return { type: name, raw: match[0], tokens: this.lexer.inlineTokens(match[1]) };
    },
    renderer(token) {
      return `<${tag}>${this.parser.parseInline(token.tokens ?? [])}</${tag}>`;
    },
  };
}

// [texte]{rouge grand}: unknown words are ignored; with no known word the text stays plain.
const styled: TokenizerAndRendererExtension = {
  name: 'styled',
  level: 'inline',
  start: (src) => {
    const index = src.search(/\[[^\]\n]+\]\{/);
    return index === -1 ? undefined : index;
  },
  tokenizer(src) {
    const match = /^\[([^\]\n]+)\]\{([^}\n]{1,60})\}/.exec(src);
    if (!match) return undefined;
    const classes = match[2]
      .toLowerCase()
      .split(/[\s,]+/)
      .map((word) => STYLE_CLASSES[word])
      .filter(Boolean);
    return {
      type: 'styled',
      raw: match[0],
      classes: [...new Set(classes)],
      tokens: this.lexer.inlineTokens(match[1]),
    };
  },
  renderer(token) {
    const inner = this.parser.parseInline(token.tokens ?? []);
    const classes = token.classes as string[];
    return classes.length ? `<span class="${classes.join(' ')}">${inner}</span>` : inner;
  },
};

// [[Ctrl]] → a keyboard key.
const kbd: TokenizerAndRendererExtension = {
  name: 'kbd',
  level: 'inline',
  start: (src) => {
    const index = src.indexOf('[[');
    return index === -1 ? undefined : index;
  },
  tokenizer(src) {
    const match = /^\[\[([^\][\n]{1,30})\]\]/.exec(src);
    if (!match) return undefined;
    return { type: 'kbd', raw: match[0], text: match[1] };
  },
  renderer(token) {
    return `<kbd>${escapeHtml(token.text)}</kbd>`;
  },
};

// > [!ASTUCE] Optional title
// > Content…
const callout: TokenizerAndRendererExtension = {
  name: 'callout',
  level: 'block',
  start: (src) => {
    const index = src.search(/^> ?\[!/m);
    return index === -1 ? undefined : index;
  },
  tokenizer(src) {
    const match = /^> ?\[!([a-zA-Z]+)\][ \t]*([^\n]*)(?:\n|$)((?:>[^\n]*(?:\n|$))*)/.exec(src);
    if (!match) return undefined;
    const type = CALLOUTS[match[1].toLowerCase()];
    if (!type) return undefined;
    const body = match[3]
      .split('\n')
      .map((line) => line.replace(/^> ?/, ''))
      .join('\n');
    return {
      type: 'callout',
      raw: match[0],
      kind: type.kind,
      titleTokens: this.lexer.inlineTokens(match[2].trim() || type.title),
      tokens: this.lexer.blockTokens(body),
    };
  },
  renderer(token) {
    const title = this.parser.parseInline(token.titleTokens as Tokens.Generic[]);
    return `<div class="md-callout md-callout-${token.kind}"><p class="md-callout-title">${title}</p>${this.parser.parse(token.tokens ?? [])}</div>`;
  },
};

// +++ Title
// Hidden content…
// +++
const details: TokenizerAndRendererExtension = {
  name: 'details',
  level: 'block',
  start: (src) => {
    const index = src.search(/^\+\+\+/m);
    return index === -1 ? undefined : index;
  },
  tokenizer(src) {
    const match = /^\+\+\+[ \t]*([^\n]*)\n([\s\S]*?)\n\+\+\+[ \t]*(?:\n|$)/.exec(src);
    if (!match) return undefined;
    return {
      type: 'details',
      raw: match[0],
      titleTokens: this.lexer.inlineTokens(match[1].trim() || 'Afficher'),
      tokens: this.lexer.blockTokens(match[2]),
    };
  },
  renderer(token) {
    const title = this.parser.parseInline(token.titleTokens as Tokens.Generic[]);
    return `<details><summary>${title}</summary>${this.parser.parse(token.tokens ?? [])}</details>\n`;
  },
};

export const MARKDOWN_EXTENSIONS: TokenizerAndRendererExtension[] = [
  callout,
  details,
  styled,
  kbd,
  wrapper('mark', '==', /^==(?=\S)([^\n]*?\S)==/, 'mark'),
  wrapper('underline', '++', /^\+\+(?=\S)([^\n]*?\S)\+\+/, 'u'),
  wrapper('sup', '^', /^\^([^\s^]{1,30})\^/, 'sup'),
  // A single tilde around a word without spaces is a subscript (H~2~O); "~~text~~" stays
  // struck through.
  wrapper('sub', '~', /^~(?!~)([^\s~]{1,30})~(?!~)/, 'sub'),
];
