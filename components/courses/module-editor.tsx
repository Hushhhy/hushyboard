'use client';

import { useId, useState, useTransition } from 'react';
import type { CourseItemKind } from '@/generated/prisma/client';
import {
  deleteCourseModule,
  moveCourseModule,
  saveCourseModule,
} from '@/app/(app)/career/courses/actions';
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, PlusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { COURSE_ITEM_LABELS } from '@/lib/course-progress';

const KINDS = Object.entries(COURSE_ITEM_LABELS) as [CourseItemKind, string][];

type DraftItem = { key: string; id: string | null; kind: CourseItemKind; title: string };

export type EditableModule = {
  id: string;
  title: string;
  items: { id: string; kind: CourseItemKind; title: string }[];
};

// Edit one module of a course: its title and its items (kind, title, order).
// moduleId null = a new module, saved at the end of the plan.
export function ModuleEditor({
  courseId,
  courseModule,
  index,
  count,
  onSaved,
}: {
  courseId: string;
  courseModule: EditableModule | null;
  index: number;
  count: number;
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState(courseModule?.title ?? '');
  const [items, setItems] = useState<DraftItem[]>(
    () =>
      courseModule?.items.map((item) => ({
        key: item.id,
        id: item.id,
        kind: item.kind,
        title: item.title,
      })) ?? []
  );
  const [newTitle, setNewTitle] = useState('');
  const [newKind, setNewKind] = useState<CourseItemKind>('PART');
  const [status, setStatus] = useState<{ error?: string; saved?: boolean }>({});
  const [isPending, startTransition] = useTransition();
  const baseId = useId();

  function update(next: DraftItem[]) {
    setItems(next);
    setStatus({});
  }

  function move(position: number, delta: number) {
    const target = position + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[position], next[target]] = [next[target], next[position]];
    update(next);
  }

  function addItem() {
    const label = newTitle.trim();
    if (!label) return;
    update([...items, { key: `${baseId}-${Date.now()}`, id: null, kind: newKind, title: label }]);
    setNewTitle('');
  }

  function save() {
    startTransition(async () => {
      const result = await saveCourseModule(courseId, courseModule?.id ?? null, {
        title,
        items: items.map(({ id, kind, title: itemTitle }) => ({ id, kind, title: itemTitle })),
      });
      if (result.error) {
        setStatus({ error: result.error });
        return;
      }
      setStatus({ saved: true });
      if (!courseModule) {
        // The new module now lives in the list: reset this "new module" form.
        setTitle('');
        setItems([]);
      }
      onSaved?.();
    });
  }

  const label = courseModule ? `Module ${index + 1}` : 'Nouveau module';
  return (
    <section aria-label={label} className="flex flex-col gap-2 rounded-control bg-surface-base p-3">
      <div className="flex items-center gap-2">
        <label htmlFor={`${baseId}-title`} className="shrink-0 text-body-14 font-semibold">
          {label} ·
        </label>
        <input
          id={`${baseId}-title`}
          value={title}
          placeholder="SQL et jointures"
          onChange={(event) => {
            setTitle(event.target.value);
            setStatus({});
          }}
          className="h-8 min-w-0 flex-1 rounded-control border border-line-strong bg-surface-sunken px-2 text-body-14"
        />
        {courseModule ? (
          <>
            <Button
              variant="icon"
              aria-label={`Monter le module ${index + 1}`}
              disabled={index === 0}
              onClick={() => startTransition(() => moveCourseModule(courseModule.id, -1))}
            >
              <ChevronUpIcon className="size-4" />
            </Button>
            <Button
              variant="icon"
              aria-label={`Descendre le module ${index + 1}`}
              disabled={index === count - 1}
              onClick={() => startTransition(() => moveCourseModule(courseModule.id, 1))}
            >
              <ChevronDownIcon className="size-4" />
            </Button>
          </>
        ) : null}
      </div>

      <ol className="flex flex-col gap-1">
        {items.map((item, position) => (
          <li key={item.key} className="flex items-center gap-1">
            <label htmlFor={`${baseId}-kind-${item.key}`} className="sr-only">
              Type de l’élément {position + 1}
            </label>
            <select
              id={`${baseId}-kind-${item.key}`}
              value={item.kind}
              onChange={(event) =>
                update(
                  items.map((other) =>
                    other.key === item.key
                      ? { ...other, kind: event.target.value as CourseItemKind }
                      : other
                  )
                )
              }
              className="h-8 rounded-control border border-line-subtle bg-surface-sunken px-1 text-caption-12"
            >
              {KINDS.map(([kind, kindLabel]) => (
                <option key={kind} value={kind}>
                  {kindLabel}
                </option>
              ))}
            </select>
            <label htmlFor={`${baseId}-${item.key}`} className="sr-only">
              Titre de l’élément {position + 1}
            </label>
            <input
              id={`${baseId}-${item.key}`}
              value={item.title}
              onChange={(event) =>
                update(
                  items.map((other) =>
                    other.key === item.key ? { ...other, title: event.target.value } : other
                  )
                )
              }
              className="h-8 min-w-0 flex-1 rounded-control border border-line-subtle bg-surface-sunken px-2 text-body-14"
            />
            <Button
              variant="icon"
              aria-label={`Monter « ${item.title} »`}
              disabled={position === 0}
              onClick={() => move(position, -1)}
            >
              <ChevronUpIcon className="size-4" />
            </Button>
            <Button
              variant="icon"
              aria-label={`Descendre « ${item.title} »`}
              disabled={position === items.length - 1}
              onClick={() => move(position, 1)}
            >
              <ChevronDownIcon className="size-4" />
            </Button>
            <Button
              variant="icon"
              aria-label={`Retirer « ${item.title} »`}
              onClick={() => update(items.filter((other) => other.key !== item.key))}
            >
              <CloseIcon className="size-4" />
            </Button>
          </li>
        ))}
      </ol>

      <form
        className="flex gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          addItem();
        }}
      >
        <label htmlFor={`${baseId}-new-kind`} className="sr-only">
          Type du nouvel élément
        </label>
        <select
          id={`${baseId}-new-kind`}
          value={newKind}
          onChange={(event) => setNewKind(event.target.value as CourseItemKind)}
          className="h-8 rounded-control border border-line-subtle bg-surface-sunken px-1 text-caption-12"
        >
          {KINDS.map(([kind, kindLabel]) => (
            <option key={kind} value={kind}>
              {kindLabel}
            </option>
          ))}
        </select>
        <label htmlFor={`${baseId}-new`} className="sr-only">
          Titre du nouvel élément
        </label>
        <input
          id={`${baseId}-new`}
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Partie, quiz ou solo project"
          className="h-8 min-w-0 flex-1 rounded-control border border-line-subtle bg-surface-sunken px-2 text-body-14"
        />
        <Button type="submit" variant="quiet" small>
          <PlusIcon className="size-4" />
          Ajouter
        </Button>
      </form>

      {status.error ? <ErrorState title={status.error} announce /> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button small pending={isPending} onClick={save}>
          {courseModule ? 'Enregistrer le module' : 'Créer le module'}
        </Button>
        <span role="status" className="text-caption-12 text-fg-2">
          {status.saved ? (courseModule ? 'Module enregistré.' : 'Module créé.') : ''}
        </span>
        {courseModule ? (
          <span className="ml-auto">
            <DeleteDialog
              title={`Supprimer le module « ${courseModule.title} » ?`}
              description="Ses parties, quiz et solo projects seront supprimés. Leurs notes sont gardées dans les notes générales du cours, et l’XP déjà gagnée reste acquise."
              triggerLabel="Supprimer le module"
              onConfirm={deleteCourseModule.bind(null, courseModule.id)}
            />
          </span>
        ) : null}
      </div>
    </section>
  );
}
