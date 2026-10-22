'use client';

import { useState, useTransition } from 'react';
import { deleteSkill, saveSkillProjects } from '@/app/(app)/career/profile/actions';
import { Button } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { TextField } from '@/components/ui/text-field';

// Edit mode, bottom of the page: linked projects and deletion of the skill.
export function SkillSettings({
  skillId,
  skillName,
  projects,
}: {
  skillId: string;
  skillName: string;
  projects: string[];
}) {
  const [value, setValue] = useState(projects.join(', '));
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <section
      aria-label="Réglages de la compétence"
      className="flex flex-col gap-3 rounded-control bg-surface-base p-3"
    >
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            await saveSkillProjects(skillId, value);
            setSaved(true);
          });
        }}
      >
        <TextField
          label="Projets liés"
          hint="Séparés par des virgules, par exemple : Transcendance, Hushyboard"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
          }}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" small pending={isPending}>
            Enregistrer les projets
          </Button>
          <span role="status" className="text-caption-12 text-fg-2">
            {saved ? 'Projets enregistrés.' : ''}
          </span>
        </div>
      </form>
      <div className="border-t border-line-subtle pt-3">
        <DeleteDialog
          title={`Supprimer la compétence ${skillName} ?`}
          description="Ses 5 paliers, ses notions cochées et son historique d'évaluations seront supprimés."
          triggerLabel="Supprimer la compétence"
          onConfirm={deleteSkill.bind(null, skillId)}
        />
      </div>
    </section>
  );
}
