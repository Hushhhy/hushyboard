'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { addRepo, autoSync, syncNow, type SyncState } from '@/app/(app)/career/projects/actions';
import { SyncIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { TextField } from '@/components/ui/text-field';
import { EMPTY_FORM_STATE } from '@/lib/forms';

function describe(state: SyncState): string | null {
  if (!state.result) return null;
  if (state.result.skipped === 'rate-limit') {
    return 'Limite GitHub presque atteinte, réessaie dans une heure.';
  }
  const { total, added } = state.result;
  return `${total} dépôt${total > 1 ? 's' : ''} synchronisé${total > 1 ? 's' : ''}${
    added > 0 ? `, ${added} nouveau${added > 1 ? 'x' : ''}` : ''
  }.`;
}

// « Synchroniser » button, plus the automatic sync when the page opens (if the last one
// is older than an hour). Errors stay on screen until the next try.
export function SyncControls({ auto }: { auto: boolean }) {
  const [state, setState] = useState<SyncState>({});
  const [isPending, startTransition] = useTransition();
  const started = useRef(false);

  useEffect(() => {
    if (!auto || started.current) return;
    started.current = true;
    startTransition(async () => {
      const result = await autoSync();
      if (result) setState(result);
    });
  }, [auto]);

  const message = isPending ? 'Synchronisation avec GitHub…' : describe(state);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        pending={isPending}
        onClick={() =>
          startTransition(async () => {
            setState(await syncNow());
          })
        }
      >
        <SyncIcon className="size-4" />
        Synchroniser
      </Button>
      <p role="status" className="text-caption-12 text-fg-2">
        {message}
      </p>
      {state.error ? (
        <ErrorState title="Synchronisation impossible." description={state.error} announce />
      ) : null}
    </div>
  );
}

// « Ajouter un dépôt »: a public repo of a teammate, by URL.
export function AddRepoForm() {
  const [state, formAction, isPending] = useActionState(addRepo, EMPTY_FORM_STATE);
  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <p className="text-body-14 text-fg-2">
        Pour un projet d’équipe hébergé sur le compte d’un camarade : colle l’adresse du dépôt. Il
        doit être public.
      </p>
      <TextField
        name="url"
        label="Adresse du dépôt"
        placeholder="https://github.com/pseudo/ft_transcendence"
        defaultValue={state.values?.url ?? ''}
        error={state.fieldErrors?.url}
      />
      <div>
        <Button type="submit" onOverlay pending={isPending}>
          Ajouter le dépôt
        </Button>
      </div>
    </form>
  );
}
