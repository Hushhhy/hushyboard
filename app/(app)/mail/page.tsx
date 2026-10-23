import { Suspense } from 'react';
import { MailSkeleton, MailView } from '@/components/mail/mail-view';

// Recruiter replies are classified by Gemini from this page's Server Actions.
export const maxDuration = 60;

export default function MailPage({ searchParams }: PageProps<'/mail'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<MailSkeleton />}>
        <MailView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
