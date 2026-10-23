import { Suspense } from 'react';
import { ProgressSkeleton, ProgressView } from '@/components/progress/progress-view';

export default function ProgressPage() {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<ProgressSkeleton />}>
        <ProgressView />
      </Suspense>
    </main>
  );
}
