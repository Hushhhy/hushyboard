import Link from 'next/link';
import { notFound } from 'next/navigation';
import { analyzeOffer } from '@/app/(app)/career/job-search/offer-actions';
import { PageHeader } from '@/components/app-shell/page-header';
import {
  CheckIcon,
  ChevronLeftIcon,
  ExternalLinkIcon,
  ResumeIcon,
  SparkleIcon,
} from '@/components/icons';
import { ActionButton } from '@/components/skills/action-button';
import { GenerateOnOpen } from '@/components/skills/generate-on-open';
import { buttonClasses } from '@/components/ui/button';
import { Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ModuleCard } from '@/components/ui/module-card';
import { Ruler } from '@/components/ui/ruler';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime, formatShortDate } from '@/lib/dates';
import { getBaseResume, getOffer, getResumeChoices } from '@/lib/job-search-data';
import { CONTRACT_LABELS, parseStoredAnalysis } from '@/lib/job-search-schemas';
import { requireUser } from '@/lib/session';
import { JobSearchTabs } from './job-search-tabs';
import { AdaptedResumeButton, CoverLetterEditor, WriteLetterButton } from './offer-documents';
import { ApplyForm, DismissOfferButton } from './offer-actions-buttons';

// Offer detail: the offer, the analysis of Alex's CV against it, the adapted CV and the letter.
export async function OfferView({ params }: { params: Promise<{ offerId: string }> }) {
  const [user, { offerId }] = await Promise.all([requireUser(), params]);
  const offer = await getOffer(user.id, offerId);
  if (!offer) notFound();
  const [baseResume, resumes] = await Promise.all([
    getBaseResume(user.id),
    getResumeChoices(user.id),
  ]);
  const analysis = parseStoredAnalysis(offer.analysis);
  const now = new Date();
  const basePath = `/career/job-search/offers/${offer.id}`;

  const sourceLine = [
    offer.source,
    `ajoutée ${formatRelativeTime(offer.foundAt, now)}`,
    offer.description ? 'texte analysé par l’IA' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const details = [
    offer.company,
    offer.location,
    offer.contractType ? CONTRACT_LABELS[offer.contractType] : null,
    offer.remotePolicy,
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        breadcrumb="Recherches pro · Veille · Offre"
        title={`${offer.title} · ${offer.company}`}
      />
      <JobSearchTabs activeHref="/career/job-search/watch" />

      <Link
        href="/career/job-search/watch"
        className={`${buttonClasses({ variant: 'quiet' })} -ml-2 self-start`}
      >
        <ChevronLeftIcon className="size-4" />
        Retour à la veille
      </Link>

      <section
        aria-labelledby="offer-title"
        className="flex flex-wrap items-center gap-4 rounded-card bg-surface-default p-4.5"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-caption-12 text-fg-3">{sourceLine}</p>
          <h2 id="offer-title" className="text-title-20">
            {offer.title}
          </h2>
          <p className="text-body-14 text-fg-2">{details.join(' · ')}</p>
          {offer.tags.length > 0 ? (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {offer.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-tick bg-surface-raised px-2 py-0.5 text-caption-12 text-fg-2"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
          {offer.summary ? (
            <p className="mt-2 max-w-[80ch] text-body-14 text-fg-2">{offer.summary}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {offer.url ? (
            <a
              href={offer.url}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: 'quiet' })}
            >
              <ExternalLinkIcon className="size-4" />
              Voir l’offre
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          ) : null}
          {offer.application ? (
            <Link
              href={`/career/job-search?panel=app-${offer.application.id}`}
              className={buttonClasses({ variant: 'secondary' })}
            >
              <CheckIcon className="size-4" />
              Postulée le {formatShortDate(offer.application.sentAt)}
            </Link>
          ) : (
            <>
              {offer.decision === 'DISMISSED' ? (
                <span className="text-body-14 text-fg-3">Refusée par toi</span>
              ) : (
                <DismissOfferButton offerId={offer.id} />
              )}
              <Link
                href={`${basePath}?panel=apply`}
                scroll={false}
                className={buttonClasses({ variant: 'secondary' })}
              >
                Marquer postulée
              </Link>
            </>
          )}
        </div>
      </section>

      <div className="grid items-stretch gap-3 lg:grid-cols-[26.25rem_minmax(0,1fr)]">
        <ModuleCard
          title="Analyse du CV"
          icon={<ResumeIcon className="size-4" />}
          aside={analysis ? `CV « ${analysis.baseResumeName} »` : undefined}
        >
          {!baseResume ? (
            <EmptyState
              title="Aucun CV de base."
              description="L’analyse compare l’offre à ton CV. Importe-le d’abord depuis ton PDF."
              action={{ label: 'Aller au CV', href: '/career/resume', primary: true }}
            />
          ) : !analysis ? (
            <GenerateOnOpen
              id={`analysis-${offer.id}`}
              action={analyzeOffer.bind(null, offer.id, false)}
              pendingLabel="Analyse du CV face à l’offre…"
              retryLabel="Analyser le CV"
            />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="font-display text-display-30 tabular">{analysis.score} %</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-body-14 text-fg-2">de correspondance avec l’offre</span>
                  <Ruler
                    value={analysis.score}
                    max={100}
                    segments={10}
                    size="small"
                    label="Correspondance avec l’offre"
                    valueText={`${analysis.score} %`}
                    colorClass="bg-career"
                  />
                </div>
              </div>
              {analysis.strengths.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-label-12 text-fg-3 uppercase">Points forts</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {analysis.strengths.map((item) => (
                      <li key={item}>
                        <Tag tone="success">{item}</Tag>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {analysis.gaps.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-label-12 text-fg-3 uppercase">À renforcer</h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {analysis.gaps.map((item) => (
                      <li key={item}>
                        <Tag tone="warning">{item}</Tag>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="flex flex-col gap-2 rounded-control bg-surface-sunken p-3">
                <h3 className="text-label-12 text-fg-3 uppercase">Ce que change le CV adapté</h3>
                <ul className="flex flex-col gap-1.5">
                  {analysis.changes.map((change) => (
                    <li key={change} className="flex gap-2 text-body-14">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <AdaptedResumeButton offerId={offer.id} />
                <ActionButton
                  variant="quiet"
                  action={analyzeOffer.bind(null, offer.id, true)}
                  pendingHint="Nouvelle analyse…"
                >
                  Régénérer
                </ActionButton>
              </div>
              <p className="text-caption-12 text-fg-3">
                {offer.adaptedResume
                  ? `CV adapté prêt : « ${offer.adaptedResume.name} », aussi dans l’onglet CV.`
                  : 'Le CV adapté est créé au premier téléchargement : réécrit et réordonné, jamais inventé.'}
              </p>
            </div>
          )}
        </ModuleCard>

        <ModuleCard
          title="Lettre de motivation"
          icon={<SparkleIcon className="size-4" />}
          accentClass="text-career"
          aside="rédigée dans ton style"
        >
          {offer.coverLetter ? (
            <CoverLetterEditor
              key={offer.coverLetter.updatedAt.toISOString()}
              offerId={offer.id}
              company={offer.company}
              initial={offer.coverLetter.content}
              model={offer.coverLetter.model}
              edited={offer.coverLetter.editedAt !== null}
            />
          ) : !analysis ? (
            <p className="text-body-14 text-fg-2">
              La lettre s’appuie sur le CV adapté : elle sera disponible une fois l’analyse prête.
            </p>
          ) : (
            <EmptyState
              title="Pas encore de lettre."
              description="Elle part de ton CV adapté à cette offre, sans rien inventer : 180 à 250 mots, vouvoiement, signée « Alexis Carpentier »."
            >
              <WriteLetterButton offerId={offer.id} />
            </EmptyState>
          )}
        </ModuleCard>
      </div>

      {!offer.application ? (
        <SidePanel
          name="apply"
          title="Marquer postulée"
          subtitle={`${offer.title} · ${offer.company}`}
        >
          <ApplyForm
            offerId={offer.id}
            resumes={resumes.map((resume) => ({ id: resume.id, name: resume.name }))}
            defaultResumeId={offer.adaptedResume?.id ?? baseResume?.id ?? null}
            closeHref={basePath}
          />
        </SidePanel>
      ) : null}
    </>
  );
}

export function OfferSkeleton() {
  return (
    <LoadingRegion label="Chargement de l’offre…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-10" />
      <Skeleton surface="card" className="h-36" />
      <div className="grid gap-3 lg:grid-cols-[26.25rem_minmax(0,1fr)]">
        <Skeleton surface="card" className="h-140" />
        <Skeleton surface="card" className="h-140" />
      </div>
    </LoadingRegion>
  );
}
