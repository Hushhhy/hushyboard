import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { githubJson, GithubError, RATE_LIMIT_FLOOR, type GithubRepo } from './client';
import { guessCategory, languagesToPercent, parseRepoUrl, suggestSkillSlugs } from './helpers';

export type SyncResult = { total: number; added: number; skipped?: 'rate-limit' };

// Snapshot fields refreshed by every sync. Alex's annotations (category, role, pinned,
// hidden, featured, skills) are never touched here, except on first insert.
function snapshot(repo: GithubRepo, isExternal: boolean) {
  return {
    githubId: BigInt(repo.id),
    fullName: repo.full_name,
    name: repo.name,
    description: repo.description,
    url: repo.html_url,
    homepage: repo.homepage || null,
    defaultBranch: repo.default_branch,
    isPrivate: repo.private,
    isFork: repo.fork,
    isArchived: repo.archived,
    isExternal,
    topics: repo.topics ?? [],
    stars: repo.stargazers_count,
    pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
    deletedOnGithubAt: null,
    syncedAt: new Date(),
  };
}

async function fetchLanguages(fullName: string) {
  const { data } = await githubJson<Record<string, number>>(`/repos/${fullName}/languages`);
  return languagesToPercent(data);
}

// Inserts or refreshes one repository. Languages are fetched only when the repo changed.
async function upsertRepo(userId: string, repo: GithubRepo, isExternal: boolean): Promise<boolean> {
  const existing = await prisma.project.findUnique({
    where: { userId_githubId: { userId, githubId: BigInt(repo.id) } },
    select: { id: true, pushedAt: true },
  });
  const pushedAt = repo.pushed_at ? new Date(repo.pushed_at) : null;
  const changed = !existing || existing.pushedAt?.getTime() !== pushedAt?.getTime();
  const languages = changed ? await fetchLanguages(repo.full_name) : undefined;

  if (existing) {
    await prisma.project.update({
      where: { id: existing.id },
      data: {
        ...snapshot(repo, isExternal),
        ...(languages ? { languages: languages as Prisma.InputJsonValue } : {}),
      },
    });
    return false;
  }

  const suggested = suggestSkillSlugs(languages ?? [], repo.topics ?? []);
  const skills = await prisma.skill.findMany({
    where: { userId, slug: { in: suggested } },
    select: { id: true },
  });
  await prisma.project.create({
    data: {
      userId,
      ...snapshot(repo, isExternal),
      languages: (languages ?? []) as Prisma.InputJsonValue,
      category: guessCategory(repo.name, repo.topics ?? [], isExternal),
      skills: { connect: skills },
    },
  });
  return true;
}

// Lists Alex's own repos (public and private), refreshes the external ones, and flags
// the repos that disappeared from GitHub (kept until Alex removes them).
export async function syncProjects(
  userId: string,
  { automatic = false } = {}
): Promise<SyncResult> {
  const repos: GithubRepo[] = [];
  for (let page = 1; page <= 10; page += 1) {
    const { data, remaining } = await githubJson<GithubRepo[]>(
      `/user/repos?affiliation=owner&per_page=100&page=${page}&sort=pushed`
    );
    if (automatic && page === 1 && remaining !== null && remaining < RATE_LIMIT_FLOOR) {
      return { total: 0, added: 0, skipped: 'rate-limit' };
    }
    repos.push(...data);
    if (data.length < 100) break;
  }

  let added = 0;
  for (const repo of repos) {
    if (await upsertRepo(userId, repo, false)) added += 1;
  }

  const seen = new Set(repos.map((repo) => BigInt(repo.id)));
  const known = await prisma.project.findMany({
    where: { userId, deletedOnGithubAt: null },
    select: { id: true, githubId: true, fullName: true, isExternal: true },
  });
  for (const project of known) {
    if (project.isExternal) {
      try {
        const { data } = await githubJson<GithubRepo>(`/repos/${project.fullName}`);
        await upsertRepo(userId, data, true);
      } catch (error) {
        if (!(error instanceof GithubError) || error.kind !== 'not-found') throw error;
        await prisma.project.update({
          where: { id: project.id },
          data: { deletedOnGithubAt: new Date() },
        });
      }
    } else if (!seen.has(project.githubId)) {
      await prisma.project.update({
        where: { id: project.id },
        data: { deletedOnGithubAt: new Date() },
      });
    }
  }

  return { total: repos.length, added };
}

// "Ajouter un dépôt": a public repo of someone else (a teammate's project), by URL.
export async function addExternalRepo(
  userId: string,
  url: string
): Promise<{ error: string } | { slugName: string; fullName: string; isExternal: boolean }> {
  const parsed = parseRepoUrl(url);
  if (!parsed)
    return { error: 'Colle l’adresse d’un dépôt GitHub, par exemple github.com/pseudo/projet.' };
  let repo: GithubRepo;
  try {
    ({ data: repo } = await githubJson<GithubRepo>(`/repos/${parsed.owner}/${parsed.repo}`));
  } catch (error) {
    if (error instanceof GithubError && error.kind === 'not-found') {
      return {
        error:
          'Dépôt introuvable. S’il est privé chez quelqu’un d’autre, le jeton n’y a pas accès.',
      };
    }
    return { error: error instanceof GithubError ? error.message : 'Ajout impossible.' };
  }
  const { data: me } = await githubJson<{ login: string }>('/user');
  // One of Alex's own repos pasted by URL: it is not external.
  const isExternal = repo.owner.login.toLowerCase() !== me.login.toLowerCase();
  await upsertRepo(userId, repo, isExternal);
  return { slugName: repo.name, fullName: repo.full_name, isExternal };
}
