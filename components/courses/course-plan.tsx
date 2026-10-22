'use client';

import { useId, useOptimistic, useState, useTransition } from 'react';
import type { CourseItemKind } from '@/generated/prisma/client';
import { updateCourseItem } from '@/app/(app)/career/courses/actions';
import { levelUpReward } from '@/components/rewards/use-form-done';
import { useRewards } from '@/components/rewards/rewards-provider';
import { HabitCheckbox } from '@/components/ui/checkbox';
import { Tag, type ChipTone } from '@/components/ui/chip';
import { ErrorState } from '@/components/ui/error-state';
import { UndoStatus } from '@/components/ui/undo-status';
import { COURSE_ITEM_LABELS, computeProgress, QUIZ_PASS_SCORE } from '@/lib/course-progress';
import { CourseNotes, type RenderedNote } from './course-notes';

export type PlanItem = {
  id: string;
  kind: CourseItemKind;
  title: string;
  done: boolean;
  score: number | null;
  notes: RenderedNote[];
};

export type PlanModule = { id: string; title: string; items: PlanItem[] };

const KIND_TONES: Record<CourseItemKind, ChipTone | undefined> = {
  PART: undefined,
  QUIZ: 'info',
  SOLO_PROJECT: 'career',
};

const XP_HINT: Record<CourseItemKind, string> = {
  PART: '',
  QUIZ: `+10 XP à partir de ${QUIZ_PASS_SCORE} %`,
  SOLO_PROJECT: '+30 XP',
};

type Change = { itemId: string; done?: boolean; score?: number | null };

// The plan of a course: modules, then their parts, quizzes and solo projects.
// Checking is instant (optimistic), saved on the server and undoable; notes sit under each item.
export function CoursePlan({ courseId, modules }: { courseId: string; modules: PlanModule[] }) {
  const { announce } = useRewards();
  const [, startTransition] = useTransition();
  const [optimistic, apply] = useOptimistic(modules, (current, change: Change) =>
    current.map((courseModule) => ({
      ...courseModule,
      items: courseModule.items.map((item) =>
        item.id === change.itemId
          ? {
              ...item,
              done: change.done ?? item.done,
              score: change.score === undefined ? item.score : change.score,
            }
          : item
      ),
    }))
  );
  const [undo, setUndo] = useState<{ message: string; itemId: string; done: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save(change: Change, message?: string, previousDone?: boolean) {
    setError(null);
    startTransition(async () => {
      apply(change);
      const result = await updateCourseItem(change.itemId, {
        done: change.done,
        score: change.score,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (message && previousDone !== undefined) {
        setUndo({ message, itemId: change.itemId, done: previousDone });
      }
      if (result.levelUp) announce(levelUpReward(result.levelUp));
    });
  }

  function revert() {
    if (!undo) return;
    const { itemId, done } = undo;
    setUndo(null);
    save({ itemId, done });
  }

  return (
    <div className="flex flex-col gap-4">
      <UndoStatus message={undo?.message ?? null} onUndo={revert} />
      {error ? <ErrorState title="Score non enregistré." description={error} announce /> : null}
      {optimistic.map((courseModule, moduleIndex) => {
        const progress = computeProgress(
          courseModule.items.map((item) => ({ completedAt: item.done ? new Date() : null }))
        );
        const headingId = `module-${courseModule.id}`;
        return (
          <section
            key={courseModule.id}
            aria-labelledby={headingId}
            className={`flex flex-col gap-2 rounded-control p-3 ${
              progress.done > 0 && progress.done < progress.total
                ? 'bg-surface-raised'
                : 'bg-surface-base'
            }`}
          >
            <div className="flex items-baseline gap-2">
              <h3 id={headingId} className="flex-1 text-body-16 font-semibold">
                Module {moduleIndex + 1} · {courseModule.title}
              </h3>
              <span className="text-caption-12 text-fg-3 tabular">
                {progress.done} / {progress.total}
              </span>
            </div>
            {courseModule.items.length === 0 ? (
              <p className="text-caption-12 text-fg-3">
                Module vide : ajoute ses parties en mode édition.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {courseModule.items.map((item) => (
                  <li key={item.id}>
                    <PlanItemRow
                      courseId={courseId}
                      item={item}
                      onToggle={(done) =>
                        save(
                          { itemId: item.id, done },
                          `« ${item.title} » ${done ? 'fait' : 'remis à faire'}.`,
                          item.done
                        )
                      }
                      onScore={(score) => save({ itemId: item.id, score })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function PlanItemRow({
  courseId,
  item,
  onToggle,
  onScore,
}: {
  courseId: string;
  item: PlanItem;
  onToggle: (done: boolean) => void;
  onScore: (score: number | null) => void;
}) {
  const [showNotes, setShowNotes] = useState(item.notes.length > 0);
  const scoreId = useId();
  const tone = KIND_TONES[item.kind];
  const quizBelowPass =
    item.kind === 'QUIZ' && item.done && item.score !== null && item.score < QUIZ_PASS_SCORE;

  function commitScore(raw: string) {
    const value = raw.trim() === '' ? null : Number(raw);
    if (value === item.score) return;
    // Not a number: send an out-of-range value so the server answers with its French message.
    onScore(Number.isNaN(value) ? -1 : value);
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-x-2">
        <HabitCheckbox
          className="min-w-0 flex-1"
          checked={item.done}
          onChange={(event) => onToggle(event.target.checked)}
          label={
            <span className="flex flex-wrap items-center gap-2">
              {tone ? <Tag tone={tone}>{COURSE_ITEM_LABELS[item.kind]}</Tag> : null}
              <span className={item.done ? 'text-fg-2' : ''}>{item.title}</span>
              {XP_HINT[item.kind] ? (
                <span className="text-caption-12 font-normal text-fg-3">{XP_HINT[item.kind]}</span>
              ) : null}
            </span>
          }
        />
        {item.kind === 'QUIZ' ? (
          <span className="flex items-center gap-1.5">
            <label htmlFor={scoreId} className="text-caption-12 text-fg-2">
              Score
            </label>
            <input
              id={scoreId}
              key={item.score ?? 'empty'}
              inputMode="numeric"
              defaultValue={item.score ?? ''}
              placeholder="—"
              onBlur={(event) => commitScore(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitScore(event.currentTarget.value);
              }}
              className="h-8 w-14 rounded-control border border-line-strong bg-surface-sunken px-2 text-right text-body-14 tabular"
            />
            <span aria-hidden="true" className="text-caption-12 text-fg-2">
              %
            </span>
          </span>
        ) : null}
        <button
          type="button"
          aria-expanded={showNotes}
          onClick={() => setShowNotes((open) => !open)}
          className="h-8 rounded-control px-2 text-caption-12 font-semibold text-fg-2 hover:text-fg-1"
        >
          Notes ({item.notes.length})
        </button>
      </div>
      {quizBelowPass ? (
        <p className="ml-11 text-caption-12 text-fg-2">
          Score sous {QUIZ_PASS_SCORE} % : pas d’XP pour l’instant. Repasse le quiz et mets à jour
          le score.
        </p>
      ) : null}
      {showNotes ? (
        <div className="mt-1 mb-2 ml-11 border-l-2 border-line-subtle pl-3">
          <CourseNotes courseId={courseId} itemId={item.id} notes={item.notes} compact />
        </div>
      ) : null}
    </div>
  );
}
