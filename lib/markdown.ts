import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { CALLOUT_KINDS, MARKDOWN_EXTENSIONS, STYLE_CLASSES } from './markdown-extensions';

// GitHub-flavoured Markdown (tables, fenced code, task lists, strikethrough), line breaks kept
// as written, like GitHub comments, plus the styles of markdown-extensions.ts.
const marked = new Marked({
  gfm: true,
  breaks: true,
  async: false,
  extensions: MARKDOWN_EXTENSIONS,
});

// Only what Markdown produces. Everything else (scripts, styles, iframes, event handlers,
// javascript: links) is removed, so a note can never run code in the page.
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'blockquote',
    'ul',
    'ol',
    'li',
    'input',
    'strong',
    'em',
    'del',
    'code',
    'pre',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    // Styles of markdown-extensions.ts
    'span',
    'div',
    'mark',
    'u',
    'sup',
    'sub',
    'kbd',
    'details',
    'summary',
  ],
  allowedAttributes: {
    span: ['class'],
    div: ['class'],
    p: ['class'],
    // target and rel are set by transformTags below.
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    code: ['class'],
    th: ['align'],
    td: ['align'],
    input: ['type', 'checked', 'disabled'],
  },
  // Only the classes of the style lists: a note cannot bring its own colors or fonts.
  allowedClasses: {
    code: [/^language-[\w+#-]+$/],
    span: Object.values(STYLE_CLASSES),
    div: ['md-callout', ...CALLOUT_KINDS.map((kind) => `md-callout-${kind}`)],
    p: ['md-callout-title'],
  },
  allowedSchemes: ['https', 'http', 'mailto'],
  allowedSchemesByTag: { img: ['https'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noreferrer noopener' }),
    // Task list checkboxes are display only.
    input: (tagName, attribs) =>
      attribs.type === 'checkbox'
        ? {
            tagName,
            attribs: {
              type: 'checkbox',
              disabled: '',
              ...(attribs.checked !== undefined ? { checked: '' } : {}),
            },
          }
        : { tagName: 'span', attribs: {} },
  },
};

export function renderMarkdown(source: string): string {
  const html = marked.parse(source) as string;
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
