'use client';

import { useActionState, useId } from 'react';
import { createEmptyResume, importResume } from '@/app/(app)/career/resume/actions';
import { UploadIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ErrorState, FieldError } from '@/components/ui/error-state';
import { EMPTY_FORM_STATE } from '@/lib/forms';

// Import the CV PDF: Gemini extracts the content, Alex reviews it in the editor.
// The PDF itself is never stored.
export function ImportForm({ primary = false }: { primary?: boolean }) {
  const [state, formAction, isPending] = useActionState(importResume, EMPTY_FORM_STATE);
  const inputId = useId();

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-2" noValidate>
        {state.error ? (
          <ErrorState title="Import impossible." description={state.error} announce />
        ) : null}
        <label htmlFor={inputId} className="text-body-14 font-medium">
          PDF de ton CV (4 Mo maximum)
        </label>
        <input
          id={inputId}
          type="file"
          name="file"
          accept="application/pdf"
          aria-invalid={state.fieldErrors?.file ? true : undefined}
          aria-describedby={state.fieldErrors?.file ? `${inputId}-error` : `${inputId}-hint`}
          className="text-body-14 text-fg-2 file:mr-3 file:h-9 file:rounded-control file:border file:border-line-subtle file:bg-surface-control file:px-3 file:font-semibold file:text-fg-1"
        />
        {state.fieldErrors?.file ? (
          <FieldError id={`${inputId}-error`}>{state.fieldErrors.file}</FieldError>
        ) : (
          <p id={`${inputId}-hint`} className="text-caption-12 text-fg-3">
            Le PDF est lu par l’IA puis supprimé : seul le contenu extrait est gardé, et tu le relis
            avant tout.
          </p>
        )}
        <div className="mt-1">
          <Button
            type="submit"
            variant={primary ? 'primary' : 'secondary'}
            onOverlay={!primary}
            pending={isPending}
          >
            <UploadIcon className="size-4" />
            {isPending ? 'Lecture du CV' : 'Importer et relire'}
          </Button>
        </div>
        {isPending ? (
          <p role="status" className="text-caption-12 text-fg-2">
            L’IA lit ton CV, cela prend en général 10 à 30 secondes.
          </p>
        ) : null}
      </form>

      <form action={createEmptyResume} className="border-t border-line-subtle pt-3">
        <p className="mb-2 text-caption-12 text-fg-3">
          Pas de PDF sous la main, ou limite de l’IA atteinte ?
        </p>
        <Button type="submit" variant="quiet" className="-ml-2">
          Partir d’une version vide
        </Button>
      </form>
    </div>
  );
}
