import Link from 'next/link';
import { CodeIcon, PinIcon, StarIcon } from '@/components/icons';
import { Tag } from '@/components/ui/chip';
import { formatRelativeDay } from '@/lib/dates';
import { projectSlug } from '@/lib/github/helpers';
import type { ProjectItem } from '@/lib/projects-data';
import { LanguageBar } from './language-bar';

export function VisibilityBadge({ isPrivate }: { isPrivate: boolean }) {
  return (
    <span className="rounded-pill border border-line-strong px-1.5 text-caption-12 font-semibold text-fg-2">
      {isPrivate ? 'Privé' : 'Public'}
    </span>
  );
}

// One repository in the grid. The whole card opens the project page.
export function ProjectCard({ project, now }: { project: ProjectItem; now: Date }) {
  return (
    <Link
      href={`/career/projects/${projectSlug(project)}`}
      className="flex h-full flex-col gap-2.5 rounded-card bg-surface-default p-4 transition-colors duration-(--duration-tick) hover:bg-surface-raised"
    >
      <div className="flex items-center gap-2">
        <CodeIcon className="size-4 shrink-0 text-fg-2" />
        <h2 className="min-w-0 truncate text-body-16 font-semibold">{project.name}</h2>
        {project.pinned ? (
          <>
            <PinIcon className="size-3.5 shrink-0 text-career" />
            <span className="sr-only">(épinglé)</span>
          </>
        ) : null}
        <span className="ml-auto shrink-0">
          <VisibilityBadge isPrivate={project.isPrivate} />
        </span>
      </div>
      {project.isExternal ? (
        <p className="text-caption-12 text-fg-3">Dépôt de {project.fullName.split('/')[0]}</p>
      ) : null}
      <p className="line-clamp-2 min-h-10 text-body-14 text-fg-2">
        {project.description ?? 'Pas de description.'}
      </p>
      <LanguageBar languages={project.languages} compact />
      {project.skills.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {project.skills.map((skill) => (
            <Tag key={skill.id}>{skill.name}</Tag>
          ))}
        </div>
      ) : null}
      <p className="mt-auto flex items-center gap-3 pt-1 text-caption-12 text-fg-3">
        {project.deletedOnGithubAt ? (
          <span className="font-semibold text-fg-1">Supprimé de GitHub</span>
        ) : project.pushedAt ? (
          <span>Modifié {formatRelativeDay(project.pushedAt, now)}</span>
        ) : null}
        {project.stars > 0 ? (
          <span className="flex items-center gap-1 tabular">
            <StarIcon className="size-3.5" />
            {project.stars}
            <span className="sr-only">étoiles</span>
          </span>
        ) : null}
      </p>
    </Link>
  );
}
