import { Suspense, type ReactNode } from 'react';
import { Sidebar } from '@/components/app-shell/sidebar';
import { CommandPalette } from '@/components/palette/command-palette';
import { RewardsProvider } from '@/components/rewards/rewards-provider';
import { TrophyAnnouncer } from '@/components/rewards/trophy-announcer';
import { todayInParis } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { syncTrophies } from '@/lib/trophies-data';

// Unlocks the trophies earned by the last actions (pages re-render after each Server Action)
// and hands the new ones to the reward toast.
async function TrophyWatch() {
  const user = await requireUser();
  return <TrophyAnnouncer trophies={await syncTrophies(user.id)} />;
}

// The palette lists today's habits (« Cocher Sport » / « Décocher Sport »).
async function PaletteWatch() {
  const user = await requireUser();
  const habits = await prisma.habit.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      checkIns: { where: { date: todayInParis(new Date()) }, select: { date: true } },
    },
  });
  return (
    <CommandPalette
      habits={habits.map((habit) => ({
        id: habit.id,
        name: habit.name,
        done: habit.checkIns.length > 0,
      }))}
    />
  );
}

// Shared frame for every page of the app (not for /login).
// The "(app)" folder is a route group: the parentheses keep it out of the URL.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <RewardsProvider>
          {children}
          <Suspense fallback={null}>
            <TrophyWatch />
          </Suspense>
          <Suspense fallback={null}>
            <PaletteWatch />
          </Suspense>
        </RewardsProvider>
      </div>
    </div>
  );
}
