// Mermaid diagrams of the Markdown notes, drawn in the browser. The library is heavy, so it is
// only downloaded when a page has a ```mermaid block. Strict security: no scripts, no click
// handlers, labels sanitized by Mermaid itself.

import { readableMermaidSource } from './mermaid-source';

type Mermaid = typeof import('mermaid').default;

let loading: Promise<Mermaid> | null = null;
// Dark text for light boxes of a diagram written for a light theme (see mermaid-source.ts).
let darkText = '#000000';
let counter = 0;

// Theme tokens are oklch(); Mermaid computes its shades from hex colors only: the browser
// converts each token through a 1×1 canvas.
function tokenHex(name: string, context: CanvasRenderingContext2D): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = value || '#000';
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

function themeVariables() {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!context) return {};
  const color = (name: string) => tokenHex(`--color-${name}`, context);
  darkText = color('surface-sunken');
  return {
    darkMode: true,
    background: color('surface-default'),
    primaryColor: color('surface-raised'),
    primaryTextColor: color('fg-1'),
    primaryBorderColor: color('line-strong'),
    secondaryColor: color('surface-overlay'),
    tertiaryColor: color('surface-sunken'),
    lineColor: color('fg-2'),
    textColor: color('fg-1'),
    clusterBkg: color('surface-sunken'),
    clusterBorder: color('line-subtle'),
    titleColor: color('fg-1'),
    edgeLabelBackground: color('surface-default'),
    fontFamily: getComputedStyle(document.body).fontFamily,
    fontSize: '14px',
  };
}

function loadMermaid(): Promise<Mermaid> {
  loading ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: themeVariables(),
    });
    return mermaid;
  });
  return loading;
}

// Replaces each <pre><code class="language-mermaid"> of the container by its diagram. The
// source stays available under the diagram; an invalid diagram keeps its code and says why.
export async function renderMermaidBlocks(root: HTMLElement, isCancelled: () => boolean) {
  const blocks = [...root.querySelectorAll<HTMLElement>('pre > code.language-mermaid')];
  if (blocks.length === 0) return;
  const mermaid = await loadMermaid();
  for (const code of blocks) {
    const pre = code.parentElement;
    if (!pre || isCancelled()) return;
    const source = readableMermaidSource(code.textContent ?? '', darkText);
    try {
      await mermaid.parse(source);
      const { svg } = await mermaid.render(`mermaid-diagram-${++counter}`, source);
      if (isCancelled() || !pre.isConnected) return;
      const figure = document.createElement('figure');
      figure.className = 'md-mermaid';
      const drawing = document.createElement('div');
      drawing.setAttribute('role', 'img');
      drawing.setAttribute('aria-label', 'Diagramme (son code est juste en dessous)');
      drawing.innerHTML = svg;
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'Code du diagramme';
      details.append(summary, pre.cloneNode(true));
      figure.append(drawing, details);
      pre.replaceWith(figure);
    } catch (error) {
      if (isCancelled() || !pre.isConnected) return;
      const message = document.createElement('p');
      message.className = 'md-mermaid-error';
      const reason = error instanceof Error ? error.message.split('\n')[0] : '';
      message.textContent = `Diagramme illisible${reason ? ` : ${reason}` : '.'}`;
      pre.after(message);
    }
  }
}
