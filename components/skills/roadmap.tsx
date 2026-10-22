'use client';

import { createContext, use, useOptimistic, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { setNotionChecked } from '@/app/(app)/career/profile/actions';
import { PencilIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { HabitCheckbox } from '@/components/ui/checkbox';
import { UndoStatus } from '@/components/ui/undo-status';
import { computeSkillLevel, nextNotionId } from '@/lib/skills';
import { toTierInputs, type TierView } from './tier-view';

type Toggle = { notionId: string; checked: boolean };

type RoadmapState = {
  tiers: TierView[];
  toggle: (notionId: string, label: string, checked: boolean) => void;
  undo: () => void;
  lastToggle: (Toggle & { label: string }) | null;
};

const RoadmapContext = createContext<RoadmapState | null>(null);

function useRoadmap(): RoadmapState {
  const state = use(RoadmapContext);
  if (!state) throw new Error('useRoadmap outside RoadmapProvider');
  return state;
}

// Known notions, shared by the roadmap (dots) and the sheet (« Je sais faire »).
// Checking is instant (optimistic), saved on the server, undoable.
export function RoadmapProvider({ tiers, children }: { tiers: TierView[]; children: ReactNode }) {
  const [optimisticTiers, applyToggle] = useOptimistic(tiers, (current, change: Toggle) =>
    current.map((tier) => ({
      ...tier,
      notions: tier.notions.map((notion) =>
        notion.id === change.notionId ? { ...notion, checked: change.checked } : notion
      ),
    }))
  );
  const [, startTransition] = useTransition();
  const [lastToggle, setLastToggle] = useState<RoadmapState['lastToggle']>(null);

  function save(change: Toggle) {
    startTransition(async () => {
      applyToggle(change);
      await setNotionChecked(change.notionId, change.checked);
    });
  }

  return (
    <RoadmapContext
      value={{
        tiers: optimisticTiers,
        lastToggle,
        toggle(notionId, label, checked) {
          setLastToggle({ notionId, label, checked });
          save({ notionId, checked });
        },
        undo() {
          if (!lastToggle) return;
          setLastToggle(null);
          save({ notionId: lastToggle.notionId, checked: !lastToggle.checked });
        },
      }}
    >
      {children}
    </RoadmapContext>
  );
}

// « Je sais faire » on the sheet of the selected notion.
export function KnownCheckbox({ notionId, label }: { notionId: string; label: string }) {
  const { tiers, toggle, undo, lastToggle } = useRoadmap();
  const checked = tiers.some((tier) =>
    tier.notions.some((notion) => notion.id === notionId && notion.checked)
  );
  return (
    <div className="flex flex-col items-end gap-1">
      <HabitCheckbox
        label="Je sais faire"
        checked={checked}
        onChange={(event) => toggle(notionId, label, event.target.checked)}
      />
      <UndoStatus
        message={
          lastToggle
            ? `« ${lastToggle.label} » ${lastToggle.checked ? 'marquée comme sue' : 'à revoir'}.`
            : null
        }
        onUndo={undo}
      />
    </div>
  );
}

// Left column: one vertical line of notions, grouped by level milestones.
export function RoadmapColumn({
  skillSlug,
  selectedId,
}: {
  skillSlug: string;
  selectedId: string | null;
}) {
  const { tiers } = useRoadmap();
  const { level } = computeSkillLevel(toTierInputs(tiers));
  const nextId = nextNotionId(tiers);
  // Milestones up to level + 2 are open; the later ones fold into one line.
  const [opened, setOpened] = useState<Set<number>>(() => new Set());
  const basePath = `/career/profile/${skillSlug}`;

  return (
    <nav
      aria-labelledby="roadmap-title"
      className="flex flex-col rounded-card bg-surface-default px-2.5 py-3"
    >
      <div className="flex items-center gap-2 px-2 pb-1">
        <h2 id="roadmap-title" className="flex-1 text-label-12 text-fg-3 uppercase">
          Roadmap
        </h2>
        <Link
          href={`${basePath}?edit=1`}
          className={buttonClasses({ variant: 'icon' })}
          aria-label="Modifier la roadmap"
        >
          <PencilIcon className="size-4" />
        </Link>
      </div>

      {tiers.map((tier) => {
        const known = tier.notions.filter((notion) => notion.checked).length;
        const complete = tier.notions.length > 0 && known === tier.notions.length;
        const isOpen = tier.level <= level + 2 || opened.has(tier.level);
        const headingId = `milestone-${tier.id}`;

        return (
          <section key={tier.id} aria-labelledby={headingId}>
            <h3
              id={headingId}
              className="flex items-center gap-2.5 px-2 pt-3 pb-1.5 text-label-12 text-fg-3 uppercase"
            >
              <span
                aria-hidden="true"
                className={`grid size-5.5 shrink-0 place-items-center rounded-tick text-caption-12 font-bold normal-case tabular ${
                  complete ? 'bg-career-deep text-career' : 'bg-surface-raised text-fg-2'
                }`}
              >
                {tier.level}
              </span>
              <span className="min-w-0 flex-1">
                Niveau {tier.level} · {tier.title}
                {complete ? <span className="sr-only"> (acquis)</span> : null}
              </span>
              <span className="font-medium normal-case tabular">
                {known} / {tier.notions.length}
              </span>
            </h3>

            {tier.notions.length === 0 ? (
              <p className="px-2 pb-1 pl-10.5 text-caption-12 text-fg-3">Aucune notion.</p>
            ) : isOpen ? (
              <ol>
                {tier.notions.map((notion) => {
                  const isNext = notion.id === nextId;
                  const isSelected = notion.id === selectedId;
                  return (
                    <li
                      key={notion.id}
                      className="relative before:absolute before:-top-1 before:-bottom-1 before:left-4.5 before:w-0.5 before:bg-line-subtle"
                    >
                      <Link
                        href={`${basePath}?notion=${notion.id}`}
                        scroll={false}
                        prefetch={false}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`relative grid grid-cols-[1.375rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-control px-2 py-1.5 text-body-14 ${
                          isNext
                            ? 'bg-surface-raised font-semibold text-fg-1'
                            : 'text-fg-2 hover:bg-surface-raised hover:text-fg-1'
                        } ${isSelected ? 'outline-1 outline-line-strong' : ''}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`size-3 justify-self-center rounded-pill border-2 ${
                            notion.checked
                              ? 'border-career bg-career'
                              : isNext
                                ? 'border-career bg-surface-base ring-3 ring-career/25'
                                : 'border-line-strong bg-surface-base'
                          }`}
                        />
                        <span>
                          {notion.label}
                          <span className="sr-only">
                            {notion.checked ? ', sue' : ', à apprendre'}
                          </span>
                        </span>
                        {isNext ? (
                          <small className="text-caption-12 font-medium text-fg-3">prochaine</small>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <button
                type="button"
                aria-expanded={false}
                onClick={() => setOpened((current) => new Set(current).add(tier.level))}
                className="grid w-full grid-cols-[1.375rem_minmax(0,1fr)] items-center gap-2.5 rounded-control px-2 py-1.5 text-left text-caption-12 text-fg-3 hover:bg-surface-raised hover:text-fg-2"
              >
                <span
                  aria-hidden="true"
                  className="size-3 justify-self-center rounded-pill border-2 border-line-subtle"
                />
                <span>
                  {tier.notions.map((notion) => notion.label).join(' · ')}
                  <span className="sr-only"> : afficher les notions</span>
                </span>
              </button>
            )}
          </section>
        );
      })}
    </nav>
  );
}
