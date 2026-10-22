'use client';

import { useActionState } from 'react';
import { saveCertification } from '@/app/(app)/career/certifications/actions';
import { SkillCheckboxes, type Option } from '@/components/courses/skill-checkboxes';
import { useFormDone } from '@/components/rewards/use-form-done';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { toDateInputValue } from '@/lib/dates';
import { EMPTY_FORM_STATE } from '@/lib/forms';
import type { CertificationItem } from '@/lib/learning-data';

const STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Prévue' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'OBTAINED', label: 'Obtenue (+200 XP)' },
];

function centsToInput(cents: number | null): string {
  return cents === null ? '' : (cents / 100).toFixed(2).replace('.', ',');
}

export function CertificationForm({
  certification,
  skills,
  closeHref,
}: {
  certification: CertificationItem | null;
  skills: Option[];
  closeHref: string;
}) {
  const [state, formAction, isPending] = useActionState(saveCertification, EMPTY_FORM_STATE);
  useFormDone(state, closeHref);
  const value = (name: string, fallback: string) => state.values?.[name] ?? fallback;

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      {certification ? <input type="hidden" name="id" value={certification.id} /> : null}
      <TextField
        name="name"
        label="Nom"
        placeholder="IBM Data Engineering"
        defaultValue={value('name', certification?.name ?? '')}
        error={state.fieldErrors?.name}
      />
      <TextField
        name="issuer"
        label="Organisme"
        placeholder="Coursera · IBM"
        defaultValue={value('issuer', certification?.issuer ?? '')}
        error={state.fieldErrors?.issuer}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          name="status"
          label="Statut"
          options={STATUS_OPTIONS}
          defaultValue={value('status', certification?.status ?? 'PLANNED')}
        />
        <TextField
          name="totalCourses"
          label="Nombre de cours"
          inputMode="numeric"
          placeholder="13"
          defaultValue={value(
            'totalCourses',
            certification?.totalCourses ? String(certification.totalCourses) : ''
          )}
          error={state.fieldErrors?.totalCourses}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="plannedFor"
          type="date"
          label="Date visée"
          defaultValue={value('plannedFor', toDateInputValue(certification?.plannedFor))}
          error={state.fieldErrors?.plannedFor}
        />
        <TextField
          name="obtainedAt"
          type="date"
          label="Obtenue le"
          hint="Aujourd’hui par défaut si obtenue."
          defaultValue={value('obtainedAt', toDateInputValue(certification?.obtainedAt))}
          error={state.fieldErrors?.obtainedAt}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="cost"
          label="Coût (€)"
          inputMode="decimal"
          placeholder="49,99"
          defaultValue={value('cost', centsToInput(certification?.costCents ?? null))}
          error={state.fieldErrors?.cost}
        />
        <TextField
          name="credentialUrl"
          label="Lien du certificat"
          placeholder="https://…"
          defaultValue={value('credentialUrl', certification?.credentialUrl ?? '')}
          error={state.fieldErrors?.credentialUrl}
        />
      </div>
      <SkillCheckboxes
        skills={skills}
        selected={certification?.skills.map((skill) => skill.id) ?? []}
      />
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          {certification ? 'Enregistrer' : 'Ajouter la certification'}
        </Button>
      </div>
    </form>
  );
}
