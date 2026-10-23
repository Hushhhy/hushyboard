import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractPreviewImage, fetchPreviewImage, isFetchableUrl } from './link-preview';

const PAGE = 'https://www.coursera.org/account/accomplishments/certificate/ABC123';

describe('extractPreviewImage', () => {
  it('reads og:image', () => {
    const html = `<html><head>
      <meta property="og:title" content="Certificat">
      <meta property="og:image" content="https://s3.amazonaws.com/coursera_assets/cert.png">
    </head></html>`;
    expect(extractPreviewImage(html, PAGE)).toBe(
      'https://s3.amazonaws.com/coursera_assets/cert.png'
    );
  });

  it('prefers og:image:secure_url and decodes entities', () => {
    const html = `<meta content="https://img.example.com/a.png?x=1&amp;y=2" property="og:image:secure_url">
      <meta property="og:image" content="https://img.example.com/other.png">`;
    expect(extractPreviewImage(html, PAGE)).toBe('https://img.example.com/a.png?x=1&y=2');
  });

  it('falls back to twitter:image (name attribute, single quotes)', () => {
    const html = `<meta name='twitter:image' content='https://images.credly.com/badge.png'>`;
    expect(extractPreviewImage(html, PAGE)).toBe('https://images.credly.com/badge.png');
  });

  it('resolves a relative image against the page', () => {
    const html = '<meta property="og:image" content="/static/cert.jpg">';
    expect(extractPreviewImage(html, PAGE)).toBe('https://www.coursera.org/static/cert.jpg');
  });

  it('uses link rel=image_src as a last resort', () => {
    const html = '<link rel="image_src" href="https://cdn.example.com/badge.webp">';
    expect(extractPreviewImage(html, PAGE)).toBe('https://cdn.example.com/badge.webp');
  });

  it('refuses http, data: and javascript: images, and pages without metadata', () => {
    expect(
      extractPreviewImage('<meta property="og:image" content="http://x.com/a.png">', PAGE)
    ).toBeNull();
    expect(
      extractPreviewImage('<meta property="og:image" content="data:image/png;base64,AAA">', PAGE)
    ).toBeNull();
    expect(
      extractPreviewImage('<meta property="og:image" content="javascript:alert(1)">', PAGE)
    ).toBeNull();
    expect(extractPreviewImage('<html><head><title>x</title></head></html>', PAGE)).toBeNull();
  });
});

describe('isFetchableUrl', () => {
  it('accepts public https pages', () => {
    expect(isFetchableUrl('https://www.credly.com/badges/123')).toBe(true);
    expect(isFetchableUrl('https://coursera.org/verify/ABC:443')).toBe(true);
  });

  it('refuses local, private or non-https targets', () => {
    for (const url of [
      'http://www.credly.com/badges/123',
      'https://localhost/x',
      'https://api.localhost/x',
      'https://127.0.0.1/x',
      'https://10.0.0.5/x',
      'https://[::1]/x',
      'https://intranet/x',
      'https://printer.local/x',
      'https://user:pass@example.com/x',
      'https://example.com:8443/x',
      'file:///etc/passwd',
      'pas une url',
    ]) {
      expect(isFetchableUrl(url), url).toBe(false);
    }
  });
});

describe('fetchPreviewImage redirects', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('never follows a redirect to an internal address', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } })
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchPreviewImage('https://www.credly.com/badges/abc')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows a public redirect and reads the final page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 301, headers: { location: '/badges/abc/public' } })
      )
      .mockResolvedValueOnce(
        new Response('<meta property="og:image" content="/img/badge.png">', {
          headers: { 'content-type': 'text/html' },
        })
      );
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchPreviewImage('https://www.credly.com/badges/abc')).toBe(
      'https://www.credly.com/img/badge.png'
    );
    expect(fetchMock.mock.calls[1][0]).toBe('https://www.credly.com/badges/abc/public');
  });
});
