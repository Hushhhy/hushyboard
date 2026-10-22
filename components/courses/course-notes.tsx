'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import {
  addCourseNote,
  deleteCourseNote,
  updateCourseNote,
} from '@/app/(app)/career/courses/actions';
import { PlusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { TextField } from '@/components/ui/text-field';
import { formatShortDate } from '@/lib/dates';
import { EMPTY_FORM_STATE } from '@/lib/forms';
import { MarkdownEditor } from './markdown-editor';

// A note with its Markdown already rendered and sanitized on the server.
export type RenderedNote = {
  id: string;
  title: string;
  content: string;
  html: string;
  createdAt: Date;
  updatedAt: Date;
};

function NoteForm({
  courseId,
  itemId,
  note,
  onDone,
  onCancel,
}: {
  courseId: string;
  itemId: string | null;
  note: RenderedNote | null;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const action = note ? updateCourseNote.bind(null, note.id) : addCourseNote.bind(null, courseId);
  const [state, formAction, isPending] = useActionState(action, EMPTY_FORM_STATE);
  // A new key empties the editor after each saved note.
  const [formKey, setFormKey] = useState(0);

  // Handle each successful save once (onDone is a new function on every render).
  const handled = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!state.done || handled.current === state.done) return;
    handled.current = state.done;
    setFormKey((key) => key + 1);
    onDone();
  }, [state.done, onDone]);

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-2" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      {itemId ? <input type="hidden" name="itemId" value={itemId} /> : null}
      <TextField
        name="title"
        label="Titre de la note"
        placeholder="Clés primaires et étrangères"
        defaultValue={state.values?.title ?? note?.title ?? ''}
        error={state.fieldErrors?.title}
      />
      <MarkdownEditor
        name="content"
        label="Note"
        defaultValue={state.values?.content ?? note?.content ?? ''}
        error={state.fieldErrors?.content}
      />
      <div className="flex gap-2">
        <Button type="submit" small pending={isPending}>
          {note ? 'Enregistrer la note' : 'Ajouter la note'}
        </Button>
        {onCancel ? (
          <Button variant="quiet" small onClick={onCancel}>
            Annuler
          </Button>
        ) : null}
      </div>
    </form>
  );
}

// Notes oldest first like a notebook, then the editor for the next one.
// itemId = notes of one part, quiz or solo project; null = general notes of the course.
// compact = inside the course plan: the editor stays folded behind "Ajouter une note".
export function CourseNotes({
  courseId,
  itemId = null,
  notes,
  compact = false,
}: {
  courseId: string;
  itemId?: string | null;
  notes: RenderedNote[];
  compact?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(!compact);
  const headingId = useId();

  return (
    <div className="flex flex-col gap-3">
      {notes.length === 0 && !compact ? (
        <p className="text-body-14 text-fg-2">Aucune note. Écris la première ci-dessous.</p>
      ) : null}
      {notes.length > 0 ? (
        <ul className="flex flex-col divide-y divide-line-subtle">
          {notes.map((note) => (
            <li key={note.id} className="flex flex-col gap-2 py-3 first:pt-0">
              {editingId === note.id ? (
                <NoteForm
                  courseId={courseId}
                  itemId={itemId}
                  note={note}
                  onDone={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <h3
                      className={`flex-1 ${compact ? 'text-body-16 font-semibold' : 'text-title-18'}`}
                    >
                      {note.title}
                    </h3>
                    <span className="text-caption-12 text-fg-3">
                      {formatShortDate(note.updatedAt)}
                    </span>
                  </div>
                  <div className="markdown" dangerouslySetInnerHTML={{ __html: note.html }} />
                  <div className="flex gap-1">
                    <Button variant="quiet" small onClick={() => setEditingId(note.id)}>
                      Modifier
                    </Button>
                    <DeleteDialog
                      title={`Supprimer la note « ${note.title} » ?`}
                      description="La note disparaîtra de ce cours."
                      onConfirm={deleteCourseNote.bind(null, note.id)}
                    />
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {isAdding ? (
        <section
          aria-labelledby={headingId}
          className={`flex flex-col gap-2 ${notes.length > 0 || !compact ? 'border-t border-line-subtle pt-3' : ''}`}
        >
          <h2 id={headingId} className="text-label-12 text-fg-3 uppercase">
            Nouvelle note
          </h2>
          <NoteForm
            courseId={courseId}
            itemId={itemId}
            note={null}
            onDone={() => {
              if (compact) setIsAdding(false);
            }}
            onCancel={compact ? () => setIsAdding(false) : undefined}
          />
        </section>
      ) : (
        <Button
          variant="quiet"
          small
          className="-ml-2 self-start"
          onClick={() => setIsAdding(true)}
        >
          <PlusIcon className="size-4" />
          Ajouter une note
        </Button>
      )}
    </div>
  );
}
