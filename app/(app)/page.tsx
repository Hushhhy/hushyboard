import { Suspense } from 'react';
import { HomeDashboard, HomeDashboardSkeleton } from '@/components/home/home-dashboard';

// The page itself is static; the dashboard streams in once the database answers.
export default function HomePage() {
  return (
    <main id="content" className="flex min-h-dvh flex-col gap-4 px-7 pt-5 pb-6">
      <Suspense fallback={<HomeDashboardSkeleton />}>
        <HomeDashboard />
      </Suspense>
    </main>
  );
}
