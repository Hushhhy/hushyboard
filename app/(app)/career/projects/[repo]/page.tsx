import { Suspense } from 'react';
import { TabSkeleton } from '@/components/projects/project-header';
import { ReadmeTab } from '@/components/projects/readme-tab';

export default function ProjectReadmePage({ params }: PageProps<'/career/projects/[repo]'>) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <ReadmeTab slug={params.then((value) => value.repo)} />
    </Suspense>
  );
}
