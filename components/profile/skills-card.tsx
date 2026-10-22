import Link from 'next/link';
import { CareerIcon, ChevronRightIcon, PlusIcon, SparkleIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Ruler } from '@/components/ui/ruler';
import { SidePanel } from '@/components/ui/side-panel';
import type { SkillSummary } from '@/lib/profile-data';
import {
  formatSkillLevel,
  MAX_SKILL_LEVEL,
  SKILL_CATEGORY_LABELS,
  type SkillCategoryKey,
} from '@/lib/skills';
import { SkillForm } from './skill-form';

// Layout of the mockup: two columns of two groups.
const COLUMNS: SkillCategoryKey[][] = [
  ['WEB_FRONT', 'DATA_ENGINEERING'],
  ['BACKEND_DATA', 'SYSTEM_TOOLS'],
];

export function SkillsCard({ skills }: { skills: SkillSummary[] }) {
  return (
    <section
      aria-labelledby="skills-title"
      className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
    >
      <h2 id="skills-title" className="flex items-center gap-2 text-label-12 text-fg-3 uppercase">
        <CareerIcon className="size-4 text-career" />
        <span className="flex-1">Compétences techniques</span>
        <span className="hidden text-caption-12 tracking-normal normal-case sm:inline">
          niveau sur 5 · 5 = dev senior · clique pour le détail
        </span>
      </h2>

      {skills.length === 0 ? (
        <EmptyState
          title="Aucune compétence suivie."
          description="Ajoute un langage ou un outil, puis découpe-le en 5 paliers de notions."
        />
      ) : (
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          {COLUMNS.map((column) => (
            <div key={column.join()} className="flex flex-col gap-4">
              {column.map((category) => (
                <SkillGroup
                  key={category}
                  title={SKILL_CATEGORY_LABELS[category]}
                  skills={skills.filter((skill) => skill.category === category)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <p className="flex items-start gap-2 rounded-control bg-surface-sunken p-3 text-caption-12 text-fg-2">
        <SparkleIcon className="mt-px size-4 shrink-0 text-career" />
        Le niveau = dernier palier dont toutes les notions sont cochées. Un cran pâle et le « + »
        indiquent un palier commencé.
      </p>

      <Link
        href="/career/profile?panel=skill-new"
        scroll={false}
        className={`${buttonClasses({ variant: 'quiet' })} -ml-2 self-start`}
      >
        <PlusIcon className="size-4" />
        Ajouter une compétence
      </Link>
      <SidePanel name="skill-new" title="Ajouter une compétence">
        <SkillForm />
      </SidePanel>
    </section>
  );
}

function SkillGroup({ title, skills }: { title: string; skills: SkillSummary[] }) {
  if (skills.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-body-14 font-semibold text-fg-2">{title}</h3>
      <ul className="flex flex-col">
        {skills.map((skill) => (
          <li key={skill.id}>
            <SkillRow skill={skill} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkillRow({ skill }: { skill: SkillSummary }) {
  const { level, started } = skill.computed;
  const value = formatSkillLevel(skill.computed);
  return (
    <Link
      href={`/career/profile/${skill.slug}`}
      className={`grid h-9 grid-cols-[minmax(0,1fr)_4rem_2.75rem_1rem] items-center gap-2 rounded-control px-2 text-body-14 transition-colors duration-(--duration-tick) hover:bg-surface-raised ${
        level === 0 && !started ? 'text-fg-3' : 'font-medium text-fg-1'
      }`}
    >
      <span className="truncate">{skill.name}</span>
      <Ruler
        value={level}
        max={MAX_SKILL_LEVEL}
        segments={MAX_SKILL_LEVEL}
        partialIndex={started ? level : undefined}
        label={skill.name}
        colorClass="bg-career"
        size="small"
        decorative
      />
      <span className="text-right text-caption-12 text-fg-2 tabular">
        <span aria-hidden="true">{value}</span>
        <span className="sr-only">
          , niveau {level} sur {MAX_SKILL_LEVEL}
          {started ? ', palier suivant commencé' : ''}
        </span>
      </span>
      <ChevronRightIcon className="size-4 text-fg-3" />
    </Link>
  );
}
