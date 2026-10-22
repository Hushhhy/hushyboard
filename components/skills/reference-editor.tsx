'use client';

import { useId, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  generateReferenceDetails,
  saveReferenceDetails,
} from '@/app/(app)/career/profile/skill-actions';
import { Button, buttonClasses } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import type { ReferenceDetails } from '@/lib/skills/schemas';

const FIELD =
  'rounded-control border border-line-subtle bg-surface-sunken px-3 py-2 text-body-14 placeholder:text-fg-3';
const CODE_FIELD = `${FIELD} font-mono text-caption-12`;

const lines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

// « Modifier » on a reference entry: summary, description, syntax, values, example, equivalents.
export function ReferenceEditor({
  entryId,
  summary,
  details,
  edited,
  equivalentsLabel,
  closeHref,
}: {
  entryId: string;
  summary: string;
  details: ReferenceDetails;
  edited: boolean;
  equivalentsLabel: string;
  closeHref: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(details);
  const [summaryDraft, setSummaryDraft] = useState(summary);
  const [values, setValues] = useState(details.values.join('\n'));
  const [equivalents, setEquivalents] = useState(details.equivalents.join('\n'));
  const [error, setError] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const id = useId();

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else router.push(closeHref, { scroll: false });
    });
  }

  const textField = (
    key: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { rows?: number; code?: boolean } = {}
  ) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-${key}`} className="text-label-12 text-fg-3 uppercase">
        {label}
      </label>
      <textarea
        id={`${id}-${key}`}
        value={value}
        rows={options.rows ?? 3}
        spellCheck={!options.code}
        onChange={(event) => onChange(event.target.value)}
        className={options.code ? CODE_FIELD : FIELD}
      />
    </div>
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(() =>
          saveReferenceDetails(entryId, {
            summary: summaryDraft,
            details: { ...draft, values: lines(values), equivalents: lines(equivalents) },
          })
        );
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-summary`} className="text-label-12 text-fg-3 uppercase">
          Résumé dans la liste
        </label>
        <input
          id={`${id}-summary`}
          value={summaryDraft}
          maxLength={120}
          onChange={(event) => setSummaryDraft(event.target.value)}
          className={`${FIELD} h-9`}
        />
      </div>
      {textField('description', 'Description (Markdown)', draft.description, (description) =>
        setDraft({ ...draft, description })
      )}
      {textField('syntax', 'Syntaxe', draft.syntax, (syntax) => setDraft({ ...draft, syntax }), {
        code: true,
      })}
      {textField('values', 'Valeurs courantes (une par ligne)', values, setValues, { rows: 4 })}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-lang`} className="text-label-12 text-fg-3 uppercase">
          Langage de l’exemple
        </label>
        <input
          id={`${id}-lang`}
          value={draft.example.lang}
          onChange={(event) =>
            setDraft({ ...draft, example: { ...draft.example, lang: event.target.value } })
          }
          className={`${FIELD} h-9 w-56`}
        />
      </div>
      {textField(
        'example',
        'Exemple',
        draft.example.code,
        (code) => setDraft({ ...draft, example: { ...draft.example, code } }),
        { rows: 6, code: true }
      )}
      {textField('equivalents', `${equivalentsLabel} (un par ligne)`, equivalents, setEquivalents)}

      {error ? <ErrorState title={error} announce /> : null}

      {confirmRegenerate ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-control border-l-3 border-warning bg-surface-raised p-3"
        >
          <p className="text-body-14 font-semibold">Régénérer remplace tes modifications.</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              pending={isPending}
              onClick={() => run(() => generateReferenceDetails(entryId, true))}
            >
              Régénérer quand même
            </Button>
            <Button variant="quiet" onClick={() => setConfirmRegenerate(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" pending={isPending}>
          Enregistrer
        </Button>
        <Link href={closeHref} scroll={false} className={buttonClasses({ variant: 'quiet' })}>
          Annuler
        </Link>
        <span className="flex-1" />
        <Button
          variant="quiet"
          disabled={isPending}
          onClick={() =>
            edited ? setConfirmRegenerate(true) : run(() => generateReferenceDetails(entryId, true))
          }
        >
          Régénérer
        </Button>
      </div>
    </form>
  );
}
