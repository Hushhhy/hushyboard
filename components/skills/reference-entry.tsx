import Link from 'next/link';
import {
  deleteReferenceEntry,
  generateReferenceDetails,
  setReferenceFlag,
} from '@/app/(app)/career/profile/skill-actions';
import { ExternalLinkIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { highlightCode } from '@/lib/highlight';
import { renderMarkdownWithCode } from '@/lib/markdown';
import { getReferenceEntry } from '@/lib/profile-data';
import { codeLanguage } from '@/lib/skills';
import {
  docLink,
  REFERENCE_KIND_LABELS,
  REFERENCE_SOURCE_LABELS,
} from '@/lib/skills/reference/labels';
import { parseReferenceDetails } from '@/lib/skills/schemas';
import { ActionButton } from './action-button';
import { GenerateOnOpen } from './generate-on-open';
import { ReferenceEditor } from './reference-editor';
import { EntryToggles } from './reference-list';
import { MarkdownContent } from '@/components/ui/markdown-content';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-label-12 text-fg-3 uppercase">{title}</h3>
      {children}
    </section>
  );
}

async function Code({ code, lang }: { code: string; lang: string }) {
  const html = await highlightCode(code, lang);
  return <div className="code-view code-snippet" dangerouslySetInnerHTML={{ __html: html }} />;
}

// Right column of the « Référence » tab: details of the selected entry.
export async function ReferenceEntryPanel({
  skill,
  entryId,
  editing,
}: {
  skill: { id: string; slug: string; name: string };
  entryId: string;
  editing: boolean;
}) {
  const entry = await getReferenceEntry(skill.id, entryId);
  if (!entry) return <EntryPlaceholder text="Cette entrée n’existe plus." />;

  const details = parseReferenceDetails(entry.details);
  const basePath = `/career/profile/${skill.slug}/reference`;
  const entryHref = `${basePath}?entry=${entry.id}`;
  const doc = docLink(entry.docUrl);
  const lang = (given?: string) => codeLanguage(given, skill.slug);
  const equivalentsLabel = skill.slug === 'css' ? 'En Tailwind' : 'Équivalents';

  return (
    <article
      aria-labelledby="entry-title"
      className="flex min-w-0 flex-col gap-4 rounded-card bg-surface-default p-5"
    >
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-label-12 text-fg-3 uppercase">
            {REFERENCE_KIND_LABELS[entry.kind]} {skill.name} · {entry.group}
            {entry.isDeprecated ? ' · obsolète' : ''}
          </p>
          <h2 id="entry-title" className="font-mono text-title-20 break-words">
            {entry.name}
          </h2>
        </div>
        <EntryToggles entryId={entry.id} />
      </header>

      {!details ? (
        <GenerateOnOpen
          id={entry.id}
          action={generateReferenceDetails.bind(null, entry.id, false)}
          pendingLabel="Préparation de la fiche…"
          retryLabel="Générer la fiche"
        />
      ) : editing ? (
        <ReferenceEditor
          entryId={entry.id}
          summary={entry.summary ?? ''}
          details={details}
          edited={entry.detailsEditedAt !== null}
          equivalentsLabel={equivalentsLabel}
          closeHref={entryHref}
        />
      ) : (
        <>
          <MarkdownContent
            className="max-w-[68ch] text-fg-2"
            html={await renderMarkdownWithCode(details.description)}
          />
          {details.syntax.trim() ? (
            <Section title="Syntaxe">
              <Code code={details.syntax} lang={lang(details.example.lang)} />
            </Section>
          ) : null}
          {details.values.length > 0 ? (
            <Section title="Valeurs courantes">
              <ul className="flex flex-wrap gap-1.5">
                {details.values.map((value) => (
                  <li key={value}>
                    <code className="rounded-tick bg-surface-raised px-1.5 py-0.5 font-mono text-caption-12 text-fg-1">
                      {value}
                    </code>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {details.example.code.trim() ? (
            <Section title="Exemple">
              <Code code={details.example.code} lang={lang(details.example.lang)} />
            </Section>
          ) : null}
          {details.equivalents.length > 0 ? (
            <Section title={equivalentsLabel}>
              <ul className="flex flex-wrap gap-1.5">
                {details.equivalents.map((value) => (
                  <li key={value}>
                    <code className="rounded-tick bg-surface-raised px-1.5 py-0.5 font-mono text-caption-12 text-fg-1">
                      {value}
                    </code>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      )}

      {!editing ? (
        <footer className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line-subtle pt-3">
          <p className="text-caption-12 text-fg-2">
            {entry.notions.length > 0 ? (
              <>
                Notion liée :{' '}
                {entry.notions.map((notion, index) => (
                  <span key={notion.id}>
                    {index > 0 ? ' · ' : ''}
                    <Link
                      href={`/career/profile/${skill.slug}?notion=${notion.id}`}
                      className="font-semibold text-fg-1 underline-offset-2 hover:underline"
                    >
                      {notion.label}
                    </Link>{' '}
                    ({skill.name} niveau {notion.tier.level})
                  </span>
                ))}
              </>
            ) : (
              'Aucune notion liée.'
            )}
          </p>
          <span className="flex-1" />
          <p className="text-caption-12 text-fg-3">
            Liste : {REFERENCE_SOURCE_LABELS[entry.source]}
            {details ? ` · description : ${entry.detailsEditedAt ? 'modifiée par toi' : 'IA'}` : ''}
          </p>
          {doc ? (
            <a
              href={doc.href}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses({ variant: 'quiet' })}
            >
              <ExternalLinkIcon className="size-4" />
              {doc.label}
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          ) : null}
          {details ? (
            <Link
              href={`${entryHref}&edit=1`}
              scroll={false}
              className={buttonClasses({ variant: 'quiet' })}
            >
              Modifier
            </Link>
          ) : null}
          <ActionButton
            variant="quiet"
            action={setReferenceFlag.bind(null, entry.id, 'hidden', true)}
          >
            Masquer
          </ActionButton>
          {entry.source !== 'MDN' ? (
            <DeleteDialog
              title={`Supprimer « ${entry.name} » ?`}
              description="L’entrée et sa fiche sont supprimées de la référence. Tu peux la rajouter à la main."
              onConfirm={deleteReferenceEntry.bind(null, entry.id)}
            />
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}

export function EntryPlaceholder({ text }: { text: string }) {
  return (
    <div className="rounded-card bg-surface-default p-5">
      <p className="text-body-14 text-fg-2">{text}</p>
    </div>
  );
}
