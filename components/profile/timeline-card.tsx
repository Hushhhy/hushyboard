import Link from 'next/link';
import type { TimelineEntry } from '@/generated/prisma/client';
import { projectSlug } from '@/lib/github/helpers';
import { deleteTimelineEntry } from '@/app/(app)/career/profile/actions';
import { CourseIcon, PencilIcon, PlusIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SidePanel } from '@/components/ui/side-panel';
import { TimelineForm } from './timeline-form';

type Entry = TimelineEntry & {
  project: { name: string; fullName: string; isExternal: boolean } | null;
};

export function TimelineCard({
  entries,
  projects,
}: {
  entries: Entry[];
  projects: { id: string; name: string }[];
}) {
  return (
    <section
      aria-labelledby="timeline-title"
      className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
    >
      <h2 id="timeline-title" className="flex items-center gap-2 text-label-12 text-fg-3 uppercase">
        <CourseIcon className="size-4" />
        Formation et expériences
      </h2>

      {entries.length === 0 ? (
        <EmptyState
          title="Aucune étape pour l'instant."
          description="Ajoute ta formation, tes expériences et tes projets marquants."
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id} className="group flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-1.5 size-2 shrink-0 rounded-full ${
                  entry.isCurrent ? 'bg-career' : 'border border-fg-3'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-body-14 font-medium">
                  {entry.project ? (
                    <Link
                      href={`/career/projects/${projectSlug(entry.project)}`}
                      className="underline decoration-line-strong underline-offset-3 hover:decoration-current"
                    >
                      {entry.title}
                    </Link>
                  ) : (
                    entry.title
                  )}
                  {entry.isCurrent ? <span className="sr-only"> (en cours)</span> : null}
                </p>
                <p className="text-caption-12 text-fg-3">
                  {[entry.period, entry.place].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Link
                href={`/career/profile?panel=timeline-${entry.id}`}
                scroll={false}
                aria-label={`Modifier « ${entry.title} »`}
                className={buttonClasses({ variant: 'icon' })}
              >
                <PencilIcon className="size-4" />
              </Link>
              <SidePanel name={`timeline-${entry.id}`} title="Modifier l'étape">
                <TimelineForm entry={entry} projects={projects} />
                <div className="mt-auto border-t border-line-subtle pt-3">
                  <DeleteDialog
                    title={`Supprimer « ${entry.title} » ?`}
                    description="Cette étape disparaîtra de ton profil."
                    onConfirm={deleteTimelineEntry.bind(null, entry.id)}
                  />
                </div>
              </SidePanel>
            </li>
          ))}
        </ol>
      )}

      <Link
        href="/career/profile?panel=timeline-new"
        scroll={false}
        className={`${buttonClasses({ variant: 'quiet' })} -ml-2 self-start`}
      >
        <PlusIcon className="size-4" />
        Ajouter une étape
      </Link>
      <SidePanel name="timeline-new" title="Ajouter une étape">
        <TimelineForm entry={null} projects={projects} />
      </SidePanel>
    </section>
  );
}
