import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { generateRoadmap } from '@/app/(app)/career/profile/skill-actions';
import { SparkleIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { requireUser } from '@/lib/session';
import { getSkillPageData } from '@/lib/profile-data';
import { nextNotionId } from '@/lib/skills';
import { ActionButton } from './action-button';
import { LinkedCard } from './linked-card';
import { NotionSheetPanel } from './notion-sheet';
import { RoadmapColumn, RoadmapProvider } from './roadmap';
import { SkillHeader } from './skill-header';
import { SkillSettings } from './skill-settings';
import { TierEditor } from './tier-editor';
import { toTierViews } from './tier-view';

type SkillViewProps = Pick<PageProps<'/career/profile/[skillSlug]'>, 'params' | 'searchParams'>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// « Roadmap » tab: notions on a vertical line (left), the sheet of the selected one (right).
export async function SkillView({ params, searchParams }: SkillViewProps) {
  const [{ skillSlug }, search] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const data = await getSkillPageData(user.id, skillSlug);
  if (!data) notFound();

  const { skill } = data;
  const tiers = toTierViews(skill.tiers);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    const first = one(value);
    if (first !== undefined) query.set(key, first);
  }
  const header = <SkillHeader data={data} tab="roadmap" query={query} />;

  if (one(search.edit) === '1') {
    return (
      <>
        {header}
        <section
          aria-labelledby="edit-title"
          className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
        >
          <div className="flex items-center gap-2">
            <h2 id="edit-title" className="flex-1 text-label-12 text-fg-3 uppercase">
              Modifier la roadmap
            </h2>
            <Link
              href={`/career/profile/${skill.slug}`}
              className={buttonClasses({ variant: 'secondary' })}
            >
              Terminer
            </Link>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            {tiers.map((tier) => (
              <TierEditor key={tier.id} tier={tier} levels={tiers.map((item) => item.level)} />
            ))}
          </div>
          <SkillSettings skillId={skill.id} skillName={skill.name} />
        </section>
      </>
    );
  }

  const allNotions = tiers.flatMap((tier) => tier.notions);
  if (allNotions.length === 0) {
    return (
      <>
        {header}
        <section className="rounded-card bg-surface-default p-5">
          <EmptyState
            variant="block"
            icon={<SparkleIcon className="size-5 text-career" />}
            title={`La roadmap ${skill.name} est vide`}
            description="L’IA propose une première liste de notions, du niveau 1 (bases) au niveau 5 (senior). Tu peux tout modifier ensuite."
          >
            <ActionButton
              variant="primary"
              action={generateRoadmap.bind(null, skill.id)}
              pendingHint="Génération de la roadmap…"
            >
              Générer la roadmap
            </ActionButton>
            <Link
              href={`/career/profile/${skill.slug}?edit=1`}
              className={buttonClasses({ variant: 'quiet' })}
            >
              Remplir à la main
            </Link>
          </EmptyState>
        </section>
      </>
    );
  }

  // The selected notion, or the « prochaine » one by default.
  const requested = one(search.notion);
  const selectedId =
    allNotions.find((notion) => notion.id === requested)?.id ??
    nextNotionId(tiers) ??
    allNotions[0].id;
  const selectedTier = tiers.find((tier) => tier.notions.some((n) => n.id === selectedId))!;
  const selected = selectedTier.notions.find((notion) => notion.id === selectedId)!;

  return (
    <>
      {header}
      <RoadmapProvider tiers={tiers}>
        <div className="grid items-start gap-3 lg:grid-cols-[23.75rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <RoadmapColumn skillSlug={skill.slug} selectedId={selectedId} />
            <LinkedCard data={data} />
          </div>
          <div>
            <Suspense key={selectedId} fallback={<SheetSkeleton />}>
              <NotionSheetPanel
                skill={skill}
                tier={selectedTier}
                notion={selected}
                editing={one(search.sheet) === 'edit'}
              />
            </Suspense>
          </div>
        </div>
      </RoadmapProvider>
    </>
  );
}

function SheetSkeleton() {
  return (
    <LoadingRegion label="Chargement de la fiche…">
      <Skeleton surface="card" className="h-140" />
    </LoadingRegion>
  );
}

export function SkillSkeleton() {
  return (
    <LoadingRegion label="Chargement de la compétence…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-14" />
      <div className="grid gap-3 lg:grid-cols-[23.75rem_minmax(0,1fr)]">
        <Skeleton surface="card" className="h-160" />
        <Skeleton surface="card" className="h-140" />
      </div>
    </LoadingRegion>
  );
}
