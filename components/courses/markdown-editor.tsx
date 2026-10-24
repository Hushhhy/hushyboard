'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { previewMarkdown } from '@/app/(app)/career/courses/actions';
import { FieldError } from '@/components/ui/error-state';
import {
  CALLOUT_OPTIONS,
  insertCallout,
  insertDetails,
  wrapSelection,
  type Edit,
} from '@/lib/markdown-format';
import { MarkdownContent } from '@/components/ui/markdown-content';

const COLORS = ['or', 'bleu', 'vert', 'orange', 'rouge', 'rose', 'violet', 'gris'];
const FONTS = [
  { value: 'titre', label: 'Police des titres' },
  { value: 'code', label: 'Police code' },
  { value: 'grand', label: 'Grand' },
  { value: 'petit', label: 'Petit' },
];

// Markdown textarea with a toolbar (bold, color, font, callout…) and a "Aperçu" toggle. The
// preview is rendered on the server, with the same sanitizing as the saved note, so what
// Alex sees is exactly what will be shown.
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  function showPreview() {
    setMode('preview');
    startTransition(async () => {
      setHtml(value.trim() ? await previewMarkdown(value) : '');
    });
  }

  // Applies a toolbar edit to the selection, then gives the focus back with the new selection.
  function apply(edit: (text: string, start: number, end: number) => Edit) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const result = edit(value, textarea.selectionStart, textarea.selectionEnd);
    setValue(result.text);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(result.start, result.end);
    });
  }
  const wrap = (before: string, after: string, placeholder: string) =>
    apply((text, start, end) => wrapSelection(text, start, end, before, after, placeholder));

  const toggleClass = (active: boolean) =>
    `h-8 rounded-control px-2.5 text-caption-12 font-semibold ${
      active ? 'bg-surface-control text-fg-1' : 'text-fg-2 hover:text-fg-1'
    }`;
  const toolClass =
    'h-8 min-w-8 rounded-control px-2 text-caption-12 text-fg-2 hover:bg-surface-raised hover:text-fg-1';
  const selectClass =
    'h-8 rounded-control border border-line-subtle bg-surface-sunken px-1.5 text-caption-12 text-fg-2';

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

      {mode === 'write' ? (
        <div
          role="toolbar"
          aria-label="Mise en forme"
          aria-controls={id}
          className="flex flex-wrap items-center gap-1 rounded-control bg-surface-default p-1"
        >
          <button
            type="button"
            className={`${toolClass} font-bold`}
            onClick={() => wrap('**', '**', 'gras')}
          >
            <span aria-hidden="true">G</span>
            <span className="sr-only">Gras</span>
          </button>
          <button
            type="button"
            className={`${toolClass} italic`}
            onClick={() => wrap('*', '*', 'italique')}
          >
            <span aria-hidden="true">I</span>
            <span className="sr-only">Italique</span>
          </button>
          <button
            type="button"
            className={`${toolClass} underline`}
            onClick={() => wrap('++', '++', 'souligné')}
          >
            <span aria-hidden="true">S</span>
            <span className="sr-only">Souligner</span>
          </button>
          <button type="button" className={toolClass} onClick={() => wrap('==', '==', 'surligné')}>
            Surligner
          </button>
          <button type="button" className={toolClass} onClick={() => wrap('`', '`', 'code')}>
            Code
          </button>
          <select
            aria-label="Couleur du texte sélectionné"
            value=""
            onChange={(event) => {
              if (event.target.value) wrap('[', `]{${event.target.value}}`, 'texte');
            }}
            className={selectClass}
          >
            <option value="">Couleur…</option>
            {COLORS.map((color) => (
              <option key={color} value={color}>
                {color.charAt(0).toUpperCase() + color.slice(1)}
              </option>
            ))}
          </select>
          <select
            aria-label="Police ou taille du texte sélectionné"
            value=""
            onChange={(event) => {
              if (event.target.value) wrap('[', `]{${event.target.value}}`, 'texte');
            }}
            className={selectClass}
          >
            <option value="">Police, taille…</option>
            {FONTS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Encadré autour de la sélection"
            value=""
            onChange={(event) => {
              const type = event.target.value;
              if (type) apply((text, start, end) => insertCallout(text, start, end, type));
            }}
            className={selectClass}
          >
            <option value="">Encadré…</option>
            {CALLOUT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" className={toolClass} onClick={() => apply(insertDetails)}>
            Bloc repliable
          </button>
        </div>
      ) : null}

      {/* The textarea stays in the form (hidden in preview) so its value is always submitted. */}
      <textarea
        ref={textareaRef}
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
            <MarkdownContent html={html} />
          ) : (
            <p className="text-caption-12 text-fg-3">Rien à afficher pour l’instant.</p>
          )}
        </div>
      ) : null}
      <p id={`${id}-hint`} className="text-caption-12 text-fg-3">
        Markdown comme sur GitHub : **gras**, `code`, blocs ```sql, tableaux | a | b |, listes - [
        ]. Sélectionne du texte puis utilise la barre pour la couleur, la police ou un encadré.
      </p>
      <details className="text-caption-12 text-fg-2">
        <summary className="cursor-pointer text-fg-3 hover:text-fg-1">Syntaxe des styles</summary>
        <ul className="mt-1 flex flex-col gap-0.5 font-mono">
          <li>
            [texte]{'{'}rouge grand{'}'} : couleurs or, bleu, vert, orange, rouge, rose, violet,
            gris ; polices titre, code ; tailles grand, petit
          </li>
          <li>==surligné== · ++souligné++ · x^2^ · H~2~O · [[Ctrl]]+[[C]]</li>
          <li>&gt; [!ASTUCE] puis &gt; texte : encadrés NOTE, ASTUCE, ATTENTION, IMPORTANT</li>
          <li>+++ Titre … +++ : bloc repliable</li>
          <li>```mermaid … ``` : diagramme (flowchart, séquence, gantt…), dessiné dans l’aperçu</li>
        </ul>
      </details>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}
