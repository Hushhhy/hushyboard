'use client';

import { useActionState } from 'react';
import { saveCourse } from '@/app/(app)/career/courses/actions';
import { useFormDone } from '@/components/rewards/use-form-done';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { toDateInputValue } from '@/lib/dates';
import { EMPTY_FORM_STATE } from '@/lib/forms';
import type { CourseItem } from '@/lib/learning-data';
import { SkillCheckboxes, type Option } from './skill-checkboxes';

const STATUS_OPTIONS = [
  { value: 'PLANNED', label: 'Prévu' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminé (+60 XP)' },
];

export function CourseForm({
  course,
  certifications,
  skills,
  closeHref,
}: {
  course: CourseItem | null;
  certifications: Option[];
  skills: Option[];
  closeHref: string;
}) {
  const [state, formAction, isPending] = useActionState(saveCourse, EMPTY_FORM_STATE);
  useFormDone(state, closeHref);
  const value = (name: string, fallback: string) => state.values?.[name] ?? fallback;

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      {course ? <input type="hidden" name="id" value={course.id} /> : null}
      <TextField
        name="title"
        label="Titre"
        placeholder="Introduction aux bases de données relationnelles"
        defaultValue={value('title', course?.title ?? '')}
        error={state.fieldErrors?.title}
      />
      <TextField
        name="provider"
        label="Plateforme ou école"
        placeholder="Coursera"
        defaultValue={value('provider', course?.provider ?? '')}
        error={state.fieldErrors?.provider}
      />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          name="status"
          label="Statut"
          options={STATUS_OPTIONS}
          defaultValue={value('status', course?.status ?? 'IN_PROGRESS')}
          error={state.fieldErrors?.status}
        />
        <TextField
          name="progress"
          label="Avancement (%)"
          inputMode="numeric"
          defaultValue={value('progress', String(course?.progress ?? 0))}
          error={state.fieldErrors?.progress}
        />
      </div>
      <SelectField
        name="certificationId"
        label="Parcours de certification"
        options={[
          { value: '', label: 'Aucun (cours seul)' },
          ...certifications.map((item) => ({ value: item.id, label: item.name })),
        ]}
        defaultValue={value('certificationId', course?.certificationId ?? '')}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="position"
          label="N° dans le parcours"
          inputMode="numeric"
          placeholder="4"
          defaultValue={value('position', course?.position ? String(course.position) : '')}
          error={state.fieldErrors?.position}
        />
        <TextField
          name="nextDeadline"
          type="date"
          label="Prochaine échéance"
          defaultValue={value('nextDeadline', toDateInputValue(course?.nextDeadline))}
          error={state.fieldErrors?.nextDeadline}
        />
      </div>
      <SkillCheckboxes skills={skills} selected={course?.skills.map((skill) => skill.id) ?? []} />
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          {course ? 'Enregistrer' : 'Ajouter le cours'}
        </Button>
      </div>
    </form>
  );
}
