import { Suspense } from 'react';
import { CoursesSkeleton, CoursesView } from '@/components/courses/courses-view';

export default function CompletedCoursesPage() {
  return (
    <main
      id="content"
      className="mx-auto flex w-full max-w-240 flex-col gap-4 px-4 pt-5 pb-6 md:px-7"
    >
      <Suspense fallback={<CoursesSkeleton />}>
        <CoursesView
          statuses={['COMPLETED']}
          basePath="/career/courses/completed"
          empty={{
            title: 'Aucun cours terminé.',
            description: 'Chaque cours terminé rapporte 60 XP et apparaît ici.',
          }}
        />
      </Suspense>
    </main>
  );
}
