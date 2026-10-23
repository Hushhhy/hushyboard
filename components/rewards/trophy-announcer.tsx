'use client';

import { useEffect, useRef } from 'react';
import { markTrophiesSeen } from '@/app/(app)/trophies/actions';
import type { Domain } from '@/components/ui/domain';
import { useRewards } from './rewards-provider';

export type UnseenTrophy = { id: string; name: string; domain: Domain; text: string };

// Announces the trophies unlocked since the last page render (once each).
export function TrophyAnnouncer({ trophies }: { trophies: UnseenTrophy[] }) {
  const { announce } = useRewards();
  const announced = useRef(new Set<string>());

  useEffect(() => {
    const fresh = trophies.filter((trophy) => !announced.current.has(trophy.id));
    if (fresh.length === 0) return;
    for (const trophy of fresh) announced.current.add(trophy.id);
    announce(
      fresh.map(({ name, domain, text }) => ({ kind: 'trophy' as const, name, domain, text }))
    );
    void markTrophiesSeen(fresh.map((trophy) => trophy.id));
  }, [trophies, announce]);

  return null;
}
