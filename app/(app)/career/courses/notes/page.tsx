import { Suspense } from 'react';
import { CoursesSkeleton } from '@/components/courses/courses-view';
import { NotesView } from '@/components/courses/notes-view';

export default function CourseNotesPage() {
  return (
    <main
      id="content"
      className="mx-auto flex w-full max-w-240 flex-col gap-4 px-4 pt-5 pb-6 md:px-7"
    >
      <Suspense fallback={<CoursesSkeleton />}>
        <NotesView />
      </Suspense>
    </main>
  );
}
