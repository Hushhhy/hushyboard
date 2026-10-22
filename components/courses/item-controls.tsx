'use client';

import { useId, useOptimistic, useState, useTransition } from 'react';
import type { CourseItemKind } from '@/generated/prisma/client';
import { updateCourseItem } from '@/app/(app)/career/courses/actions';
import { levelUpReward } from '@/components/rewards/use-form-done';
import { useRewards } from '@/components/rewards/rewards-provider';
import { HabitCheckbox } from '@/components/ui/checkbox';
import { ErrorState } from '@/components/ui/error-state';
import { UndoStatus } from '@/components/ui/undo-status';
import { QUIZ_PASS_SCORE } from '@/lib/course-progress';

type ItemState = { done: boolean; score: number | null };

// "Fait" checkbox and, for a quiz, its score: instant, saved on the server, undoable.
// Used on the page of one part, quiz or solo project.
export function ItemControls({
  itemId,
  kind,
  title,
  done,
  score,
}: {
  itemId: string;
  kind: CourseItemKind;
  title: string;
  done: boolean;
  score: number | null;
}) {
  const { announce } = useRewards();
  const [, startTransition] = useTransition();
  const [state, apply] = useOptimistic<ItemState, Partial<ItemState>>(
    { done, score },
    (current, change) => ({
      ...current,
      ...change,
    })
  );
  const [undo, setUndo] = useState<{ message: string; done: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scoreId = useId();

  function save(change: Partial<ItemState>, undoable = false) {
    setError(null);
    startTransition(async () => {
      apply(change);
      const result = await updateCourseItem(itemId, change);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (undoable && change.done !== undefined) {
        setUndo({
          message: change.done ? 'Marqué comme fait.' : 'Remis à faire.',
          done: !change.done,
        });
      }
      if (result.levelUp) announce(levelUpReward(result.levelUp));
    });
  }

  function commitScore(raw: string) {
    const value = raw.trim() === '' ? null : Number(raw);
    if (value === state.score) return;
    // Not a number: send an out-of-range value so the server answers with its French message.
    save({ score: Number.isNaN(value) ? -1 : value });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <HabitCheckbox
          className="-ml-2"
          checked={state.done}
          onChange={(event) => save({ done: event.target.checked }, true)}
          label={
            <span>
              Fait<span className="sr-only"> : {title}</span>
            </span>
          }
        />
        {kind === 'QUIZ' ? (
          <span className="flex items-center gap-1.5">
            <label htmlFor={scoreId} className="text-body-14 text-fg-2">
              Score
            </label>
            <input
              id={scoreId}
              key={state.score ?? 'empty'}
              inputMode="numeric"
              defaultValue={state.score ?? ''}
              placeholder="—"
              onBlur={(event) => commitScore(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitScore(event.currentTarget.value);
              }}
              className="h-8 w-16 rounded-control border border-line-strong bg-surface-sunken px-2 text-right text-body-14 tabular"
            />
            <span aria-hidden="true" className="text-body-14 text-fg-2">
              %
            </span>
          </span>
        ) : null}
        <UndoStatus
          message={undo?.message ?? null}
          onUndo={() => {
            if (!undo) return;
            const previous = undo.done;
            setUndo(null);
            save({ done: previous });
          }}
        />
      </div>
      {kind === 'QUIZ' && state.done && state.score !== null && state.score < QUIZ_PASS_SCORE ? (
        <p className="text-caption-12 text-fg-2">
          Score sous {QUIZ_PASS_SCORE} % : pas d’XP pour l’instant. Repasse le quiz et mets à jour
          le score.
        </p>
      ) : null}
      {error ? <ErrorState title="Score non enregistré." description={error} announce /> : null}
    </div>
  );
}
