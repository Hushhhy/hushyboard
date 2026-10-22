import { Suspense } from 'react';
import { ResumeSkeleton, ResumeView } from '@/components/resume/resume-view';

// The PDF import calls Gemini from a Server Action of this page.
export const maxDuration = 60;

export default function ResumePage({ searchParams }: PageProps<'/career/resume'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<ResumeSkeleton />}>
        <ResumeView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
