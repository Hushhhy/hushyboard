import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/app-shell/page-header';
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Ruler } from '@/components/ui/ruler';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { computeProgress, modulePath } from '@/lib/course-progress';
import { getCourseWithNotes } from '@/lib/learning-data';
import { requireUser } from '@/lib/session';
import { PartCards, type PlanItem } from './course-plan';

// One module on its own page: its parts, quizzes and solo projects as cards, then the
// previous and next modules.
export async function ModulePage({
  params,
}: Pick<PageProps<'/career/courses/[courseId]/modules/[moduleId]'>, 'params'>) {
  const [{ courseId, moduleId }, user] = await Promise.all([params, requireUser()]);
  const course = await getCourseWithNotes(user.id, courseId);
  const index = course?.modules.findIndex((courseModule) => courseModule.id === moduleId) ?? -1;
  if (!course || index === -1) notFound();

  const courseModule = course.modules[index];
  const coursePath = `/career/courses/${course.id}`;
  const items: PlanItem[] = courseModule.items.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    done: item.completedAt !== null,
    score: item.score,
    noteCount: item._count.notes,
  }));
  const progress = computeProgress(courseModule.items);
  const previous = course.modules[index - 1];
  const next = course.modules[index + 1];

  return (
    <>
      <Link href={coursePath} className={`${buttonClasses({ variant: 'quiet' })} -ml-2 self-start`}>
        <ChevronLeftIcon className="size-4" />
        {course.title}
      </Link>
      <PageHeader
        breadcrumb={`Cours · Module ${index + 1} sur ${course.modules.length}`}
        title={courseModule.title}
      />

      <section aria-label="Avancement du module" className="flex flex-col gap-2">
        {progress.total > 0 ? (
          <Ruler
            value={progress.done}
            max={progress.total}
            segments={Math.min(progress.total, 20)}
            label={`Avancement de « ${courseModule.title} »`}
            valueText={`${progress.done} éléments faits sur ${progress.total}`}
            colorClass="bg-career"
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <p className="flex-1 text-caption-12 text-fg-2 tabular">
            {progress.done} / {progress.total} élément{progress.total > 1 ? 's' : ''} faits · clique
            une carte pour ouvrir ses notes, coche-la quand c’est fait.
          </p>
          <Link href={`${coursePath}?edit=1`} className={buttonClasses({ variant: 'quiet' })}>
            <PencilIcon className="size-4" />
            Modifier le plan
          </Link>
        </div>
      </section>

      {items.length === 0 ? (
        <EmptyState
          variant="block"
          title="Module vide."
          description="Ajoute ses parties, quiz et solo projects depuis l’édition du plan."
          action={{ label: 'Modifier le plan', href: `${coursePath}?edit=1` }}
        />
      ) : (
        <PartCards courseId={course.id} items={items} />
      )}

      <nav aria-label="Modules" className="flex flex-wrap gap-2 border-t border-line-subtle pt-3">
        {previous ? (
          <Link
            href={modulePath(course.id, previous.id)}
            className={`${buttonClasses({ variant: 'quiet' })} -ml-2 min-w-0`}
          >
            <ChevronLeftIcon className="size-4 shrink-0" />
            <span className="truncate">
              Module {index} · {previous.title}
            </span>
          </Link>
        ) : null}
        <span className="flex-1" />
        {next ? (
          <Link
            href={modulePath(course.id, next.id)}
            className={`${buttonClasses({ variant: 'secondary' })} min-w-0`}
          >
            <span className="truncate">
              Module {index + 2} · {next.title}
            </span>
            <ChevronRightIcon className="size-4 shrink-0" />
          </Link>
        ) : null}
      </nav>
    </>
  );
}

export function ModulePageSkeleton() {
  return (
    <LoadingRegion label="Chargement du module…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-6" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} surface="card" className="h-32" />
        ))}
      </div>
    </LoadingRegion>
  );
}
