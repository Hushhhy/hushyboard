import { describe, expect, it } from 'vitest';
import { renderMarkdown, renderMarkdownWithCode } from './markdown';

describe('renderMarkdown', () => {
  it('renders headings, emphasis and lists', () => {
    const html = renderMarkdown('## Jointures\n\n**INNER** et *LEFT*\n\n- un\n- deux');
    expect(html).toContain('<h2>Jointures</h2>');
    expect(html).toContain('<strong>INNER</strong>');
    expect(html).toContain('<em>LEFT</em>');
    expect(html).toContain('<li>un</li>');
  });

  it('renders fenced code with its language class', () => {
    const html = renderMarkdown('```sql\nSELECT * FROM users;\n```');
    expect(html).toContain('<pre><code class="language-sql">SELECT * FROM users;');
  });

  it('renders GitHub tables with alignment', () => {
    const html = renderMarkdown('| Forme | Règle |\n|:--|--:|\n| 1NF | atomique |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th align="left">Forme</th>');
    expect(html).toContain('<td align="right">atomique</td>');
  });

  it('renders task lists as disabled checkboxes', () => {
    const html = renderMarkdown('- [x] fait\n- [ ] à faire');
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*disabled/);
    expect(html).toMatch(/<input[^>]*checked/);
  });

  it('keeps line breaks like GitHub comments', () => {
    expect(renderMarkdown('ligne 1\nligne 2')).toContain('ligne 1<br />');
  });

  it('opens links in a new tab without referrer', () => {
    const html = renderMarkdown('[doc](https://www.postgresql.org)');
    expect(html).toContain('href="https://www.postgresql.org"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
  });

  it('removes scripts, event handlers and javascript: links', () => {
    const html = renderMarkdown(
      '<script>alert(1)</script>\n\n<img src="x" onerror="alert(2)">\n\n[clic](javascript:alert(3))\n\n<iframe src="https://evil.example"></iframe>'
    );
    expect(html).not.toMatch(/<script|onerror|javascript:|<iframe/i);
  });

  it('only allows https images', () => {
    expect(renderMarkdown('![a](http://example.com/a.png)')).not.toContain('http://example.com');
    expect(renderMarkdown('![a](https://example.com/a.png)')).toContain(
      'src="https://example.com/a.png"'
    );
  });
});

describe('renderMarkdown styles', () => {
  it('colors, fonts and sizes from the fixed list, combined', () => {
    expect(renderMarkdown('[Attention]{rouge grand}')).toContain(
      '<span class="md-color-red md-size-large">Attention</span>'
    );
    expect(renderMarkdown('[npm install]{code vert}')).toContain(
      '<span class="md-font-mono md-color-green">npm install</span>'
    );
    expect(renderMarkdown('[**gras** en or]{or}')).toContain(
      '<span class="md-color-gold"><strong>gras</strong> en or</span>'
    );
  });

  it('keeps the text plain with an unknown style, and leaves links alone', () => {
    const html = renderMarkdown('[texte]{fluo} et [lien](https://example.com)');
    expect(html).toContain('<p>texte et <a href="https://example.com"');
    expect(html).not.toContain('<span');
  });

  it('renders highlight, underline, sub and superscript, keys; ~~ stays struck', () => {
    const html = renderMarkdown('==clé== ++souligné++ x^2^ H~2~O ~~barré~~ [[Ctrl]]+[[C]]');
    expect(html).toContain('<mark>clé</mark>');
    expect(html).toContain('<u>souligné</u>');
    expect(html).toContain('x<sup>2</sup>');
    expect(html).toContain('H<sub>2</sub>O');
    expect(html).toContain('<del>barré</del>');
    expect(html).toContain('<kbd>Ctrl</kbd>+<kbd>C</kbd>');
  });

  it('does not touch C++ or a lone ^', () => {
    const html = renderMarkdown('Le C++ et le C++, 2 ^ 3');
    expect(html).toContain('Le C++ et le C++, 2 ^ 3');
  });

  it('renders callouts with their title, French or GitHub names; a plain quote stays a quote', () => {
    const tip = renderMarkdown('> [!ASTUCE]\n> Utilise **map()**.');
    expect(tip).toContain('<div class="md-callout md-callout-tip">');
    expect(tip).toContain('<p class="md-callout-title">Astuce</p>');
    expect(tip).toContain('<strong>map()</strong>');
    expect(renderMarkdown('> [!WARNING] Piège classique\n> texte')).toContain(
      '<p class="md-callout-title">Piège classique</p>'
    );
    expect(renderMarkdown('> une citation')).toContain('<blockquote>');
  });

  it('renders collapsible blocks', () => {
    const html = renderMarkdown('+++ Voir la solution\nLe `code` caché.\n+++');
    expect(html).toContain('<details><summary>Voir la solution</summary>');
    expect(html).toContain('<code>code</code>');
  });

  it('keeps only the listed classes and never inline styles or handlers', () => {
    const html = renderMarkdown(
      '<span class="md-color-red evil" style="color:#f00" onclick="x()">a</span> <div class="evil">b</div>'
    );
    expect(html).toContain('<span class="md-color-red">a</span>');
    expect(html).not.toMatch(/style=|onclick|evil/);
  });
});

describe('renderMarkdown mermaid blocks', () => {
  it('keeps a ```mermaid block as code for the browser to draw, arrows escaped', () => {
    const html = renderMarkdown('```mermaid\nflowchart LR\n  A["Début"] --> B\n```');
    expect(html).toContain('<code class="language-mermaid">');
    expect(html).toContain('A["Début"] --&gt; B');
  });
});

describe('renderMarkdownWithCode', () => {
  it('colors a code block by its language, with the theme variables', async () => {
    const html = await renderMarkdownWithCode(
      '```sql\nSELECT year, COUNT(*) FROM cars WHERE sold IS TRUE;\n```'
    );
    expect(html).toContain('<div class="code-view code-snippet" data-language="sql">');
    expect(html).toMatch(/style="color:var\(--shiki-token-keyword\)">SELECT</);
  });

  it('reads aliases (py) and keeps the code characters exact', async () => {
    const html = await renderMarkdownWithCode("```py\nif a < b and c > 0:\n    print('ok')\n```");
    expect(html).toContain('data-language="py"');
    expect(html).toContain('&#x3C;');
    expect(html).toContain('print');
    expect(html).not.toContain('&amp;lt;');
  });

  it('leaves mermaid, unknown languages and the rest of the note alone', async () => {
    const html = await renderMarkdownWithCode(
      '# Titre\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n```klingon\nqapla\n```\n\nFin.'
    );
    expect(html).toContain('<h1>Titre</h1>');
    expect(html).toContain('<code class="language-mermaid">');
    expect(html).toContain('data-language="klingon"');
    expect(html).toContain('qapla');
    expect(html).toContain('<p>Fin.</p>');
  });

  it('never lets HTML hidden in a code block run', async () => {
    const html = await renderMarkdownWithCode('```html\n<script>alert(1)</script>\n```');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&#x3C;');
  });
});
