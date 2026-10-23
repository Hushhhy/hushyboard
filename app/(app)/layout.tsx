import { Suspense, type ReactNode } from 'react';
import { Sidebar } from '@/components/app-shell/sidebar';
import { RewardsProvider } from '@/components/rewards/rewards-provider';
import { TrophyAnnouncer } from '@/components/rewards/trophy-announcer';
import { requireUser } from '@/lib/session';
import { getUnseenTrophies, syncTrophies } from '@/lib/trophies-data';

// Unlocks the trophies earned by the last actions (pages re-render after each Server Action)
// and hands the new ones to the reward toast.
async function TrophyWatch() {
  const user = await requireUser();
  await syncTrophies(user.id);
  return <TrophyAnnouncer trophies={await getUnseenTrophies(user.id)} />;
}

// Shared frame for every page of the app (not for /login).
// The "(app)" folder is a route group: the parentheses keep it out of the URL.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <RewardsProvider>
          {children}
          <Suspense fallback={null}>
            <TrophyWatch />
          </Suspense>
        </RewardsProvider>
      </div>
    </div>
  );
}
