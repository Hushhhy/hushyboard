import { Suspense } from 'react';
import { ApplicationsView, JobSearchSkeleton } from '@/components/job-search/applications-view';

export default function JobSearchPage({ searchParams }: PageProps<'/career/job-search'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<JobSearchSkeleton />}>
        <ApplicationsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
