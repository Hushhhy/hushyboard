import { Suspense } from 'react';
import { CommitsTab } from '@/components/projects/commits-tab';
import { TabSkeleton } from '@/components/projects/project-header';

export default function ProjectCommitsPage({
  params,
}: PageProps<'/career/projects/[repo]/commits'>) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <CommitsTab slug={params.then((value) => value.repo)} />
    </Suspense>
  );
}
