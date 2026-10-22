import { Suspense } from 'react';
import { DetailsTab } from '@/components/projects/details-tab';
import { TabSkeleton } from '@/components/projects/project-header';

export default function ProjectDetailsPage({
  params,
}: PageProps<'/career/projects/[repo]/details'>) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <DetailsTab slug={params.then((value) => value.repo)} />
    </Suspense>
  );
}
