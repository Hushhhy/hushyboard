'use client';

import { useActionState, useEffect, useRef } from 'react';
import { addCourseNote, deleteCourseNote } from '@/app/(app)/career/courses/actions';
import { Button } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { TextField } from '@/components/ui/text-field';
import { formatShortDate } from '@/lib/dates';
import { EMPTY_FORM_STATE } from '@/lib/forms';

type Note = { id: string; title: string; content: string; createdAt: Date };

// Notes of one course: list (newest first) and a short form to add one.
export function CourseNotes({ courseId, notes }: { courseId: string; notes: Note[] }) {
  const [state, formAction, isPending] = useActionState(
    addCourseNote.bind(null, courseId),
    EMPTY_FORM_STATE
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Empty the form after a note is saved.
  useEffect(() => {
    if (state.done) formRef.current?.reset();
  }, [state.done]);

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={formAction} className="flex flex-col gap-2" noValidate>
        {state.error ? <ErrorState title={state.error} announce /> : null}
        <TextField
          name="title"
          label="Titre de la note"
          placeholder="Clés primaires et étrangères"
          defaultValue={state.done ? '' : (state.values?.title ?? '')}
          error={state.fieldErrors?.title}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor={`note-${courseId}`} className="text-body-14 font-medium">
            Note
          </label>
          <textarea
            id={`note-${courseId}`}
            name="content"
            rows={4}
            defaultValue={state.done ? '' : (state.values?.content ?? '')}
            aria-invalid={state.fieldErrors?.content ? true : undefined}
            className="rounded-control border border-line-strong bg-surface-sunken px-3 py-2 text-body-14"
          />
          {state.fieldErrors?.content ? (
            <p className="text-caption-12 text-fg-1">{state.fieldErrors.content}</p>
          ) : null}
        </div>
        <div>
          <Button type="submit" onOverlay small pending={isPending}>
            Ajouter la note
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-body-14 text-fg-2">Aucune note pour ce cours.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-subtle">
          {notes.map((note) => (
            <li key={note.id} className="flex flex-col gap-1 py-3">
              <div className="flex items-baseline gap-2">
                <h3 className="flex-1 text-body-14 font-semibold">{note.title}</h3>
                <span className="text-caption-12 text-fg-3">{formatShortDate(note.createdAt)}</span>
              </div>
              <p className="text-body-14 whitespace-pre-line text-fg-2">{note.content}</p>
              <div>
                <DeleteDialog
                  title={`Supprimer la note « ${note.title} » ?`}
                  description="La note disparaîtra de ce cours."
                  onConfirm={deleteCourseNote.bind(null, note.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
