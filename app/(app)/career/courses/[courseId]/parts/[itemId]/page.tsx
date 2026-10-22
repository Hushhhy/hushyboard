import { Suspense } from 'react';
import { ItemPage, ItemPageSkeleton } from '@/components/courses/item-page';

export default function CourseItemPage({
  params,
}: PageProps<'/career/courses/[courseId]/parts/[itemId]'>) {
  return (
    <main
      id="content"
      className="mx-auto flex w-full max-w-200 flex-col gap-4 px-4 pt-5 pb-6 md:px-7"
    >
      <Suspense fallback={<ItemPageSkeleton />}>
        <ItemPage params={params} />
      </Suspense>
    </main>
  );
}
