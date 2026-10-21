'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRewards } from '@/components/rewards/rewards-provider';
import { Button, buttonClasses } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { KeyValueList } from '@/components/ui/key-value-list';
import { SidePanel } from '@/components/ui/side-panel';
import { StatusPill } from '@/components/ui/status-pill';
import { UndoStatus } from '@/components/ui/undo-status';

// Client demos: undo, rewards, side panel and delete dialog (development page only).
export function InteractiveDemos() {
  const { announce } = useRewards();
  const [applied, setApplied] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {applied ? null : <Button onClick={() => setApplied(true)}>Postulé</Button>}
        <UndoStatus
          message={applied ? 'Candidature ajoutée au suivi.' : null}
          onUndo={() => setApplied(false)}
          focusUndo
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() =>
            announce({
              kind: 'level',
              level: 5,
              title: 'Argonaute',
              text: "Tu embarques sur l'Argo. Prochain titre : Héros.",
            })
          }
        >
          Simuler un niveau
        </Button>
        <Button
          onClick={() =>
            announce({
              kind: 'trophy',
              name: 'Fil d’Ariane',
              domain: 'career',
              text: '10 candidatures suivies.',
            })
          }
        >
          Simuler un trophée
        </Button>
        <Button
          onClick={() =>
            announce([
              { kind: 'trophy', name: 'Sept jours', domain: 'habits', text: 'Série de 7 jours.' },
              {
                kind: 'trophy',
                name: 'Premier pas',
                domain: 'career',
                text: 'Première candidature.',
              },
            ])
          }
        >
          Simuler 2 récompenses
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/styleguide?panel=demo" scroll={false} className={buttonClasses()}>
          Ouvrir le panneau
        </Link>
        <DeleteDialog
          title="Supprimer la candidature Groupe Bel ?"
          description="L'historique (3 étapes) sera supprimé. Les 15 XP gagnés restent acquis."
          onConfirm={async () => ({
            error: 'Exemple : la base de données ne répond pas. Réessaie.',
          })}
          triggerVariant="secondary"
        />
      </div>

      <SidePanel name="demo" title="Stagiaire Data Engineer" subtitle="Groupe Bel · Suresnes">
        <StatusPill status="SENT" />
        <KeyValueList
          items={[
            { key: 'contract', label: 'Contrat', value: 'Stage 6 mois' },
            { key: 'source', label: 'Source', value: 'Welcome to the Jungle' },
            { key: 'follow-up', label: 'Relance', value: '29 octobre' },
          ]}
        />
      </SidePanel>
    </div>
  );
}
