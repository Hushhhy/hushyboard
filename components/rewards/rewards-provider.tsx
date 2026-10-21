'use client';

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { buttonClasses, Button } from '@/components/ui/button';
import { LevelMedal } from '@/components/ui/level-medal';
import { DOMAIN_CLASSES, type Domain } from '@/components/ui/domain';
import { TrophyIcon } from '@/components/icons';

// Rewards only: errors never go in a toast.
export type Reward =
  | { kind: 'level'; level: number; title: string; text: string }
  | { kind: 'trophy'; name: string; domain: Domain; text: string };

type RewardsContextValue = {
  // Shows one or several rewards earned together (grouped in one toast).
  announce: (rewards: Reward | Reward[]) => void;
};

const RewardsContext = createContext<RewardsContextValue | null>(null);

export function useRewards(): RewardsContextValue {
  const value = use(RewardsContext);
  if (!value) throw new Error('useRewards must be used inside <RewardsProvider>');
  return value;
}

export function RewardsProvider({ children }: { children: ReactNode }) {
  const [rewards, setRewards] = useState<Reward[]>([]);

  const announce = useCallback((next: Reward | Reward[]) => {
    setRewards((current) => [...current, ...(Array.isArray(next) ? next : [next])]);
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);

  function close() {
    setRewards([]);
    // Give focus back to a stable element: the page title.
    const heading = document.querySelector<HTMLElement>('#content h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }

  return (
    <RewardsContext value={value}>
      {/* Rendered empty from the start, otherwise the first announcement is lost. Never takes focus. */}
      <div
        role="status"
        aria-live="polite"
        className="fixed top-20 right-6 z-40 w-85 max-w-[calc(100vw-2rem)]"
      >
        {rewards.length > 0 ? <RewardToast rewards={rewards} onClose={close} /> : null}
      </div>
      {children}
    </RewardsContext>
  );
}

function RewardToast({ rewards, onClose }: { rewards: Reward[]; onClose: () => void }) {
  const first = rewards[0];
  const isGroup = rewards.length > 1;
  const showsLevel = rewards.some((reward) => reward.kind === 'level');

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') onClose();
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      className="grid animate-toast-in grid-cols-[52px_1fr] gap-3 rounded-panel bg-surface-overlay p-4 shadow-overlay"
    >
      <RewardEmblem reward={first} />
      <div className="flex min-w-0 flex-col gap-1">
        {isGroup ? (
          <>
            <p className="text-label-12 text-career uppercase">{rewards.length} récompenses</p>
            <ul className="flex flex-col gap-0.5">
              {rewards.map((reward, index) => (
                <li key={index} className="text-body-14">
                  <span className="font-semibold">{rewardTitle(reward)}</span>
                  <span className="text-fg-2"> · {rewardLabel(reward)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="text-label-12 text-career uppercase">{rewardLabel(first)}</p>
            <p className="font-display text-display-20">{rewardTitle(first)}</p>
            <p className="text-body-14 text-fg-2">{first.text}</p>
          </>
        )}
        <div className="mt-2 flex gap-1.5">
          <Link
            href={showsLevel ? '/career/progress' : '/trophies'}
            className={buttonClasses({ variant: 'secondary', onOverlay: true, small: true })}
          >
            {showsLevel ? 'Voir la progression' : 'Voir la vitrine'}
          </Link>
          <Button variant="quiet" small onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}

function rewardLabel(reward: Reward): string {
  return reward.kind === 'level' ? `Niveau ${reward.level} atteint` : 'Nouveau trophée';
}

function rewardTitle(reward: Reward): string {
  return reward.kind === 'level' ? reward.title : reward.name;
}

function RewardEmblem({ reward }: { reward: Reward }) {
  if (reward.kind === 'level') return <LevelMedal level={reward.level} size="small" />;
  const colors = DOMAIN_CLASSES[reward.domain];
  return (
    <span aria-hidden="true" className="relative grid h-14 w-13 place-items-center">
      <svg viewBox="0 0 44 48" className="absolute inset-0 size-full">
        <path
          d="M22 2 41 13v22L22 46 3 35V13z"
          className={`${colors.deepFill} ${colors.stroke}`}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <TrophyIcon className={`relative size-5 ${colors.text}`} />
    </span>
  );
}
