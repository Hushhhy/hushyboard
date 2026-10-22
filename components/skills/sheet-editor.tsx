'use client';

import { useId, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { generateNotionSheet, saveNotionSheet } from '@/app/(app)/career/profile/skill-actions';
import { Button, buttonClasses } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import type { NotionSheet } from '@/lib/skills/schemas';

const FIELD =
  'rounded-control border border-line-subtle bg-surface-sunken px-3 py-2 text-body-14 placeholder:text-fg-3';
const CODE_FIELD = `${FIELD} font-mono text-caption-12`;

function CodeFields({
  legend,
  value,
  onChange,
}: {
  legend: string;
  value: NotionSheet['syntax'];
  onChange: (value: NotionSheet['syntax']) => void;
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-label-12 text-fg-3 uppercase">{legend}</legend>
      <label htmlFor={`${id}-lang`} className="text-caption-12 text-fg-2">
        Langage (css, javascript, python, sql, shellscript…)
      </label>
      <input
        id={`${id}-lang`}
        value={value.lang}
        onChange={(event) => onChange({ ...value, lang: event.target.value })}
        className={`${FIELD} h-9 w-56`}
      />
      <label htmlFor={`${id}-code`} className="text-caption-12 text-fg-2">
        Code
      </label>
      <textarea
        id={`${id}-code`}
        value={value.code}
        rows={Math.min(14, Math.max(4, value.code.split('\n').length + 1))}
        spellCheck={false}
        onChange={(event) => onChange({ ...value, code: event.target.value })}
        className={CODE_FIELD}
      />
    </fieldset>
  );
}

// « Modifier la fiche »: one Markdown field per section, one code field per block.
// « Régénérer » replaces the sheet; it asks first if Alex has edited it.
export function SheetEditor({
  notionId,
  sheet,
  edited,
  closeHref,
}: {
  notionId: string;
  sheet: NotionSheet;
  edited: boolean;
  closeHref: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(sheet);
  const [pitfalls, setPitfalls] = useState(sheet.pitfalls.join('\n'));
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

  function save() {
    run(() =>
      saveNotionSheet(notionId, {
        ...draft,
        pitfalls: pitfalls
          .split('\n')
          .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
          .filter(Boolean),
      })
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-summary`} className="text-label-12 text-fg-3 uppercase">
          Résumé (Markdown)
        </label>
        <textarea
          id={`${id}-summary`}
          value={draft.summary}
          rows={4}
          onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
          className={FIELD}
        />
      </div>
      <CodeFields
        legend="Syntaxe"
        value={draft.syntax}
        onChange={(syntax) => setDraft({ ...draft, syntax })}
      />
      <CodeFields
        legend="Exemple concret"
        value={draft.example}
        onChange={(example) => setDraft({ ...draft, example })}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-pitfalls`} className="text-label-12 text-fg-3 uppercase">
          Pièges (un par ligne, Markdown)
        </label>
        <textarea
          id={`${id}-pitfalls`}
          value={pitfalls}
          rows={4}
          onChange={(event) => setPitfalls(event.target.value)}
          className={FIELD}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-doc`} className="text-label-12 text-fg-3 uppercase">
          Lien vers la documentation
        </label>
        <input
          id={`${id}-doc`}
          type="url"
          value={draft.docUrl}
          onChange={(event) => setDraft({ ...draft, docUrl: event.target.value })}
          className={`${FIELD} h-9`}
        />
      </div>

      {error ? <ErrorState title={error} announce /> : null}

      {confirmRegenerate ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-control border-l-3 border-warning bg-surface-raised p-3"
        >
          <p className="text-body-14 font-semibold">Régénérer remplace tes modifications.</p>
          <p className="text-body-14 text-fg-2">
            L’IA écrit une nouvelle fiche. Tes notes personnelles sont gardées.
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              pending={isPending}
              onClick={() => run(() => generateNotionSheet(notionId, true))}
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
          Enregistrer la fiche
        </Button>
        <Link href={closeHref} scroll={false} className={buttonClasses({ variant: 'quiet' })}>
          Annuler
        </Link>
        <span className="flex-1" />
        <Button
          variant="quiet"
          disabled={isPending}
          onClick={() =>
            edited ? setConfirmRegenerate(true) : run(() => generateNotionSheet(notionId, true))
          }
        >
          Régénérer
        </Button>
      </div>
    </form>
  );
}
