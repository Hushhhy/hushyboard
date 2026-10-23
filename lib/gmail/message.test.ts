import { describe, expect, it } from 'vitest';
import {
  decodeBody,
  extractBodies,
  formatMailDate,
  hasRemoteImages,
  header,
  mailDocument,
  sanitizeMailHtml,
} from './message';

const b64 = (text: string, encoding: BufferEncoding = 'utf8') =>
  Buffer.from(text, encoding).toString('base64url');

describe('header', () => {
  it('reads a header without caring about case', () => {
    const part = { headers: [{ name: 'Subject', value: 'Bonjour' }] };
    expect(header(part, 'subject')).toBe('Bonjour');
    expect(header(part, 'From')).toBe('');
  });
});

describe('decodeBody and extractBodies', () => {
  it('decodes base64url in the declared charset', () => {
    expect(decodeBody(b64('Réponse'))).toBe('Réponse');
    expect(decodeBody(b64('Réponse', 'latin1'), 'text/plain; charset="iso-8859-1"')).toBe(
      'Réponse'
    );
  });

  it('finds the HTML and text bodies in nested parts, skipping attachments', () => {
    const payload = {
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: b64('Bonjour Alexis') } },
            { mimeType: 'text/html', body: { data: b64('<p>Bonjour <b>Alexis</b></p>') } },
          ],
        },
        { mimeType: 'text/html', filename: 'piece.html', body: { data: b64('<p>PJ</p>') } },
      ],
    };
    expect(extractBodies(payload)).toEqual({
      html: '<p>Bonjour <b>Alexis</b></p>',
      text: 'Bonjour Alexis',
    });
    expect(extractBodies(null)).toEqual({ html: null, text: null });
  });
});

describe('sanitizeMailHtml', () => {
  it('keeps the layout but removes scripts, handlers and javascript links', () => {
    const clean = sanitizeMailHtml(
      '<table style="width:100%"><tr><td bgcolor="#fff">Hi</td></tr></table>' +
        '<script>alert(1)</script><img src="https://t.example/p.gif" onerror="x()">' +
        '<a href="javascript:alert(1)">bad</a><a href="https://ok.example">ok</a>' +
        '<iframe src="https://evil"></iframe><form><input></form>'
    );
    expect(clean).toContain('<td bgcolor="#fff">Hi</td>');
    expect(clean).not.toMatch(/script|onerror|javascript:|iframe|<form|<input/);
    expect(clean).toContain(
      '<a href="https://ok.example" target="_blank" rel="noreferrer noopener">'
    );
  });
});

describe('mailDocument', () => {
  it('blocks remote images unless asked, and never allows scripts', () => {
    const blocked = mailDocument(
      { html: '<img src="https://t.example/p.gif">', text: null },
      false
    );
    expect(blocked).toContain('img-src data:;');
    expect(blocked).toContain("default-src 'none'");
    const shown = mailDocument({ html: '<img src="https://t.example/p.gif">', text: null }, true);
    expect(shown).toContain('img-src data: https: http:');
  });

  it('escapes a plain-text mail', () => {
    expect(mailDocument({ html: null, text: '<b>1 < 2</b>' }, false)).toContain(
      '&lt;b&gt;1 &lt; 2&lt;/b&gt;'
    );
  });
});

describe('hasRemoteImages', () => {
  it('spots remote images in tags and CSS', () => {
    expect(hasRemoteImages('<img src="https://x/p.gif">')).toBe(true);
    expect(hasRemoteImages('<div style="background:url(https://x/bg.png)">')).toBe(true);
    expect(hasRemoteImages('<img src="data:image/png;base64,AAA">')).toBe(false);
  });
});

describe('formatMailDate', () => {
  const now = new Date('2026-10-22T14:00:00+02:00');
  it('shows the time today, then hier, the weekday, the date', () => {
    expect(formatMailDate(new Date('2026-10-22T10:42:00+02:00'), now)).toBe('10:42');
    expect(formatMailDate(new Date('2026-10-21T23:30:00+02:00'), now)).toBe('hier');
    expect(formatMailDate(new Date('2026-10-19T09:00:00+02:00'), now)).toBe('lun.');
    expect(formatMailDate(new Date('2026-10-01T09:00:00+02:00'), now)).toBe('1 oct.');
  });
});
