import Link from 'next/link';
import { PageHeader } from '@/components/app-shell/page-header';
import { ExternalLinkIcon, MailIcon, PlusIcon, SearchIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ModuleCard } from '@/components/ui/module-card';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { addDays, describeSpontaneous, displayUrl, isFollowUpDue } from '@/lib/job-search';
import { daysBetweenInParis, formatShortDate, todayInParis } from '@/lib/dates';
import { getApplications, getResumeChoices } from '@/lib/job-search-data';
import { requireUser } from '@/lib/session';
import { ApplicationForm } from './application-form';
import { ApplicationPanel } from './application-panel';
import { JobSearchTabs } from './job-search-tabs';
import { FollowedUpButton } from './status-controls';

const BASE_PATH = '/career/job-search/spontaneous';

type Search = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// « Candidatures spontanées »: one row per careers site where Alex sent an application.
export async function SpontaneousView({ searchParams }: { searchParams: Promise<Search> }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const [all, resumes] = await Promise.all([getApplications(user.id), getResumeChoices(user.id)]);
  const applications = all.filter((application) => application.kind === 'SPONTANEOUS');
  const now = new Date();
  const today = todayInParis(now);
  const weekEnd = addDays(today, 7);
  const due = applications.filter((application) => isFollowUpDue(application, today));
  // « À relancer cette semaine »: due now or within 7 days, soonest first.
  const thisWeek = applications
    .filter((application) => isFollowUpDue(application, weekEnd) && application.followUpAt !== null)
    .sort((a, b) => a.followUpAt!.getTime() - b.followUpAt!.getTime());
  const interviews = applications.filter((a) =>
    a.events.some((event) => event.status === 'HR_INTERVIEW' || event.status === 'TECH_INTERVIEW')
  ).length;
  const refusals = applications.filter((a) => a.status === 'REJECTED').length;
  const panel = one(params.panel);
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
        breadcrumb="Recherches pro · Candidatures spontanées"
        title={describeSpontaneous(applications.length, due.length)}
      />
      <JobSearchTabs />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
        <section aria-labelledby="sites-title" className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2 id="sites-title" className="flex-1 text-title-18">
              Sites carrière
            </h2>
            <Link
              href={`${BASE_PATH}?panel=site-new`}
              scroll={false}
              className={buttonClasses({ variant: 'primary' })}
            >
              <PlusIcon className="size-4" />
              Ajouter un site
            </Link>
          </div>

          {applications.length === 0 ? (
            <EmptyState
              variant="block"
              title="Aucune candidature spontanée."
              description="Ajoute chaque entreprise contactée par sa page carrière : la relance est proposée 14 jours après l’envoi."
              action={{ label: 'Ajouter un site', href: `${BASE_PATH}?panel=site-new` }}
            />
          ) : (
            <div className="overflow-x-auto rounded-card bg-surface-default">
              <table className="w-full min-w-160 text-body-14">
                <caption className="sr-only">Candidatures spontanées</caption>
                <thead>
                  <tr className="text-left text-label-12 text-fg-3 uppercase">
                    {['Entreprise et page carrière', 'Envoyée le', 'CV', 'Statut', 'Relance'].map(
                      (header) => (
                        <th key={header} scope="col" className="px-4.5 py-3 font-semibold">
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => {
                    const isDue = isFollowUpDue(application, today);
                    const waiting = ['SENT', 'WAITING', 'NO_RESPONSE', 'FOLLOWED_UP'].includes(
                      application.status
                    );
                    return (
                      <tr key={application.id} className="border-t border-line-subtle">
                        <td className="px-4.5 py-3">
                          <Link
                            href={`${BASE_PATH}?panel=app-${application.id}`}
                            scroll={false}
                            className="font-semibold underline-offset-2 hover:underline"
                          >
                            {application.company}
                          </Link>
                          {application.careersUrl ? (
                            <a
                              href={application.careersUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-caption-12 text-fg-3 underline-offset-2 hover:underline"
                            >
                              <ExternalLinkIcon className="size-3" />
                              {displayUrl(application.careersUrl)}
                              <span className="sr-only"> (nouvel onglet)</span>
                            </a>
                          ) : null}
                        </td>
                        <td className="px-4.5 py-3 text-fg-2 tabular">
                          {formatShortDate(application.sentAt)}
                        </td>
                        <td className="px-4.5 py-3 text-fg-2">{application.resume?.name ?? '—'}</td>
                        <td className="px-4.5 py-3">
                          <StatusPill status={application.status} />
                        </td>
                        <td className="px-4.5 py-3 tabular">
                          {isDue ? (
                            <span className="font-semibold text-warning">À relancer</span>
                          ) : waiting && application.followUpAt ? (
                            <span className="text-fg-2">
                              {formatShortDate(application.followUpAt)}
                            </span>
                          ) : (
                            <span className="text-fg-3">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-3">
          <ModuleCard
            title="Bilan"
            icon={<SearchIcon className="size-4" />}
            accentClass="text-career"
          >
            <dl className="grid grid-cols-3 gap-3">
              {[
                {
                  label: applications.length > 1 ? 'envoyées' : 'envoyée',
                  value: applications.length,
                },
                { label: interviews > 1 ? 'entretiens' : 'entretien', value: interviews },
                { label: 'refus', value: refusals },
              ].map((item) => (
                <div key={item.label} className="flex flex-col-reverse">
                  <dt className="text-caption-12 text-fg-3">{item.label}</dt>
                  <dd className="text-kpi-30 tabular">{item.value}</dd>
                </div>
              ))}
            </dl>
          </ModuleCard>
          <ModuleCard
            title="À relancer cette semaine"
            icon={<MailIcon className="size-4" />}
            accentClass="text-warning"
            aside={<span className="tabular">{thisWeek.length}</span>}
          >
            {thisWeek.length === 0 ? (
              <p className="text-body-14 text-fg-2">Aucune relance prévue cette semaine.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {thisWeek.map((application) => {
                  const days = daysBetweenInParis(application.sentAt, now);
                  return (
                    <li key={application.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{application.company}</p>
                        <p className="text-caption-12 text-fg-3">
                          envoyée il y a {days} jour{days > 1 ? 's' : ''}
                        </p>
                      </div>
                      <FollowedUpButton applicationId={application.id} />
                    </li>
                  );
                })}
              </ul>
            )}
          </ModuleCard>
          <p className="text-caption-12 text-fg-3">
            Relance proposée 14 jours après l’envoi. Une réponse détectée dans Mails met le statut à
            jour après ta validation.
          </p>
        </div>
      </div>

      <SidePanel name="site-new" title="Ajouter un site">
        <ApplicationForm
          kind="SPONTANEOUS"
          application={null}
          resumes={resumeOptions}
          closeHref={BASE_PATH}
        />
      </SidePanel>
      {selected ? (
        <SidePanel
          name={`app-${selected.id}`}
          title={selected.company}
          subtitle="Candidature spontanée"
        >
          <ApplicationPanel
            application={selected}
            editHref={`${BASE_PATH}?panel=edit-${selected.id}`}
          />
        </SidePanel>
      ) : null}
      {editing ? (
        <SidePanel name={`edit-${editing.id}`} title="Modifier la candidature">
          <ApplicationForm
            kind="SPONTANEOUS"
            application={editing}
            resumes={resumeOptions}
            closeHref={`${BASE_PATH}?panel=app-${editing.id}`}
          />
        </SidePanel>
      ) : null}
    </>
  );
}

export function SpontaneousSkeleton() {
  return (
    <LoadingRegion label="Chargement des candidatures spontanées…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-10" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
        <Skeleton surface="card" className="h-100" />
        <Skeleton surface="card" className="h-80" />
      </div>
    </LoadingRegion>
  );
}
