import { PageHeader } from '@/components/app-shell/page-header';
import { AnalyticsIcon, SearchIcon } from '@/components/icons';
import { BarRow } from '@/components/ui/bar-row';
import { EmptyState } from '@/components/ui/empty-state';
import { ModuleCard } from '@/components/ui/module-card';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { todayInParis } from '@/lib/dates';
import { describeStats, jobSearchStats } from '@/lib/job-search';
import { getApplications } from '@/lib/job-search-data';
import { CONTRACT_LABELS, KIND_LABELS, type ContractTypeKey } from '@/lib/job-search-schemas';
import { requireUser } from '@/lib/session';
import { JobSearchTabs } from './job-search-tabs';

function Kpi({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-surface-default px-4.5 py-4">
      <p className="text-label-12 text-fg-3 uppercase">{label}</p>
      <p className="text-kpi-30 tabular">{value}</p>
      <p className="text-caption-12 text-fg-2">{caption}</p>
    </div>
  );
}

type Ratio = { key: string; label: string; responses: number; total: number };

// « réponses / envoyées » per group, as bars of the response rate.
function RatioRows({ rows, caption }: { rows: Ratio[]; caption: string }) {
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="sr-only">{caption}</figcaption>
      {rows.map((row) => (
        <BarRow
          key={row.key}
          label={row.label}
          value={row.responses}
          max={row.total}
          colorClass="bg-fg-2"
          display={`${row.responses} / ${row.total}`}
        />
      ))}
    </figure>
  );
}

// « Analyses »: response rate, delays, funnel, and splits by source, contract, kind and week.
export async function AnalyticsView() {
  const user = await requireUser();
  const applications = await getApplications(user.id);
  const stats = jobSearchStats(applications, todayInParis(new Date()));
  const title = describeStats(stats.total, stats.responses, stats.medianDelay);
  const weekMax = Math.max(1, ...stats.perWeek.map((week) => week.value));

  return (
    <>
      <PageHeader breadcrumb="Carrière · Recherches pro" title={title} />
      <JobSearchTabs />

      {stats.total === 0 ? (
        <EmptyState
          variant="block"
          title="Rien à analyser pour l’instant."
          description="Les taux de réponse, délais et sources apparaissent dès ta première candidature."
          action={{
            label: 'Ajouter une candidature',
            href: '/career/job-search?panel=application-new',
          }}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Taux de réponse"
              value={`${stats.responseRate} %`}
              caption={`${stats.responses} réponse${stats.responses > 1 ? 's' : ''} sur ${stats.total}`}
            />
            <Kpi
              label="Délai médian"
              value={stats.medianDelay === null ? '—' : `${stats.medianDelay} j`}
              caption="entre envoi et réponse"
            />
            <Kpi
              label="Entretiens"
              value={String(stats.interviews)}
              caption={stats.interviewCompanies.join(', ') || 'aucun pour l’instant'}
            />
            <Kpi
              label="Ce mois-ci"
              value={String(stats.thisMonth)}
              caption={`candidature${stats.thisMonth > 1 ? 's' : ''} envoyée${stats.thisMonth > 1 ? 's' : ''}`}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ModuleCard
              title="Entonnoir"
              icon={<AnalyticsIcon className="size-4" />}
              accentClass="text-career"
            >
              <figure className="flex flex-col gap-1.5">
                <figcaption className="sr-only">
                  {`${stats.funnel.sent} envoyées, ${stats.funnel.responses} réponses, ${stats.funnel.interviews} entretiens, ${stats.funnel.offers} offres`}
                </figcaption>
                {[
                  { key: 'sent', label: 'Envoyées', value: stats.funnel.sent, color: 'bg-fg-2' },
                  {
                    key: 'responses',
                    label: 'Réponses',
                    value: stats.funnel.responses,
                    color: 'bg-fg-2',
                  },
                  {
                    key: 'interviews',
                    label: 'Entretiens',
                    value: stats.funnel.interviews,
                    color: 'bg-info',
                  },
                  {
                    key: 'offers',
                    label: 'Offres',
                    value: stats.funnel.offers,
                    color: 'bg-career',
                  },
                ].map((row) => (
                  <BarRow
                    key={row.key}
                    label={row.label}
                    value={row.value}
                    max={stats.funnel.sent}
                    colorClass={row.color}
                  />
                ))}
              </figure>
            </ModuleCard>
            <ModuleCard
              title="Réponses par source"
              icon={<SearchIcon className="size-4" />}
              accentClass="text-career"
              aside="réponses / envoyées"
            >
              <RatioRows rows={stats.bySource} caption="Réponses par source" />
            </ModuleCard>
            <ModuleCard title="Réponses par contrat" aside="réponses / envoyées">
              <RatioRows
                rows={stats.byContract.map((row) => ({
                  ...row,
                  label: CONTRACT_LABELS[row.key as ContractTypeKey] ?? row.key,
                }))}
                caption="Réponses par type de contrat"
              />
            </ModuleCard>
            <ModuleCard title="Spontanées ou sur offre" aside="réponses / envoyées">
              <RatioRows
                rows={stats.byKind.map((row) => ({
                  ...row,
                  label: KIND_LABELS[row.key as 'OFFER' | 'SPONTANEOUS'],
                }))}
                caption="Réponses des candidatures spontanées et sur offre"
              />
            </ModuleCard>
          </div>

          <ModuleCard
            title="Candidatures envoyées par semaine"
            icon={<AnalyticsIcon className="size-4" />}
            accentClass="text-career"
            aside="8 dernières semaines"
          >
            <figure>
              <figcaption className="sr-only">
                Candidatures envoyées par semaine, sur les 8 dernières semaines
              </figcaption>
              <div aria-hidden="true" className="flex h-56 items-end gap-3 px-2 pt-6">
                {stats.perWeek.map((week) => (
                  <div
                    key={week.key}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <span className="text-caption-12 font-semibold tabular">{week.value}</span>
                    <span
                      className={`w-full max-w-10 rounded-tick ${week.current ? 'bg-career' : 'bg-fg-3'}`}
                      style={{
                        height: `${(week.value / weekMax) * 100}%`,
                        minHeight: week.value ? 4 : 1,
                      }}
                    />
                    <span className="text-caption-12 text-fg-3">{week.label}</span>
                  </div>
                ))}
              </div>
              <table className="sr-only">
                <thead>
                  <tr>
                    <th scope="col">Semaine</th>
                    <th scope="col">Candidatures</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perWeek.map((week) => (
                    <tr key={week.key}>
                      <th scope="row">
                        {week.current ? `${week.label} (cette semaine)` : week.label}
                      </th>
                      <td>{week.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </figure>
          </ModuleCard>
        </>
      )}
    </>
  );
}

export function AnalyticsSkeleton() {
  return (
    <LoadingRegion label="Chargement des analyses…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-10" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} surface="card" className="h-28" />
        ))}
      </div>
      <Skeleton surface="card" className="h-60" />
    </LoadingRegion>
  );
}
