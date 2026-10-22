import { Suspense } from 'react';
import { SpontaneousSkeleton, SpontaneousView } from '@/components/job-search/spontaneous-view';

export default function SpontaneousPage({
  searchParams,
}: PageProps<'/career/job-search/spontaneous'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<SpontaneousSkeleton />}>
        <SpontaneousView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
