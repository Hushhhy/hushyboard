import { describe, expect, it } from 'vitest';
import {
  isPublicHttpsUrl,
  listUnsubscribeUris,
  unsubscribeMail,
  unsubscribePlan,
} from './unsubscribe';

describe('listUnsubscribeUris', () => {
  it('reads bracketed and bare values, keeping only web and mail links', () => {
    expect(
      listUnsubscribeUris(
        '<mailto:unsub-123@list.example.com?subject=unsubscribe>, <https://example.com/u/123>'
      )
    ).toEqual([
      'mailto:unsub-123@list.example.com?subject=unsubscribe',
      'https://example.com/u/123',
    ]);
    expect(listUnsubscribeUris('https://news.example.org/unsubscribe?id=9')).toEqual([
      'https://news.example.org/unsubscribe?id=9',
    ]);
    expect(listUnsubscribeUris('<javascript:alert(1)>, <ftp://x>')).toEqual([]);
    expect(listUnsubscribeUris(undefined)).toEqual([]);
  });
});

describe('unsubscribePlan', () => {
  it('prefers the RFC 8058 one-click POST', () => {
    expect(
      unsubscribePlan(
        '<mailto:u@list.example.com>, <https://example.com/one-click/abc>',
        'List-Unsubscribe=One-Click'
      )
    ).toEqual({ method: 'one-click', url: 'https://example.com/one-click/abc' });
  });

  it('falls back to a mailto with its subject, then to a link', () => {
    expect(
      unsubscribePlan(
        '<mailto:leave@lists.example.com?subject=Unsubscribe%20me>, <https://x.y/u>',
        null
      )
    ).toEqual({
      method: 'mailto',
      address: 'leave@lists.example.com',
      subject: 'Unsubscribe me',
      body: '',
    });
    expect(unsubscribePlan('<https://example.com/prefs>', null)).toEqual({
      method: 'link',
      url: 'https://example.com/prefs',
    });
  });

  it('does not one-click a plain http URL, and ignores malformed headers', () => {
    expect(unsubscribePlan('<http://example.com/u>', 'List-Unsubscribe=One-Click')).toBeNull();
    expect(unsubscribePlan('<mailto:not-an-address>', null)).toBeNull();
    expect(unsubscribePlan('garbage', null)).toBeNull();
  });
});

describe('unsubscribeMail', () => {
  it('builds a base64url RFC 2822 message, encoding a non-ASCII subject', () => {
    const raw = unsubscribeMail('me@gmail.com', {
      address: 'leave@list.example.com',
      subject: 'Désinscription',
      body: '',
    });
    const text = Buffer.from(raw, 'base64url').toString();
    expect(text).toContain('To: leave@list.example.com');
    expect(text).toContain('Subject: =?UTF-8?B?');
    expect(text.endsWith('\r\n\r\nunsubscribe')).toBe(true);
  });
});

describe('isPublicHttpsUrl', () => {
  it('accepts public https addresses only', () => {
    expect(isPublicHttpsUrl('https://news.example.com/u?id=1')).toBe(true);
    expect(isPublicHttpsUrl('http://news.example.com/u')).toBe(false);
    expect(isPublicHttpsUrl('https://127.0.0.1/u')).toBe(false);
    expect(isPublicHttpsUrl('https://169.254.169.254/latest')).toBe(false);
    expect(isPublicHttpsUrl('https://[::1]/u')).toBe(false);
    expect(isPublicHttpsUrl('https://localhost/u')).toBe(false);
    expect(isPublicHttpsUrl('https://db.internal/u')).toBe(false);
    expect(isPublicHttpsUrl('https://intranet/u')).toBe(false);
    expect(isPublicHttpsUrl('https://user:pw@example.com/u')).toBe(false);
    expect(isPublicHttpsUrl('https://example.com:8443/u')).toBe(false);
  });

  it('never plans a one-click POST to a private address', () => {
    expect(unsubscribePlan('<https://10.0.0.5/u>', 'List-Unsubscribe=One-Click')).toBeNull();
  });
});
