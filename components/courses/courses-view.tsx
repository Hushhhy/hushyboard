import Link from 'next/link';
import type { CourseStatus } from '@/generated/prisma/client';
import { deleteCourse } from '@/app/(app)/career/courses/actions';
import { PageHeader } from '@/components/app-shell/page-header';
import { PlusIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { renderMarkdown } from '@/lib/markdown';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import {
  getCourseCounts,
  getCourses,
  getLearningOptions,
  type CourseItem,
} from '@/lib/learning-data';
import { CourseList } from './course-card';
import { CourseForm } from './course-form';
import { CourseNotes } from './course-notes';

export const COURSE_TABS = [
  { href: '/career/courses', label: 'En cours' },
  { href: '/career/courses/completed', label: 'Terminés' },
  { href: '/career/courses/notes', label: 'Notes' },
];

// "3 cours en cours, 1 prévu."
export function coursesSummary(counts: { inProgress: number; planned: number; completed: number }) {
  const parts: string[] = [];
  if (counts.inProgress > 0) parts.push(`${counts.inProgress} cours en cours`);
  if (counts.planned > 0) parts.push(`${counts.planned} prévu${counts.planned > 1 ? 's' : ''}`);
  if (parts.length === 0) {
    return counts.completed > 0
      ? `${counts.completed} cours terminé${counts.completed > 1 ? 's' : ''}, aucun en cours.`
      : 'Aucun cours suivi pour l’instant.';
  }
  return `${parts.join(', ')}.`;
}

// Header shared by the 3 tabs, with the single primary button of the page.
export function CoursesHeader({
  counts,
  basePath,
}: {
  counts: Parameters<typeof coursesSummary>[0];
  basePath: string;
}) {
  return (
    <>
      <PageHeader breadcrumb="Carrière · Cours" title={coursesSummary(counts)} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Tabs label="Cours" items={COURSE_TABS} />
        </div>
        <Link
          href={`${basePath}?panel=course-new`}
          scroll={false}
          className={buttonClasses({ variant: 'primary' })}
        >
          <PlusIcon className="size-4" />
          Ajouter un cours
        </Link>
      </div>
    </>
  );
}

// Edit and notes panels of the listed courses, plus the "new course" panel.
export async function CoursePanels({
  userId,
  courses,
  basePath,
}: {
  userId: string;
  courses: CourseItem[];
  basePath: string;
}) {
  const [options, notes] = await Promise.all([
    getLearningOptions(userId),
    prisma.courseNote.findMany({
      where: { courseId: { in: courses.map((course) => course.id) } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return (
    <>
      <SidePanel name="course-new" title="Ajouter un cours">
        <CourseForm course={null} closeHref={basePath} {...options} />
      </SidePanel>
      {courses.map((course) => (
        <SidePanel key={course.id} name={`course-${course.id}`} title="Modifier le cours">
          <CourseForm course={course} closeHref={basePath} {...options} />
          <div className="mt-auto border-t border-line-subtle pt-3">
            <DeleteDialog
              title={`Supprimer le cours « ${course.title} » ?`}
              description="Ses notes seront supprimées. L’XP déjà gagnée reste acquise."
              onConfirm={deleteCourse.bind(null, course.id)}
            />
          </div>
        </SidePanel>
      ))}
      {courses.map((course) => (
        <SidePanel
          key={`notes-${course.id}`}
          name={`notes-${course.id}`}
          title={`Notes · ${course.title}`}
          wide
        >
          <CourseNotes
            courseId={course.id}
            notes={notes
              .filter((note) => note.courseId === course.id)
              .map((note) => ({ ...note, html: renderMarkdown(note.content) }))}
          />
        </SidePanel>
      ))}
    </>
  );
}

// "En cours" and "Terminés" tabs.
export async function CoursesView({
  statuses,
  basePath,
  empty,
}: {
  statuses: CourseStatus[];
  basePath: string;
  empty: { title: string; description: string };
}) {
  const user = await requireUser();
  const [courses, counts] = await Promise.all([
    getCourses(user.id, statuses),
    getCourseCounts(user.id),
  ]);

  return (
    <>
      <CoursesHeader counts={counts} basePath={basePath} />
      <CourseList courses={courses} basePath={basePath} empty={empty} />
      <CoursePanels userId={user.id} courses={courses} basePath={basePath} />
    </>
  );
}

export function CoursesSkeleton() {
  return (
    <LoadingRegion label="Chargement des cours…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-10 w-80" />
      <Skeleton surface="card" className="h-32" />
      <Skeleton surface="card" className="h-32" />
    </LoadingRegion>
  );
}
