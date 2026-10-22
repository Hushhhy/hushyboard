import Link from 'next/link';
import { buttonClasses } from '@/components/ui/button';
import { Ruler } from '@/components/ui/ruler';
import { formatShortDate } from '@/lib/dates';
import type { SkillPageData } from '@/lib/profile-data';
import { lowerFirst, MAX_SKILL_LEVEL } from '@/lib/skills';

export function LevelCard({ data }: { data: SkillPageData }) {
  const { skill, computed } = data;
  const { level, started, currentTier, remaining } = computed;
  const levelTier = skill.tiers.find((tier) => tier.level === level);
  const lastAssessment = skill.assessments[0];
  const basePath = `/career/profile/${skill.slug}`;

  return (
    <section
      aria-labelledby="level-title"
      className="flex flex-col gap-4 rounded-card bg-surface-raised p-4 shadow-raised"
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-16 shrink-0 place-items-center rounded-control border-2 border-career bg-career-deep font-display text-display-40 text-career tabular"
        >
          {level}
        </span>
        <div className="min-w-0">
          <p className="text-label-12 text-fg-3 uppercase">
            Niveau {level} sur {MAX_SKILL_LEVEL}
          </p>
          <h2 id="level-title" className="text-title-20">
            {levelTier?.title ?? 'Pas encore commencé'}
          </h2>
          {currentTier ? (
            <p className="text-body-14 text-fg-2 tabular">
              Palier {currentTier.level} : {currentTier.notions.length - remaining.length} notion
              {currentTier.notions.length - remaining.length > 1 ? 's' : ''} sur{' '}
              {currentTier.notions.length}
            </p>
          ) : null}
        </div>
      </div>

      <Ruler
        value={level}
        max={MAX_SKILL_LEVEL}
        segments={MAX_SKILL_LEVEL}
        partialIndex={started ? level : undefined}
        label={`Niveau en ${skill.name}`}
        valueText={`Niveau ${level} sur ${MAX_SKILL_LEVEL}${started ? ', palier suivant commencé' : ''}`}
        colorClass="bg-career"
      />

      <div className="flex flex-col gap-1 rounded-control bg-surface-sunken p-3">
        <p className="text-label-12 text-fg-3 uppercase">Prochain objectif</p>
        <p className="text-body-14 font-semibold">
          {!currentTier
            ? 'Tous les paliers sont acquis.'
            : currentTier.notions.length === 0
              ? `Ajoute des notions au palier ${currentTier.level} pour commencer.`
              : `${remaining.map(lowerFirst).join(', ')} → passe au niveau ${currentTier.level}`}
        </p>
      </div>

      <p className="text-caption-12 text-fg-3">
        {lastAssessment
          ? `Dernière évaluation : ${formatShortDate(lastAssessment.assessedAt)}`
          : 'Jamais évaluée'}
      </p>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`${basePath}?panel=reassess`}
          scroll={false}
          className={buttonClasses({ variant: 'primary' })}
        >
          Me réévaluer
        </Link>
        <Link
          href={`${basePath}?panel=history`}
          scroll={false}
          className={buttonClasses({ variant: 'quiet' })}
        >
          Historique
        </Link>
      </div>
    </section>
  );
}
