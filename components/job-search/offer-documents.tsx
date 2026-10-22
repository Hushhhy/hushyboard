'use client';

import { useId, useState, useTransition } from 'react';
import {
  generateCoverLetter,
  prepareAdaptedResume,
  saveCoverLetter,
} from '@/app/(app)/career/job-search/offer-actions';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { countWords } from '@/lib/job-search';
import { slugifySkillName } from '@/lib/skills';

// « Télécharger le CV adapté (PDF) »: the adapted CV is created on the first click (one AI
// call), then the PDF route renders it.
export function AdaptedResumeButton({ offerId }: { offerId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="primary"
        pending={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await prepareAdaptedResume(offerId);
            if (result.error || !result.resumeId) {
              setError(result.error ?? 'Le CV adapté n’a pas pu être préparé.');
              return;
            }
            // A file download from the PDF route, not a page navigation.
            const link = document.createElement('a');
            link.href = `/api/resume/${result.resumeId}/pdf`;
            link.download = '';
            link.click();
          });
        }}
      >
        Télécharger le CV adapté (PDF)
      </Button>
      <span role="status" className="text-caption-12 text-fg-3 empty:hidden">
        {isPending ? 'Adaptation du CV…' : ''}
      </span>
      {error ? <ErrorState title={error} announce /> : null}
    </div>
  );
}

// The letter in a « paper » block: editable (saved on blur), copy, download, regenerate.
export function CoverLetterEditor({
  offerId,
  company,
  initial,
  model,
  edited,
}: {
  offerId: string;
  company: string;
  initial: string;
  model: string;
  edited: boolean;
}) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const id = useId();

  function save(value: string) {
    if (value.trim() === saved.trim()) return;
    startTransition(async () => {
      const result = await saveCoverLetter(offerId, value);
      if (result.error) return setError(result.error);
      setError(null);
      setSaved(value);
      setStatus('Lettre enregistrée.');
    });
  }

  function regenerate() {
    setConfirmRegenerate(false);
    setError(null);
    startTransition(async () => {
      const result = await generateCoverLetter(offerId, true);
      if (result.error) setError(result.error);
      else setStatus('Nouvelle lettre rédigée.');
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <label htmlFor={id} className="sr-only">
        Lettre de motivation
      </label>
      <textarea
        id={id}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setStatus('');
        }}
        onBlur={(event) => save(event.currentTarget.value)}
        rows={18}
        className="min-h-96 flex-1 rounded-control bg-surface-sunken p-5 text-body-14 leading-6 text-fg-1"
      />
      {error ? <ErrorState title={error} announce /> : null}
      {confirmRegenerate ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-control border-l-3 border-warning bg-surface-raised p-3"
        >
          <p className="text-body-14 font-semibold">Régénérer remplace tes modifications.</p>
          <div className="flex gap-2">
            <Button pending={isPending} onClick={regenerate}>
              Régénérer quand même
            </Button>
            <Button variant="quiet" onClick={() => setConfirmRegenerate(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setStatus('Lettre copiée.');
            } catch {
              setError('La copie a échoué : sélectionne le texte et copie-le à la main.');
            }
          }}
        >
          Copier la lettre
        </Button>
        <Button
          onClick={() => {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `lettre-${slugifySkillName(company) || 'motivation'}.txt`;
            link.click();
            URL.revokeObjectURL(link.href);
          }}
        >
          Télécharger
        </Button>
        <Button
          variant="quiet"
          pending={isPending}
          onClick={() => (edited || text !== initial ? setConfirmRegenerate(true) : regenerate())}
        >
          Régénérer
        </Button>
        <span className="flex-1" />
        <span className="text-caption-12 text-fg-3 tabular">
          {model} · {countWords(text)} mots
        </span>
      </div>
      <p role="status" className="min-h-4 text-caption-12 text-fg-3">
        {isPending && !confirmRegenerate ? 'Rédaction…' : status}
      </p>
    </div>
  );
}
