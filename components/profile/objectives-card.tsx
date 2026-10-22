import Link from 'next/link';
import { ChevronRightIcon } from '@/components/icons';
import type { Objective } from '@/lib/skills';

export function ObjectivesCard({ objectives }: { objectives: Objective[] }) {
  return (
    <section
      aria-labelledby="objectives-title"
      className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
    >
      <h2
        id="objectives-title"
        className="flex items-center gap-2 text-label-12 text-fg-3 uppercase"
      >
        <ChevronRightIcon className="size-4 text-career" />
        <span className="flex-1">Prochains objectifs</span>
        <span className="text-caption-12 tracking-normal normal-case">
          calculés depuis tes roadmaps
        </span>
      </h2>

      {objectives.length === 0 ? (
        <p className="text-body-14 text-fg-2">
          Aucun objectif pour l&apos;instant : ajoute des notions à tes compétences.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {objectives.map((objective) => (
            <li key={objective.slug}>
              <Link
                href={`/career/profile/${objective.slug}`}
                className="grid min-h-9 grid-cols-[7rem_1fr_auto] items-center gap-3 rounded-control bg-surface-sunken px-3 py-2 text-body-14 hover:bg-surface-raised"
              >
                <span className="font-semibold">{objective.name}</span>
                <span className="text-fg-1">{objective.notions}</span>
                <span className="text-caption-12 text-fg-3">{objective.hint}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
