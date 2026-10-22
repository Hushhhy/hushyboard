'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { CourseStatus } from '@/generated/prisma/client';
import { setCourseStatus } from '@/app/(app)/career/courses/actions';
import { CourseIcon } from '@/components/icons';
import { levelUpReward } from '@/components/rewards/use-form-done';
import { useRewards } from '@/components/rewards/rewards-provider';
import { Button, buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Ruler } from '@/components/ui/ruler';
import { UndoStatus } from '@/components/ui/undo-status';
import { COURSE_ITEM_LABELS } from '@/lib/course-progress';
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
        courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            basePath={basePath}
            isPending={pendingId === course.id}
            onStatus={changeStatus}
          />
        ))
      )}
    </div>
  );
}

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
      className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
    >
      <div className="flex items-start gap-3">
        <CourseIcon className="mt-0.5 size-4.5 shrink-0 text-career" />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-title-18">
            <Link
              href={`/career/courses/${course.id}`}
              className="hover:underline hover:decoration-line-strong hover:underline-offset-3"
            >
              {course.title}
            </Link>
          </h2>
          <p className="text-caption-12 text-fg-2">{courseContext(course)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {course.status === 'PLANNED' ? (
            <Button
              pending={isPending}
              onClick={() => changeStatus('IN_PROGRESS', `« ${course.title} » commencé.`)}
            >
              Commencer
            </Button>
          ) : null}
          {course.status === 'IN_PROGRESS' ? (
            <Button
              pending={isPending}
              onClick={() => changeStatus('COMPLETED', `« ${course.title} » terminé · +60 XP.`)}
            >
              Terminer
            </Button>
          ) : null}
          {isCompleted ? (
            <Button
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
            className={buttonClasses({ variant: 'quiet' })}
            aria-label={`Modifier « ${course.title} »`}
          >
            Modifier
          </Link>
        </div>
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
        {course.next && !isCompleted ? (
          <span>
            Ensuite : {COURSE_ITEM_LABELS[course.next.kind]} · {course.next.title}
          </span>
        ) : null}
        {course.nextDeadline && !isCompleted ? (
          <span>Échéance · {formatShortDate(course.nextDeadline)}</span>
        ) : null}
        {course.skills.length > 0 ? (
          <span className="text-fg-3">{course.skills.map((skill) => skill.name).join(', ')}</span>
        ) : null}
        <Link
          href={`/career/courses/${course.id}`}
          className="ml-auto underline decoration-line-strong underline-offset-3 hover:text-fg-1"
        >
          Notes ({course._count.notes})
        </Link>
      </div>
    </article>
  );
}
