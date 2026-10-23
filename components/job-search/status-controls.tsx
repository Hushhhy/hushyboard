'use client';

import { useId, useState, useTransition } from 'react';
import type { ApplicationStatus } from '@/generated/prisma/client';
import {
  changeApplicationStatus,
  setFollowUpDate,
  undoApplicationEvent,
} from '@/app/(app)/career/job-search/actions';
import { levelUpReward } from '@/components/rewards/use-form-done';
import { useRewards } from '@/components/rewards/rewards-provider';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { statusLabel } from '@/components/ui/status-pill';
import { UndoStatus } from '@/components/ui/undo-status';
import { toDateInputValue } from '@/lib/dates';

const STATUS_ORDER: ApplicationStatus[] = [
  'SENT',
  'WAITING',
  'FOLLOWED_UP',
  'HR_INTERVIEW',
  'TECH_INTERVIEW',
  'OFFER',
  'REJECTED',
  'NO_RESPONSE',
];

const XP_HINTS: Partial<Record<ApplicationStatus, string>> = {
  HR_INTERVIEW: ' (+40 XP)',
  TECH_INTERVIEW: ' (+60 XP)',
  OFFER: ' (+300 XP)',
};

// Shared by the status select and the « Relancée » buttons: one event, XP, undo.
function useStatusChange() {
  const { announce } = useRewards();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{ eventId: string; label: string } | null>(null);

  function change(applicationId: string, status: ApplicationStatus) {
    setError(null);
    startTransition(async () => {
      const result = await changeApplicationStatus(applicationId, status);
      if (result.error) return setError(result.error);
      if (result.levelUp) announce(levelUpReward(result.levelUp));
      if (result.eventId) setLast({ eventId: result.eventId, label: statusLabel(status) });
    });
  }

  function undo() {
    if (!last) return;
    const { eventId } = last;
    setLast(null);
    startTransition(async () => {
      await undoApplicationEvent(eventId);
    });
  }

  return { change, undo, isPending, error, last };
}

// Side panel of an application: change the status, see the undo.
export function StatusControls({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatus;
}) {
  const [next, setNext] = useState<ApplicationStatus>(status);
  const { change, undo, isPending, error, last } = useStatusChange();
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-body-14 font-medium">
        Nouveau statut
      </label>
      <div className="flex gap-2">
        <select
          id={id}
          value={next}
          onChange={(event) => setNext(event.target.value as ApplicationStatus)}
          className="h-9 min-w-0 flex-1 rounded-control border border-line-strong bg-surface-sunken px-2 text-body-14"
        >
          {STATUS_ORDER.map((value) => (
            <option key={value} value={value}>
              {statusLabel(value)}
              {XP_HINTS[value] ?? ''}
            </option>
          ))}
        </select>
        <Button
          onOverlay
          pending={isPending}
          disabled={next === status}
          onClick={() => change(applicationId, next)}
        >
          Changer
        </Button>
      </div>
      {error ? <ErrorState title={error} announce /> : null}
      <UndoStatus message={last ? `Statut passé à « ${last.label} ».` : null} onUndo={undo} />
    </div>
  );
}

// « Relancée » (spontaneous follow-ups, side panel): status FOLLOWED_UP, next follow-up +14 days.
export function FollowedUpButton({ applicationId }: { applicationId: string }) {
  const { change, undo, isPending, error, last } = useStatusChange();
  return (
    <div className="flex flex-col items-end gap-1">
      {last ? (
        <UndoStatus message="Marquée relancée." onUndo={undo} focusUndo />
      ) : (
        <Button
          variant="quiet"
          small
          pending={isPending}
          onClick={() => change(applicationId, 'FOLLOWED_UP')}
        >
          Relancée
        </Button>
      )}
      {error ? <ErrorState title={error} announce /> : null}
    </div>
  );
}

// Follow-up date, saved as soon as it changes.
export function FollowUpField({
  applicationId,
  followUpAt,
}: {
  applicationId: string;
  followUpAt: Date | null;
}) {
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-body-14 font-medium">
        Date de relance
      </label>
      <input
        id={id}
        type="date"
        defaultValue={toDateInputValue(followUpAt)}
        onChange={(event) => {
          const value = event.target.value;
          setSaved(false);
          startTransition(async () => {
            await setFollowUpDate(applicationId, value);
            setSaved(true);
          });
        }}
        className="h-9 w-48 rounded-control border border-line-strong bg-surface-sunken px-3 text-body-14"
      />
      <p role="status" className="min-h-4 text-caption-12 text-fg-3">
        {saved ? 'Date de relance enregistrée.' : ''}
      </p>
    </div>
  );
}
