'use client';

import { useActionState } from 'react';
import { createSkill } from '@/app/(app)/career/profile/actions';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { EMPTY_FORM_STATE } from '@/lib/forms';
import { SKILL_CATEGORY_LABELS } from '@/lib/skills';

const CATEGORY_OPTIONS = Object.entries(SKILL_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function SkillForm() {
  const [state, formAction, isPending] = useActionState(createSkill, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      <TextField
        name="name"
        label="Nom"
        placeholder="Docker, Go, GraphQL…"
        defaultValue={state.values?.name ?? ''}
        error={state.fieldErrors?.name}
      />
      <SelectField
        name="category"
        label="Catégorie"
        options={CATEGORY_OPTIONS}
        defaultValue={state.values?.category ?? 'WEB_FRONT'}
        error={state.fieldErrors?.category}
      />
      <p className="text-caption-12 text-fg-3">
        La compétence est créée avec une roadmap vide de 5 niveaux. Tu la génères avec l’IA ou tu la
        remplis à la main.
      </p>
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          Créer la compétence
        </Button>
      </div>
    </form>
  );
}
