'use client';

import { useId, useState, useTransition } from 'react';
import { previewMarkdown } from '@/app/(app)/career/courses/actions';
import { FieldError } from '@/components/ui/error-state';

// Markdown textarea with a "Aperçu" toggle. The preview is rendered on the server, with the
// same sanitizing as the saved note, so what Alex sees is exactly what will be shown.
export function MarkdownEditor({
  name,
  label,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [html, setHtml] = useState('');
  const [isPending, startTransition] = useTransition();
  const id = useId();

  function showPreview() {
    setMode('preview');
    startTransition(async () => {
      setHtml(value.trim() ? await previewMarkdown(value) : '');
    });
  }

  const toggleClass = (active: boolean) =>
    `h-8 rounded-control px-2.5 text-caption-12 font-semibold ${
      active ? 'bg-surface-control text-fg-1' : 'text-fg-2 hover:text-fg-1'
    }`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="flex-1 text-body-14 font-medium">
          {label}
        </label>
        <div role="group" aria-label="Mode d’édition" className="flex gap-1">
          <button
            type="button"
            aria-pressed={mode === 'write'}
            onClick={() => setMode('write')}
            className={toggleClass(mode === 'write')}
          >
            Écrire
          </button>
          <button
            type="button"
            aria-pressed={mode === 'preview'}
            onClick={showPreview}
            className={toggleClass(mode === 'preview')}
          >
            Aperçu
          </button>
        </div>
      </div>
      {/* The textarea stays in the form (hidden in preview) so its value is always submitted. */}
      <textarea
        id={id}
        name={name}
        rows={10}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        hidden={mode === 'preview'}
        spellCheck
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
        className="min-h-40 resize-y rounded-control border border-line-strong bg-surface-sunken px-3 py-2 font-mono text-caption-12 leading-relaxed text-fg-1"
      />
      {mode === 'preview' ? (
        <div
          aria-busy={isPending || undefined}
          className="min-h-40 rounded-control border border-line-subtle bg-surface-default p-3"
        >
          {isPending ? (
            <p className="text-caption-12 text-fg-3">Préparation de l’aperçu…</p>
          ) : html ? (
            <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-caption-12 text-fg-3">Rien à afficher pour l’instant.</p>
          )}
        </div>
      ) : null}
      <p id={`${id}-hint`} className="text-caption-12 text-fg-3">
        Markdown comme sur GitHub : **gras**, `code`, blocs ```sql, tableaux | a | b |, listes - [
        ].
      </p>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}
