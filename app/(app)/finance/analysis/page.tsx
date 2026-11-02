import { Suspense } from 'react';
import { AnalysisView } from '@/components/finance/finance-analysis';
import { FinanceSkeleton } from '@/components/finance/finance-views';

export default function FinanceAnalysisPage({ searchParams }: PageProps<'/finance/analysis'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<FinanceSkeleton />}>
        <AnalysisView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
