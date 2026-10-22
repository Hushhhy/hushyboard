import Link from 'next/link';
import type { CertificationStatus } from '@/generated/prisma/client';
import { deleteCertification } from '@/app/(app)/career/certifications/actions';
import { PageHeader } from '@/components/app-shell/page-header';
import { CertificationIcon, LockIcon, PlusIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { Tag, type ChipTone } from '@/components/ui/chip';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { Ruler } from '@/components/ui/ruler';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { formatShortDate } from '@/lib/dates';
import { formatEuros } from '@/lib/finance';
import {
  CERTIFICATION_STATUS_LABELS,
  getCertifications,
  getLearningOptions,
  type CertificationItem,
} from '@/lib/learning-data';
import { requireUser } from '@/lib/session';
import { CertificationForm } from './certification-form';

const BASE_PATH = '/career/certifications';

const STATUS_TONES: Record<CertificationStatus, ChipTone> = {
  OBTAINED: 'success',
  IN_PROGRESS: 'info',
  PLANNED: 'neutral',
};

const FILTERS: { status: CertificationStatus | null; label: string }[] = [
  { status: null, label: 'Toutes' },
  { status: 'IN_PROGRESS', label: 'En cours' },
  { status: 'OBTAINED', label: 'Obtenues' },
  { status: 'PLANNED', label: 'Prévues' },
];

// "2 obtenues, 2 en cours, 1 prévue."
function summary(items: CertificationItem[]): string {
  const count = (status: CertificationStatus) =>
    items.filter((item) => item.status === status).length;
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
  const parts = [
    count('OBTAINED') ? plural(count('OBTAINED'), 'obtenue') : null,
    count('IN_PROGRESS') ? `${count('IN_PROGRESS')} en cours` : null,
    count('PLANNED') ? plural(count('PLANNED'), 'prévue') : null,
  ].filter(Boolean);
  return parts.length > 0 ? `${parts.join(', ')}.` : 'Aucune certification suivie.';
}

function parseFilter(value: string | string[] | undefined): CertificationStatus | null {
  return value === 'IN_PROGRESS' || value === 'OBTAINED' || value === 'PLANNED' ? value : null;
}

export async function CertificationsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const filter = parseFilter(params.status);
  const [all, options] = await Promise.all([
    getCertifications(user.id),
    getLearningOptions(user.id),
  ]);
  const visible = filter ? all.filter((item) => item.status === filter) : all;
  const listPath = filter ? `${BASE_PATH}?status=${filter}` : BASE_PATH;
  const panelHref = (panel: string) => `${listPath}${filter ? '&' : '?'}panel=${panel}`;

  return (
    <>
      <PageHeader breadcrumb="Carrière · Certifications" title={summary(all)} />

      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Filtrer par statut" className="flex flex-1 flex-wrap gap-1.5">
          {FILTERS.map((item) => {
            const count = item.status
              ? all.filter((certification) => certification.status === item.status).length
              : all.length;
            const isActive = item.status === filter;
            return (
              <Link
                key={item.label}
                href={item.status ? `${BASE_PATH}?status=${item.status}` : BASE_PATH}
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
          href={panelHref('certification-new')}
          scroll={false}
          className={buttonClasses({ variant: 'primary' })}
        >
          <PlusIcon className="size-4" />
          Ajouter une certification
        </Link>
      </div>

      <ul className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((certification) => (
          <li key={certification.id}>
            <CertificationCard
              certification={certification}
              href={panelHref(`certification-${certification.id}`)}
            />
          </li>
        ))}
        <li>
          <Link
            href={panelHref('certification-new')}
            scroll={false}
            className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-line-strong p-6 text-center hover:bg-surface-default"
          >
            <span className="font-semibold">Une certification en vue ?</span>
            <span className="text-caption-12 text-fg-2">
              Ajoute-la en « prévue » : tu verras son coût et sa date.
            </span>
            <span className="mt-2 text-body-14 font-semibold text-fg-2">Ajouter</span>
          </Link>
        </li>
      </ul>

      <SidePanel name="certification-new" title="Ajouter une certification">
        <CertificationForm certification={null} skills={options.skills} closeHref={listPath} />
      </SidePanel>
      {visible.map((certification) => (
        <SidePanel
          key={certification.id}
          name={`certification-${certification.id}`}
          title="Modifier la certification"
        >
          <CertificationForm
            certification={certification}
            skills={options.skills}
            closeHref={listPath}
          />
          <div className="mt-auto border-t border-line-subtle pt-3">
            <DeleteDialog
              title={`Supprimer « ${certification.name} » ?`}
              description="Ses cours restent dans la page Cours. L’XP déjà gagnée reste acquise."
              onConfirm={deleteCertification.bind(null, certification.id)}
            />
          </div>
        </SidePanel>
      ))}
    </>
  );
}

function CertificationCard({
  certification,
  href,
}: {
  certification: CertificationItem;
  href: string;
}) {
  const { status } = certification;
  const details = [
    status === 'OBTAINED' && certification.obtainedAt
      ? `Obtenue le ${formatShortDate(certification.obtainedAt)}`
      : null,
    status !== 'OBTAINED' && certification.plannedFor
      ? `Visée pour le ${formatShortDate(certification.plannedFor)}`
      : null,
    certification.costCents !== null ? formatEuros(certification.costCents) : null,
  ].filter(Boolean);

  return (
    <Link
      href={href}
      scroll={false}
      className="flex flex-col gap-3 rounded-card bg-surface-default p-4 transition-colors duration-(--duration-tick) hover:bg-surface-raised"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          aria-hidden="true"
          className={`grid size-9 place-items-center rounded-control ${
            status === 'OBTAINED' ? 'bg-career-deep text-career' : 'bg-surface-sunken text-fg-2'
          }`}
        >
          {status === 'PLANNED' ? (
            <LockIcon className="size-4" />
          ) : (
            <CertificationIcon className="size-4.5" />
          )}
        </span>
        <Tag tone={STATUS_TONES[status]}>{CERTIFICATION_STATUS_LABELS[status]}</Tag>
      </div>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-body-16 font-semibold">{certification.name}</h2>
        <p className="text-caption-12 text-fg-2">{certification.issuer}</p>
        {details.length > 0 ? (
          <p className="text-caption-12 text-fg-3">{details.join(' · ')}</p>
        ) : null}
      </div>
      {certification.totalCourses ? (
        <div className="flex flex-col gap-1">
          <Ruler
            value={certification.completedCourses}
            max={certification.totalCourses}
            segments={Math.min(certification.totalCourses, 13)}
            label={`Cours terminés de ${certification.name}`}
            valueText={`${certification.completedCourses} cours terminés sur ${certification.totalCourses}`}
            colorClass="bg-career"
            size="small"
          />
          <p className="text-caption-12 text-fg-3 tabular">
            {certification.completedCourses} / {certification.totalCourses} cours
          </p>
        </div>
      ) : null}
      {certification.skills.length > 0 ? (
        <p className="text-caption-12 text-fg-3">
          {certification.skills.map((skill) => skill.name).join(', ')}
        </p>
      ) : null}
    </Link>
  );
}

export function CertificationsSkeleton() {
  return (
    <LoadingRegion label="Chargement des certifications…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-9 w-96" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton surface="card" className="h-44" />
        <Skeleton surface="card" className="h-44" />
        <Skeleton surface="card" className="h-44" />
      </div>
    </LoadingRegion>
  );
}
