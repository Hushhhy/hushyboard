import { Suspense } from 'react';
import { ReferenceSkeleton, ReferenceView } from '@/components/skills/reference-view';

// Reference lists and entry details call Gemini; the MDN import writes hundreds of rows.
export const maxDuration = 60;

export default function SkillReferencePage({
  params,
  searchParams,
}: PageProps<'/career/profile/[skillSlug]/reference'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<ReferenceSkeleton />}>
        <ReferenceView params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
