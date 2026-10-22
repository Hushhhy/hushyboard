import Link from 'next/link';
import type { ProfileInfo } from '@/generated/prisma/client';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { KeyValueList } from '@/components/ui/key-value-list';
import { SidePanel } from '@/components/ui/side-panel';
import { ProfileForm } from './profile-form';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return letters.toUpperCase() || '?';
}

// "https://github.com/Hushhhy" → "github.com/Hushhhy"
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function IdentityCard({ name, profile }: { name: string; profile: ProfileInfo | null }) {
  return (
    <section
      aria-labelledby="identity-title"
      className="flex flex-col gap-4 rounded-card bg-surface-default p-4"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-13 shrink-0 place-items-center rounded-control bg-career-deep font-display text-display-20 text-career"
        >
          {initials(name)}
        </span>
        <div className="min-w-0">
          <h2 id="identity-title" className="text-title-18">
            {name}
          </h2>
          {profile ? <p className="text-body-14 text-fg-2">{profile.headline}</p> : null}
        </div>
      </div>

      {profile ? (
        <KeyValueList
          items={[
            { key: 'target', label: 'Domaine visé', value: profile.targetRoles },
            { key: 'search', label: 'Recherche actuelle', value: profile.currentSearch },
            { key: 'contracts', label: 'Contrats', value: profile.contracts },
            { key: 'zone', label: 'Zone', value: profile.zone },
            { key: 'availability', label: 'Disponibilité', value: profile.availability },
            {
              key: 'github',
              label: 'GitHub',
              value: profile.githubUrl ? (
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-line-strong underline-offset-3 hover:decoration-current"
                >
                  {displayUrl(profile.githubUrl)}
                </a>
              ) : (
                '—'
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          title="Profil à compléter."
          description="Indique ce que tu recherches : domaine, contrats, zone et disponibilité."
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/career/profile?panel=profile" scroll={false} className={buttonClasses()}>
          {profile ? 'Modifier le profil' : 'Compléter le profil'}
        </Link>
        <Link href="/career/resume" className={buttonClasses({ variant: 'quiet' })}>
          Voir le CV
        </Link>
      </div>

      <SidePanel name="profile" title="Modifier le profil">
        <ProfileForm profile={profile} />
      </SidePanel>
    </section>
  );
}
