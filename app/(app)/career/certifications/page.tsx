import { Suspense } from 'react';
import {
  CertificationsSkeleton,
  CertificationsView,
} from '@/components/certifications/certifications-view';

export default function CertificationsPage({ searchParams }: PageProps<'/career/certifications'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<CertificationsSkeleton />}>
        <CertificationsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
