import Link from 'next/link';
import { PageHeader } from '@/components/app-shell/page-header';
import { ChevronLeftIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { LevelMedal } from '@/components/ui/level-medal';
import { Ruler } from '@/components/ui/ruler';
import { SidePanel } from '@/components/ui/side-panel';
import { Tabs } from '@/components/ui/tabs';
import { formatShortDate } from '@/lib/dates';
import type { SkillPageData } from '@/lib/profile-data';
import {
  describeReference,
  describeSkillLevel,
  MAX_SKILL_LEVEL,
  referenceNoun,
} from '@/lib/skills';
import { withSearchParam } from '@/lib/url';
import { HistoryList } from './history-list';
import { ReassessWizard } from './reassess-wizard';
import { toTierViews } from './tier-view';

// Header shared by the « Roadmap » and « Référence » tabs: level, ruler, re-evaluation, tabs.
export function SkillHeader({
  data,
  tab,
  query,
}: {
  data: SkillPageData;
  tab: 'roadmap' | 'reference';
  // Current search params, kept when opening a panel.
  query: URLSearchParams;
}) {
  const { skill, computed, reference } = data;
  const { level, started } = computed;
  const notions = skill.tiers.flatMap((tier) => tier.notions);
  const knownCount = notions.filter((notion) => notion.checkedAt !== null).length;
  const lastAssessment = skill.assessments[0];
  const basePath = `/career/profile/${skill.slug}`;
  const pathname = tab === 'roadmap' ? basePath : `${basePath}/reference`;

  const title =
    tab === 'roadmap'
      ? describeSkillLevel(skill.name, computed)
      : describeReference(skill.name, skill.slug, level, reference.known, reference.total);

  return (
    <>
      <PageHeader breadcrumb={`Carrière · Profil · ${skill.name}`} title={title} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href="/career/profile"
          className={`${buttonClasses({ variant: 'quiet' })} -ml-2 self-center`}
        >
          <ChevronLeftIcon className="size-4" />
          Profil
        </Link>
        <div className="flex items-center gap-3">
          <LevelMedal level={level} size="small" />
          <div>
            <p className="text-body-14 font-semibold">
              Niveau {level} sur {MAX_SKILL_LEVEL}
            </p>
            <p className="text-caption-12 text-fg-3 tabular">
              {knownCount} notion{knownCount > 1 ? 's' : ''} sur {notions.length} ·{' '}
              {lastAssessment
                ? `évalué le ${formatShortDate(lastAssessment.assessedAt)}`
                : 'jamais évalué'}
            </p>
          </div>
        </div>
        <Ruler
          value={level}
          max={MAX_SKILL_LEVEL}
          segments={MAX_SKILL_LEVEL}
          partialIndex={started ? level : undefined}
          label={`Niveau en ${skill.name}`}
          valueText={`Niveau ${level} sur ${MAX_SKILL_LEVEL}${started ? ', niveau suivant commencé' : ''}`}
          colorClass="bg-career"
          size="small"
          className="w-44"
        />
        <div className="flex flex-1 justify-end gap-2">
          <Link
            href={withSearchParam(pathname, query, 'panel', 'history')}
            scroll={false}
            className={buttonClasses({ variant: 'quiet' })}
          >
            Historique
          </Link>
          <Link
            href={withSearchParam(pathname, query, 'panel', 'reassess')}
            scroll={false}
            className={buttonClasses({ variant: 'secondary' })}
          >
            Me réévaluer
          </Link>
        </div>
      </div>

      <Tabs
        label={`Sections de ${skill.name}`}
        items={[
          { href: basePath, label: 'Roadmap' },
          {
            href: `${basePath}/reference`,
            label:
              reference.total > 0
                ? `Référence · ${reference.total} ${referenceNoun(skill.slug)}`
                : 'Référence',
          },
        ]}
      />

      <SidePanel name="reassess" title={`Me réévaluer en ${skill.name}`}>
        <ReassessWizard skillId={skill.id} tiers={toTierViews(skill.tiers)} />
      </SidePanel>
      <SidePanel name="history" title={`Historique · ${skill.name}`}>
        <HistoryList assessments={skill.assessments} />
      </SidePanel>
    </>
  );
}
