import { Suspense } from 'react';
import { GamesSkeleton, GamesView } from '@/components/games/games-view';

export default function GamesPage({ searchParams }: PageProps<'/leisure/games'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<GamesSkeleton />}>
        <GamesView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
