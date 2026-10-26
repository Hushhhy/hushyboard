import { Suspense } from 'react';
import { ModulePage, ModulePageSkeleton } from '@/components/courses/module-page';

export default function CourseModulePage({
  params,
}: PageProps<'/career/courses/[courseId]/modules/[moduleId]'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<ModulePageSkeleton />}>
        <ModulePage params={params} />
      </Suspense>
    </main>
  );
}
