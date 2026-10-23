// « Se désabonner »: reads the List-Unsubscribe headers (RFC 2369, RFC 8058). Pure, unit-tested.

export type UnsubscribePlan =
  // RFC 8058: the server POSTs "List-Unsubscribe=One-Click" to the https URL.
  | { method: 'one-click'; url: string }
  // An unsubscribe mail sent through Gmail.
  | { method: 'mailto'; address: string; subject: string; body: string }
  // Only a web page: opened in a new tab.
  | { method: 'link'; url: string };

function parseMailto(value: string): { address: string; subject: string; body: string } | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'mailto:') return null;
    const address = decodeURIComponent(url.pathname).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return null;
    return {
      address,
      subject: url.searchParams.get('subject') ?? 'unsubscribe',
      body: url.searchParams.get('body') ?? '',
    };
  } catch {
    return null;
  }
}

function isHttps(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

// "<mailto:a@b.c?subject=x>, <https://…>" → the URIs, in order. Values without angle brackets
// (seen in the wild) are accepted too.
export function listUnsubscribeUris(header: string | null | undefined): string[] {
  if (!header) return [];
  const bracketed = [...header.matchAll(/<([^>]+)>/g)].map((match) => match[1].trim());
  const uris = bracketed.length > 0 ? bracketed : header.split(',').map((part) => part.trim());
  return uris.filter((uri) => /^(https?|mailto):/i.test(uri));
}

// The best way to unsubscribe, or null when the headers offer none.
export function unsubscribePlan(
  header: string | null | undefined,
  postHeader: string | null | undefined
): UnsubscribePlan | null {
  const uris = listUnsubscribeUris(header);
  const https = uris.find(isHttps);
  const oneClick = /List-Unsubscribe\s*=\s*One-Click/i.test(postHeader ?? '');
  if (https && oneClick) return { method: 'one-click', url: https };
  for (const uri of uris) {
    const mail = parseMailto(uri);
    if (mail) return { method: 'mailto', ...mail };
  }
  if (https) return { method: 'link', url: https };
  return null;
}

// RFC 2822 message for a mailto: unsubscribe, base64url as the Gmail API expects.
export function unsubscribeMail(
  from: string,
  plan: { address: string; subject: string; body: string }
) {
  const encodeHeader = (text: string) =>
    /^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${Buffer.from(text).toString('base64')}?=`;
  const message = [
    `From: ${from}`,
    `To: ${plan.address}`,
    `Subject: ${encodeHeader(plan.subject)}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    plan.body || 'unsubscribe',
  ].join('\r\n');
  return Buffer.from(message).toString('base64url');
}
