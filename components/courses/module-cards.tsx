import Link from 'next/link';
import { ChevronRightIcon } from '@/components/icons';
import { Ruler } from '@/components/ui/ruler';
import { COURSE_ITEM_LABELS, computeProgress, itemPath, modulePath } from '@/lib/course-progress';
import type { PlanModule } from './course-plan';

// Where to pick up: the first part not done, across the modules.
export function ContinueCard({ courseId, modules }: { courseId: string; modules: PlanModule[] }) {
  const index = modules.findIndex((courseModule) => courseModule.items.some((item) => !item.done));
  if (index === -1) return null;
  const item = modules[index].items.find((candidate) => !candidate.done)!;
  return (
    <article className="group relative flex items-center gap-3 rounded-card bg-surface-raised p-4 shadow-raised ring-1 ring-career">
      <div className="min-w-0 flex-1">
        <p className="text-label-12 text-career uppercase">
          Continuer · Module {index + 1} · {COURSE_ITEM_LABELS[item.kind]}
        </p>
        <h3 className="text-title-18">
          <Link
            href={itemPath(courseId, item.id)}
            className="after:absolute after:inset-0 after:rounded-card"
          >
            {item.title}
          </Link>
        </h3>
        <p className="text-caption-12 text-fg-2">{modules[index].title}</p>
      </div>
      <ChevronRightIcon className="size-5 shrink-0 text-fg-2 transition-transform duration-(--duration-tick) group-hover:translate-x-0.5" />
    </article>
  );
}

// The modules of a course as cards: progress, what comes next; the whole card opens the
// module page with its parts.
export function ModuleCards({ courseId, modules }: { courseId: string; modules: PlanModule[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map((courseModule, index) => {
        const progress = computeProgress(
          courseModule.items.map((item) => ({ completedAt: item.done ? new Date() : null }))
        );
        const next = courseModule.items.find((item) => !item.done);
        const notes = courseModule.items.reduce((sum, item) => sum + item.noteCount, 0);
        const isDone = progress.total > 0 && progress.done === progress.total;
        return (
          <li key={courseModule.id}>
            <article
              className={`group relative flex h-full flex-col gap-2 rounded-card p-4 transition-colors duration-(--duration-tick) hover:bg-surface-overlay ${
                progress.done > 0 && !isDone ? 'bg-surface-raised' : 'bg-surface-base'
              }`}
            >
              <div className="flex items-baseline gap-2">
                <p className="flex-1 text-label-12 text-fg-3 uppercase">Module {index + 1}</p>
                <span className="text-caption-12 text-fg-2 tabular">
                  {progress.done} / {progress.total}
                </span>
              </div>
              <h3 className="text-body-16 font-semibold">
                <Link
                  href={modulePath(courseId, courseModule.id)}
                  className="after:absolute after:inset-0 after:rounded-card"
                >
                  {courseModule.title}
                </Link>
              </h3>
              {progress.total > 0 ? (
                <Ruler
                  value={progress.done}
                  max={progress.total}
                  segments={Math.min(progress.total, 12)}
                  label={`Avancement du module ${index + 1}`}
                  valueText={`${progress.done} éléments faits sur ${progress.total}`}
                  colorClass="bg-career"
                  size="small"
                />
              ) : null}
              <p className="mt-auto flex flex-wrap gap-x-3 text-caption-12 text-fg-2">
                {progress.total === 0 ? (
                  <span className="text-fg-3">Module vide</span>
                ) : isDone ? (
                  <span className="text-success">Terminé</span>
                ) : next ? (
                  <span className="min-w-0 truncate">Ensuite : {next.title}</span>
                ) : null}
                <span className="text-fg-3">
                  {notes} note{notes > 1 ? 's' : ''}
                </span>
              </p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
