import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'Mentions légales · Hushyboard',
};

// Public page (excluded from the proxy): legal notice, personal data and processors.
// Static text: update it when a processor or a stored data type changes.

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-title-18 text-fg-1">{title}</h2>
      {children}
    </section>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-fg-1 underline underline-offset-2"
    >
      {children}
      <span className="sr-only"> (nouvel onglet)</span>
    </a>
  );
}

const PROCESSORS: { name: string; role: string; place: string; policy: string }[] = [
  {
    name: 'Vercel Inc.',
    role: 'Hébergement de l’application.',
    place: 'Fonctions exécutées à Francfort (région fra1).',
    policy: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Neon (Databricks)',
    role: 'Base de données PostgreSQL où sont stockées les données de l’application.',
    place: 'Région choisie à la création du projet Neon.',
    policy: 'https://neon.com/privacy-policy',
  },
  {
    name: 'GitHub (Microsoft)',
    role: 'Connexion (OAuth) et lecture en lecture seule des dépôts affichés dans « Projets ».',
    place: 'États-Unis.',
    policy:
      'https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement',
  },
  {
    name: 'Google (API Gmail)',
    role: 'Lecture et classement des mails, une fois Gmail connecté. Le contenu des mails n’est jamais stocké.',
    place: 'Infrastructure Google.',
    policy: 'https://policies.google.com/privacy',
  },
  {
    name: 'Google (API Gemini, offre gratuite)',
    role: 'Intelligence artificielle : lecture d’un CV importé, analyse d’offres, CV adaptés, lettres de motivation, fiches de compétences.',
    place: 'Infrastructure Google.',
    policy: 'https://ai.google.dev/gemini-api/terms',
  },
];

export default function LegalPage() {
  return (
    <main id="content" className="min-h-dvh bg-surface-sunken px-4 py-10">
      <div className="mx-auto flex max-w-[68ch] flex-col gap-7">
        <Link
          href="/"
          className="-ml-1 flex items-center gap-1 self-start text-body-14 font-semibold text-fg-2 hover:text-fg-1 hover:underline"
        >
          <ChevronLeftIcon className="size-4" />
          Hushyboard
        </Link>
        <header className="flex flex-col gap-1">
          <p className="text-label-12 text-fg-3 uppercase">Hushyboard</p>
          <h1 className="font-display text-display-30">Mentions légales et données personnelles</h1>
          <p className="text-caption-12 text-fg-3">
            Dernière mise à jour : 23 octobre 2026 (alertes d’offres)
          </p>
        </header>

        <div className="flex flex-col gap-6 text-body-14 text-fg-2">
          <Section title="Éditeur">
            <p>
              Site personnel et non commercial, édité par Alexis Carpentier pour son propre usage.
              Contact :{' '}
              <ExternalLink href="https://github.com/Hushhhy">github.com/Hushhhy</ExternalLink>.
            </p>
          </Section>

          <Section title="Hébergement">
            <p>
              Application hébergée par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723,
              États-Unis (<ExternalLink href="https://vercel.com">vercel.com</ExternalLink>). Base
              de données hébergée par Neon (
              <ExternalLink href="https://neon.com">neon.com</ExternalLink>).
            </p>
          </Section>

          <Section title="Données personnelles">
            <p>
              L’accès est réservé à un seul compte GitHub : celui de l’éditeur, qui est aussi le
              seul utilisateur. Les données servent uniquement à son organisation personnelle :
              carrière (profil, compétences, projets, CV, cours, candidatures), habitudes, jeux
              vidéo et finances. Elles ne sont ni vendues, ni partagées, ni utilisées pour de la
              publicité.
            </p>
            <p>Ne sont jamais conservés :</p>
            <ul className="list-disc pl-5">
              <li>
                les fichiers importés (CV en PDF, relevés bancaires) : seules les informations
                extraites sont gardées ;
              </li>
              <li>le contenu des mails : ils sont lus en direct depuis Gmail.</li>
            </ul>
          </Section>

          <Section title="Sous-traitants">
            <p>Ces services traitent des données pour le fonctionnement de l’application :</p>
            <ul className="flex flex-col gap-3">
              {PROCESSORS.map((processor) => (
                <li key={processor.name} className="rounded-card bg-surface-default p-4">
                  <p className="font-semibold text-fg-1">{processor.name}</p>
                  <p>{processor.role}</p>
                  <p className="text-caption-12 text-fg-3">
                    {processor.place}{' '}
                    <ExternalLink href={processor.policy}>
                      Politique de confidentialité
                    </ExternalLink>
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Intelligence artificielle (Gemini, offre gratuite)">
            <p>
              Sur l’offre gratuite de l’API Gemini, Google peut utiliser le contenu envoyé pour
              améliorer ses produits. Seuls sont donc envoyés : les noms de compétences et de
              notions, le CV, les offres d’emploi collées dans l’application et, une fois Gmail
              connecté, les mails de recruteurs liés à une candidature et les alertes d’offres
              d’emploi rangées dans le libellé choisi dans la Veille (pour en extraire les offres).
            </p>
            <p>
              Ne sont jamais envoyés : les données bancaires, les habitudes, les notes personnelles
              (« Mes notes ») et les autres mails.
            </p>
          </Section>

          <Section title="Conservation et suppression">
            <p>
              Les données sont conservées tant que l’application est utilisée. L’éditeur peut les
              modifier ou les supprimer à tout moment depuis l’application. La commande « Supprimer
              toutes mes données » (page Profil, carte « Mes données ») efface définitivement toutes
              les lignes du compte dans la base, révoque l’accès Gmail auprès de Google et ferme la
              session. Les offres d’emploi non retenues sont supprimées après 7 jours. Les droits
              prévus par le RGPD (accès, rectification, effacement) s’exercent auprès de chaque
              sous-traitant via sa politique de confidentialité.
            </p>
          </Section>

          <Section title="Cookies">
            <p>
              Uniquement des cookies techniques, nécessaires à la connexion (session). Aucun cookie
              de mesure d’audience ni publicitaire : aucun bandeau de consentement n’est donc
              requis.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}
