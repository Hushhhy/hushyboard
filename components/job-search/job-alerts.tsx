'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import {
  setAlertLabel,
  syncJobAlerts,
  type SyncResult,
} from '@/app/(app)/career/job-search/alert-actions';
import { purgeExpiredOffers } from '@/app/(app)/career/job-search/actions';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

// Several calls while mails remain (each call reads a few, within the function time limit).
const MAX_ROUNDS = 6;

function useSync() {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  function run(force: boolean) {
    setError(null);
    startTransition(async () => {
      let mails = 0;
      let offers = 0;
      try {
        for (let round = 0; round < MAX_ROUNDS; round += 1) {
          setStatus(
            round === 0
              ? 'Lecture des alertes…'
              : `Lecture des alertes… ${offers} offre${offers > 1 ? 's' : ''} ajoutée${offers > 1 ? 's' : ''}`
          );
          const result: SyncResult = await syncJobAlerts(force || round > 0);
          if (result.skipped) return setStatus('');
          mails += result.mails ?? 0;
          offers += result.offers ?? 0;
          if (result.error) {
            setError(result.error);
            break;
          }
          if (!result.remaining) break;
        }
        setStatus(
          mails === 0
            ? 'Aucune nouvelle alerte.'
            : `${mails} alerte${mails > 1 ? 's' : ''} lue${mails > 1 ? 's' : ''}, ${offers} offre${offers > 1 ? 's' : ''} ajoutée${offers > 1 ? 's' : ''}.`
        );
      } catch {
        setError('L’import des alertes n’a pas abouti. Réessaie.');
        setStatus('');
      }
    });
  }
  return { run, isPending, status, error };
}

// Alert label choice, « Synchroniser maintenant », and an automatic import on opening
// (the server skips it if the last one is less than 30 min old).
export function JobAlertsControls({
  labels,
  labelId,
}: {
  labels: { id: string; name: string }[];
  labelId: string | null;
}) {
  const { run, isPending, status, error } = useSync();
  const [labelError, setLabelError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const auto = useRef(false);
  const id = useId();

  useEffect(() => {
    if (!labelId || auto.current) return;
    auto.current = true;
    run(false);
    // Once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelId]);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-caption-12 text-fg-2">
        Libellé Gmail des alertes
      </label>
      <select
        id={id}
        value={labelId ?? ''}
        disabled={isSaving}
        onChange={(event) => {
          const next = event.target.value;
          setLabelError(null);
          startSaving(async () => {
            const result = await setAlertLabel(next);
            if (result.error) setLabelError(result.error);
          });
        }}
        className="h-9 rounded-control border border-line-strong bg-surface-sunken px-2 text-body-14"
      >
        <option value="">Choisir un libellé…</option>
        {labels.map((label) => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </select>
      {labelError ? <ErrorState title={labelError} announce /> : null}
      {labelId ? (
        <Button className="self-start" pending={isPending} onClick={() => run(true)}>
          Synchroniser maintenant
        </Button>
      ) : null}
      <p role="status" className="text-caption-12 text-fg-2 empty:hidden">
        {status}
      </p>
      {error ? <ErrorState title={error} announce /> : null}
    </div>
  );
}

// Offers not applied to are deleted after 7 days: done when the watch opens.
export function PurgeExpiredOffers() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void purgeExpiredOffers().catch(() => {});
  }, []);
  return null;
}
