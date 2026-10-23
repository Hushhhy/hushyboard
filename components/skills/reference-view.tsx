import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  generateReferenceList,
  importMdnReference,
  unhideReferenceEntries,
} from '@/app/(app)/career/profile/skill-actions';
import { PlusIcon, SparkleIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { getReferenceRows, getSkillPageData } from '@/lib/profile-data';
import { requireUser } from '@/lib/session';
import { referenceSearchLabel } from '@/lib/skills';
import { CSS_GROUP_ORDER } from '@/lib/skills/reference/mdn-groups';
import { isMdnSkill } from '@/lib/skills/reference/mdn-skills';
import type { ReferenceRow } from '@/lib/skills/reference/list';
import { withSearchParam } from '@/lib/url';
import { ActionButton } from './action-button';
import { AddEntryForm } from './add-entry-form';
import { EntryPlaceholder, ReferenceEntryPanel } from './reference-entry';
import { ReferenceList, ReferenceProvider } from './reference-list';
import { SkillHeader } from './skill-header';

type ReferenceViewProps = Pick<
  PageProps<'/career/profile/[skillSlug]/reference'>,
  'params' | 'searchParams'
>;

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// The kind proposed first in « Ajouter une entrée ».
const DEFAULT_KINDS: Record<string, string> = {
  css: 'PROPERTY',
  html: 'ELEMENT',
  javascript: 'METHOD',
  git: 'COMMAND',
  docker: 'COMMAND',
  'linux-bash': 'COMMAND',
  react: 'HOOK',
};

// « Référence » tab: the full list of the language (left), the selected entry (right).
export async function ReferenceView({ params, searchParams }: ReferenceViewProps) {
  const [{ skillSlug }, search] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const data = await getSkillPageData(user.id, skillSlug);
  if (!data) notFound();

  const { skill } = data;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    const first = one(value);
    if (first !== undefined) query.set(key, first);
  }
  const basePath = `/career/profile/${skill.slug}/reference`;
  const fromMdn = isMdnSkill(skill.slug);

  const [entries, hiddenCount, syncedAt] = await Promise.all([
    getReferenceRows(skill.id),
    prisma.referenceEntry.count({ where: { skillId: skill.id, hidden: true } }),
    prisma.skill
      .findUnique({ where: { id: skill.id }, select: { referenceSyncedAt: true } })
      .then((row) => row?.referenceSyncedAt ?? null),
  ]);
  const rows: ReferenceRow[] = entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    group: entry.group,
    summary: entry.summary,
    isCommon: entry.isCommon,
    isDeprecated: entry.isDeprecated,
    known: entry.knownAt !== null,
    favorite: entry.favorite,
  }));
  const groups = [...new Set(entries.map((entry) => entry.group))].sort((a, b) =>
    a.localeCompare(b, 'fr')
  );
  const addHref = withSearchParam(basePath, query, 'panel', 'add-entry');

  const addPanel = (
    <SidePanel name="add-entry" title="Ajouter une entrée" subtitle={skill.name}>
      <AddEntryForm
        skillId={skill.id}
        skillSlug={skill.slug}
        groups={groups}
        defaultKind={DEFAULT_KINDS[skill.slug] ?? 'OTHER'}
      />
    </SidePanel>
  );
  const header = <SkillHeader data={data} tab="reference" query={query} />;

  if (rows.length === 0) {
    return (
      <>
        {header}
        <section className="rounded-card bg-surface-default p-5">
          {fromMdn ? (
            <EmptyState
              variant="block"
              title={`Importer la référence ${skill.name}`}
              description="La liste complète vient des données ouvertes de MDN, classée par groupes. Aucun appel à l’IA : les fiches détaillées sont préparées quand tu ouvres une entrée."
            >
              <ActionButton
                variant="primary"
                action={importMdnReference.bind(null, skill.id)}
                pendingHint="Import de la liste MDN…"
              >
                Importer la liste MDN
              </ActionButton>
            </EmptyState>
          ) : (
            <EmptyState
              variant="block"
              icon={<SparkleIcon className="size-5 text-career" />}
              title={`Générer la référence ${skill.name}`}
              description="L’IA liste une fois les commandes, fonctions ou mots-clés à connaître, classés par groupes. Tu peux ensuite ajouter, masquer ou supprimer des entrées."
            >
              <ActionButton
                variant="primary"
                action={generateReferenceList.bind(null, skill.id)}
                pendingHint="Génération de la liste…"
              >
                Générer la référence
              </ActionButton>
              <Link href={addHref} scroll={false} className={buttonClasses({ variant: 'quiet' })}>
                <PlusIcon className="size-4" />
                Ajouter une entrée
              </Link>
            </EmptyState>
          )}
        </section>
        {addPanel}
      </>
    );
  }

  const requested = one(search.entry);
  const selectedId = rows.find((row) => row.id === requested)?.id ?? null;

  return (
    <>
      {header}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="flex-1 text-caption-12 text-fg-3">
          {fromMdn ? 'Liste complète issue de MDN' : 'Liste générée par l’IA, modifiable'}
          {syncedAt ? `, mise à jour ${formatRelativeTime(syncedAt, new Date())}` : ''}.
          {hiddenCount > 0
            ? ` ${hiddenCount} entrée${hiddenCount > 1 ? 's' : ''} masquée${hiddenCount > 1 ? 's' : ''}.`
            : ''}
        </p>
        {hiddenCount > 0 ? (
          <ActionButton variant="quiet" action={unhideReferenceEntries.bind(null, skill.id)}>
            Réafficher les masquées
          </ActionButton>
        ) : null}
        {fromMdn ? (
          <ActionButton
            variant="quiet"
            action={importMdnReference.bind(null, skill.id)}
            pendingHint="Mise à jour…"
          >
            Mettre à jour la liste
          </ActionButton>
        ) : null}
        <Link href={addHref} scroll={false} className={buttonClasses({ variant: 'quiet' })}>
          <PlusIcon className="size-4" />
          Ajouter une entrée
        </Link>
      </div>

      <ReferenceProvider rows={rows}>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-3 lg:grid-cols-[27.5rem_minmax(0,1fr)]">
          <ReferenceList
            skillSlug={skill.slug}
            selectedId={selectedId}
            searchLabel={referenceSearchLabel(skill.slug)}
            groupOrder={skill.slug === 'css' ? CSS_GROUP_ORDER : undefined}
          />
          <div className="lg:sticky lg:top-5">
            {selectedId ? (
              <Suspense key={selectedId} fallback={<EntrySkeleton />}>
                <ReferenceEntryPanel
                  skill={skill}
                  entryId={selectedId}
                  editing={one(search.edit) === '1'}
                />
              </Suspense>
            ) : (
              <EntryPlaceholder text="Choisis une entrée dans la liste pour voir sa fiche : description, syntaxe, exemple." />
            )}
          </div>
        </div>
      </ReferenceProvider>
      {addPanel}
    </>
  );
}

function EntrySkeleton() {
  return (
    <LoadingRegion label="Chargement de l’entrée…">
      <Skeleton surface="card" className="h-110" />
    </LoadingRegion>
  );
}

export function ReferenceSkeleton() {
  return (
    <LoadingRegion label="Chargement de la référence…" className="flex flex-col gap-4">
      <Skeleton surface="card" className="h-13 w-2/3" />
      <Skeleton surface="card" className="h-14" />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[27.5rem_minmax(0,1fr)]">
        <Skeleton surface="card" className="h-160" />
        <Skeleton surface="card" className="h-110" />
      </div>
    </LoadingRegion>
  );
}
