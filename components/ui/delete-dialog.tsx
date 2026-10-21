'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { Button, type ButtonVariant } from './button';
import { ErrorState } from './error-state';

export type DeleteResult = { error?: string } | void;

type DeleteDialogProps = {
  // "Supprimer la candidature Groupe Bel ?"
  title: string;
  // The consequence: "L'historique (3 étapes) sera supprimé. Les 15 XP gagnés restent acquis."
  description: string;
  // A Server Action (bind the id beforehand). Return { error } to keep the dialog open.
  onConfirm: () => Promise<DeleteResult>;
  triggerLabel?: string;
  triggerVariant?: ButtonVariant;
};

// The only modal of the app: confirming a deletion, which cannot be undone.
// Native <dialog> + showModal(): the browser traps focus, handles Escape and makes the page inert.
export function DeleteDialog({
  title,
  description,
  onConfirm,
  triggerLabel = 'Supprimer',
  triggerVariant = 'quiet',
}: DeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Pages stay mounted (hidden) after navigation: never come back to an open dialog.
  useLayoutEffect(() => () => setIsOpen(false), []);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (result?.error) setError(result.error);
      else setIsOpen(false);
    });
  }

  return (
    <>
      <Button variant={triggerVariant} onClick={() => setIsOpen(true)}>
        {triggerLabel}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={() => setIsOpen(false)}
        className="m-auto w-110 max-w-[calc(100vw-2rem)] animate-palette-in rounded-panel bg-surface-overlay p-6 text-fg-1 shadow-overlay backdrop:bg-scrim"
      >
        {isOpen ? (
          <div className="flex flex-col gap-3">
            <h2 id={titleId} className="text-title-18">
              {title}
            </h2>
            <p id={descriptionId} className="text-body-14 text-fg-2">
              {description}
            </p>
            {error ? (
              <ErrorState title="Suppression impossible." description={error} announce />
            ) : null}
            <div className="mt-2 flex justify-end gap-2">
              {/* Initial focus on the safe choice. */}
              <Button autoFocus onOverlay onClick={() => setIsOpen(false)}>
                Annuler
              </Button>
              <Button variant="primary" pending={isPending} onClick={confirm}>
                Supprimer
              </Button>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
