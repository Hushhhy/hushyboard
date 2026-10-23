import Link from 'next/link';
import { PageHeader } from '@/components/app-shell/page-header';
import { PlusIcon, SearchIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ModuleCard } from '@/components/ui/module-card';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/dates';
import { describeWatch } from '@/lib/job-search';
import { getWatchData } from '@/lib/job-search-data';
import { CONTRACT_LABELS } from '@/lib/job-search-schemas';
import { requireUser } from '@/lib/session';
import { JobSearchTabs } from './job-search-tabs';
import { OfferCardActions, RestoreOfferButton } from './offer-actions-buttons';
import { OfferForm } from './offer-form';
import { KeywordsList, SourcesList } from './watch-settings';

const BASE_PATH = '/career/job-search/watch';

type OfferCardData = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  contractType: keyof typeof CONTRACT_LABELS | null;
  remotePolicy: string | null;
  source: string | null;
  tags: string[];
  foundAt: Date;
};

function OfferHeading({ offer, now }: { offer: OfferCardData; now: Date }) {
  const meta = [offer.source, formatRelativeTime(offer.foundAt, now)].filter(Boolean).join(' · ');
  const chips = [
    offer.contractType ? CONTRACT_LABELS[offer.contractType] : null,
    offer.remotePolicy,
    ...offer.tags.slice(0, 5),
  ].filter((chip): chip is string => Boolean(chip));
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="text-caption-12 text-fg-3">{meta}</p>
      <h3 className="text-title-18">
        <Link
          href={`/career/job-search/offers/${offer.id}`}
          className="underline-offset-2 hover:underline"
        >
          {offer.title}
        </Link>
      </h3>
      <p className="text-body-14 text-fg-2">
        {[offer.company, offer.location].filter(Boolean).join(' · ')}
      </p>
      {chips.length > 0 ? (
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-tick bg-surface-raised px-2 py-0.5 text-caption-12 text-fg-2"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// « Veille »: offers to sort, then the ones sorted this week; sources and keywords on the right.
export async function WatchView() {
  const user = await requireUser();
  const now = new Date();
  const { pending, recentlyDecided, sources, keywords } = await getWatchData(user.id, now);

  return (
    <>
      <PageHeader breadcrumb="Carrière · Recherches pro" title={describeWatch(pending.length)} />
      <JobSearchTabs />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
        <section aria-labelledby="offers-title" className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2 id="offers-title" className="flex-1 text-title-18">
              Nouvelles offres
            </h2>
            <Link
              href={`${BASE_PATH}?panel=offer-new`}
              scroll={false}
              className={buttonClasses({ variant: 'primary' })}
            >
              <PlusIcon className="size-4" />
              Ajouter une offre
            </Link>
          </div>

          {pending.length === 0 ? (
            <EmptyState
              variant="block"
              title="Aucune offre à trier."
              description="Colle le texte d’une offre repérée : l’IA remplit la fiche, puis tu obtiens l’analyse de ton CV et une lettre de motivation."
              action={{ label: 'Ajouter une offre', href: `${BASE_PATH}?panel=offer-new` }}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {pending.map((offer) => (
                <li
                  key={offer.id}
                  className="flex flex-wrap items-center gap-4 rounded-card bg-surface-default p-4.5"
                >
                  <OfferHeading offer={offer} now={now} />
                  <OfferCardActions offerId={offer.id} />
                </li>
              ))}
            </ul>
          )}

          {recentlyDecided.length > 0 ? (
            <>
              <h2 className="mt-2 text-label-12 text-fg-3 uppercase">Triées cette semaine</h2>
              <ul className="flex flex-col gap-3">
                {recentlyDecided.map((offer) => (
                  <li
                    key={offer.id}
                    className="flex flex-wrap items-center gap-4 rounded-card bg-surface-default p-4.5 opacity-80"
                  >
                    <OfferHeading offer={offer} now={now} />
                    <div className="flex items-center gap-2 text-body-14 text-fg-2">
                      {offer.decision === 'APPLIED' ? (
                        'Classée : postulée'
                      ) : (
                        <>
                          Classée : refusée par toi
                          <RestoreOfferButton offerId={offer.id} />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <div className="flex flex-col gap-3">
          <ModuleCard
            title="Sources suivies"
            icon={<SearchIcon className="size-4" />}
            accentClass="text-career"
            aside={<span className="tabular">{sources.length}</span>}
          >
            <SourcesList sources={sources} />
          </ModuleCard>
          <ModuleCard title="Mots-clés de la veille">
            <KeywordsList keywords={keywords} />
          </ModuleCard>
        </div>
      </div>

      <SidePanel name="offer-new" title="Ajouter une offre" wide>
        <OfferForm sources={sources.map((source) => source.name)} closeHref={BASE_PATH} />
      </SidePanel>
    </>
  );
}

export function WatchSkeleton() {
  return (
    <LoadingRegion label="Chargement de la veille…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-10" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
        <Skeleton surface="card" className="h-120" />
        <Skeleton surface="card" className="h-80" />
      </div>
    </LoadingRegion>
  );
}
