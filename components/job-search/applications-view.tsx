import Link from 'next/link';
import { PageHeader } from '@/components/app-shell/page-header';
import { PlusIcon, SearchIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { formatDayMonth, todayInParis } from '@/lib/dates';
import {
  APPLICATION_FILTERS,
  describeApplications,
  isApplicationFilter,
  isFollowUpDue,
  matchesApplicationFilter,
  type ApplicationFilter,
} from '@/lib/job-search';
import { getApplications, getResumeChoices } from '@/lib/job-search-data';
import { normalizeSearch } from '@/lib/skills/reference/list';
import { requireUser } from '@/lib/session';
import { ApplicationForm } from './application-form';
import { ApplicationPanel } from './application-panel';
import { JobSearchTabs } from './job-search-tabs';

const BASE_PATH = '/career/job-search';
const PAGE_SIZE = 20;

type Search = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// « Candidatures »: every application (offer-based and spontaneous), newest first.
export async function ApplicationsView({ searchParams }: { searchParams: Promise<Search> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const [applications, resumes] = await Promise.all([
    getApplications(user.id),
    getResumeChoices(user.id),
  ]);
  const today = todayInParis(new Date());
  const filterParam = one(params.filter);
  const filter: ApplicationFilter = isApplicationFilter(filterParam) ? filterParam : 'all';
  const query = (one(params.q) ?? '').trim();
  const limit = Math.max(PAGE_SIZE, Number(one(params.limit)) || PAGE_SIZE);
  const panel = one(params.panel);

  const listQuery = new URLSearchParams();
  if (filter !== 'all') listQuery.set('filter', filter);
  if (query) listQuery.set('q', query);
  const listHref = (extra: Record<string, string> = {}) => {
    const next = new URLSearchParams(listQuery);
    for (const [key, value] of Object.entries(extra)) next.set(key, value);
    const text = next.toString();
    return text ? `${BASE_PATH}?${text}` : BASE_PATH;
  };

  const needle = normalizeSearch(query);
  const searched = applications.filter(
    (application) =>
      !needle ||
      normalizeSearch(`${application.company} ${application.position ?? ''}`).includes(needle)
  );
  const visible = searched.filter((application) =>
    matchesApplicationFilter(application, filter, today)
  );
  const shown = visible.slice(0, limit);
  const interviewsInProgress = applications.filter(
    (application) =>
      application.status === 'HR_INTERVIEW' || application.status === 'TECH_INTERVIEW'
  ).length;

  const selected = panel?.startsWith('app-')
    ? applications.find((application) => application.id === panel.slice(4))
    : undefined;
  const editing = panel?.startsWith('edit-')
    ? applications.find((application) => application.id === panel.slice(5))
    : undefined;
  const resumeOptions = resumes.map((resume) => ({ id: resume.id, name: resume.name }));

  return (
    <>
      <PageHeader
        breadcrumb="Carrière · Recherches pro"
        title={describeApplications(applications.length, interviewsInProgress)}
      />
      <JobSearchTabs />

      <div className="flex flex-wrap items-center gap-3">
        <form role="search" action={BASE_PATH} className="relative min-w-0 flex-1 sm:flex-none">
          {filter !== 'all' ? <input type="hidden" name="filter" value={filter} /> : null}
          <label htmlFor="application-search" className="sr-only">
            Chercher une entreprise, un poste
          </label>
          <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-fg-3" />
          <input
            id="application-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Chercher une entreprise, un poste…"
            className="h-9 w-full rounded-control sm:w-72 border border-line-strong bg-surface-sunken pr-3 pl-8 text-body-14"
          />
        </form>
        <nav
          aria-label="Filtrer les candidatures"
          className="order-last flex w-full flex-wrap gap-1.5"
        >
          {APPLICATION_FILTERS.map((item) => {
            const count = searched.filter((application) =>
              matchesApplicationFilter(application, item.value, today)
            ).length;
            const isActive = item.value === filter;
            const next = new URLSearchParams();
            if (item.value !== 'all') next.set('filter', item.value);
            if (query) next.set('q', query);
            return (
              <Link
                key={item.value}
                href={next.toString() ? `${BASE_PATH}?${next}` : BASE_PATH}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-body-14 ${
                  isActive
                    ? 'border-line-strong bg-surface-raised font-semibold text-fg-1'
                    : 'border-transparent bg-surface-default font-medium text-fg-2 hover:text-fg-1'
                }`}
              >
                {item.label}
                <span className="text-caption-12 text-fg-3 tabular">{count}</span>
              </Link>
            );
          })}
        </nav>
        <Link
          href={listHref({ panel: 'application-new' })}
          scroll={false}
          className={buttonClasses({ variant: 'primary' })}
        >
          <PlusIcon className="size-4" />
          Ajouter une candidature
        </Link>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          variant="block"
          title="Aucune candidature suivie."
          description="Ajoute une candidature envoyée, ou marque une offre de la veille comme postulée : le suivi et les relances se font ici."
          action={{
            label: 'Ajouter une candidature',
            href: listHref({ panel: 'application-new' }),
          }}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          variant="block"
          title="Aucune candidature ne correspond."
          action={{ label: 'Tout afficher', href: BASE_PATH }}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-card bg-surface-default">
            <table className="w-full min-w-180 text-body-14">
              <caption className="sr-only">Candidatures, triées par date d’envoi</caption>
              <thead>
                <tr className="text-left text-label-12 text-fg-3 uppercase">
                  {['Entreprise', 'Poste', 'Statut', 'Envoyée', 'Relance', 'Source'].map(
                    (header) => (
                      <th key={header} scope="col" className="px-4.5 py-3 font-semibold">
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {shown.map((application) => {
                  const due = isFollowUpDue(application, today);
                  return (
                    <tr
                      key={application.id}
                      className="relative border-t border-line-subtle hover:bg-surface-raised"
                    >
                      <td className="px-4.5 py-3 font-semibold">
                        <Link
                          href={listHref({ panel: `app-${application.id}` })}
                          scroll={false}
                          className="after:absolute after:inset-0"
                        >
                          {application.company}
                        </Link>
                      </td>
                      <td className="px-4.5 py-3 text-fg-2">
                        {application.position ??
                          (application.kind === 'SPONTANEOUS' ? 'Candidature spontanée' : '—')}
                      </td>
                      <td className="px-4.5 py-3">
                        <StatusPill status={application.status} />
                      </td>
                      <td className="px-4.5 py-3 text-fg-2 tabular">
                        {formatDayMonth(application.sentAt)}
                      </td>
                      <td className="px-4.5 py-3 tabular">
                        {due ? (
                          <span className="font-semibold text-warning">À relancer</span>
                        ) : application.followUpAt &&
                          ['SENT', 'WAITING', 'NO_RESPONSE', 'FOLLOWED_UP'].includes(
                            application.status
                          ) ? (
                          <span className="text-fg-2">
                            {formatDayMonth(application.followUpAt)}
                          </span>
                        ) : (
                          <span className="text-fg-3">—</span>
                        )}
                      </td>
                      <td className="max-w-48 truncate px-4.5 py-3 text-fg-2">
                        {application.source ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 text-caption-12 text-fg-3">
            <p className="flex-1 tabular">
              {shown.length} sur {visible.length} · triées par date d’envoi
            </p>
            {visible.length > shown.length ? (
              <Link
                href={listHref({ limit: String(limit + PAGE_SIZE) })}
                scroll={false}
                className={buttonClasses({ variant: 'quiet' })}
              >
                Voir les {Math.min(PAGE_SIZE, visible.length - shown.length)} suivantes
              </Link>
            ) : null}
          </div>
        </>
      )}

      <SidePanel name="application-new" title="Ajouter une candidature">
        <ApplicationForm
          kind="OFFER"
          application={null}
          resumes={resumeOptions}
          closeHref={listHref()}
        />
      </SidePanel>
      {selected ? (
        <SidePanel
          name={`app-${selected.id}`}
          title={selected.company}
          subtitle={selected.position ?? undefined}
        >
          <ApplicationPanel
            application={selected}
            editHref={listHref({ panel: `edit-${selected.id}` })}
          />
        </SidePanel>
      ) : null}
      {editing ? (
        <SidePanel name={`edit-${editing.id}`} title="Modifier la candidature">
          <ApplicationForm
            kind={editing.kind}
            application={editing}
            resumes={resumeOptions}
            closeHref={listHref({ panel: `app-${editing.id}` })}
          />
        </SidePanel>
      ) : null}
    </>
  );
}

export function JobSearchSkeleton() {
  return (
    <LoadingRegion label="Chargement des recherches…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-10" />
      <Skeleton surface="card" className="h-120" />
    </LoadingRegion>
  );
}
