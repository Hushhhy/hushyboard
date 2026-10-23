'use client';

import { useActionState, useId, useState, useTransition } from 'react';
import {
  saveGoal,
  saveHabit,
  savePause,
  setGoalProgress,
  toggleGoalStep,
} from '@/app/(app)/habits/actions';
import { useFormDone } from '@/components/rewards/use-form-done';
import { Button } from '@/components/ui/button';
import { HabitCheckbox } from '@/components/ui/checkbox';
import { ErrorState, FieldError } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { toDateInputValue } from '@/lib/dates';
import { EMPTY_FORM_STATE } from '@/lib/forms';

const WEEKDAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 7, label: 'Dim' },
];

export type HabitFormValue = {
  id: string;
  name: string;
  activeDays: number[];
  timesPerWeek: number | null;
  unit: string | null;
};

// « Nouvelle habitude » and its edit form: precise days, or N times a week.
export function HabitForm({
  habit,
  closeHref,
}: {
  habit: HabitFormValue | null;
  closeHref: string;
}) {
  const [state, formAction, isPending] = useActionState(saveHabit, EMPTY_FORM_STATE);
  useFormDone(state, closeHref);
  const [schedule, setSchedule] = useState<'days' | 'weekly'>(
    habit?.timesPerWeek ? 'weekly' : 'days'
  );
  const id = useId();
  const days = habit?.activeDays ?? [1, 2, 3, 4, 5, 6, 7];

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      {habit ? <input type="hidden" name="id" value={habit.id} /> : null}
      <TextField
        name="name"
        label="Nom"
        placeholder="Lecture 30 min"
        defaultValue={state.values?.name ?? habit?.name ?? ''}
        error={state.fieldErrors?.name}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-body-14 font-medium">Rythme</legend>
        {[
          { value: 'days' as const, label: 'Certains jours de la semaine' },
          { value: 'weekly' as const, label: 'Un nombre de fois par semaine, n’importe quel jour' },
        ].map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-body-14">
            <input
              type="radio"
              name="schedule"
              value={option.value}
              checked={schedule === option.value}
              onChange={() => setSchedule(option.value)}
              className="size-4 accent-habits"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {schedule === 'days' ? (
        <fieldset
          className="flex flex-col gap-2"
          aria-describedby={state.fieldErrors?.activeDays ? `${id}-days` : undefined}
        >
          <legend className="mb-1 text-body-14 font-medium">Jours</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => (
              <label
                key={day.value}
                className="flex cursor-pointer items-center gap-1.5 rounded-control border border-line-subtle px-2 py-1 text-body-14 has-checked:border-habits has-checked:bg-habits-deep"
              >
                <input
                  type="checkbox"
                  name="activeDays"
                  value={day.value}
                  defaultChecked={days.includes(day.value)}
                  className="size-3.5 accent-habits"
                />
                {day.label}
              </label>
            ))}
          </div>
          <p className="text-caption-12 text-fg-3">
            Les autres jours sont des jours de repos : ils ne cassent pas la série.
          </p>
          {state.fieldErrors?.activeDays ? (
            <FieldError id={`${id}-days`}>{state.fieldErrors.activeDays}</FieldError>
          ) : null}
        </fieldset>
      ) : (
        <SelectField
          name="timesPerWeek"
          label="Combien de fois par semaine"
          options={[1, 2, 3, 4, 5, 6, 7].map((count) => ({
            value: String(count),
            label: `${count} fois`,
          }))}
          defaultValue={String(habit?.timesPerWeek ?? 3)}
          error={state.fieldErrors?.timesPerWeek}
        />
      )}
      <TextField
        name="unit"
        label="Unité de quantité (facultatif)"
        placeholder="min, pages, km"
        hint="Avec une unité, tu peux noter une quantité en cochant (45 min, 30 pages)."
        defaultValue={state.values?.unit ?? habit?.unit ?? ''}
        error={state.fieldErrors?.unit}
      />
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          {habit ? 'Enregistrer' : 'Créer l’habitude'}
        </Button>
      </div>
    </form>
  );
}

// « Planifier une pause »: holidays or illness, for one habit or all.
export function PauseForm({
  habits,
  closeHref,
  today,
}: {
  habits: { id: string; name: string }[];
  closeHref: string;
  today: string;
}) {
  const [state, formAction, isPending] = useActionState(savePause, EMPTY_FORM_STATE);
  useFormDone(state, closeHref);
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      <SelectField
        name="habitId"
        label="Habitude"
        options={[
          { value: '', label: 'Toutes les habitudes' },
          ...habits.map((habit) => ({ value: habit.id, label: habit.name })),
        ]}
        defaultValue={state.values?.habitId ?? ''}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="startDate"
          type="date"
          label="Du"
          defaultValue={state.values?.startDate ?? today}
          error={state.fieldErrors?.startDate}
        />
        <TextField
          name="endDate"
          type="date"
          label="Au"
          defaultValue={state.values?.endDate ?? today}
          error={state.fieldErrors?.endDate}
        />
      </div>
      <TextField
        name="reason"
        label="Raison (facultatif)"
        placeholder="Congés"
        defaultValue={state.values?.reason ?? ''}
        error={state.fieldErrors?.reason}
      />
      <p className="text-caption-12 text-fg-3">
        Pendant une pause, les séries sont gelées : elles reprennent ensuite.
      </p>
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          Planifier la pause
        </Button>
      </div>
    </form>
  );
}

