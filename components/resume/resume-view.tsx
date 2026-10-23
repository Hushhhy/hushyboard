import Link from 'next/link';
import { deleteResume, duplicateResume, setDefaultResume } from '@/app/(app)/career/resume/actions';
import { PageHeader } from '@/components/app-shell/page-header';
import { ResumeIcon } from '@/components/icons';
import { Button, buttonClasses } from '@/components/ui/button';
import { Tag } from '@/components/ui/chip';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { formatRelativeDay, formatShortDate } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { parseResumeContent } from '@/lib/resume/schema';
import { requireUser } from '@/lib/session';
import { ImportForm } from './import-form';

const BASE_PATH = '/career/resume';

export async function ResumeView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const resumes = await prisma.resume.findMany({
    where: { userId: user.id },
    include: {
      _count: { select: { applications: true } },
      jobOffer: { select: { id: true, title: true, company: true } },
    },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });
  // CVs adapted to one offer (phase 4) are listed apart, under « Versions adaptées ».
  const baseVersions = resumes.filter((resume) => !resume.jobOffer);
  const adaptedVersions = resumes.filter((resume) => resume.jobOffer);
  const now = new Date();

  if (resumes.length === 0) {
    return (
      <>
        <PageHeader breadcrumb="Carrière · CV" title="Aucun CV pour l’instant." />
        <section className="flex max-w-160 flex-col gap-4 rounded-card bg-surface-default p-6">
          <EmptyState
            title="Importe ton CV actuel."
            description="L’IA en extrait le contenu (expériences, projets, compétences). Tu le relis, puis tu télécharges un PDF propre et tu crées des versions par type de poste."
          />
          <ImportForm primary />
        </section>
      </>
    );
  }

  const selected = resumes.find((resume) => resume.id === params.v) ?? resumes[0];
  const content = parseResumeContent(selected.content);
  const latest = resumes.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
  const title = `${resumes.length} version${resumes.length > 1 ? 's' : ''}, la dernière mise à jour ${formatRelativeDay(latest.updatedAt, now)}.`;
  const selectedHref = `${BASE_PATH}?v=${selected.id}`;

  return (
    <>
      <PageHeader breadcrumb="Carrière · CV" title={title} />
      <div className="grid items-start gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section aria-labelledby="versions-title" className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="versions-title" className="text-title-20">
              Versions
            </h2>
            <Link
              href={`${selectedHref}&panel=resume-new`}
              scroll={false}
              className={buttonClasses()}
            >
              Nouvelle version
            </Link>
          </div>
          {[
            { key: 'base', heading: null, items: baseVersions },
            { key: 'adapted', heading: 'Versions adaptées', items: adaptedVersions },
          ]
            .filter((list) => list.items.length > 0)
            .map((list) => (
              <div key={list.key} className="flex flex-col gap-2">
                {list.heading ? (
                  <h3 className="mt-2 text-label-12 text-fg-3 uppercase">{list.heading}</h3>
                ) : null}
                <ul className="flex flex-col gap-2">
                  {list.items.map((resume) => {
                    const isSelected = resume.id === selected.id;
                    return (
                      <li key={resume.id}>
                        <Link
                          href={`${BASE_PATH}?v=${resume.id}`}
                          aria-current={isSelected ? 'true' : undefined}
                          className={`flex items-center gap-3 rounded-card p-3 transition-colors duration-(--duration-tick) ${
                            isSelected
                              ? 'border border-line-strong bg-surface-raised'
                              : 'border border-transparent bg-surface-default hover:bg-surface-raised'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-sunken text-fg-2"
                          >
                            <ResumeIcon />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{resume.name}</span>
                            <span className="block text-caption-12 text-fg-2">
                              mis à jour le {formatShortDate(resume.updatedAt)}
                            </span>
                            <span className="block text-caption-12 text-fg-3">
                              {resume.jobOffer
                                ? `pour ${resume.jobOffer.title} · ${resume.jobOffer.company}`
                                : `utilisé pour ${resume._count.applications} candidature${resume._count.applications > 1 ? 's' : ''}`}
                            </span>
                          </span>
                          {resume.isDefault ? <Tag tone="career">Par défaut</Tag> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          <p className="text-caption-12 text-fg-3">
            Astuce : une version par type de poste. La candidature garde la trace de la version
            envoyée.
          </p>
        </section>

        <section
          aria-labelledby="selected-title"
          className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
        >
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 id="selected-title" className="text-title-18">
                {selected.name}
              </h2>
              <p className="text-caption-12 text-fg-2">
                {selected.isDefault ? 'Version par défaut · ' : ''}
                {selected.jobOffer ? (
                  <>
                    Adaptée à{' '}
                    <Link
                      href={`/career/job-search/offers/${selected.jobOffer.id}`}
                      className="underline underline-offset-2"
                    >
                      {selected.jobOffer.title} · {selected.jobOffer.company}
                    </Link>{' '}
                    ·{' '}
                  </>
                ) : null}
                mise à jour le {formatShortDate(selected.updatedAt)}
              </p>
            </div>
            <form action={duplicateResume.bind(null, selected.id)}>
              <Button type="submit" variant="quiet">
                Dupliquer
              </Button>
            </form>
            {selected.isDefault || selected.jobOffer ? null : (
              <form action={setDefaultResume.bind(null, selected.id)}>
                <Button type="submit" variant="quiet">
                  Définir par défaut
                </Button>
              </form>
            )}
            <Link href={`${BASE_PATH}/${selected.id}/edit`} className={buttonClasses()}>
              Modifier
            </Link>
            {content ? (
              <a
                href={`/api/resume/${selected.id}/pdf`}
                className={buttonClasses({ variant: 'primary' })}
              >
                Télécharger
              </a>
            ) : null}
          </div>

          {content ? (
            <iframe
              title={`Aperçu PDF de ${selected.name}`}
              src={`/api/resume/${selected.id}/pdf?inline=1#toolbar=0&view=FitH`}
              className="h-[70dvh] min-h-120 w-full rounded-control bg-surface-sunken"
            />
          ) : (
            <EmptyState
              variant="block"
              title="Cette version n’a pas encore de contenu."
              description="Ouvre l’éditeur pour la remplir, puis télécharge le PDF."
              action={{ label: 'Remplir le CV', href: `${BASE_PATH}/${selected.id}/edit` }}
            />
          )}

          <div className="border-t border-line-subtle pt-3">
            <DeleteDialog
              title={`Supprimer « ${selected.name} » ?`}
              description="Les candidatures déjà envoyées gardent leur trace, sans lien vers cette version."
              onConfirm={deleteResume.bind(null, selected.id)}
            />
          </div>
        </section>
      </div>

      <SidePanel name="resume-new" title="Nouvelle version">
        <p className="text-body-14 text-fg-2">
          Pour une variante (data, full stack…), le plus simple est de dupliquer une version
          existante. Sinon, importe un autre PDF.
        </p>
        <ImportForm />
      </SidePanel>
    </>
  );
}

export function ResumeSkeleton() {
  return (
    <LoadingRegion label="Chargement des CV…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-2">
          <Skeleton surface="card" className="h-20" />
          <Skeleton surface="card" className="h-20" />
        </div>
        <Skeleton surface="card" className="h-140" />
      </div>
    </LoadingRegion>
  );
}
