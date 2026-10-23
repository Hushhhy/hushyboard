import type { Metadata } from 'next';
import { bricolage, plex } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hushyboard',
  description: 'Personal life dashboard',
  // Private app: search engines must not list the login or legal pages either.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={`${plex.variable} ${bricolage.variable}`} data-animations="on">
      <body>
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-50 focus:rounded-control focus:bg-action focus:px-3 focus:py-2 focus:font-semibold focus:text-on-action"
        >
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
