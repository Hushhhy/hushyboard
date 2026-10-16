'use client';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';

export function SignInButton() {
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    const { error } = await authClient.signIn.social({
      provider: 'github',
      callbackURL: '/',
      errorCallbackURL: '/login',
    });
    if (error) setIsPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-action px-4 font-semibold text-on-action transition-colors duration-(--duration-tick) hover:bg-action-hover disabled:cursor-wait disabled:opacity-55"
    >
      {isPending ? 'Redirection vers GitHub...' : 'Continuer vers GitHub'}
    </button>
  );
}
