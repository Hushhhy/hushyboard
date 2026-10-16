import { Suspense } from 'react';
import Link from 'next/link';
import { NeuralBackground } from '@/components/neural-background';
import { LoginError } from './login-error';
import { SignInButton } from './sign-in-button';

export default function LoginPage(props: PageProps<'/login'>) {
  return (
    <main
      id="content"
      className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-surface-sunken px-4"
    >
      <NeuralBackground />
      <div className="relative flex w-full max-w-100 flex-col gap-6">
        <p className="font-display text-display-30">HushyBoard</p>
        <section className="flex flex-col gap-4 rounded-card border border-line-subtle bg-surface-default/90 p-6 shadow-overlay">
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
