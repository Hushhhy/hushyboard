import { notFound } from 'next/navigation';
import { ErrorState } from '@/components/ui/error-state';
import { formatShortDate } from '@/lib/dates';
import { GithubError } from '@/lib/github/client';
import { getCommits } from '@/lib/github/reads';
import { getProjectBySlug } from '@/lib/projects-data';
import { requireUser } from '@/lib/session';

// The last 30 commits of the default branch, each linked to GitHub.
export async function CommitsTab({ slug }: { slug: Promise<string> }) {
  const [user, repoSlug] = await Promise.all([requireUser(), slug]);
  const project = await getProjectBySlug(user.id, repoSlug);
  if (!project) notFound();

  let commits: Awaited<ReturnType<typeof getCommits>>;
  try {
    commits = await getCommits(project.fullName, project.defaultBranch);
  } catch (error) {
    return (
      <ErrorState
        title="Commits indisponibles."
        description={error instanceof GithubError ? error.message : 'Réessaie dans un instant.'}
      />
    );
  }

  return (
    <section aria-label="Derniers commits" className="rounded-card bg-surface-default p-2">
      {commits.length === 0 ? (
        <p className="p-2 text-body-14 text-fg-2">Aucun commit sur cette branche.</p>
      ) : (
        <ol className="flex flex-col">
          {commits.map((commit) => (
            <li key={commit.sha}>
              <a
                href={commit.url}
                target="_blank"
                rel="noreferrer"
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 rounded-control px-2 py-2 hover:bg-surface-raised"
              >
                <span className="truncate text-body-14 font-medium">{commit.message}</span>
                <span className="font-mono text-caption-12 text-fg-2">
                  {commit.sha.slice(0, 7)}
                </span>
                <span className="text-caption-12 text-fg-3">
                  {commit.author}
                  {commit.date ? ` · ${formatShortDate(new Date(commit.date))}` : ''}
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
