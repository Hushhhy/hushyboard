import Link from 'next/link';
import { generateNotionSheet } from '@/app/(app)/career/profile/skill-actions';
import { ExternalLinkIcon, PencilIcon, SparkleIcon } from '@/components/icons';
import { buttonClasses } from '@/components/ui/button';
import { formatShortDate } from '@/lib/dates';
import { highlightCode } from '@/lib/highlight';
import { renderMarkdown, renderMarkdownWithCode } from '@/lib/markdown';
import { getNotionSheetData } from '@/lib/profile-data';
import { codeLanguage } from '@/lib/skills';
import { docLink } from '@/lib/skills/reference/labels';
import { parseNotionSheet } from '@/lib/skills/schemas';
import { GenerateOnOpen } from './generate-on-open';
import { NotesField } from './notes-field';
import { KnownCheckbox } from './roadmap';
import { SheetEditor } from './sheet-editor';
import type { TierView } from './tier-view';
import { MarkdownContent } from '@/components/ui/markdown-content';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-label-12 text-fg-3 uppercase">{title}</h3>
      {children}
    </section>
  );
}

async function CodeBlock({
  code,
  lang,
  skillSlug,
}: {
  code: string;
  lang: string;
  skillSlug: string;
}) {
  const html = await highlightCode(code, codeLanguage(lang, skillSlug));
  return <div className="code-view code-snippet" dangerouslySetInnerHTML={{ __html: html }} />;
}

// Right column of the « Roadmap » tab: the « fiche mémo » of the selected notion.
export async function NotionSheetPanel({
  skill,
  tier,
  notion,
  editing,
}: {
  skill: { id: string; slug: string; name: string };
  tier: TierView;
  notion: TierView['notions'][number];
  editing: boolean;
}) {
  const data = await getNotionSheetData(skill.id, notion.id);
  if (!data) return null;
  const sheet = parseNotionSheet(data.sheet);
  const position = tier.notions.findIndex((item) => item.id === notion.id) + 1;
  const sheetHref = `/career/profile/${skill.slug}?notion=${notion.id}`;
  const doc = docLink(sheet?.docUrl);

  return (
    <article
      aria-labelledby="sheet-title"
      className="flex min-w-0 flex-col gap-4 rounded-card bg-surface-default p-5"
    >
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-label-12 text-fg-3 uppercase tabular">
            Niveau {tier.level} · notion {position} sur {tier.notions.length}
          </p>
          <h2 id="sheet-title" className="font-display text-display-24">
            {notion.label}
          </h2>
        </div>
        <KnownCheckbox notionId={notion.id} label={notion.label} />
      </header>

      {!sheet ? (
        <GenerateOnOpen
          id={notion.id}
          action={generateNotionSheet.bind(null, notion.id, false)}
          pendingLabel="Préparation de la fiche…"
          retryLabel="Générer la fiche"
        />
      ) : editing ? (
        <SheetEditor
          notionId={notion.id}
          sheet={sheet}
          edited={data.sheetEditedAt !== null}
          closeHref={sheetHref}
        />
      ) : (
        <>
          <MarkdownContent
            className="max-w-[68ch] text-fg-2"
            html={await renderMarkdownWithCode(sheet.summary)}
          />
          <Section title="Syntaxe">
            <CodeBlock {...sheet.syntax} skillSlug={skill.slug} />
          </Section>
          <Section title="Exemple concret">
            <CodeBlock {...sheet.example} skillSlug={skill.slug} />
          </Section>
          <Section title="Pièges">
            <div
              className="markdown text-fg-2"
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(sheet.pitfalls.map((pitfall) => `- ${pitfall}`).join('\n')),
              }}
            />
          </Section>
        </>
      )}

      {!editing ? (
        <NotesField key={notion.id} notionId={notion.id} initial={data.notes ?? ''} />
      ) : null}

      {sheet && !editing ? (
        <footer className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line-subtle pt-3">
          <p className="flex items-center gap-1.5 text-caption-12 text-fg-3">
            {data.sheetEditedAt ? (
              <>
                <PencilIcon className="size-3.5" />
                Fiche modifiée par toi le {formatShortDate(data.sheetEditedAt)}
              </>
            ) : (
              <>
                <SparkleIcon className="size-3.5 text-career" />
                Fiche générée par l’IA
                {data.sheetGeneratedAt ? ` le ${formatShortDate(data.sheetGeneratedAt)}` : ''}
              </>
            )}
          </p>
          <span className="flex-1" />
          {data.references.length > 0 ? (
            <p className="text-caption-12 text-fg-2">
              Voir aussi :{' '}
              {data.references.map((entry, index) => (
                <span key={entry.id}>
                  {index > 0 ? ' · ' : ''}
                  <Link
                    href={`/career/profile/${skill.slug}/reference?entry=${entry.id}`}
                    className="font-mono text-fg-1 underline-offset-2 hover:underline"
                  >
                    {entry.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
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
          <Link
            href={`${sheetHref}&sheet=edit`}
            scroll={false}
            className={buttonClasses({ variant: 'quiet' })}
          >
            Modifier la fiche
          </Link>
        </footer>
      ) : null}
    </article>
  );
}
