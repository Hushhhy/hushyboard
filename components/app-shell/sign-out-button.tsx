'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { SignOutIcon } from '@/components/icons';

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    await authClient.signOut();
    // Back to the login page, and refresh so no page keeps showing private data.
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Se déconnecter"
      title="Se déconnecter"
      className="grid size-8 place-items-center rounded-control text-fg-3 transition-colors duration-(--duration-tick) hover:bg-surface-raised hover:text-fg-1 disabled:opacity-55"
    >
      <SignOutIcon />
    </button>
  );
}
