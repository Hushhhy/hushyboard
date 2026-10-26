'use client';

import { useId, useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import type { CourseItemKind } from '@/generated/prisma/client';
import { updateCourseItem } from '@/app/(app)/career/courses/actions';
import { levelUpReward } from '@/components/rewards/use-form-done';
import { useRewards } from '@/components/rewards/rewards-provider';
import { HabitCheckbox } from '@/components/ui/checkbox';
import { Tag, type ChipTone } from '@/components/ui/chip';
import { ErrorState } from '@/components/ui/error-state';
import { UndoStatus } from '@/components/ui/undo-status';
import { COURSE_ITEM_LABELS, itemPath, QUIZ_PASS_SCORE } from '@/lib/course-progress';

export type PlanItem = {
  id: string;
  kind: CourseItemKind;
  title: string;
  done: boolean;
  score: number | null;
  noteCount: number;
};

export type PlanModule = { id: string; title: string; items: PlanItem[] };

const KIND_TONES: Record<CourseItemKind, ChipTone> = {
  PART: 'neutral',
  QUIZ: 'info',
  SOLO_PROJECT: 'career',
};

const XP_HINT: Record<CourseItemKind, string> = {
  PART: '',
  QUIZ: `+10 XP à partir de ${QUIZ_PASS_SCORE} %`,
  SOLO_PROJECT: '+30 XP',
};

type Change = { itemId: string; done?: boolean; score?: number | null };

// The parts, quizzes and solo projects of a module, as cards: the whole card opens the item
// page with its notes; « Fait » is checked on the card (instant, saved, undoable) and the
// quiz score typed there.
export function PartCards({ courseId, items }: { courseId: string; items: PlanItem[] }) {
  const { announce } = useRewards();
  const [, startTransition] = useTransition();
  const [optimistic, apply] = useOptimistic(items, (current, change: Change) =>
    current.map((item) =>
      item.id === change.itemId
        ? {
            ...item,
            done: change.done ?? item.done,
            score: change.score === undefined ? item.score : change.score,
          }
        : item
    )
  );
  const [undo, setUndo] = useState<{ message: string; itemId: string; done: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The first item not done: highlighted, it is where to continue.
  const nextId = optimistic.find((item) => !item.done)?.id;

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
    <div className="flex flex-col gap-3">
      <UndoStatus message={undo?.message ?? null} onUndo={revert} />
      {error ? <ErrorState title="Score non enregistré." description={error} announce /> : null}
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {optimistic.map((item, index) => (
          <li key={item.id}>
            <PartCard
              courseId={courseId}
              item={item}
              position={index + 1}
              isNext={item.id === nextId}
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
      </ol>
    </div>
  );
}

function PartCard({
  courseId,
  item,
  position,
  isNext,
  onToggle,
  onScore,
}: {
  courseId: string;
  item: PlanItem;
  position: number;
  isNext: boolean;
  onToggle: (done: boolean) => void;
  onScore: (score: number | null) => void;
}) {
  const scoreId = useId();
  const quizBelowPass =
    item.kind === 'QUIZ' && item.done && item.score !== null && item.score < QUIZ_PASS_SCORE;

  function commitScore(raw: string) {
    const value = raw.trim() === '' ? null : Number(raw);
    if (value === item.score) return;
    // Not a number: send an out-of-range value so the server answers with its French message.
    onScore(Number.isNaN(value) ? -1 : value);
  }

  return (
    <article
      className={`group relative flex h-full flex-col gap-2 rounded-card p-4 transition-colors duration-(--duration-tick) ${
        isNext
          ? 'bg-surface-raised shadow-raised ring-1 ring-career'
          : 'bg-surface-default hover:bg-surface-raised'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-caption-12 text-fg-3 tabular">{position}</span>
        <Tag tone={KIND_TONES[item.kind]}>{COURSE_ITEM_LABELS[item.kind]}</Tag>
        {isNext ? (
          <span className="text-caption-12 font-semibold text-career">À suivre</span>
        ) : null}
        <span className="flex-1" />
        {/* Above the card link: checking does not open the page. */}
        <HabitCheckbox
          className="relative z-10 shrink-0 px-1"
          checked={item.done}
          onChange={(event) => onToggle(event.target.checked)}
          label={<span className="sr-only">Fait : {item.title}</span>}
        />
      </div>
      <h3 className="text-body-16 font-semibold">
        <Link
          href={itemPath(courseId, item.id)}
          className={`after:absolute after:inset-0 after:rounded-card ${item.done ? 'text-fg-2' : ''}`}
        >
          {item.title}
        </Link>
      </h3>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-caption-12 text-fg-2">
        <span>
          {item.noteCount} note{item.noteCount > 1 ? 's' : ''}
        </span>
        {item.done ? <span className="text-success">Fait</span> : null}
        {XP_HINT[item.kind] ? <span className="text-fg-3">{XP_HINT[item.kind]}</span> : null}
        {item.kind === 'QUIZ' ? (
          <span className="relative z-10 ml-auto flex items-center gap-1.5">
            <label htmlFor={scoreId}>Score</label>
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
            <span aria-hidden="true">%</span>
          </span>
        ) : null}
      </div>
      {quizBelowPass ? (
        <p className="text-caption-12 text-fg-2">
          Score sous {QUIZ_PASS_SCORE} % : pas d’XP pour l’instant. Repasse le quiz et mets à jour
          le score.
        </p>
      ) : null}
    </article>
  );
}
