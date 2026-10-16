import Link from 'next/link';

// Shown for any page that does not exist yet (most sidebar links during development).
export default function NotFound() {
  return (
    <main id="content" className="grid min-h-dvh place-items-center bg-surface-sunken px-4">
      <div className="flex max-w-100 flex-col gap-3">
        <p className="text-label-12 text-fg-3 uppercase">Page introuvable</p>
        <h1 className="font-display text-display-30">Cette page arrive bientôt.</h1>
        <p className="text-fg-2">Elle fait partie d&apos;une prochaine mission.</p>
        <Link href="/" className="font-semibold text-fg-2 hover:text-fg-1 hover:underline">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
