'use client';

import type { ComponentProps } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Trophy } from '@/components/ui/trophy';

// A trophy that opens its detail panel (?panel=trophy-<key>).
export function TrophyButton({
  trophyKey,
  ...props
}: { trophyKey: string } & Omit<ComponentProps<typeof Trophy>, 'onClick'>) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Trophy
      {...props}
      onClick={() => router.push(`${pathname}?panel=trophy-${trophyKey}`, { scroll: false })}
    />
  );
}
