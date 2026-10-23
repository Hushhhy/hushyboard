import { Suspense } from 'react';
import { FinanceSkeleton, MonthView } from '@/components/finance/finance-views';

export default function FinancePage({ searchParams }: PageProps<'/finance'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<FinanceSkeleton />}>
        <MonthView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
