import { Suspense } from 'react';
import { ProfileView, ProfileSkeleton } from '@/components/profile/profile-view';

export default function ProfilePage() {
  return (
    <main id="content" className="flex flex-col gap-4 px-4 pt-5 pb-6 md:px-7">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileView />
      </Suspense>
    </main>
  );
}
