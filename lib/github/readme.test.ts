import { describe, expect, it } from 'vitest';
import {
  resolveReadmeImage,
  resolveReadmeLink,
  sanitizeReadme,
  type ReadmeContext,
} from './readme';

const publicRepo: ReadmeContext = {
  owner: 'Hushhhy',
  repo: 'minishell',
  branch: 'main',
  isPrivate: false,
  rawRoute: (path) => `/api/projects/p1/raw?path=${encodeURIComponent(path)}`,
};
const privateRepo: ReadmeContext = { ...publicRepo, repo: 'hushyboard', isPrivate: true };

describe('relative links and images', () => {
  it('points relative links to the file on GitHub', () => {
    expect(resolveReadmeLink('docs/setup.md', publicRepo)).toBe(
      'https://github.com/Hushhhy/minishell/blob/main/docs/setup.md'
    );
    expect(resolveReadmeLink('./src/../LICENSE', publicRepo)).toBe(
      'https://github.com/Hushhhy/minishell/blob/main/LICENSE'
    );
  });

  it('keeps anchors and absolute URLs', () => {
    expect(resolveReadmeLink('#installation', publicRepo)).toBe('#installation');
    expect(resolveReadmeLink('https://42.fr', publicRepo)).toBe('https://42.fr');
  });

  it('serves public images from raw.githubusercontent and private ones through our route', () => {
    expect(resolveReadmeImage('assets/demo.png', publicRepo)).toBe(
      'https://raw.githubusercontent.com/Hushhhy/minishell/main/assets/demo.png'
    );
    expect(resolveReadmeImage('/assets/demo.png', privateRepo)).toBe(
      '/api/projects/p1/raw?path=assets%2Fdemo.png'
    );
    expect(resolveReadmeImage('https://img.shields.io/badge/x.svg', privateRepo)).toBe(
      'https://img.shields.io/badge/x.svg'
    );
  });
});

describe('sanitizeReadme', () => {
  it('keeps the README structure and rewrites links', () => {
    const html = sanitizeReadme(
      '<h2>Lancer le projet</h2><p><a href="docs/run.md">Doc</a> <code>make up</code></p><img src="demo.gif" alt="Démo">',
      publicRepo
    );
    expect(html).toContain('<h2>Lancer le projet</h2>');
    expect(html).toContain('href="https://github.com/Hushhhy/minishell/blob/main/docs/run.md"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain(
      'src="https://raw.githubusercontent.com/Hushhhy/minishell/main/demo.gif"'
    );
    expect(html).toContain('<code>make up</code>');
  });

  it('removes scripts, styles, iframes and event handlers', () => {
    const html = sanitizeReadme(
      '<script>alert(1)</script><style>body{}</style><iframe src="https://x.y"></iframe><img src="a.png" onerror="alert(2)"><a href="javascript:alert(3)">x</a>',
      publicRepo
    );
    expect(html).not.toMatch(/<script|<style|<iframe|onerror|javascript:/i);
  });
});
