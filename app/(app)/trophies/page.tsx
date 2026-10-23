import { Suspense } from 'react';
import { TrophiesSkeleton, TrophiesView } from '@/components/trophies/trophies-view';

export default function TrophiesPage({ searchParams }: PageProps<'/trophies'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<TrophiesSkeleton />}>
        <TrophiesView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
