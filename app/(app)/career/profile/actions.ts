'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { fieldErrors, formValues, type FormState } from '@/lib/forms';
import { computeSkillLevel, MAX_SKILL_LEVEL, slugifySkillName } from '@/lib/skills';

const PROFILE_PATH = '/career/profile';

// Profile and every skill page show the same data (levels, objectives).
function revalidateProfile() {
  revalidatePath(PROFILE_PATH, 'layout');
}

const requiredText = (message: string, max = 120) =>
  z.string().trim().min(1, message).max(max, `${max} caractères au maximum.`);

// --- Profile info --------------------------------------------------------------

const profileSchema = z.object({
  headline: requiredText('Indique ta situation, par exemple « Étudiant à 42 Paris ».'),
  targetRoles: requiredText('Indique le domaine visé.'),
  currentSearch: requiredText('Indique ta recherche actuelle.'),
  contracts: requiredText('Indique les contrats recherchés.'),
  zone: requiredText('Indique une zone.'),
  availability: requiredText('Indique ta disponibilité.'),
  githubUrl: z
    .string()
    .trim()
    .max(200)
    .transform((value) => (value && !/^https?:\/\//.test(value) ? `https://${value}` : value))
    .pipe(
      z.union([z.literal(''), z.url('Saisis une adresse valide, par exemple github.com/Hushhhy.')])
    ),
});

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const data = { ...parsed.data, githubUrl: parsed.data.githubUrl || null };
  await prisma.profileInfo.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });
  revalidateProfile();
  redirect(PROFILE_PATH);
}

// --- Tools ---------------------------------------------------------------------

const toolStatusSchema = z.enum(['DISCOVERED', 'USING', 'MASTERED']);
const toolNameSchema = requiredText("Donne un nom à l'outil.", 40);

export async function addTool(name: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = toolNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.tool.findUnique({
    where: { userId_name: { userId: user.id, name: parsed.data } },
  });
  if (existing) return { error: 'Cet outil est déjà dans la liste.' };

  const last = await prisma.tool.aggregate({
    where: { userId: user.id },
    _max: { position: true },
  });
  await prisma.tool.create({
    data: { userId: user.id, name: parsed.data, position: (last._max.position ?? -1) + 1 },
  });
  revalidateProfile();
  return {};
}

export async function setToolStatus(toolId: string, status: string): Promise<void> {
  const user = await requireUser();
  const parsed = toolStatusSchema.parse(status);
  await prisma.tool.updateMany({
    where: { id: toolId, userId: user.id },
    data: { status: parsed },
  });
  revalidateProfile();
}

export type RemovedTool = { name: string; status: string; position: number };

// Returns what was removed so the client can offer "Annuler".
export async function removeTool(toolId: string): Promise<RemovedTool | null> {
  const user = await requireUser();
  const tool = await prisma.tool.findFirst({ where: { id: toolId, userId: user.id } });
  if (!tool) return null;
  await prisma.tool.delete({ where: { id: tool.id } });
  revalidateProfile();
  return { name: tool.name, status: tool.status, position: tool.position };
}

export async function restoreTool(tool: RemovedTool): Promise<void> {
  const user = await requireUser();
  const data = z
    .object({ name: toolNameSchema, status: toolStatusSchema, position: z.int().min(0) })
    .parse(tool);
  await prisma.tool.upsert({
    where: { userId_name: { userId: user.id, name: data.name } },
    create: { userId: user.id, ...data },
    update: {},
  });
  revalidateProfile();
}

// --- Timeline ------------------------------------------------------------------

const timelineSchema = z.object({
  id: z.string().optional(),
  period: requiredText('Indique la période, par exemple « 2023 – 2026 ».', 40),
  title: requiredText('Donne un intitulé.', 160),
  place: z.string().trim().max(120),
  isCurrent: z.literal('on').optional(),
  projectId: z.string().optional(),
});

export async function saveTimelineEntry(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = timelineSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const { id, period, title, place, isCurrent, projectId } = parsed.data;
  // Only one of Alex's own projects can be linked.
  const project = projectId
    ? await prisma.project.findFirst({
        where: { id: projectId, userId: user.id },
        select: { id: true },
      })
    : null;
  const data = {
    period,
    title,
    place: place || null,
    isCurrent: isCurrent === 'on',
    projectId: project?.id ?? null,
  };

  if (id) {
    const updated = await prisma.timelineEntry.updateMany({
      where: { id, userId: user.id },
      data,
    });
    if (updated.count === 0) return { error: "Cette étape n'existe plus.", values };
  } else {
    // New entries go on top of the timeline.
    const first = await prisma.timelineEntry.aggregate({
      where: { userId: user.id },
      _min: { position: true },
    });
    await prisma.timelineEntry.create({
      data: { userId: user.id, ...data, position: (first._min.position ?? 1) - 1 },
    });
  }
  revalidateProfile();
  redirect(PROFILE_PATH);
}

export async function deleteTimelineEntry(entryId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const deleted = await prisma.timelineEntry.deleteMany({
    where: { id: entryId, userId: user.id },
  });
  if (deleted.count === 0) return { error: "Cette étape n'existe plus." };
  revalidateProfile();
  redirect(PROFILE_PATH);
}

// --- Skills --------------------------------------------------------------------

const skillSchema = z.object({
  name: requiredText('Donne un nom à la compétence.', 40),
  category: z.enum(['WEB_FRONT', 'BACKEND_DATA', 'DATA_ENGINEERING', 'SYSTEM_TOOLS'], {
    error: 'Choisis une catégorie.',
  }),
});

