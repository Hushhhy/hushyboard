import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

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