export type GoalFormValue = {
  id: string;
  title: string;
  target: number | null;
  unit: string | null;
  habitId: string | null;
  deadline: Date | null;
  steps: { title: string }[];
};

// « Nouvel objectif »: a target (manual or fed by a habit) or a list of steps.
export function GoalForm({
  goal,
  habits,
  closeHref,
}: {
  goal: GoalFormValue | null;
  habits: { id: string; name: string; unit: string | null }[];
  closeHref: string;
}) {
  const [state, formAction, isPending] = useActionState(saveGoal, EMPTY_FORM_STATE);
  useFormDone(state, closeHref);
  const [mode, setMode] = useState<'target' | 'steps'>(
    goal && goal.steps.length > 0 ? 'steps' : 'target'
  );
  const [habitId, setHabitId] = useState(state.values?.habitId ?? goal?.habitId ?? '');
  const linked = habits.find((habit) => habit.id === habitId);
  const id = useId();

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      {goal ? <input type="hidden" name="id" value={goal.id} /> : null}
      <TextField
        name="title"
        label="Objectif"
        placeholder="20 h de SQL en octobre"
        defaultValue={state.values?.title ?? goal?.title ?? ''}
        error={state.fieldErrors?.title}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-body-14 font-medium">Suivi</legend>
        {[
          { value: 'target' as const, label: 'Une cible chiffrée' },
          { value: 'steps' as const, label: 'Des étapes à cocher' },
        ].map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-body-14">
            <input
              type="radio"
              name="mode"
              value={option.value}
              checked={mode === option.value}
              onChange={() => setMode(option.value)}
              className="size-4 accent-habits"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {mode === 'target' ? (
        <>
          <SelectField
            name="habitId"
            label="Relié à une habitude (facultatif)"
            options={[
              { value: '', label: 'Non, je note l’avancée à la main' },
              ...habits.map((habit) => ({
                value: habit.id,
                label: `${habit.name}${habit.unit ? ` (${habit.unit})` : ' (nombre de fois)'}`,
              })),
            ]}
            value={habitId}
            onChange={(event) => setHabitId(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              name="target"
              label="Cible"
              inputMode="numeric"
              placeholder="20"
              defaultValue={state.values?.target ?? (goal?.target ? String(goal.target) : '')}
              error={state.fieldErrors?.target}
            />
            {linked ? (
              <div className="flex flex-col gap-1">
                <span className="text-body-14 font-medium">Unité</span>
                <span className="flex h-9 items-center text-body-14 text-fg-2">
                  {linked.unit ?? 'fois'} (celle de l’habitude)
                </span>
              </div>
            ) : (
              <TextField
                name="unit"
                label="Unité"
                placeholder="h, livres, km"
                defaultValue={state.values?.unit ?? goal?.unit ?? ''}
                error={state.fieldErrors?.unit}
              />
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-steps`} className="text-body-14 font-medium">
            Étapes (une par ligne)
          </label>
          <textarea
            id={`${id}-steps`}
            name="steps"
            rows={6}
            defaultValue={
              state.values?.steps ?? goal?.steps.map((step) => step.title).join('\n') ?? ''
            }
            placeholder={'Courir 3 km\nCourir 5 km\nCourir 8 km'}
            aria-describedby={state.fieldErrors?.steps ? `${id}-steps-error` : undefined}
            className="rounded-control border border-line-strong bg-surface-sunken px-3 py-2 text-body-14"
          />
          {state.fieldErrors?.steps ? (
            <FieldError id={`${id}-steps-error`}>{state.fieldErrors.steps}</FieldError>
          ) : null}
        </div>
      )}
      <TextField
        name="deadline"
        type="date"
        label="Échéance (facultatif)"
        defaultValue={state.values?.deadline ?? toDateInputValue(goal?.deadline)}
        error={state.fieldErrors?.deadline}
      />
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          {goal ? 'Enregistrer' : 'Créer l’objectif'}
        </Button>
      </div>
    </form>
  );
}

// A step of a goal, checked in place.
export function GoalStepCheckbox({
  stepId,
  title,
  done,
}: {
  stepId: string;
  title: string;
  done: boolean;
}) {
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useState(done);
  return (
    <HabitCheckbox
      label={title}
      checked={checked}
      onChange={(event) => {
        const next = event.target.checked;
        setChecked(next);
        startTransition(() => toggleGoalStep(stepId, next));
      }}
      className="-mx-2"
    />
  );
}

// Manual progress of a goal without steps nor habit, saved on blur.
export function GoalProgressField({
  goalId,
  value,
  unit,
}: {
  goalId: string;
  value: number;
  unit: string;
}) {
  const [status, setStatus] = useState('');
  const [, startTransition] = useTransition();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-caption-12 text-fg-2">
        Avancée
      </label>
      <input
        id={id}
        inputMode="decimal"
        defaultValue={value}
        onBlur={(event) => {
          const next = event.currentTarget.value;
          startTransition(async () => {
            const result = await setGoalProgress(goalId, next);
            setStatus(result.error ?? 'Avancée enregistrée.');
          });
        }}
        className="h-8 w-24 rounded-control border border-line-subtle bg-surface-sunken px-2 text-body-14 tabular"
      />
      <span className="text-caption-12 text-fg-2">{unit}</span>
      <span role="status" className="text-caption-12 text-fg-3">
        {status}
      </span>
    </div>
  );
}
