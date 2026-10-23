import { Suspense } from 'react';
import { HomeDashboard, HomeDashboardSkeleton } from '@/components/home/home-dashboard';

// The page itself is static; the dashboard streams in once the database answers.
export default function HomePage() {
  return (
    <main id="content" className="flex min-h-dvh flex-col gap-4 px-4 pt-5 md:px-7 pb-6">
      <Suspense fallback={<HomeDashboardSkeleton />}>
        <HomeDashboard />
      </Suspense>
    </main>
  );
}
