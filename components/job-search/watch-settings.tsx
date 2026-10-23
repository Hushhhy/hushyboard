'use client';

import { useId, useState, useTransition } from 'react';
import {
  addWatchKeyword,
  addWatchSource,
  removeWatchKeyword,
  removeWatchSource,
} from '@/app/(app)/career/job-search/actions';
import { CloseIcon, PlusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

type Source = { id: string; name: string; url: string | null; thisWeek: number };

// « Sources suivies »: the sites Alex checks; the count comes from the offers he added.
export function SourcesList({ sources }: { sources: Source[] }) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      {sources.length === 0 ? (
        <p className="text-caption-12 text-fg-2">
          Ajoute les sites que tu consultes : Welcome to the Jungle, LinkedIn, Indeed…
        </p>
      ) : (
        <ul className="flex flex-col">
          {sources.map((source) => (
            <li key={source.id} className="group flex min-h-9 items-center gap-2">
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate font-medium underline-offset-2 hover:underline"
                >
                  {source.name}
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate font-medium">{source.name}</span>
              )}
              <span className="text-caption-12 text-fg-3 tabular">
                {source.thisWeek} cette semaine
              </span>
              <Button
                variant="icon"
                aria-label={`Ne plus suivre ${source.name}`}
                disabled={isPending}
                onClick={() => startTransition(() => removeWatchSource(source.id).then(() => {}))}
              >
                <CloseIcon className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await addWatchSource(name, '');
            if (result.error) setError(result.error);
            else setName('');
          });
        }}
      >
        <label htmlFor={id} className="sr-only">
          Nouvelle source
        </label>
        <input
          id={id}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nouvelle source"
          className="h-8 min-w-0 flex-1 rounded-control border border-line-subtle bg-surface-sunken px-2 text-body-14"
        />
        <Button type="submit" variant="quiet" small pending={isPending} disabled={!name.trim()}>
          <PlusIcon className="size-4" />
          Suivre
        </Button>
      </form>
      {error ? <ErrorState title={error} announce /> : null}
    </div>
  );
}

// « Mots-clés de la veille »: editable chips.
export function KeywordsList({ keywords }: { keywords: { id: string; label: string }[] }) {
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-1.5">
        {keywords.map((keyword) => (
          <li
            key={keyword.id}
            className="inline-flex items-center gap-1 rounded-control bg-surface-raised py-0.5 pr-0.5 pl-2 text-caption-12 text-fg-2"
          >
            {keyword.label}
            <button
              type="button"
              aria-label={`Retirer le mot-clé ${keyword.label}`}
              disabled={isPending}
              onClick={() => startTransition(() => removeWatchKeyword(keyword.id))}
              className="grid size-5 place-items-center rounded-tick text-fg-3 hover:bg-surface-overlay hover:text-fg-1"
            >
              <CloseIcon className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await addWatchKeyword(label);
            if (result.error) setError(result.error);
            else setLabel('');
          });
        }}
      >
        <label htmlFor={id} className="sr-only">
          Nouveau mot-clé
        </label>
        <input
          id={id}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Nouveau mot-clé"
          className="h-8 min-w-0 flex-1 rounded-control border border-line-subtle bg-surface-sunken px-2 text-body-14"
        />
        <Button type="submit" variant="quiet" small pending={isPending} disabled={!label.trim()}>
          <PlusIcon className="size-4" />
          Ajouter
        </Button>
      </form>
      {error ? <ErrorState title={error} announce /> : null}
    </div>
  );
}
