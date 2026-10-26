'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { CourseStatus } from '@/generated/prisma/client';
import { setCourseStatus } from '@/app/(app)/career/courses/actions';
import { ChevronRightIcon, CourseIcon } from '@/components/icons';
import { levelUpReward } from '@/components/rewards/use-form-done';
import { useRewards } from '@/components/rewards/rewards-provider';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Ruler } from '@/components/ui/ruler';
import { UndoStatus } from '@/components/ui/undo-status';
import { COURSE_ITEM_LABELS, itemPath } from '@/lib/course-progress';
import { formatShortDate } from '@/lib/dates';
import type { CourseListEntry } from '@/lib/learning-data';

// "IBM Data Engineering · cours 4 / 13 · Coursera"
function courseContext(course: CourseListEntry): string {
  const parts: string[] = [];
  if (course.certification) {
    parts.push(course.certification.name);
    if (course.position) {
      const total = course.certification.totalCourses;
      parts.push(`cours ${course.position}${total ? ` / ${total}` : ''}`);
    }
  }
  parts.push(course.provider);
  return parts.join(' · ');
}

type StatusChange = (course: CourseListEntry, status: CourseStatus, message: string) => void;

// List of course cards. The "Annuler" line lives here, not in a card: a completed course
// leaves the "En cours" tab, and its undo must stay available.
export function CourseList({
  courses,
  basePath,
  empty,
}: {
  courses: CourseListEntry[];
  basePath: string;
  empty: { title: string; description: string };
}) {
  const { announce } = useRewards();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [undo, setUndo] = useState<{ message: string; id: string; previous: CourseStatus } | null>(
    null
  );

  const changeStatus: StatusChange = (course, status, message) => {
    setPendingId(course.id);
    startTransition(async () => {
      const { levelUp } = await setCourseStatus(course.id, status);
      setPendingId(null);
      setUndo({ message, id: course.id, previous: course.status });
      if (levelUp) announce(levelUpReward(levelUp));
    });
  };

  function revert() {
    if (!undo) return;
    const { id, previous } = undo;
    setUndo(null);
    startTransition(async () => {
      await setCourseStatus(id, previous);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <UndoStatus message={undo?.message ?? null} onUndo={revert} focusUndo />
      {courses.length === 0 ? (
        <EmptyState variant="block" title={empty.title} description={empty.description} />
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {courses.map((course) => (
            <li key={course.id}>
              <CourseCard
                course={course}
                basePath={basePath}
                isPending={pendingId === course.id}
                onStatus={changeStatus}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// A course as a card: the whole card opens the course; « Continuer » jumps straight to the
// next part; the status buttons and « Modifier » sit above the card link.
function CourseCard({
  course,
  basePath,
  isPending,
  onStatus,
}: {
  course: CourseListEntry;
  basePath: string;
  isPending: boolean;
  onStatus: StatusChange;
}) {
  const changeStatus = (status: CourseStatus, message: string) => onStatus(course, status, message);
  const isCompleted = course.status === 'COMPLETED';
  const titleId = `course-${course.id}`;

  return (
    <article
      aria-labelledby={titleId}
      className="group relative flex h-full flex-col gap-3 rounded-card bg-surface-default p-4 transition-colors duration-(--duration-tick) hover:bg-surface-raised"
    >
      <div className="flex items-start gap-3">
        <CourseIcon className="mt-0.5 size-4.5 shrink-0 text-career" />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-title-18">
            <Link
              href={`/career/courses/${course.id}`}
              className="after:absolute after:inset-0 after:rounded-card"
            >
              {course.title}
            </Link>
          </h2>
          <p className="text-caption-12 text-fg-2">{courseContext(course)}</p>
        </div>
        <ChevronRightIcon className="mt-1 size-4.5 shrink-0 text-fg-3 transition-transform duration-(--duration-tick) group-hover:translate-x-0.5 group-hover:text-fg-1" />
      </div>

      <Ruler
        value={course.progress.percent}
        max={100}
        label={`Avancement de « ${course.title} »`}
        valueText={`${course.progress.percent} %, ${course.progress.done} éléments faits sur ${course.progress.total}`}
        colorClass="bg-career"
        size="small"
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption-12 text-fg-2">
        <span className="tabular">
          {isCompleted && course.completedAt
            ? `Terminé le ${formatShortDate(course.completedAt)}`
            : course.progress.total === 0
              ? 'Plan à remplir'
              : `${course.progress.percent} % · ${course.progress.done} / ${course.progress.total} éléments`}
        </span>
        {course.nextDeadline && !isCompleted ? (
          <span>Échéance · {formatShortDate(course.nextDeadline)}</span>
        ) : null}
        <span>
          {course._count.notes} note{course._count.notes > 1 ? 's' : ''}
        </span>
        {course.skills.length > 0 ? (
          <span className="text-fg-3">{course.skills.map((skill) => skill.name).join(', ')}</span>
        ) : null}
      </div>

      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3">
        {course.next && !isCompleted ? (
          <Link
            href={itemPath(course.id, course.next.id)}
            className={`${buttonClasses({ variant: 'secondary', small: true })} min-w-0`}
          >
            <span className="truncate">
              Continuer : {COURSE_ITEM_LABELS[course.next.kind]} · {course.next.title}
            </span>
          </Link>
        ) : null}
        <span className="flex-1" />
        {course.status === 'PLANNED' ? (
          <Button
            small
            pending={isPending}
            onClick={() => changeStatus('IN_PROGRESS', `« ${course.title} » commencé.`)}
          >
            Commencer
          </Button>
        ) : null}
        {course.status === 'IN_PROGRESS' ? (
          <Button
            small
            variant="quiet"
            pending={isPending}
            onClick={() => changeStatus('COMPLETED', `« ${course.title} » terminé · +60 XP.`)}
          >
            Terminer
          </Button>
        ) : null}
        {isCompleted ? (
          <Button
            small
            variant="quiet"
            pending={isPending}
            onClick={() => changeStatus('IN_PROGRESS', `« ${course.title} » remis en cours.`)}
          >
            Remettre en cours
          </Button>
        ) : null}
        <Link
          href={`${basePath}?panel=course-${course.id}`}
          scroll={false}
          className={buttonClasses({ variant: 'quiet', small: true })}
          aria-label={`Modifier « ${course.title} »`}
        >
          Modifier
        </Link>
      </div>
    </article>
  );
}
