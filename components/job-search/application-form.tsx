'use client';

import { useActionState } from 'react';
import { saveApplication } from '@/app/(app)/career/job-search/actions';
import { useFormDone } from '@/components/rewards/use-form-done';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { toDateInputValue } from '@/lib/dates';
import { EMPTY_FORM_STATE } from '@/lib/forms';
import { CONTRACT_LABELS, CONTRACT_TYPES } from '@/lib/job-search-schemas';

export type ApplicationFormValue = {
  id: string;
  company: string;
  position: string | null;
  contractType: string | null;
  location: string | null;
  source: string | null;
  url: string | null;
  careersUrl: string | null;
  sentAt: Date;
  resumeId: string | null;
  notes: string | null;
};

const CONTRACT_OPTIONS = [
  { value: '', label: 'Non précisé' },
  ...CONTRACT_TYPES.map((value) => ({ value, label: CONTRACT_LABELS[value] })),
];

// « Ajouter une candidature » and « Ajouter un site » (spontaneous), and their edit forms.
export function ApplicationForm({
  kind,
  application,
  resumes,
  closeHref,
}: {
  kind: 'OFFER' | 'SPONTANEOUS';
  application: ApplicationFormValue | null;
  resumes: { id: string; name: string }[];
  closeHref: string;
}) {
  const [state, formAction, isPending] = useActionState(saveApplication, EMPTY_FORM_STATE);
  useFormDone(state, closeHref);
  const value = (name: string, fallback: string | null | undefined) =>
    state.values?.[name] ?? fallback ?? '';
  const spontaneous = kind === 'SPONTANEOUS';
  const resumeOptions = [
    { value: '', label: 'Aucun CV joint (pas d’XP)' },
    ...resumes.map((resume) => ({ value: resume.id, label: resume.name })),
  ];

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      <input type="hidden" name="kind" value={kind} />
      {application ? <input type="hidden" name="id" value={application.id} /> : null}
      <TextField
        name="company"
        label="Entreprise"
        defaultValue={value('company', application?.company)}
        error={state.fieldErrors?.company}
      />
      {spontaneous ? (
        <TextField
          name="careersUrl"
          label="Page carrière"
          placeholder="https://entreprise.com/careers"
          defaultValue={value('careersUrl', application?.careersUrl)}
          error={state.fieldErrors?.careersUrl}
        />
      ) : null}
      <TextField
        name="position"
        label={spontaneous ? 'Poste visé (facultatif)' : 'Poste'}
        placeholder={spontaneous ? 'Développeur full stack' : undefined}
        defaultValue={value('position', application?.position)}
        error={state.fieldErrors?.position}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          name="contractType"
          label="Contrat"
          options={CONTRACT_OPTIONS}
          defaultValue={value('contractType', application?.contractType)}
        />
        <TextField
          name="location"
          label="Lieu"
          defaultValue={value('location', application?.location)}
          error={state.fieldErrors?.location}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="sentAt"
          type="date"
          label="Envoyée le"
          defaultValue={value('sentAt', toDateInputValue(application?.sentAt ?? new Date()))}
          error={state.fieldErrors?.sentAt}
        />
        <TextField
          name="source"
          label="Source"
          placeholder={spontaneous ? 'Site carrière' : 'LinkedIn'}
          defaultValue={value(
            'source',
            application?.source ?? (spontaneous ? 'Site carrière' : '')
          )}
          error={state.fieldErrors?.source}
        />
      </div>
      {!spontaneous ? (
        <TextField
          name="url"
          label="Lien de l’offre"
          placeholder="https://…"
          defaultValue={value('url', application?.url)}
          error={state.fieldErrors?.url}
        />
      ) : null}
      <SelectField
        name="resumeId"
        label="CV envoyé"
        options={resumeOptions}
        defaultValue={value('resumeId', application ? application.resumeId : resumes[0]?.id)}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="application-notes" className="text-body-14 font-medium">
          Notes
        </label>
        <textarea
          id="application-notes"
          name="notes"
          rows={3}
          defaultValue={value('notes', application?.notes)}
          className="rounded-control border border-line-strong bg-surface-sunken px-3 py-2 text-body-14"
        />
      </div>
      <p className="text-caption-12 text-fg-3">
        Relance proposée 14 jours après l’envoi. +15 XP quand un CV est joint (75 XP par jour au
        plus).
      </p>
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          {application ? 'Enregistrer' : spontaneous ? 'Ajouter le site' : 'Ajouter la candidature'}
        </Button>
      </div>
    </form>
  );
}
