import sanitizeHtml from 'sanitize-html';

// Gmail message helpers: headers, body decoding, and a safe document for the reader iframe.
// Pure, unit-tested. Mail content only lives in memory for one request: never stored or logged.

export type MessagePart = {
  mimeType?: string | null;
  filename?: string | null;
  headers?: { name?: string | null; value?: string | null }[] | null;
  body?: { data?: string | null; size?: number | null } | null;
  parts?: MessagePart[] | null;
};

export function header(part: MessagePart | null | undefined, name: string): string {
  const wanted = name.toLowerCase();
  return part?.headers?.find((item) => item.name?.toLowerCase() === wanted)?.value ?? '';
}

// base64url bytes → text in the part's charset (UTF-8 when unknown or unsupported).
export function decodeBody(data: string, contentType = ''): string {
  const bytes = Buffer.from(data, 'base64url');
  const charset = contentType.match(/charset="?([\w.-]+)"?/i)?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

// The first HTML and the first plain-text bodies, attachments skipped.
export function extractBodies(payload: MessagePart | null | undefined): {
  html: string | null;
  text: string | null;
} {
  const found: { html: string | null; text: string | null } = { html: null, text: null };
  const walk = (part: MessagePart) => {
    if (part.filename) return;
    const data = part.body?.data;
    const type = (part.mimeType ?? '').toLowerCase();
    if (data && type === 'text/html' && found.html === null) {
      found.html = decodeBody(data, header(part, 'Content-Type'));
    } else if (data && type === 'text/plain' && found.text === null) {
      found.text = decodeBody(data, header(part, 'Content-Type'));
    }
    part.parts?.forEach(walk);
  };
  if (payload) walk(payload);
  return found;
}

// Mail layouts need tables, inline styles and <style>; scripts, forms, frames, event handlers
// and javascript: links are removed. Links open in a new tab.
const MAIL_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'style',
    'font',
    'center',
    'span',
    'u',
    's',
    'small',
    'big',
  ],
  allowVulnerableTags: true, // <style>: its URLs stay blocked by the CSP of the document
  allowedAttributes: {
    '*': ['style', 'align', 'valign', 'width', 'height', 'bgcolor', 'color', 'dir', 'class'],
    a: ['href', 'title', 'target', 'rel', 'style'],
    img: ['src', 'alt', 'title', 'width', 'height', 'style'],
    td: ['colspan', 'rowspan', 'style', 'align', 'valign', 'width', 'height', 'bgcolor'],
    th: ['colspan', 'rowspan', 'style', 'align', 'valign', 'width', 'height', 'bgcolor'],
    table: ['cellpadding', 'cellspacing', 'border', 'style', 'align', 'width', 'bgcolor', 'role'],
    font: ['color', 'face', 'size'],
  },
  allowedSchemes: ['https', 'http', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['https', 'http', 'data'] },
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noreferrer noopener' }),
  },
};

export function sanitizeMailHtml(html: string): string {
  return sanitizeHtml(html, MAIL_SANITIZE);
}

// Remote images are blocked until « Afficher les images » (they can track opening).
export function hasRemoteImages(html: string): boolean {
  return /<img[^>]+src\s*=\s*["']?https?:/i.test(html) || /url\(\s*['"]?https?:/i.test(html);
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Full document for <iframe sandbox srcdoc>. The CSP forbids scripts, frames, forms and any
// remote load except images when Alex asks for them. The mail keeps its own light design:
// the white page and dark text are the mail's paper, not app UI colours.
export function mailDocument(
  bodies: { html: string | null; text: string | null },
  showImages: boolean
): string {
  const images = showImages ? 'data: https: http:' : 'data:';
  const csp = `default-src 'none'; img-src ${images}; style-src 'unsafe-inline'; font-src data:`;
  const content = bodies.html
    ? sanitizeMailHtml(bodies.html)
    : `<pre style="white-space:pre-wrap;font:inherit;margin:0">${escapeHtml(bodies.text ?? '')}</pre>`;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<base target="_blank">
<style>body{margin:16px;font:14px/1.5 system-ui,sans-serif;color:#1e2126;background:#fff;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style>
</head><body>${content}</body></html>`;
}

const TIME_ZONE = 'Europe/Paris';
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });
const timeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});
const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, weekday: 'short' });
const dayMonthFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
});

// List dates: "10:42" today, "hier", "lun." this week, else "22 oct.".
export function formatMailDate(date: Date, now: Date): string {
  const days = Math.round(
    (new Date(dayKey.format(now)).getTime() - new Date(dayKey.format(date)).getTime()) / 86_400_000
  );
  if (days <= 0) return timeFormat.format(date);
  if (days === 1) return 'hier';
  if (days < 7) return weekdayFormat.format(date);
  return dayMonthFormat.format(date);
}

// Reader date: "10:42 · 22 oct."
export function formatMailDateTime(date: Date): string {
  return `${timeFormat.format(date)} · ${dayMonthFormat.format(date)}`;
}

// Plain text of a mail (for the recruiter-reply classification): the text part, else the HTML
// without tags. Whitespace collapsed.
export function mailPlainText(bodies: { html: string | null; text: string | null }): string {
  const source =
    bodies.text ??
    sanitizeHtml(bodies.html ?? '', {
      allowedTags: [],
      allowedAttributes: {},
      nonTextTags: ['style', 'script', 'head', 'title'],
    });
  return source
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
