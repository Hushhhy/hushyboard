import { Suspense } from 'react';
import { ProjectsSkeleton, ProjectsView } from '@/components/projects/projects-view';

// The sync with GitHub runs from Server Actions of this page and can take a few seconds.
export const maxDuration = 60;

export default function ProjectsPage({ searchParams }: PageProps<'/career/projects'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<ProjectsSkeleton />}>
        <ProjectsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
