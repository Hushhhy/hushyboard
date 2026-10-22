'use client';

import { useActionState } from 'react';
import { saveProjectDetails } from '@/app/(app)/career/projects/actions';
import { SkillCheckboxes } from '@/components/courses/skill-checkboxes';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField } from '@/components/ui/text-field';
import { EMPTY_FORM_STATE } from '@/lib/forms';
import { PROJECT_CATEGORY_LABELS } from '@/lib/github/helpers';
import type { ProjectItem } from '@/lib/projects-data';

const CATEGORY_OPTIONS = Object.entries(PROJECT_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-body-14">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 accent-career"
      />
      {label}
    </label>
  );
}

export function DetailsForm({
  project,
  skills,
}: {
  project: ProjectItem;
  skills: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    saveProjectDetails.bind(null, project.id),
    EMPTY_FORM_STATE
  );

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      <SelectField
        name="category"
        label="Catégorie"
        options={CATEGORY_OPTIONS}
        defaultValue={state.values?.category ?? project.category}
        error={state.fieldErrors?.category}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor="project-role" className="text-body-14 font-medium">
          Mon rôle et ce que j’ai fait
        </label>
        <textarea
          id="project-role"
          name="role"
          rows={6}
          defaultValue={state.values?.role ?? project.role ?? ''}
          placeholder="J’ai conçu l’API temps réel (WebSocket) et la base PostgreSQL, en équipe de 4…"
          aria-describedby="project-role-hint"
          className="rounded-control border border-line-strong bg-surface-sunken px-3 py-2 text-body-14"
        />
        <p id="project-role-hint" className="text-caption-12 text-fg-3">
          Repris tel quel pour ton CV et tes lettres : décris des faits, sans exagérer.
        </p>
        {state.fieldErrors?.role ? (
          <p className="text-caption-12 text-fg-1">{state.fieldErrors.role}</p>
        ) : null}
      </div>
      <SkillCheckboxes skills={skills} selected={project.skills.map((skill) => skill.id)} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-body-14 font-medium">Affichage</legend>
        <Toggle
          name="featuredOnCv"
          label="Mis en avant sur le CV"
          defaultChecked={project.featuredOnCv}
        />
        <Toggle name="pinned" label="Épinglé en haut de la liste" defaultChecked={project.pinned} />
        <Toggle
          name="hidden"
          label="Masqué (rangé sous « Masqués »)"
          defaultChecked={project.hidden}
        />
      </fieldset>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" pending={isPending}>
          Enregistrer la fiche
        </Button>
        <span role="status" className="text-caption-12 text-fg-2">
          {state.done ? 'Fiche enregistrée.' : ''}
        </span>
      </div>
    </form>
  );
}
