import { Suspense } from 'react';
import { FinanceSkeleton, TransactionsView } from '@/components/finance/finance-views';

export default function TransactionsPage({ searchParams }: PageProps<'/finance/transactions'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<FinanceSkeleton variant="list" />}>
        <TransactionsView searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
