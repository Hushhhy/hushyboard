import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { getSkillPageData } from '@/lib/profile-data';
import { describeSkillLevel } from '@/lib/skills';
import { PageHeader } from '@/components/app-shell/page-header';
import { ChevronLeftIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { HistoryList } from './history-list';
import { LevelCard } from './level-card';
import { LinkedCard } from './linked-card';
import { ReassessWizard } from './reassess-wizard';
import { SkillSettings } from './skill-settings';
import { TierEditor } from './tier-editor';
import { TiersCard, type TierView } from './tiers-card';

type SkillViewProps = Pick<PageProps<'/career/profile/[skillSlug]'>, 'params' | 'searchParams'>;

export async function SkillView({ params, searchParams }: SkillViewProps) {
  const [{ skillSlug }, { edit }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const data = await getSkillPageData(user.id, skillSlug);
  if (!data) notFound();

  const { skill, computed } = data;
  const isEditing = edit === '1';
  const tiers: TierView[] = skill.tiers.map((tier) => ({
    id: tier.id,
    level: tier.level,
    title: tier.title,
    notions: tier.notions.map((notion) => ({
      id: notion.id,
      label: notion.label,
      checked: notion.checkedAt !== null,
    })),
  }));

  return (
    <>
      <PageHeader
        breadcrumb={`Carrière · Profil · ${skill.name}`}
        title={describeSkillLevel(skill.name, computed)}
      />
      <div className="grid items-start gap-3 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Sticky on large screens: the level stays visible while checking notions. */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-5">
          <Link
            href="/career/profile"
            className={`${buttonClasses({ variant: 'quiet' })} -ml-2 self-start`}
          >
            <ChevronLeftIcon className="size-4" />
            Retour au profil
          </Link>
          <LevelCard data={data} />
          <LinkedCard data={data} />
        </div>

        {isEditing ? (
          <section
            aria-labelledby="edit-title"
            className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
          >
            <div className="flex items-center gap-2">
              <h2 id="edit-title" className="flex-1 text-label-12 text-fg-3 uppercase">
                Modifier les paliers
              </h2>
              <Link
                href={`/career/profile/${skill.slug}`}
                className={buttonClasses({ variant: 'secondary' })}
              >
                Terminer
              </Link>
            </div>
            {tiers.map((tier) => (
              <TierEditor key={tier.id} tier={tier} />
            ))}
            <SkillSettings skillId={skill.id} skillName={skill.name} projects={skill.projects} />
          </section>
        ) : (
          <TiersCard skillSlug={skill.slug} tiers={tiers} />
        )}
      </div>

      <SidePanel name="reassess" title={`Me réévaluer en ${skill.name}`}>
        <ReassessWizard skillId={skill.id} tiers={tiers} />
      </SidePanel>
      <SidePanel name="history" title={`Historique · ${skill.name}`}>
        <HistoryList assessments={skill.assessments} />
      </SidePanel>
    </>
  );
}

export function SkillSkeleton() {
  return (
    <LoadingRegion label="Chargement de la compétence…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <div className="grid gap-3 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <Skeleton surface="card" className="h-80" />
          <Skeleton surface="card" className="h-56" />
        </div>
        <Skeleton surface="card" className="h-160" />
      </div>
    </LoadingRegion>
  );
}
