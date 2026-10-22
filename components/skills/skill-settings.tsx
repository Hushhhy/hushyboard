'use client';

import { deleteSkill } from '@/app/(app)/career/profile/actions';
import { DeleteDialog } from '@/components/ui/delete-dialog';

// Edit mode, bottom of the page: deletion of the skill. Projects are linked from their
// « Fiche projet » (Carrière · Projets).
export function SkillSettings({ skillId, skillName }: { skillId: string; skillName: string }) {
  return (
    <section
      aria-label="Réglages de la compétence"
      className="flex flex-col gap-3 rounded-control bg-surface-base p-3"
    >
      <p className="text-caption-12 text-fg-3">
        Pour lier un projet GitHub à cette compétence, ouvre sa « Fiche projet » dans Carrière ·
        Projets.
      </p>
      <DeleteDialog
        title={`Supprimer la compétence ${skillName} ?`}
        description="Ses 5 paliers, ses notions cochées et son historique d'évaluations seront supprimés."
        triggerLabel="Supprimer la compétence"
        onConfirm={deleteSkill.bind(null, skillId)}
      />
    </section>
  );
}
