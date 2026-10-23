import { Suspense } from 'react';
import { GoalsView, HabitsSkeleton } from '@/components/habits/habits-views';

export default function HabitsGoalsPage({ searchParams }: PageProps<'/habits/goals'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<HabitsSkeleton />}>
        <GoalsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
