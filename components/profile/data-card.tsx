'use client';

import { useId, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { deleteAllData } from '@/app/(app)/career/profile/data-actions';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { ModuleCard } from '@/components/ui/module-card';

const CONFIRMATION = 'SUPPRIMER';

// « Mes données »: what is kept, and the irreversible full deletion (typed confirmation).
export function DataCard() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const id = useId();

  function close() {
    dialogRef.current?.close();
    setTyped('');
    setError(null);
  }

  return (
    <ModuleCard title="Mes données">
      <p className="text-body-14 text-fg-2">
        Hushyboard garde tes candidatures, compétences, cours, habitudes, jeux et finances. Le
        contenu des mails et les fichiers importés ne sont jamais conservés.{' '}
        <Link href="/legal" className="underline hover:text-fg-1">
          Mentions légales
        </Link>
      </p>
      <div>
        <Button
          variant="quiet"
          className="-ml-2 text-danger"
          onClick={() => dialogRef.current?.showModal()}
        >
          Supprimer toutes mes données
        </Button>
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onClose={() => {
          setTyped('');
          setError(null);
        }}
        className="m-auto w-110 max-w-[calc(100vw-2rem)] animate-palette-in rounded-panel bg-surface-overlay p-6 text-fg-1 shadow-overlay backdrop:bg-scrim"
      >
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await deleteAllData(typed);
              if (result?.error) setError(result.error);
            });
          }}
        >
          <h2 id={`${id}-title`} className="text-title-18">
            Supprimer toutes tes données ?
          </h2>
          <p id={`${id}-description`} className="text-body-14 text-fg-2">
            Tout sera effacé définitivement : profil, compétences, projets, CV, candidatures,
            offres, cours, XP, trophées, habitudes, jeux et finances. Gmail sera déconnecté et tu
            seras déconnecté de Hushyboard. Rien ne pourra être récupéré.
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-input`} className="text-body-14 font-medium">
              Écris {CONFIRMATION} pour confirmer
            </label>
            <input
              id={`${id}-input`}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="h-9 rounded-control border border-line-strong bg-surface-sunken px-3 text-body-14"
            />
          </div>
          {error ? <ErrorState title={error} announce /> : null}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" autoFocus onOverlay onClick={close}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              pending={isPending}
              disabled={typed.trim() !== CONFIRMATION}
            >
              Tout supprimer
            </Button>
          </div>
        </form>
      </dialog>
    </ModuleCard>
  );
}
