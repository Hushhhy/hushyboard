import { Suspense } from 'react';
import { CodeTab } from '@/components/projects/code-tab';
import { TabSkeleton } from '@/components/projects/project-header';

export default function ProjectCodePage({
  params,
  searchParams,
}: PageProps<'/career/projects/[repo]/code'>) {
  return (
    <Suspense fallback={<TabSkeleton />}>
      <CodeTab slug={params.then((value) => value.repo)} searchParams={searchParams} />
    </Suspense>
  );
}
