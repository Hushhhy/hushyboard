import { Suspense } from 'react';
import { SkillSkeleton, SkillView } from '@/components/skills/skill-view';

export default function SkillPage({
  params,
  searchParams,
}: PageProps<'/career/profile/[skillSlug]'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<SkillSkeleton />}>
        <SkillView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
