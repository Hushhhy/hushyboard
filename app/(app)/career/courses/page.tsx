import { Suspense } from 'react';
import { CoursesSkeleton, CoursesView } from '@/components/courses/courses-view';

export default function CoursesPage() {
  return (
    <main
      id="content"
      className="mx-auto flex w-full max-w-240 flex-col gap-4 px-4 pt-5 pb-6 md:px-7"
    >
      <Suspense fallback={<CoursesSkeleton />}>
        <CoursesView
          statuses={['IN_PROGRESS', 'PLANNED']}
          basePath="/career/courses"
          empty={{
            title: 'Aucun cours en cours.',
            description:
              'Ajoute le cours que tu suis en ce moment : son avancement apparaîtra ici et sur l’accueil.',
          }}
        />
      </Suspense>
    </main>
  );
}
