import type { LanguageShare } from '@/lib/github/helpers';
import { parseProjectSlug } from '@/lib/github/helpers';
import { prisma } from '@/lib/prisma';

export type ProjectFilter = 'all' | 'pinned' | 'school' | 'personal' | 'hidden';

const projectSelect = {
  id: true,
  name: true,
  fullName: true,
  description: true,
  url: true,
  homepage: true,
  defaultBranch: true,
  isPrivate: true,
  isFork: true,
  isArchived: true,
  isExternal: true,
  topics: true,
  languages: true,
  stars: true,
  pushedAt: true,
  deletedOnGithubAt: true,
  syncedAt: true,
  category: true,
  role: true,
  pinned: true,
  hidden: true,
  featuredOnCv: true,
  skills: { select: { id: true, name: true, slug: true }, orderBy: { position: 'asc' } },
  courses: { select: { id: true, title: true }, orderBy: { title: 'asc' } },
} as const;

type ProjectRow = Awaited<ReturnType<typeof findProjects>>[number];
export type ProjectItem = Omit<ProjectRow, 'languages'> & { languages: LanguageShare[] };

function findProjects(userId: string) {
  return prisma.project.findMany({ where: { userId }, select: projectSelect });
}

const withLanguages = (project: ProjectRow): ProjectItem => ({
  ...project,
  languages: Array.isArray(project.languages) ? (project.languages as LanguageShare[]) : [],
});

// Forks, archived repos and the ones Alex hid are only listed under « Masqués ».
export const isHiddenProject = (project: Pick<ProjectItem, 'hidden' | 'isFork' | 'isArchived'>) =>
  project.hidden || project.isFork || project.isArchived;

function matchesFilter(project: ProjectItem, filter: ProjectFilter): boolean {
  if (filter === 'hidden') return isHiddenProject(project);
  if (isHiddenProject(project)) return false;
  if (filter === 'pinned') return project.pinned;
  if (filter === 'school') return project.category === 'SCHOOL_42';
  if (filter === 'personal') return project.category === 'PERSONAL';
  return true;
}

function matchesSearch(project: ProjectItem, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [project.name, project.description ?? '', ...project.topics].some((text) =>
    text.toLowerCase().includes(query)
  );
}

export async function getProjectsList(userId: string, filter: ProjectFilter, search: string) {
  const all = (await findProjects(userId)).map(withLanguages);
  const counts: Record<ProjectFilter, number> = {
    all: all.filter((project) => matchesFilter(project, 'all')).length,
    pinned: all.filter((project) => matchesFilter(project, 'pinned')).length,
    school: all.filter((project) => matchesFilter(project, 'school')).length,
    personal: all.filter((project) => matchesFilter(project, 'personal')).length,
    hidden: all.filter((project) => matchesFilter(project, 'hidden')).length,
  };
  // Pinned first, then the most recent push.
  const projects = all
    .filter((project) => matchesFilter(project, filter) && matchesSearch(project, search))
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        (b.pushedAt?.getTime() ?? 0) - (a.pushedAt?.getTime() ?? 0)
    );
  const lastSync = all.reduce<Date | null>(
    (latest, project) => (!latest || project.syncedAt > latest ? project.syncedAt : latest),
    null
  );
  return { projects, counts, total: all.length, lastSync };
}

export type ProjectsList = Awaited<ReturnType<typeof getProjectsList>>;

// The project of a page URL ("hushyboard" or "owner~repo"), only if it is Alex's.
export async function getProjectBySlug(userId: string, slug: string): Promise<ProjectItem | null> {
  const { name, fullName } = parseProjectSlug(slug);
  const project = await prisma.project.findFirst({
    where: fullName
      ? { userId, fullName: { equals: fullName, mode: 'insensitive' }, isExternal: true }
      : { userId, name, isExternal: false },
    select: projectSelect,
  });
  return project ? withLanguages(project) : null;
}

export async function getLatestSync(userId: string): Promise<Date | null> {
  const latest = await prisma.project.aggregate({ where: { userId }, _max: { syncedAt: true } });
  return latest._max.syncedAt;
}