// Creates a skill with 5 empty levels, then opens it: « Générer la roadmap » or edit by hand.
export async function createSkill(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = skillSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };

  const slug = slugifySkillName(parsed.data.name);
  if (!slug) return { fieldErrors: { name: 'Utilise au moins une lettre ou un chiffre.' }, values };
  const existing = await prisma.skill.findUnique({
    where: { userId_slug: { userId: user.id, slug } },
  });
  if (existing) return { fieldErrors: { name: 'Cette compétence existe déjà.' }, values };

  const last = await prisma.skill.aggregate({
    where: { userId: user.id },
    _max: { position: true },
  });
  await prisma.skill.create({
    data: {
      userId: user.id,
      slug,
      name: parsed.data.name,
      category: parsed.data.category,
      position: (last._max.position ?? -1) + 1,
      tiers: {
        create: Array.from({ length: MAX_SKILL_LEVEL }, (_, index) => ({
          level: index + 1,
          title: `Niveau ${index + 1}`,
        })),
      },
    },
  });
  revalidateProfile();
  redirect(`${PROFILE_PATH}/${slug}`);
}

// Loads a skill only if it belongs to the signed-in user.
async function ownedSkill(userId: string, skillId: string) {
  const skill = await prisma.skill.findFirst({
    where: { id: skillId, userId },
    include: { tiers: { include: { notions: true } } },
  });
  if (!skill) throw new Error('Skill not found');
  return skill;
}

export async function setNotionChecked(notionId: string, checked: boolean): Promise<void> {
  const user = await requireUser();
  const updated = await prisma.skillNotion.updateMany({
    where: { id: notionId, tier: { skill: { userId: user.id } } },
    data: { checkedAt: checked ? new Date() : null },
  });
  if (updated.count === 0) throw new Error('Notion not found');
  revalidateProfile();
}

// Guided re-evaluation: every notion is set from Alex's answers, then a snapshot is saved.
export async function saveAssessment(skillId: string, knownNotionIds: string[]): Promise<void> {
  const user = await requireUser();
  const skill = await ownedSkill(user.id, skillId);
  const known = new Set(z.array(z.string()).parse(knownNotionIds));
  const now = new Date();
  const notions = skill.tiers.flatMap((tier) => tier.notions);

  const tiers = skill.tiers.map((tier) => ({
    level: tier.level,
    title: tier.title,
    notions: tier.notions.map((notion) => ({ label: notion.label, checked: known.has(notion.id) })),
  }));
  const { level, started } = computeSkillLevel(tiers);

  await prisma.$transaction([
    // Newly known notions get today's date; already known ones keep theirs.
    prisma.skillNotion.updateMany({
      where: {
        id: { in: notions.filter((n) => known.has(n.id) && !n.checkedAt).map((n) => n.id) },
      },
      data: { checkedAt: now },
    }),
    prisma.skillNotion.updateMany({
      where: { id: { in: notions.filter((n) => !known.has(n.id)).map((n) => n.id) } },
      data: { checkedAt: null },
    }),
    prisma.skillAssessment.create({ data: { skillId: skill.id, level, started, assessedAt: now } }),
  ]);
  revalidateProfile();
  redirect(`${PROFILE_PATH}/${skill.slug}`);
}

const tierSchema = z.object({
  title: requiredText('Donne un titre au niveau.', 80),
  notions: z
    .array(
      z.object({ id: z.string().nullable(), label: requiredText('Une notion est vide.', 120) })
    )
    .max(30, '30 notions au maximum par niveau.'),
});

// Edit mode: rename a tier and add, remove, rename or reorder its notions.
export async function saveTier(
  tierId: string,
  input: { title: string; notions: { id: string | null; label: string }[] }
): Promise<{ error?: string }> {
  const user = await requireUser();
  const parsed = tierSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const tier = await prisma.skillTier.findFirst({
    where: { id: tierId, skill: { userId: user.id } },
    include: { notions: true },
  });
  if (!tier) return { error: "Ce niveau n'existe plus." };

  const keptIds = new Set(parsed.data.notions.flatMap((notion) => (notion.id ? [notion.id] : [])));
  const ownIds = new Set(tier.notions.map((notion) => notion.id));
  if ([...keptIds].some((id) => !ownIds.has(id))) return { error: 'Notion inconnue.' };

  await prisma.$transaction([
    prisma.skillTier.update({ where: { id: tier.id }, data: { title: parsed.data.title } }),
    prisma.skillNotion.deleteMany({
      where: { tierId: tier.id, id: { notIn: [...keptIds] } },
    }),
    ...parsed.data.notions.map((notion, position) =>
      notion.id
        ? prisma.skillNotion.update({
            where: { id: notion.id },
            data: { label: notion.label, position },
          })
        : prisma.skillNotion.create({ data: { tierId: tier.id, label: notion.label, position } })
    ),
  ]);
  revalidateProfile();
  return {};
}

export async function setSkillCourses(skillId: string, courseIds: string[]): Promise<void> {
  const user = await requireUser();
  const skill = await ownedSkill(user.id, skillId);
  const ids = z.array(z.string()).parse(courseIds);
  // Only Alex's own courses can be linked.
  const courses = await prisma.course.findMany({
    where: { id: { in: ids }, userId: user.id },
    select: { id: true },
  });
  await prisma.skill.update({
    where: { id: skill.id },
    data: { courses: { set: courses } },
  });
  revalidateProfile();
  redirect(`${PROFILE_PATH}/${skill.slug}`);
}

export async function deleteSkill(skillId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const deleted = await prisma.skill.deleteMany({ where: { id: skillId, userId: user.id } });
  if (deleted.count === 0) return { error: "Cette compétence n'existe plus." };
  revalidateProfile();
  redirect(PROFILE_PATH);
}
