import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

// GitHub-flavoured Markdown (tables, fenced code, task lists, strikethrough), line breaks kept
// as written, like GitHub comments.
const marked = new Marked({ gfm: true, breaks: true, async: false });

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
  ],
  allowedAttributes: {
    // target and rel are set by transformTags below.
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    code: ['class'],
    th: ['align'],
    td: ['align'],
    input: ['type', 'checked', 'disabled'],
  },
  allowedClasses: { code: [/^language-[\w+#-]+$/] },
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
