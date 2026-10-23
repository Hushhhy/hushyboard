'use client';

import { useActionState, useId, useState, useTransition } from 'react';
import { saveOffer } from '@/app/(app)/career/job-search/actions';
import { extractOffer } from '@/app/(app)/career/job-search/offer-actions';
import { SparkleIcon } from '@/components/icons';
import { useFormDone } from '@/components/rewards/use-form-done';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { EMPTY_FORM_STATE } from '@/lib/forms';
import { CONTRACT_LABELS, CONTRACT_TYPES, type OfferExtract } from '@/lib/job-search-schemas';

const CONTRACT_OPTIONS = [
  { value: '', label: 'Non précisé' },
  ...CONTRACT_TYPES.map((value) => ({ value, label: CONTRACT_LABELS[value] })),
];

// « Ajouter une offre »: paste the text, the AI fills the fields, Alex corrects and saves.
// The fields can also be filled by hand (no AI call).
export function OfferForm({ sources, closeHref }: { sources: string[]; closeHref: string }) {
  const [state, formAction, isSaving] = useActionState(saveOffer, EMPTY_FORM_STATE);
  useFormDone(state, closeHref);
  const [text, setText] = useState(state.values?.description ?? '');
  const [url, setUrl] = useState(state.values?.url ?? '');
  const [extracted, setExtracted] = useState<OfferExtract | null>(null);
  const [showFields, setShowFields] = useState(Boolean(state.values));
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isExtracting, startExtract] = useTransition();
  // Remounts the fields with the extracted values.
  const [version, setVersion] = useState(0);
  const id = useId();

  const value = (name: string, fallback: string | undefined) =>
    state.values?.[name] ?? fallback ?? '';

  function analyze() {
    setExtractError(null);
    startExtract(async () => {
      const result = await extractOffer(text, url);
      if (result.error) return setExtractError(result.error);
      setExtracted(result.offer ?? null);
      setShowFields(true);
      setVersion((current) => current + 1);
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      <TextField
        name="url"
        label="Lien de l’offre"
        placeholder="https://…"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        error={state.fieldErrors?.url}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-text`} className="text-body-14 font-medium">
          Colle le texte de l’offre
        </label>
        <textarea
          id={`${id}-text`}
          name="description"
          rows={9}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Tout le texte de l’annonce : missions, profil, stack…"
          className="rounded-control border border-line-strong bg-surface-sunken px-3 py-2 text-body-14"
        />
        <p className="text-caption-12 text-fg-3">
          Le texte est gardé avec l’offre : il sert à l’analyse du CV et à la lettre.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onOverlay pending={isExtracting} onClick={analyze} disabled={!text.trim()}>
          <SparkleIcon className="size-4" />
          Analyser l’offre
        </Button>
        {!showFields ? (
          <Button variant="quiet" onClick={() => setShowFields(true)}>
            Remplir à la main
          </Button>
        ) : null}
        <span role="status" className="text-caption-12 text-fg-3">
          {isExtracting ? 'Lecture de l’offre…' : extracted ? 'Champs remplis : vérifie-les.' : ''}
        </span>
      </div>
      {extractError ? <ErrorState title={extractError} announce /> : null}

      {showFields ? (
        <fieldset key={version} className="flex flex-col gap-3 border-t border-line-subtle pt-3">
          <legend className="sr-only">Champs de l’offre</legend>
          <TextField
            name="title"
            label="Intitulé du poste"
            defaultValue={value('title', extracted?.title)}
            error={state.fieldErrors?.title}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              name="company"
              label="Entreprise"
              defaultValue={value('company', extracted?.company)}
              error={state.fieldErrors?.company}
            />
            <TextField
              name="location"
              label="Lieu"
              defaultValue={value('location', extracted?.location)}
              error={state.fieldErrors?.location}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              name="contractType"
              label="Contrat"
              options={CONTRACT_OPTIONS}
              defaultValue={value('contractType', extracted?.contractType)}
            />
            <TextField
              name="remotePolicy"
              label="Télétravail"
              placeholder="2 j/sem."
              defaultValue={value('remotePolicy', extracted?.remotePolicy)}
              error={state.fieldErrors?.remotePolicy}
            />
          </div>
          <TextField
            name="skills"
            label="Compétences demandées"
            hint="Séparées par des virgules."
            defaultValue={value('skills', extracted?.requiredSkills.join(', '))}
            error={state.fieldErrors?.skills}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-summary`} className="text-body-14 font-medium">
              Résumé
            </label>
            <textarea
              id={`${id}-summary`}
              name="summary"
              rows={3}
              defaultValue={value('summary', extracted?.summary)}
              className="rounded-control border border-line-strong bg-surface-sunken px-3 py-2 text-body-14"
            />
          </div>
          <TextField
            name="source"
            label="Source"
            placeholder="Welcome to the Jungle"
            list={`${id}-sources`}
            defaultValue={value('source', undefined)}
            error={state.fieldErrors?.source}
          />
          <datalist id={`${id}-sources`}>
            {sources.map((source) => (
              <option key={source} value={source} />
            ))}
          </datalist>
          <div className="mt-2">
            <Button type="submit" variant="primary" onOverlay pending={isSaving}>
              Enregistrer l’offre
            </Button>
          </div>
        </fieldset>
      ) : null}
    </form>
  );
}
