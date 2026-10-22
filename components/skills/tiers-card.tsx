'use client';

import { useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import { setNotionChecked } from '@/app/(app)/career/profile/actions';
import { CareerIcon, PencilIcon } from '@/components/icons';
import { buttonClasses, Button } from '@/components/ui/button';
import { HabitCheckbox } from '@/components/ui/checkbox';
import { Tag, type ChipTone } from '@/components/ui/chip';
import { UndoStatus } from '@/components/ui/undo-status';
import { computeSkillLevel, tierStatus, type TierStatus } from '@/lib/skills';

export type TierView = {
  id: string;
  level: number;
  title: string;
  notions: { id: string; label: string; checked: boolean }[];
};

const STATUS_TAGS: Record<TierStatus, { label: string; tone: ChipTone }> = {
  ACQUIRED: { label: 'Acquis', tone: 'success' },
  IN_PROGRESS: { label: 'En cours', tone: 'career' },
  TO_DISCOVER: { label: 'À découvrir', tone: 'neutral' },
};

type Toggle = { notionId: string; checked: boolean };

// "Paliers et notions": checking a notion is instant (optimistic), saved on the server, undoable.
export function TiersCard({ skillSlug, tiers }: { skillSlug: string; tiers: TierView[] }) {
  const [optimisticTiers, applyToggle] = useOptimistic(tiers, (current, toggle: Toggle) =>
    current.map((tier) => ({
      ...tier,
      notions: tier.notions.map((notion) =>
        notion.id === toggle.notionId ? { ...notion, checked: toggle.checked } : notion
      ),
    }))
  );
  const [, startTransition] = useTransition();
  const [lastToggle, setLastToggle] = useState<(Toggle & { label: string }) | null>(null);

  // Tiers 1..level+2 are open by default; the others show a one-line summary.
  const { level } = computeSkillLevel(
    tiers.map((tier) => ({
      level: tier.level,
      title: tier.title,
      notions: tier.notions.map((notion) => ({ label: notion.label, checked: notion.checked })),
    }))
  );
  const [opened, setOpened] = useState<Set<number>>(() => new Set());
  const isOpen = (tierLevel: number) => tierLevel <= level + 2 || opened.has(tierLevel);

  function toggle(notionId: string, label: string, checked: boolean) {
    setLastToggle({ notionId, label, checked });
    startTransition(async () => {
      applyToggle({ notionId, checked });
      await setNotionChecked(notionId, checked);
    });
  }

  function undo() {
    if (!lastToggle) return;
    const { notionId, checked } = lastToggle;
    setLastToggle(null);
    startTransition(async () => {
      applyToggle({ notionId, checked: !checked });
      await setNotionChecked(notionId, !checked);
    });
  }

  return (
    <section
      aria-labelledby="tiers-title"
      className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
    >
      <div className="flex items-center gap-2">
        <h2
          id="tiers-title"
          className="flex flex-1 items-center gap-2 text-label-12 text-fg-3 uppercase"
        >
          <CareerIcon className="size-4 text-career" />
          Paliers et notions
        </h2>
        <span className="hidden text-caption-12 text-fg-3 sm:inline">
          coche ce que tu sais faire sans aide
        </span>
        <Link
          href={`/career/profile/${skillSlug}?edit=1`}
          className={buttonClasses({ variant: 'icon' })}
          aria-label="Modifier les paliers"
        >
          <PencilIcon className="size-4" />
        </Link>
      </div>

      <UndoStatus
        message={
          lastToggle
            ? `« ${lastToggle.label} » ${lastToggle.checked ? 'cochée' : 'décochée'}.`
            : null
        }
        onUndo={undo}
      />

      {optimisticTiers.map((tier) => {
        const status = tierStatus({
          level: tier.level,
          title: tier.title,
          notions: tier.notions.map((n) => ({ label: n.label, checked: n.checked })),
        });
        const tag = STATUS_TAGS[status];
        const checkedCount = tier.notions.filter((notion) => notion.checked).length;
        const open = isOpen(tier.level);
        const headingId = `tier-${tier.id}`;

        return (
          <section
            key={tier.id}
            aria-labelledby={headingId}
            className={`flex flex-col gap-2 rounded-control p-3 ${
              status === 'IN_PROGRESS' ? 'bg-surface-raised' : 'bg-surface-base'
            }`}
          >
            <div className="flex items-center gap-2">
              <h3 id={headingId} className="flex-1 text-body-14 font-semibold">
                Palier {tier.level} · {tier.title}
              </h3>
              {tier.notions.length > 0 ? (
                <span className="text-caption-12 text-fg-3 tabular">
                  {checkedCount} / {tier.notions.length}
                </span>
              ) : null}
              <Tag tone={tag.tone}>{tag.label}</Tag>
            </div>

            {tier.notions.length === 0 ? (
              <p className="text-caption-12 text-fg-3">
                Aucune notion.{' '}
                <Link href={`/career/profile/${skillSlug}?edit=1`} className="underline">
                  Ajoute-les en mode édition
                </Link>
                .
              </p>
            ) : open ? (
              <>
                <ul className="flex flex-col">
                  {tier.notions.map((notion) => (
                    <li key={notion.id}>
                      <HabitCheckbox
                        label={notion.label}
                        checked={notion.checked}
                        onChange={(event) => toggle(notion.id, notion.label, event.target.checked)}
                        className="-mx-2"
                      />
                    </li>
                  ))}
                </ul>
                {tier.level > level + 2 ? (
                  <Button
                    variant="quiet"
                    className="-ml-2 self-start"
                    aria-expanded
                    onClick={() =>
                      setOpened((current) => {
                        const next = new Set(current);
                        next.delete(tier.level);
                        return next;
                      })
                    }
                  >
                    Masquer les notions
                  </Button>
                ) : null}
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-x-3">
                <p className="min-w-0 flex-1 text-caption-12 text-fg-2">
                  {tier.notions.map((notion) => notion.label).join(', ')}
                </p>
                <Button
                  variant="quiet"
                  aria-expanded={false}
                  onClick={() => setOpened((current) => new Set(current).add(tier.level))}
                >
                  Afficher les notions
                </Button>
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}
