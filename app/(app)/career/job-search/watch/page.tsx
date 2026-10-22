import { Suspense } from 'react';
import { WatchSkeleton, WatchView } from '@/components/job-search/watch-view';

// « Analyser l'offre » calls Gemini from this page.
export const maxDuration = 60;

export default function WatchPage() {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<WatchSkeleton />}>
        <WatchView />
      </Suspense>
    </main>
  );
}
