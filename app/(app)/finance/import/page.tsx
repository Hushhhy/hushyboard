import { Suspense } from 'react';
import { FinanceSkeleton, ImportView } from '@/components/finance/finance-views';

export default function ImportPage() {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<FinanceSkeleton variant="list" />}>
        <ImportView />
      </Suspense>
    </main>
  );
}
