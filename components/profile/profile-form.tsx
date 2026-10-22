'use client';

import { useActionState } from 'react';
import type { ProfileInfo } from '@/generated/prisma/client';
import { updateProfile } from '@/app/(app)/career/profile/actions';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { TextField } from '@/components/ui/text-field';
import { EMPTY_FORM_STATE } from '@/lib/forms';

const FIELDS = [
  { name: 'headline', label: 'Situation', placeholder: 'Étudiant à 42 Paris · acarpent' },
  { name: 'targetRoles', label: 'Domaine visé', placeholder: 'Full stack et/ou data engineer' },
  { name: 'currentSearch', label: 'Recherche actuelle', placeholder: 'Full stack uniquement' },
  { name: 'contracts', label: 'Contrats', placeholder: 'Stage, alternance, CDI/CDD, VIE' },
  { name: 'zone', label: 'Zone', placeholder: 'France et Europe' },
  { name: 'availability', label: 'Disponibilité', placeholder: 'Dès maintenant' },
  { name: 'githubUrl', label: 'GitHub', placeholder: 'github.com/Hushhhy' },
] as const;

export function ProfileForm({ profile }: { profile: ProfileInfo | null }) {
  const [state, formAction, isPending] = useActionState(updateProfile, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      {FIELDS.map((field) => (
        <TextField
          key={field.name}
          name={field.name}
          label={field.label}
          placeholder={field.placeholder}
          defaultValue={state.values?.[field.name] ?? profile?.[field.name] ?? ''}
          error={state.fieldErrors?.[field.name]}
        />
      ))}
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
