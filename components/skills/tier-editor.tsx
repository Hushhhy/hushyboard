'use client';

import { useId, useState, useTransition } from 'react';
import { saveTier } from '@/app/(app)/career/profile/actions';
import { moveNotionToLevel } from '@/app/(app)/career/profile/skill-actions';
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, PlusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import type { TierView } from './tier-view';

type DraftNotion = { key: string; id: string | null; label: string };

const toDrafts = (tier: TierView): DraftNotion[] =>
  tier.notions.map((notion) => ({ key: notion.id, id: notion.id, label: notion.label }));

// Edit one level milestone: title, and the list of notions (rename, add, remove, reorder,
// move to another level). Removing a notion also removes its check, so the change is saved
// only on "Enregistrer". Moving is saved at once, so it needs no unsaved change in the level.
export function TierEditor({ tier, levels }: { tier: TierView; levels: number[] }) {
  const [title, setTitle] = useState(tier.title);
  const [notions, setNotions] = useState<DraftNotion[]>(() => toDrafts(tier));
  // The saved level changed (saved, or a notion moved in or out): start again from it.
  const savedKey = `${tier.title}|${tier.notions.map((n) => `${n.id}:${n.label}`).join(',')}`;
  const [syncedKey, setSyncedKey] = useState(savedKey);
  if (savedKey !== syncedKey) {
    setSyncedKey(savedKey);
    setTitle(tier.title);
    setNotions(toDrafts(tier));
  }
  const dirty =
    title !== tier.title ||
    notions.length !== tier.notions.length ||
    notions.some(
      (notion, index) =>
        notion.id !== tier.notions[index].id || notion.label !== tier.notions[index].label
    );
  const [newLabel, setNewLabel] = useState('');
  const [status, setStatus] = useState<{ error?: string; saved?: boolean }>({});
  const [isPending, startTransition] = useTransition();
  const baseId = useId();

  function update(next: DraftNotion[]) {
    setNotions(next);
    setStatus({});
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= notions.length) return;
    const next = [...notions];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  }

  function addNotion() {
    const label = newLabel.trim();
    if (!label) return;
    update([...notions, { key: `${baseId}-${Date.now()}`, id: null, label }]);
    setNewLabel('');
  }

  function moveTo(notionId: string, level: number) {
    startTransition(async () => {
      const result = await moveNotionToLevel(notionId, level);
      setStatus(result.error ? { error: result.error } : {});
    });
  }

  function save() {
    startTransition(async () => {
      const result = await saveTier(tier.id, {
        title,
        notions: notions.map(({ id, label }) => ({ id, label })),
      });
      setStatus(result.error ? { error: result.error } : { saved: true });
    });
  }

  return (
    <section
      aria-label={`Niveau ${tier.level}`}
      className="flex flex-col gap-2 rounded-control bg-surface-base p-3"
    >
      <div className="flex items-center gap-2">
        <label htmlFor={`${baseId}-title`} className="shrink-0 text-body-14 font-semibold">
          Niveau {tier.level} ·
        </label>
        <input
          id={`${baseId}-title`}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setStatus({});
          }}
          className="h-8 min-w-0 flex-1 rounded-control border border-line-strong bg-surface-sunken px-2 text-body-14"
        />
      </div>

      <ol className="flex flex-col gap-1">
        {notions.map((notion, index) => (
          <li key={notion.key} className="flex items-center gap-1">
            <label htmlFor={`${baseId}-${notion.key}`} className="sr-only">
              Notion {index + 1}
            </label>
            <input
              id={`${baseId}-${notion.key}`}
              value={notion.label}
              onChange={(event) =>
                update(
                  notions.map((item) =>
                    item.key === notion.key ? { ...item, label: event.target.value } : item
                  )
                )
              }
              className="h-8 min-w-0 flex-1 rounded-control border border-line-subtle bg-surface-sunken px-2 text-body-14"
            />
            <Button
              variant="icon"
              aria-label={`Monter « ${notion.label} »`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ChevronUpIcon className="size-4" />
            </Button>
            <Button
              variant="icon"
              aria-label={`Descendre « ${notion.label} »`}
              disabled={index === notions.length - 1}
              onClick={() => move(index, 1)}
            >
              <ChevronDownIcon className="size-4" />
            </Button>
            {notion.id ? (
              <select
                aria-label={`Niveau de « ${notion.label} »`}
                title={dirty ? 'Enregistre d’abord ce niveau pour déplacer une notion.' : undefined}
                value={tier.level}
                disabled={dirty || isPending}
                onChange={(event) => moveTo(notion.id!, Number(event.target.value))}
                className="h-8 rounded-control border border-line-subtle bg-surface-sunken px-1.5 text-caption-12 disabled:opacity-55"
              >
                {levels.map((level) => (
                  <option key={level} value={level}>
                    Niv. {level}
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              variant="icon"
              aria-label={`Retirer « ${notion.label} »`}
              onClick={() => update(notions.filter((item) => item.key !== notion.key))}
            >
              <CloseIcon className="size-4" />
            </Button>
          </li>
        ))}
      </ol>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          addNotion();
        }}
      >
        <label htmlFor={`${baseId}-new`} className="sr-only">
          Nouvelle notion du niveau {tier.level}
        </label>
        <input
          id={`${baseId}-new`}
          value={newLabel}
          onChange={(event) => setNewLabel(event.target.value)}
          placeholder="Nouvelle notion"
          className="h-8 min-w-0 flex-1 rounded-control border border-line-subtle bg-surface-sunken px-2 text-body-14"
        />
        <Button type="submit" variant="quiet" small>
          <PlusIcon className="size-4" />
          Ajouter
        </Button>
      </form>

      {status.error ? <ErrorState title={status.error} announce /> : null}
      <div className="flex items-center gap-3">
        <Button small pending={isPending} onClick={save}>
          Enregistrer le niveau
        </Button>
        <span role="status" className="text-caption-12 text-fg-2">
          {status.saved ? `Niveau ${tier.level} enregistré.` : ''}
        </span>
      </div>
    </section>
  );
}
