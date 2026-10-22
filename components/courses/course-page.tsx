import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CourseStatus } from '@/generated/prisma/client';
import { PageHeader } from '@/components/app-shell/page-header';
import { ChevronLeftIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { Tag, type ChipTone } from '@/components/ui/chip';
import { Ruler } from '@/components/ui/ruler';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { formatShortDate } from '@/lib/dates';
import { COURSE_STATUS_LABELS, getCourseWithNotes } from '@/lib/learning-data';
import { renderMarkdown } from '@/lib/markdown';
import { requireUser } from '@/lib/session';
import { CourseNotes } from './course-notes';

const STATUS_TONES: Record<CourseStatus, ChipTone> = {
  PLANNED: 'neutral',
  IN_PROGRESS: 'career',
  COMPLETED: 'success',
};

// A course on its own page: its context, then every note (oldest first) and the editor.
export async function CoursePage({
  params,
}: Pick<PageProps<'/career/courses/[courseId]'>, 'params'>) {
  const [{ courseId }, user] = await Promise.all([params, requireUser()]);
  const course = await getCourseWithNotes(user.id, courseId);
  if (!course) notFound();

  const listPath = course.status === 'COMPLETED' ? '/career/courses/completed' : '/career/courses';
  const total = course.certification?.totalCourses;
  const context = [
    course.certification?.name,
    course.position ? `cours ${course.position}${total ? ` / ${total}` : ''}` : null,
    course.provider,
  ].filter(Boolean);

  return (
    <>
      <Link href={listPath} className={`${buttonClasses({ variant: 'quiet' })} -ml-2 self-start`}>
        <ChevronLeftIcon className="size-4" />
        Retour aux cours
      </Link>
      <PageHeader breadcrumb="Carrière · Cours" title={course.title} />

      <section
        aria-label="Le cours"
        className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-body-14 text-fg-2">{context.join(' · ')}</p>
          <Tag tone={STATUS_TONES[course.status]}>{COURSE_STATUS_LABELS[course.status]}</Tag>
          <Link
            href={`${listPath}?panel=course-${course.id}`}
            className={buttonClasses({ variant: 'quiet' })}
          >
            Modifier le cours
          </Link>
        </div>
        <Ruler
          value={course.progress}
          max={100}
          label={`Avancement de « ${course.title} »`}
          valueText={`${course.progress} %`}
          colorClass="bg-career"
          size="small"
        />
        <p className="flex flex-wrap gap-x-4 text-caption-12 text-fg-2">
          <span className="tabular">{course.progress} %</span>
          {course.completedAt ? (
            <span>Terminé le {formatShortDate(course.completedAt)}</span>
          ) : null}
          {course.nextDeadline && course.status !== 'COMPLETED' ? (
            <span>Échéance · {formatShortDate(course.nextDeadline)}</span>
          ) : null}
          {course.skills.length > 0 ? (
            <span className="text-fg-3">{course.skills.map((skill) => skill.name).join(', ')}</span>
          ) : null}
        </p>
      </section>

      <section
        aria-labelledby="notes-title"
        className="flex flex-col gap-3 rounded-card bg-surface-default p-4 md:p-6"
      >
        <h2 id="notes-title" className="text-label-12 text-fg-3 uppercase">
          Notes · {course.notes.length}
        </h2>
        <CourseNotes
          courseId={course.id}
          notes={course.notes.map((note) => ({ ...note, html: renderMarkdown(note.content) }))}
        />
      </section>
    </>
  );
}

export function CoursePageSkeleton() {
  return (
    <LoadingRegion label="Chargement du cours…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-28" />
      <Skeleton surface="card" className="h-96" />
    </LoadingRegion>
  );
}
