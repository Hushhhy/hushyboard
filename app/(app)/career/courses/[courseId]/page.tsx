import { Suspense } from 'react';
import { CoursePage, CoursePageSkeleton } from '@/components/courses/course-page';

export default function CourseDetailPage({ params }: PageProps<'/career/courses/[courseId]'>) {
  return (
    <main
      id="content"
      className="mx-auto flex w-full max-w-200 flex-col gap-4 px-4 pt-5 pb-6 md:px-7"
    >
      <Suspense fallback={<CoursePageSkeleton />}>
        <CoursePage params={params} />
      </Suspense>
    </main>
  );
}
