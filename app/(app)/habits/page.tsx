import { Suspense } from 'react';
import { HabitsSkeleton, TodayView } from '@/components/habits/habits-views';

export default function HabitsPage({ searchParams }: PageProps<'/habits'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<HabitsSkeleton />}>
        <TodayView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
