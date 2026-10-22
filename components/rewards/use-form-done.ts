'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { FormState } from '@/lib/forms';
import type { LevelUp } from '@/lib/xp';
import { useRewards, type Reward } from './rewards-provider';

// "Niveau 5 atteint · Argonaute · Prochain titre : Héros, encore 650 XP."
export function levelUpReward(levelUp: LevelUp): Reward {
  return {
    kind: 'level',
    level: levelUp.level,
    title: levelUp.title,
    text: levelUp.nextTitle
      ? `Prochain titre : ${levelUp.nextTitle}, encore ${levelUp.xpToNext} XP.`
      : 'Tu as atteint le dernier titre de la route.',
  };
}

// After a successful form save: announce a level-up, then go to `closeHref` (closes the panel).
export function useFormDone(state: FormState, closeHref: string) {
  const router = useRouter();
  const { announce } = useRewards();
  const handled = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!state.done || handled.current === state.done) return;
    handled.current = state.done;
    if (state.levelUp) announce(levelUpReward(state.levelUp));
    router.replace(closeHref, { scroll: false });
  }, [state, closeHref, router, announce]);
}
