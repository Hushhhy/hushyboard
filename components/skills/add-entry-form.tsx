'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addReferenceEntry } from '@/app/(app)/career/profile/skill-actions';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { REFERENCE_KIND_LABELS } from '@/lib/skills/reference/labels';

const KIND_OPTIONS = Object.entries(REFERENCE_KIND_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// « Ajouter une entrée » (side panel): an entry missing from the list, added by hand.
export function AddEntryForm({
  skillId,
  skillSlug,
  groups,
  defaultKind,
}: {
  skillId: string;
  skillSlug: string;
  // Existing groups, suggested in the field.
  groups: string[];
  defaultKind: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await addReferenceEntry(skillId, {
            name: String(form.get('name') ?? ''),
            kind: String(form.get('kind') ?? ''),
            group: String(form.get('group') ?? ''),
            summary: String(form.get('summary') ?? ''),
          });
          if (result.error) setError(result.error);
          else router.push(`/career/profile/${skillSlug}/reference?entry=${result.id}`);
        });
      }}
    >
      <TextField label="Nom" name="name" required maxLength={120} autoComplete="off" />
      <SelectField label="Type" name="kind" options={KIND_OPTIONS} defaultValue={defaultKind} />
      <TextField
        label="Groupe"
        name="group"
        required
        maxLength={60}
        list="reference-groups"
        autoComplete="off"
      />
      <datalist id="reference-groups">
        {groups.map((group) => (
          <option key={group} value={group} />
        ))}
      </datalist>
      <TextField
        label="Résumé"
        name="summary"
        maxLength={120}
        hint="Une ligne, affichée dans la liste."
      />
      {error ? <ErrorState title={error} announce /> : null}
      <Button type="submit" variant="primary" onOverlay pending={isPending} className="self-start">
        Ajouter l’entrée
      </Button>
    </form>
  );
}
