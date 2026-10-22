'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { applyToOffer, setOfferDecision } from '@/app/(app)/career/job-search/actions';
import { levelUpReward } from '@/components/rewards/use-form-done';
import { useRewards } from '@/components/rewards/rewards-provider';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { toDateInputValue } from '@/lib/dates';

// « Postulé » / « Refusé » on an offer card of the watch.
export function OfferCardActions({ offerId }: { offerId: string }) {
  const { announce } = useRewards();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button
          pending={isPending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await applyToOffer(offerId);
              if (result.error) setError(result.error);
              if (result.levelUp) announce(levelUpReward(result.levelUp));
            })
          }
        >
          Postulé
        </Button>
        <Button
          disabled={isPending}
          onClick={() => startTransition(() => setOfferDecision(offerId, 'DISMISSED'))}
        >
          Refusé
        </Button>
      </div>
      {error ? <ErrorState title={error} announce /> : null}
    </div>
  );
}

// « Classée : refusée par toi · Annuler »
export function RestoreOfferButton({ offerId }: { offerId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="quiet"
      pending={isPending}
      onClick={() => startTransition(() => setOfferDecision(offerId, 'PENDING'))}
    >
      Annuler
    </Button>
  );
}

// « Refuser » on the offer page: back to the watch.
export function DismissOfferButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="quiet"
      pending={isPending}
      onClick={() =>
        startTransition(async () => {
          await setOfferDecision(offerId, 'DISMISSED');
          router.push('/career/job-search/watch');
        })
      }
    >
      Refuser
    </Button>
  );
}

// « Marquer postulée » (side panel of the offer page): which CV, which day.
export function ApplyForm({
  offerId,
  resumes,
  defaultResumeId,
  closeHref,
}: {
  offerId: string;
  resumes: { id: string; name: string }[];
  defaultResumeId: string | null;
  closeHref: string;
}) {
  const router = useRouter();
  const { announce } = useRewards();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await applyToOffer(offerId, {
            resumeId: String(form.get('resumeId') ?? 'none'),
            sentAt: String(form.get('sentAt') ?? ''),
          });
          if (result.error) return setError(result.error);
          if (result.levelUp) announce(levelUpReward(result.levelUp));
          router.replace(closeHref, { scroll: false });
        });
      }}
    >
      <SelectField
        name="resumeId"
        label="CV envoyé"
        options={[
          ...resumes.map((resume) => ({ value: resume.id, label: resume.name })),
          { value: 'none', label: 'Aucun CV joint (pas d’XP)' },
        ]}
        defaultValue={defaultResumeId ?? 'none'}
      />
      <TextField
        name="sentAt"
        type="date"
        label="Envoyée le"
        defaultValue={toDateInputValue(new Date())}
      />
      <p className="text-caption-12 text-fg-3">
        La candidature apparaît dans l’onglet Candidatures, avec une relance dans 14 jours. +15 XP
        avec un CV joint.
      </p>
      {error ? <ErrorState title={error} announce /> : null}
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          Marquer postulée
        </Button>
      </div>
    </form>
  );
}
