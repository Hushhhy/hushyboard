'use client';

import { useEffect, useRef } from 'react';
import { renderMermaidBlocks } from '@/lib/mermaid-client';

// Rendered Markdown (already sanitized on the server) with its Mermaid diagrams drawn in the
// browser. Pages without a diagram never download Mermaid.
export function MarkdownContent({ html, className = '' }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !html.includes('language-mermaid')) return;
    let cancelled = false;
    void renderMermaidBlocks(root, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [html]);

  return (
    <div ref={ref} className={`markdown ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
