import { Suspense } from 'react';
import Link from 'next/link';
import { LoginError } from './login-error';
import { SignInButton } from './sign-in-button';

export default function LoginPage(props: PageProps<'/login'>) {
  return (
    <main id="content" className="grid min-h-dvh place-items-center bg-surface-sunken px-4">
      <div className="flex w-full max-w-100 flex-col gap-6">
        <p className="font-display text-display-30">HushyBoard</p>
        <section className="flex flex-col gap-4 rounded-card bg-surface-default p-6">
          <h1 className="font-display text-display-24">Connexion</h1>
          <p className="text-fg-2">Espace personnel, accès réservé.</p>
          <Suspense fallback={null}>
            <LoginError searchParams={props.searchParams} />
          </Suspense>
          <SignInButton />
        </section>
        <Link href="/legal" className="text-center text-caption-12 text-fg-2 hover:underline">
          Mentions légales
        </Link>
      </div>
    </main>
  );
}
