import Link from 'next/link';
import { notFound } from 'next/navigation';
import { removeProject, setProjectFlag } from '@/app/(app)/career/projects/actions';
import { PageHeader } from '@/components/app-shell/page-header';
import { ChevronLeftIcon, ExternalLinkIcon, PinIcon, StarIcon } from '@/components/icons';
import { Button, buttonClasses } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { formatRelativeDay } from '@/lib/dates';
import { projectSlug } from '@/lib/github/helpers';
import { getProjectBySlug } from '@/lib/projects-data';
import { requireUser } from '@/lib/session';
import { VisibilityBadge } from './project-card';

export async function ProjectHeader({ slug }: { slug: Promise<string> }) {
  const [user, repoSlug] = await Promise.all([requireUser(), slug]);
  const project = await getProjectBySlug(user.id, repoSlug);
  if (!project) notFound();

  const base = `/career/projects/${projectSlug(project)}`;
  const now = new Date();

  return (
    <>
      <Link
        href="/career/projects"
        className={`${buttonClasses({ variant: 'quiet' })} -ml-2 self-start`}
      >
        <ChevronLeftIcon className="size-4" />
        Projets
      </Link>
      <PageHeader
        breadcrumb={`Carrière · Projets · ${project.name}`}
        title={project.description ?? project.name}
      />

      {project.deletedOnGithubAt ? (
        <ErrorState
          title="Supprimé de GitHub."
          description="Ce dépôt n’existe plus sur GitHub (ou le jeton n’y a plus accès). Il reste ici tant que tu ne le retires pas."
          action={
            <DeleteDialog
              title={`Retirer « ${project.name} » de Hushyboard ?`}
              description="Le projet disparaît de Hushyboard, avec sa fiche. Rien n’est modifié sur GitHub."
              triggerLabel="Retirer de Hushyboard"
              triggerVariant="secondary"
              onConfirm={removeProject.bind(null, project.id)}
            />
          }
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-caption-12 text-fg-2">
          <VisibilityBadge isPrivate={project.isPrivate} />
          {project.isExternal ? <span>Dépôt de {project.fullName.split('/')[0]}</span> : null}
          <span className="flex items-center gap-1 tabular">
            <StarIcon className="size-3.5" />
            {project.stars}
            <span className="sr-only">étoiles</span>
          </span>
          <span>branche {project.defaultBranch}</span>
          {project.pushedAt ? (
            <span>modifié {formatRelativeDay(project.pushedAt, now)}</span>
          ) : null}
        </p>
        <form action={setProjectFlag.bind(null, project.id, 'pinned', !project.pinned)}>
          <Button type="submit" variant="quiet">
            <PinIcon className="size-4" />
            {project.pinned ? 'Désépingler' : 'Épingler'}
          </Button>
        </form>
        <a
          href={project.url}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({ variant: 'secondary' })}
        >
          <ExternalLinkIcon className="size-4" />
          Ouvrir sur GitHub
        </a>
      </div>

      <Tabs
        label={`Projet ${project.name}`}
        items={[
          { href: base, label: 'README' },
          { href: `${base}/code`, label: 'Code' },
          { href: `${base}/commits`, label: 'Commits' },
          { href: `${base}/details`, label: 'Fiche projet' },
        ]}
      />
    </>
  );
}

export function ProjectHeaderSkeleton() {
  return (
    <LoadingRegion label="Chargement du projet…" className="flex flex-col gap-3">
      <Skeleton surface="card" className="h-8 w-28" />
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-9" />
      <Skeleton surface="card" className="h-10 w-96" />
    </LoadingRegion>
  );
}

export function TabSkeleton() {
  return (
    <LoadingRegion
      label="Chargement depuis GitHub…"
      className="grid gap-3 lg:grid-cols-[1fr_20rem]"
    >
      <Skeleton surface="card" className="h-96" />
      <Skeleton surface="card" className="h-60" />
    </LoadingRegion>
  );
}
