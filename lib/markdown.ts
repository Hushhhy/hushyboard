import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { highlightCode } from './highlight';
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

// Names typed after ``` → Shiki grammars (everything else is passed as is; an unknown
// language stays plain text).
const LANGUAGE_ALIASES: Record<string, string> = {
  py: 'python',
  js: 'javascript',
  ts: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  yml: 'yaml',
  md: 'markdown',
  'c++': 'cpp',
  'c#': 'csharp',
  postgres: 'sql',
  postgresql: 'sql',
  psql: 'sql',
  mysql: 'sql',
  plpgsql: 'sql',
  html5: 'html',
};

const decodeEntities = (html: string) =>
  html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, '&');

// Notes and previews: the same rendering, with each ```language block colored by its
// grammar (Shiki, theme colors of the code view). Rendered at each display, so existing notes
// get their colors without being edited. Mermaid blocks are left for the browser to draw.
export async function renderMarkdownWithCode(source: string): Promise<string> {
  const html = renderMarkdown(source);
  const pattern = /<pre><code class="language-([\w+#-]+)">([\s\S]*?)<\/code><\/pre>/g;
  const blocks = [...html.matchAll(pattern)].filter(
    (match) => match[1].toLowerCase() !== 'mermaid'
  );
  if (blocks.length === 0) return html;
  // The highlighted code comes from Shiki, which escapes the code itself: it is added after
  // sanitizing, never mixed with the note's own HTML.
  const colored = await Promise.all(
    blocks.map(async ([, language, code]) => {
      const lang = language.toLowerCase();
      const highlighted = await highlightCode(
        decodeEntities(code).replace(/\n$/, ''),
        LANGUAGE_ALIASES[lang] ?? lang
      );
      return `<div class="code-view code-snippet" data-language="${lang}">${highlighted}</div>`;
    })
  );
  let index = 0;
  return html.replace(pattern, (match, language: string) =>
    language.toLowerCase() === 'mermaid' ? match : colored[index++]
  );
}

export function renderMarkdown(source: string): string {
  const html = marked.parse(source) as string;
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
