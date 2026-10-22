import sanitizeHtml from 'sanitize-html';

export type ReadmeContext = {
  owner: string;
  repo: string;
  branch: string;
  // Private repos: images go through our raw route (the browser has no access to the token).
  isPrivate: boolean;
  rawRoute: (path: string) => string;
};

const isAbsolute = (url: string) => /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//');

// "./docs/a.png", "docs/a.png", "/docs/a.png" → "docs/a.png" (README at the repo root).
function repoPath(url: string): string {
  const [path] = url.split(/[?#]/);
  const parts: string[] = [];
  for (const part of path.replace(/^\/+/, '').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

export function resolveReadmeLink(href: string, context: ReadmeContext): string {
  if (!href || href.startsWith('#') || isAbsolute(href)) return href;
  return `https://github.com/${context.owner}/${context.repo}/blob/${context.branch}/${repoPath(href)}`;
}

export function resolveReadmeImage(src: string, context: ReadmeContext): string {
  if (!src || isAbsolute(src)) return src;
  const path = repoPath(src);
  return context.isPrivate
    ? context.rawRoute(path)
    : `https://raw.githubusercontent.com/${context.owner}/${context.repo}/${context.branch}/${path}`;
}

// README HTML rendered by GitHub → safe HTML for the page: what a README uses, nothing that
// runs code; relative links and images rewritten so they still work outside GitHub.
export function sanitizeReadme(html: string, context: ReadmeContext): string {
  return sanitizeHtml(html, {
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
      'div',
      'span',
      'ul',
      'ol',
      'li',
      'input',
      'dl',
      'dt',
      'dd',
      'strong',
      'b',
      'em',
      'i',
      'del',
      's',
      'sup',
      'sub',
      'kbd',
      'code',
      'pre',
      'a',
      'img',
      'picture',
      'source',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'details',
      'summary',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'align', 'loading'],
      source: ['srcset', 'media'],
      code: ['class'],
      th: ['align'],
      td: ['align'],
      p: ['align'],
      div: ['align'],
      h1: ['align'],
      input: ['type', 'checked', 'disabled'],
    },
    allowedClasses: { code: [/^language-[\w+#-]+$/] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https'], source: ['https'] },
    transformTags: {
      a: (tagName, attribs) => {
        const href = resolveReadmeLink(attribs.href ?? '', context);
        // In-page anchors stay in the page; everything else opens GitHub or the site in a new tab.
        return href.startsWith('#')
          ? { tagName, attribs: { ...attribs, href } }
          : {
              tagName,
              attribs: { ...attribs, href, target: '_blank', rel: 'noreferrer noopener' },
            };
      },
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          src: resolveReadmeImage(attribs.src ?? '', context),
          loading: 'lazy',
        },
      }),
      source: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, srcset: resolveReadmeImage(attribs.srcset ?? '', context) },
      }),
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
  });
}
