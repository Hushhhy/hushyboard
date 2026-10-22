'use client';

import { useState } from 'react';
import { CopyIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';

// Copies the file content; the confirmation is announced, then the label comes back.
export function CopyButton({ text, label = 'Copier' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Button
        variant="quiet"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        <CopyIcon className="size-4" />
        {copied ? 'Copié' : label}
      </Button>
      <span role="status" className="sr-only">
        {copied ? 'Contenu copié.' : ''}
      </span>
    </>
  );
}
