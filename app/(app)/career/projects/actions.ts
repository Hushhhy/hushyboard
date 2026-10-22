'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { fieldErrors, formValues, type FormState } from '@/lib/forms';
import { GithubError } from '@/lib/github/client';
import { projectSlug } from '@/lib/github/helpers';
import { projectTag } from '@/lib/github/reads';
import { addExternalRepo, syncProjects, type SyncResult } from '@/lib/github/sync';
import { prisma } from '@/lib/prisma';
import { getLatestSync } from '@/lib/projects-data';
import { requireUser } from '@/lib/session';

const PROJECTS_PATH = '/career/projects';
const AUTO_SYNC_AFTER_MS = 60 * 60 * 1000;

function revalidateProjects() {
  revalidatePath(PROJECTS_PATH, 'layout');
  // Linked skills show on the skill pages; a timeline entry can link a project.
  revalidatePath('/career/profile', 'layout');
}

export type SyncState = { error?: string; result?: SyncResult };

async function runSync(userId: string, automatic: boolean): Promise<SyncState> {
  try {
    const result = await syncProjects(userId, { automatic });
    // Fresh README, tree and commits on the next visit.
    const projects = await prisma.project.findMany({
      where: { userId },
      select: { fullName: true },
    });
    for (const project of projects) updateTag(projectTag(project.fullName));
    revalidateProjects();
    return { result };
  } catch (error) {
    return { error: error instanceof GithubError ? error.message : 'Synchronisation impossible.' };
  }
}

// Button « Synchroniser ».
export async function syncNow(): Promise<SyncState> {
  const user = await requireUser();
  return runSync(user.id, false);
}

// Called when the projects page opens: syncs only if the last sync is older than an hour,
// and not when the GitHub rate limit is low.
export async function autoSync(): Promise<SyncState | null> {
  const user = await requireUser();
  const latest = await getLatestSync(user.id);
  if (latest && Date.now() - latest.getTime() < AUTO_SYNC_AFTER_MS) return null;
  return runSync(user.id, true);
}

export async function addRepo(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const result = await addExternalRepo(user.id, values.url ?? '');
  if ('error' in result) return { fieldErrors: { url: result.error }, values };
  revalidateProjects();
  redirect(
    `${PROJECTS_PATH}/${projectSlug({ name: result.slugName, fullName: result.fullName, isExternal: result.isExternal })}`
  );
}

async function ownedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!project) throw new Error('Project not found');
  return project;
}

export async function setProjectFlag(
  projectId: string,
  flag: 'pinned' | 'hidden' | 'featuredOnCv',
  value: boolean
): Promise<void> {
  const user = await requireUser();
  const project = await ownedProject(user.id, projectId);
  const field = z.enum(['pinned', 'hidden', 'featuredOnCv']).parse(flag);
  await prisma.project.update({ where: { id: project.id }, data: { [field]: Boolean(value) } });
  revalidateProjects();
}

const detailsSchema = z.object({
  category: z.enum(['SCHOOL_42', 'PERSONAL', 'TEAM']),
  role: z.string().trim().max(2000, '2 000 caractères au maximum.'),
});

// « Fiche projet »: Hushyboard-only information, never sent back to GitHub.
export async function saveProjectDetails(
  projectId: string,
  _: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const project = await ownedProject(user.id, projectId);
  const values = formValues(formData);
  const parsed = detailsSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const skillIds = formData.getAll('skillIds').map(String);
  const skills = await prisma.skill.findMany({
    where: { id: { in: skillIds }, userId: user.id },
    select: { id: true },
  });
  const courseIds = formData.getAll('courseIds').map(String);
  const courses = await prisma.course.findMany({
    where: { id: { in: courseIds }, userId: user.id },
    select: { id: true },
  });
  await prisma.project.update({
    where: { id: project.id },
    data: {
      category: parsed.data.category,
      role: parsed.data.role || null,
      featuredOnCv: formData.get('featuredOnCv') === 'on',
      pinned: formData.get('pinned') === 'on',
      hidden: formData.get('hidden') === 'on',
      skills: { set: skills },
      courses: { set: courses },
    },
  });
  revalidateProjects();
  revalidatePath('/career/courses', 'layout');
  return { done: Date.now() };
}

// Removes a project from Hushyboard only (a repo deleted on GitHub, or someone else's repo).
// The repository on GitHub is never touched.
export async function removeProject(projectId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const deleted = await prisma.project.deleteMany({ where: { id: projectId, userId: user.id } });
  if (deleted.count === 0) return { error: "Ce projet n'existe plus." };
  revalidateProjects();
  redirect(PROJECTS_PATH);
}
