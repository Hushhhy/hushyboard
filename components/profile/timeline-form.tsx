'use client';

import { useActionState } from 'react';
import type { TimelineEntry } from '@/generated/prisma/client';
import { saveTimelineEntry } from '@/app/(app)/career/profile/actions';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { EMPTY_FORM_STATE } from '@/lib/forms';

export function TimelineForm({
  entry,
  projects,
}: {
  entry: TimelineEntry | null;
  projects: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(saveTimelineEntry, EMPTY_FORM_STATE);
  const value = (name: 'period' | 'title' | 'place') => state.values?.[name] ?? entry?.[name] ?? '';

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}
      <TextField
        name="title"
        label="Intitulé"
        placeholder="Tronc commun 42 : C, Unix, réseau, web"
        defaultValue={value('title')}
        error={state.fieldErrors?.title}
      />
      <TextField
        name="period"
        label="Période"
        placeholder="2023 – 2026"
        defaultValue={value('period')}
        error={state.fieldErrors?.period}
      />
      <TextField
        name="place"
        label="Lieu (facultatif)"
        placeholder="École 42 Paris"
        defaultValue={value('place')}
        error={state.fieldErrors?.place}
      />
      {projects.length > 0 ? (
        <SelectField
          name="projectId"
          label="Projet GitHub lié (facultatif)"
          options={[
            { value: '', label: 'Aucun' },
            ...projects.map((project) => ({ value: project.id, label: project.name })),
          ]}
          defaultValue={state.values?.projectId ?? entry?.projectId ?? ''}
        />
      ) : null}
      <label className="flex items-center gap-2 text-body-14">
        <input
          type="checkbox"
          name="isCurrent"
          defaultChecked={state.values ? state.values.isCurrent === 'on' : entry?.isCurrent}
          className="size-4 accent-career"
        />
        En cours
      </label>
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
