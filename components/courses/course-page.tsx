import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CourseStatus } from '@/generated/prisma/client';
import { PageHeader } from '@/components/app-shell/page-header';
import { ChevronLeftIcon, CodeIcon, PencilIcon, PlusIcon } from '@/components/icons';
import { SidePanel } from '@/components/ui/side-panel';
import { buttonClasses } from '@/components/ui/button';
import { Tag, type ChipTone } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Ruler } from '@/components/ui/ruler';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { formatShortDate } from '@/lib/dates';
import { projectSlug } from '@/lib/github/helpers';
import { COURSE_STATUS_LABELS, getCourseWithNotes, getProjectOptions } from '@/lib/learning-data';
import { renderMarkdown } from '@/lib/markdown';
import { requireUser } from '@/lib/session';
import { CourseNotes } from './course-notes';
import { CoursePlan, type PlanModule } from './course-plan';
import { ModuleEditor } from './module-editor';
import { ProjectLinkForm } from './project-link-form';

const STATUS_TONES: Record<CourseStatus, ChipTone> = {
  PLANNED: 'neutral',
  IN_PROGRESS: 'career',
  COMPLETED: 'success',
};

const withHtml = <T extends { content: string }>(note: T) => ({
  ...note,
  html: renderMarkdown(note.content),
});

// A course on its own page: its plan (modules, parts, quizzes, solo projects) with the notes
// of each item, then the general notes. ?edit=1 shows the plan editor.
export async function CoursePage({
  params,
  searchParams,
}: Pick<PageProps<'/career/courses/[courseId]'>, 'params' | 'searchParams'>) {
  const [{ courseId }, { edit }, user] = await Promise.all([params, searchParams, requireUser()]);
  const [course, projectOptions] = await Promise.all([
    getCourseWithNotes(user.id, courseId),
    getProjectOptions(user.id),
  ]);
  if (!course) notFound();
  const linkedIds = course.projects.map((project) => project.id);

  const isEditing = edit === '1';
  const pagePath = `/career/courses/${course.id}`;
  const listPath = course.status === 'COMPLETED' ? '/career/courses/completed' : '/career/courses';
  const total = course.certification?.totalCourses;
  const context = [
    course.certification?.name,
    course.position ? `cours ${course.position}${total ? ` / ${total}` : ''}` : null,
    course.provider,
  ].filter(Boolean);
  const { progress } = course;

  const planModules: PlanModule[] = course.modules.map((courseModule) => ({
    id: courseModule.id,
    title: courseModule.title,
    items: courseModule.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      done: item.completedAt !== null,
      score: item.score,
      noteCount: item._count.notes,
    })),
  }));

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
          value={progress.percent}
          max={100}
          label={`Avancement de « ${course.title} »`}
          valueText={`${progress.percent} %, ${progress.done} éléments faits sur ${progress.total}`}
          colorClass="bg-career"
        />
        <p className="flex flex-wrap gap-x-4 text-caption-12 text-fg-2">
          <span className="tabular">
            {progress.percent} % · {progress.done} / {progress.total} éléments
          </span>
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
        {progress.total > 0 && progress.done === progress.total && course.status !== 'COMPLETED' ? (
          <p role="status" className="text-body-14 text-fg-1">
            Tout est fait : termine le cours depuis la liste pour gagner ses 60 XP.
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="course-projects-title"
        className="flex flex-col gap-2 rounded-card bg-surface-default p-4"
      >
        <div className="flex items-center gap-2">
          <h2
            id="course-projects-title"
            className="flex flex-1 items-center gap-2 text-label-12 text-fg-3 uppercase"
          >
            <CodeIcon className="size-4" />
            Projets liés · {course.projects.length}
          </h2>
          <Link
            href={`${pagePath}?panel=link-projects`}
            scroll={false}
            className={buttonClasses({ variant: 'quiet' })}
          >
            <PlusIcon className="size-4" />
            Lier un projet
          </Link>
        </div>
        {course.projects.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {course.projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/career/projects/${projectSlug(project)}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control bg-surface-raised px-2.5 text-body-14 font-medium hover:bg-surface-overlay"
                >
                  <CodeIcon className="size-3.5 text-fg-2" />
                  {project.name}
                  {project.isPrivate ? (
                    <span className="text-caption-12 text-fg-3">privé</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-14 text-fg-2">
            Aucun dépôt GitHub lié. Lie le dépôt de tes solo projects ou de tes exercices.
          </p>
        )}
      </section>

      <SidePanel name="link-projects" title={`Projets liés à « ${course.title} »`}>
        <ProjectLinkForm
          courseId={course.id}
          projects={projectOptions.filter(
            (project) =>
              linkedIds.includes(project.id) ||
              !(project.hidden || project.isFork || project.isArchived)
          )}
          linkedIds={linkedIds}
        />
      </SidePanel>

      <section
        aria-labelledby="plan-title"
        className="flex flex-col gap-3 rounded-card bg-surface-default p-4 md:p-6"
      >
        <div className="flex items-center gap-2">
          <h2 id="plan-title" className="flex-1 text-label-12 text-fg-3 uppercase">
            {isEditing
              ? 'Modifier le plan'
              : `Plan · ${course.modules.length} module${course.modules.length > 1 ? 's' : ''}`}
          </h2>
          {isEditing ? (
            <Link href={pagePath} className={buttonClasses({ variant: 'secondary' })}>
              Terminer
            </Link>
          ) : (
            <Link href={`${pagePath}?edit=1`} className={buttonClasses({ variant: 'quiet' })}>
              <PencilIcon className="size-4" />
              Modifier le plan
            </Link>
          )}
        </div>

        {isEditing ? (
          <>
            {course.modules.map((courseModule, index) => (
              <ModuleEditor
                key={courseModule.id}
                courseId={course.id}
                courseModule={courseModule}
                index={index}
                count={course.modules.length}
              />
            ))}
            <ModuleEditor
              key={`new-${course.modules.length}`}
              courseId={course.id}
              courseModule={null}
              index={course.modules.length}
              count={course.modules.length}
            />
          </>
        ) : course.modules.length === 0 ? (
          <EmptyState
            variant="block"
            title="Aucun module pour l’instant."
            description="Ajoute les modules du cours, avec leurs parties, quiz et solo projects : l’avancement se calculera tout seul."
            action={{ label: 'Construire le plan', href: `${pagePath}?edit=1` }}
          />
        ) : (
          <CoursePlan courseId={course.id} modules={planModules} />
        )}
      </section>

      <section
        aria-labelledby="notes-title"
        className="flex flex-col gap-3 rounded-card bg-surface-default p-4 md:p-6"
      >
        <h2 id="notes-title" className="text-label-12 text-fg-3 uppercase">
          Notes générales · {course.notes.length}
        </h2>
        <CourseNotes courseId={course.id} notes={course.notes.map(withHtml)} />
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
