import { Suspense } from 'react';
import { OfferSkeleton, OfferView } from '@/components/job-search/offer-view';

// The analysis, the adapted CV and the letter call Gemini from this page.
export const maxDuration = 60;

export default function OfferPage({ params }: PageProps<'/career/job-search/offers/[offerId]'>) {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<OfferSkeleton />}>
        <OfferView params={params} />
      </Suspense>
    </main>
  );
}
