import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLinkIcon, FileIcon, FolderIcon } from '@/components/icons';
import { ErrorState } from '@/components/ui/error-state';
import { GithubError } from '@/lib/github/client';
import { projectSlug } from '@/lib/github/helpers';
import { getFile, getTree, type FileView } from '@/lib/github/reads';
import { buildTree, countFiles, defaultFile, type TreeNode } from '@/lib/github/tree';
import { renderMarkdown } from '@/lib/markdown';
import { getProjectBySlug } from '@/lib/projects-data';
import { requireUser } from '@/lib/session';
import { CopyButton } from './copy-button';
import { MarkdownContent } from '@/components/ui/markdown-content';

function TreeList({
  nodes,
  base,
  current,
}: {
  nodes: TreeNode[];
  base: string;
  current: string | null;
}) {
  return (
    <ul className="flex flex-col">
      {nodes.map((node) =>
        node.type === 'tree' ? (
          <li key={node.path}>
            {/* Folders on the path of the open file start expanded. */}
            <details open={current?.startsWith(`${node.path}/`) || undefined}>
              <summary className="flex h-7 cursor-pointer items-center gap-1.5 rounded-control px-1.5 text-caption-12 text-fg-2 hover:bg-surface-raised hover:text-fg-1">
                <FolderIcon className="size-3.5 shrink-0" />
                <span className="truncate">{node.name}</span>
              </summary>
              <div className="ml-3 border-l border-line-subtle pl-1">
                <TreeList nodes={node.children} base={base} current={current} />
              </div>
            </details>
          </li>
        ) : (
          <li key={node.path}>
            <Link
              href={`${base}?path=${encodeURIComponent(node.path)}`}
              aria-current={node.path === current ? 'page' : undefined}
              className={`flex h-7 items-center gap-1.5 rounded-control px-1.5 font-mono text-caption-12 ${
                node.path === current
                  ? 'bg-surface-raised text-fg-1'
                  : 'text-fg-2 hover:bg-surface-raised hover:text-fg-1'
              }`}
            >
              <FileIcon className="size-3.5 shrink-0" />
              <span className="truncate">{node.name}</span>
            </Link>
          </li>
        )
      )}
    </ul>
  );
}

const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  tsx: 'TypeScript (JSX)',
  javascript: 'JavaScript',
  jsx: 'JavaScript (JSX)',
  shellscript: 'Shell',
  cpp: 'C++',
  c: 'C',
  python: 'Python',
  markdown: 'Markdown',
  text: 'Texte',
};

function FileBody({ file, path, githubUrl }: { file: FileView; path: string; githubUrl: string }) {
  if (file.kind === 'image') {
    return (
      // External or proxied image of the repo: next/image would need every host configured.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={file.src}
        alt={path}
        className="max-h-[60dvh] max-w-full rounded-control bg-surface-sunken object-contain"
      />
    );
  }
  if (file.kind !== 'code') {
    return (
      <p className="text-body-14 text-fg-2">
        Fichier trop volumineux ou binaire.{' '}
        <a href={githubUrl} target="_blank" rel="noreferrer" className="underline">
          Le voir sur GitHub
        </a>
        .
      </p>
    );
  }
  if (file.language === 'markdown') {
    return <MarkdownContent html={renderMarkdown(file.text)} />;
  }
  return <div className="code-view" dangerouslySetInnerHTML={{ __html: file.html }} />;
}

export async function CodeTab({
  slug,
  searchParams,
}: {
  slug: Promise<string>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, repoSlug, params] = await Promise.all([requireUser(), slug, searchParams]);
  const project = await getProjectBySlug(user.id, repoSlug);
  if (!project) notFound();
  const base = `/career/projects/${projectSlug(project)}/code`;

  let tree: Awaited<ReturnType<typeof getTree>>;
  try {
    tree = await getTree(project.fullName, project.defaultBranch);
  } catch (error) {
    return (
      <ErrorState
        title="Code indisponible."
        description={error instanceof GithubError ? error.message : 'Réessaie dans un instant.'}
      />
    );
  }

  const requested = typeof params.path === 'string' ? params.path : null;
  const entry = requested
    ? tree.entries.find((item) => item.path === requested && item.type === 'blob')
    : null;
  const path = entry?.path ?? defaultFile(tree.entries);
  const size = tree.entries.find((item) => item.path === path)?.size;
  const githubUrl = path ? `${project.url}/blob/${project.defaultBranch}/${path}` : project.url;

  let file: FileView | null = null;
  let fileError: string | null = null;
  if (path) {
    try {
      file = await getFile(
        project.id,
        project.fullName,
        project.defaultBranch,
        project.isPrivate,
        path,
        size
      );
    } catch (error) {
      fileError =
        error instanceof GithubError ? error.message : 'Fichier illisible pour le moment.';
    }
  }

  return (
    <div className="grid items-start gap-3 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <nav
        aria-label="Fichiers du dépôt"
        className="flex max-h-[75dvh] flex-col gap-2 overflow-auto rounded-card bg-surface-default p-3"
      >
        <p className="px-1.5 text-caption-12 text-fg-3">
          {project.defaultBranch} · {countFiles(tree.entries)} fichiers
        </p>
        {tree.truncated ? (
          <p className="px-1.5 text-caption-12 text-fg-2">
            Dépôt trop gros pour tout lister.{' '}
            <a href={project.url} target="_blank" rel="noreferrer" className="underline">
              Voir sur GitHub
            </a>
          </p>
        ) : null}
        <TreeList nodes={buildTree(tree.entries)} base={base} current={path} />
      </nav>

      <section
        aria-label={path ?? 'Fichier'}
        className="flex min-w-0 flex-col gap-3 rounded-card bg-surface-default p-4"
      >
        {path ? (
          <>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="min-w-0 truncate font-mono text-body-14 font-semibold">{path}</h2>
              {file?.kind === 'code' ? (
                <span className="text-caption-12 text-fg-3">
                  {LANGUAGE_LABELS[file.language] ?? file.language} · {file.lines} lignes
                </span>
              ) : null}
              <span className="ml-auto flex gap-1">
                {file?.kind === 'code' ? <CopyButton text={file.text} /> : null}
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-2 px-2 text-body-14 font-semibold text-fg-2 hover:text-fg-1"
                >
                  <ExternalLinkIcon className="size-4" />
                  Voir sur GitHub
                </a>
              </span>
            </div>
            {fileError ? (
              <ErrorState title="Fichier indisponible." description={fileError} />
            ) : file ? (
              <FileBody file={file} path={path} githubUrl={githubUrl} />
            ) : null}
          </>
        ) : (
          <p className="text-body-14 text-fg-2">Choisis un fichier dans l’arborescence.</p>
        )}
      </section>
    </div>
  );
}
