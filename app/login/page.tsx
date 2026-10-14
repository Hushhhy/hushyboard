'use client';

import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <button
        type="button"
        className="rounded-md border px-4 py-2"
        onClick={() =>
          authClient.signIn.social({
            provider: 'github',
            callbackURL: '/',
            errorCallbackURL: '/login',
          })
        }
      >
        Se connecter avec Github
      </button>
    </main>
  );
}
