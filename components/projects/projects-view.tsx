import Link from 'next/link';
import { PageHeader } from '@/components/app-shell/page-header';
import { PlusIcon, SearchIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/dates';
import { hasGithubToken } from '@/lib/github/client';
import { getProjectsList, type ProjectFilter } from '@/lib/projects-data';
import { requireUser } from '@/lib/session';
import { ProjectCard } from './project-card';
import { AddRepoForm, SyncControls } from './sync-controls';

const BASE_PATH = '/career/projects';

const FILTERS: { value: ProjectFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'pinned', label: 'Épinglés' },
  { value: 'school', label: 'Projets 42' },
  { value: 'personal', label: 'Perso' },
  { value: 'hidden', label: 'Masqués' },
];

function parseFilter(value: string | string[] | undefined): ProjectFilter {
  return FILTERS.some((filter) => filter.value === value) ? (value as ProjectFilter) : 'all';
}

function listHref(filter: ProjectFilter, search: string): string {
  const params = new URLSearchParams();
  if (filter !== 'all') params.set('filter', filter);
  if (search) params.set('q', search);
  const query = params.toString();
  return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}

// "12 dépôts GitHub, 2 épinglés, synchronisés il y a 4 min."
function summary(total: number, pinned: number, lastSync: Date | null, now: Date): string {
  if (total === 0) return 'Aucun dépôt GitHub pour l’instant.';
  const parts = [`${total} dépôt${total > 1 ? 's' : ''} GitHub`];
  if (pinned > 0) parts.push(`${pinned} épinglé${pinned > 1 ? 's' : ''}`);
  if (lastSync) parts.push(`synchronisés ${formatRelativeTime(lastSync, now)}`);
  return `${parts.join(', ')}.`;
}

// Steps to create the token, shown persistently when it is missing or refused.
function TokenHelp({ title }: { title: string }) {
  return (
    <ErrorState
      title={title}
      description="Sur GitHub : photo de profil, Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token. Repository access : All repositories. Permissions : Contents et Metadata en lecture seule. Ajoute ensuite GITHUB_TOKEN dans .env et sur Vercel, puis redémarre."
    />
  );
}

export async function ProjectsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const filter = parseFilter(params.filter);
  const search = typeof params.q === 'string' ? params.q.slice(0, 80) : '';
  const now = new Date();
  const { projects, counts, total, lastSync } = await getProjectsList(user.id, filter, search);
  const tokenReady = hasGithubToken();
  const needsAutoSync =
    tokenReady && (!lastSync || now.getTime() - lastSync.getTime() > 60 * 60 * 1000);

  return (
    <>
      <PageHeader
        breadcrumb="Carrière · Projets"
        title={summary(total, counts.pinned, lastSync, now)}
      />

      {tokenReady ? null : <TokenHelp title="Aucun jeton GitHub configuré." />}

      <div className="flex flex-wrap items-start gap-3">
        <nav aria-label="Filtrer les projets" className="flex flex-1 flex-wrap gap-1.5">
          {FILTERS.map((item) => {
            const isActive = item.value === filter;
            return (
              <Link
                key={item.value}
                href={listHref(item.value, search)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-body-14 ${
                  isActive
                    ? 'border-line-strong bg-surface-raised font-semibold text-fg-1'
                    : 'border-transparent bg-surface-default font-medium text-fg-2 hover:text-fg-1'
                }`}
              >
                {item.label}
                <span className="text-caption-12 text-fg-3 tabular">{counts[item.value]}</span>
              </Link>
            );
          })}
        </nav>
        <form role="search" action={BASE_PATH} className="relative">
          {filter !== 'all' ? <input type="hidden" name="filter" value={filter} /> : null}
          <label htmlFor="project-search" className="sr-only">
            Rechercher un projet
          </label>
          <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-fg-3" />
          <input
            id="project-search"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Rechercher un projet"
            className="h-9 w-56 rounded-control border border-line-strong bg-surface-sunken pr-3 pl-8 text-body-14"
          />
        </form>
        <Link
          href={`${listHref(filter, search)}${filter !== 'all' || search ? '&' : '?'}panel=add-repo`}
          scroll={false}
          className={buttonClasses({ variant: 'quiet' })}
        >
          <PlusIcon className="size-4" />
          Ajouter un dépôt
        </Link>
        {tokenReady ? <SyncControls auto={needsAutoSync} /> : null}
      </div>

      {projects.length === 0 ? (
        total === 0 ? (
          <EmptyState
            variant="block"
            title="Aucun dépôt trouvé."
            description="Lance une synchronisation. Si rien n’apparaît, vérifie le jeton GitHub (accès à tous les dépôts, Contents et Metadata en lecture)."
          />
        ) : (
          <EmptyState
            variant="block"
            title="Aucun projet ne correspond."
            description="Change de filtre ou de recherche."
            action={{ label: 'Effacer les filtres', href: BASE_PATH }}
          />
        )
      ) : (
        <ul className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} now={now} />
            </li>
          ))}
        </ul>
      )}

      <SidePanel name="add-repo" title="Ajouter un dépôt">
        <AddRepoForm />
      </SidePanel>
    </>
  );
}

export function ProjectsSkeleton() {
  return (
    <LoadingRegion label="Chargement des projets…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-9" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton surface="card" className="h-48" />
        <Skeleton surface="card" className="h-48" />
        <Skeleton surface="card" className="h-48" />
      </div>
    </LoadingRegion>
  );
}
