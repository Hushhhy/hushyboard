import { Suspense } from 'react';
import { AnalyticsSkeleton, AnalyticsView } from '@/components/job-search/analytics-view';

export default function JobSearchAnalyticsPage() {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsView />
      </Suspense>
    </main>
  );
}
