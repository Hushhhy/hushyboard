'use client';

import { useEffect, useState, useTransition } from 'react';
import { SparkleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';

type ActionResult = { error?: string };

// Ids already requested in this tab: a remount (Strict Mode, back and forth) never
// spends a second Gemini call on the same content.
const requested = new Set<string>();

// Content generated the first time it is opened (notion sheet, reference entry).
// The Server Action revalidates the page, which then renders the stored content.
// Render it with a `key` per id: one instance handles one id.
export function GenerateOnOpen({
  id,
  action,
  pendingLabel,
  retryLabel,
}: {
  id: string;
  // A Server Action with its id bound.
  action: () => Promise<ActionResult>;
  // « Préparation de la fiche… »
  pendingLabel: string;
  // « Générer la fiche »
  retryLabel: string;
}) {
  // This instance starts the generation, unless it was already requested earlier in the tab.
  const [isOwner] = useState(() => !requested.has(id));
  const [manual, setManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await action();
      setError(result.error ?? null);
    });
  }

  function retry() {
    setError(null);
    setManual(true);
    generate();
  }

  useEffect(() => {
    if (!isOwner || requested.has(id)) return;
    requested.add(id);
    generate();
    // Once per instance; `action` is a new bound function on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isOwner]);

  if (error && !isPending) {
    return (
      <ErrorState
        title={error}
        announce
        action={
          <Button variant="secondary" onClick={retry}>
            Réessayer
          </Button>
        }
      />
    );
  }
  if (isPending || isOwner || manual) {
    return (
      <LoadingRegion label={pendingLabel} className="flex flex-col gap-3">
        <p aria-hidden="true" className="flex items-center gap-2 text-body-14 text-fg-2">
          <SparkleIcon className="size-4 text-career" />
          {pendingLabel}
        </p>
        <Skeleton className="h-12" />
        <Skeleton className="h-24" />
        <Skeleton className="h-16" />
      </LoadingRegion>
    );
  }
  return (
    <Button variant="secondary" className="self-start" onClick={retry}>
      <SparkleIcon className="size-4" />
      {retryLabel}
    </Button>
  );
}
