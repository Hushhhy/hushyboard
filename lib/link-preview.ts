// Preview image of a credential page (Coursera certificate, Credly badge…), read from the
// metadata sites publish for link previews: og:image, twitter:image or image_src.

const META_KEYS = [
  'og:image:secure_url',
  'og:image',
  'og:image:url',
  'twitter:image',
  'twitter:image:src',
];

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return match ? decodeEntities(match[2] ?? match[3] ?? match[4] ?? '') : null;
}

// Only https images (never http, data: or javascript:), resolved against the page URL.
function toHttpsUrl(candidate: string, pageUrl: string): string | null {
  try {
    const url = new URL(candidate.trim(), pageUrl);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

// Pure: finds the best preview image in a page's HTML.
export function extractPreviewImage(html: string, pageUrl: string): string | null {
  const head = html.slice(0, 200_000);
  const found = new Map<string, string>();
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attribute(tag, 'property') ?? attribute(tag, 'name'))?.toLowerCase();
    const content = attribute(tag, 'content');
    if (key && content && META_KEYS.includes(key) && !found.has(key)) found.set(key, content);
  }
  for (const key of META_KEYS) {
    const url = found.get(key) && toHttpsUrl(found.get(key)!, pageUrl);
    if (url) return url;
  }
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const href = attribute(tag, 'href');
    if (attribute(tag, 'rel')?.toLowerCase() === 'image_src' && href) {
      const url = toHttpsUrl(href, pageUrl);
      if (url) return url;
    }
  }
  return null;
}

// The server only fetches public https pages: no localhost, no IP addresses, no internal names.
export function isFetchableUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  if (url.port && url.port !== '443') return false;
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (/^\d+(\.\d+){3}$/.test(host) || host.startsWith('[')) return false;
  return true;
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i;
const MAX_BYTES = 1_000_000;

// Network: the preview image of a credential URL, or null (never throws).
// The URL can itself be an image (badge PNG); otherwise the page metadata is read.
export async function fetchPreviewImage(credentialUrl: string): Promise<string | null> {
  if (!isFetchableUrl(credentialUrl)) return null;
  if (IMAGE_EXTENSIONS.test(new URL(credentialUrl).pathname)) return credentialUrl;
  try {
    const response = await fetch(credentialUrl, {
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
      headers: { Accept: 'text/html', 'User-Agent': 'Hushyboard link preview' },
    });
    if (!response.ok || !isFetchableUrl(response.url || credentialUrl)) return null;
    const type = response.headers.get('content-type') ?? '';
    if (type.startsWith('image/')) return response.url || credentialUrl;
    if (!type.includes('html') || !response.body) return null;

    // Read at most 1 MB: the metadata is in the <head>.
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    await reader.cancel().catch(() => {});
    const html = new TextDecoder().decode(Buffer.concat(chunks));
    return extractPreviewImage(html, response.url || credentialUrl);
  } catch {
    return null;
  }
}
