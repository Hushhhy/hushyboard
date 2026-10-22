import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CourseItemKind } from '@/generated/prisma/client';
import { PageHeader } from '@/components/app-shell/page-header';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { Tag, type ChipTone } from '@/components/ui/chip';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { adjacentItems, COURSE_ITEM_LABELS, itemPath } from '@/lib/course-progress';
import { getCourseItemPage } from '@/lib/learning-data';
import { renderMarkdown } from '@/lib/markdown';
import { requireUser } from '@/lib/session';
import { CourseNotes } from './course-notes';
import { ItemControls } from './item-controls';

const KIND_TONES: Record<CourseItemKind, ChipTone> = {
  PART: 'neutral',
  QUIZ: 'info',
  SOLO_PROJECT: 'career',
};

const XP_HINT: Record<CourseItemKind, string | null> = {
  PART: null,
  QUIZ: '+10 XP à partir de 70 %',
  SOLO_PROJECT: '+30 XP une fois terminé',
};

// One part, quiz or solo project on its own page: status, then all its notes and the editor.
export async function ItemPage({
  params,
}: Pick<PageProps<'/career/courses/[courseId]/parts/[itemId]'>, 'params'>) {
  const [{ courseId, itemId }, user] = await Promise.all([params, requireUser()]);
  const data = await getCourseItemPage(user.id, courseId, itemId);
  if (!data) notFound();

  const { course, item, moduleIndex } = data;
  const coursePath = `/career/courses/${course.id}`;
  const { previous, next } = adjacentItems(course.modules, item.id);
  const xpHint = XP_HINT[item.kind];

  return (
    <>
      <Link href={coursePath} className={`${buttonClasses({ variant: 'quiet' })} -ml-2 self-start`}>
        <ChevronLeftIcon className="size-4" />
        {course.title}
      </Link>
      <PageHeader
        breadcrumb={`Cours · Module ${moduleIndex + 1} · ${data.module.title}`}
        title={item.title}
      />

      <section
        aria-label="Avancement"
        className="flex flex-col gap-2 rounded-card bg-surface-default p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={KIND_TONES[item.kind]}>{COURSE_ITEM_LABELS[item.kind]}</Tag>
          {xpHint ? <span className="text-caption-12 text-fg-3">{xpHint}</span> : null}
        </div>
        <ItemControls
          itemId={item.id}
          kind={item.kind}
          title={item.title}
          done={item.completedAt !== null}
          score={item.score}
        />
      </section>

      <section
        aria-labelledby="item-notes-title"
        className="flex flex-col gap-3 rounded-card bg-surface-default p-4 md:p-6"
      >
        <h2 id="item-notes-title" className="text-label-12 text-fg-3 uppercase">
          Notes · {item.notes.length}
        </h2>
        <CourseNotes
          courseId={course.id}
          itemId={item.id}
          notes={item.notes.map((note) => ({ ...note, html: renderMarkdown(note.content) }))}
        />
      </section>

      <nav aria-label="Parties du cours" className="flex flex-wrap justify-between gap-3">
        {previous ? (
          <Link
            href={itemPath(course.id, previous.id)}
            className={buttonClasses({ variant: 'quiet' })}
          >
            <ChevronLeftIcon className="size-4" />
            <span>
              <span className="sr-only">Précédent : </span>
              {previous.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={itemPath(course.id, next.id)} className={buttonClasses({ variant: 'quiet' })}>
            <span>
              <span className="sr-only">Suivant : </span>
              {next.title}
            </span>
            <ChevronRightIcon className="size-4" />
          </Link>
        ) : null}
      </nav>
    </>
  );
}

export function ItemPageSkeleton() {
  return (
    <LoadingRegion label="Chargement de la partie…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-24" />
      <Skeleton surface="card" className="h-96" />
    </LoadingRegion>
  );
}
