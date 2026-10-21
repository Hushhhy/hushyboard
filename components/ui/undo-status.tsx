'use client';

import { useEffect, useRef } from 'react';
import { Button } from './button';

type UndoStatusProps = {
  // "Candidature ajoutée au suivi." — null when there is nothing to announce.
  message: string | null;
  onUndo?: () => void;
  // Move focus to "Annuler" when the clicked button disappeared with the action
  // (otherwise keyboard focus would be lost).
  focusUndo?: boolean;
  className?: string;
};

// Confirms an action and offers to undo it, until the next action. No timer.
// The role="status" region is always rendered (empty at first) so the announcement is not lost.
export function UndoStatus({
  message,
  onUndo,
  focusUndo = false,
  className = '',
}: UndoStatusProps) {
  const undoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (message && focusUndo) undoRef.current?.focus();
  }, [message, focusUndo]);

  return (
    <div
      role="status"
      className={`flex min-h-9 items-center gap-2 text-body-14 text-fg-2 ${className}`}
    >
      {message ? (
        <>
          <span>{message}</span>
          {onUndo ? (
            <Button ref={undoRef} variant="quiet" onClick={onUndo}>
              Annuler
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
