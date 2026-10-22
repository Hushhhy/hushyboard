'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import { AiError, generateJson } from '@/lib/ai/gemini';
import {
  notionSheetPrompt,
  referenceEntryPrompt,
  referenceListPrompt,
  skillRoadmapPrompt,
} from '@/lib/ai/prompts/skills';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { SKILL_CATEGORY_LABELS } from '@/lib/skills';
import {
  notionSheetAnswerSchema,
  notionSheetSchema,
  REFERENCE_KINDS,
  referenceDetailsSchema,
  referenceEntryAnswerSchema,
  referenceListAnswerSchema,
  roadmapAnswerSchema,
} from '@/lib/skills/schemas';

// Generation, editing and reference lists of the skill pages. Every AI call goes through
// lib/ai/gemini.ts (usage log, French quota messages). Content is stored: a sheet is
// generated once, then only Alex's edits or an explicit « Régénérer » change it.

export type ActionResult = { error?: string };

function revalidateSkills() {
  revalidatePath('/career/profile', 'layout');
}

const aiMessage = (error: unknown) =>
  error instanceof AiError ? error.message : 'La génération a échoué. Réessaie.';

async function ownedNotion(userId: string, notionId: string) {
  const notion = await prisma.skillNotion.findFirst({
    where: { id: notionId, tier: { skill: { userId } } },
    include: {
      tier: {
        include: {
          skill: {
            include: {
              tiers: {
                orderBy: { level: 'asc' },
                include: { notions: { orderBy: { position: 'asc' } } },
              },
            },
          },
        },
      },
    },
  });
  if (!notion) throw new Error('Notion not found');
  return notion;
}

async function ownedSkill(userId: string, skillId: string) {
  const skill = await prisma.skill.findFirst({ where: { id: skillId, userId } });
  if (!skill) throw new Error('Skill not found');
  return skill;
}

async function ownedEntry(userId: string, entryId: string) {
  const entry = await prisma.referenceEntry.findFirst({
    where: { id: entryId, skill: { userId } },
    include: { skill: true },
  });
  if (!entry) throw new Error('Reference entry not found');
  return entry;
}

// --- Notion sheets ------------------------------------------------------------------

// Called when a notion is opened without a sheet (or « Régénérer »).
export async function generateNotionSheet(notionId: string, force = false): Promise<ActionResult> {
  const user = await requireUser();
  const notion = await ownedNotion(user.id, notionId);
  if (notion.sheet && !force) return {};

  const ordered = notion.tier.skill.tiers.flatMap((tier) => tier.notions);
  const index = ordered.findIndex((item) => item.id === notion.id);
  try {
    const answer = await generateJson(
      user.id,
      'notion-sheet',
      notionSheetPrompt({
        skill: notion.tier.skill.name,
        level: notion.tier.level,
        levelTitle: notion.tier.title,
        notion: notion.label,
        before: ordered.slice(Math.max(0, index - 6), index).map((item) => item.label),
        after: ordered.slice(index + 1, index + 4).map((item) => item.label),
      }),
      notionSheetAnswerSchema
    );
    const { related, ...sheet } = answer;
    // « Voir aussi »: only entries that exist in the skill's reference list.
    const references = await prisma.referenceEntry.findMany({
      where: {
        skillId: notion.tier.skillId,
        name: { in: related, mode: 'insensitive' },
      },
      select: { id: true },
    });
    await prisma.skillNotion.update({
      where: { id: notion.id },
      data: {
        sheet: sheet as Prisma.InputJsonValue,
        sheetGeneratedAt: new Date(),
        sheetEditedAt: null,
        references: { set: references },
      },
    });
  } catch (error) {
    return { error: aiMessage(error) };
  }
  revalidateSkills();
  return {};
}

export async function saveNotionSheet(notionId: string, sheet: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const notion = await ownedNotion(user.id, notionId);
  const parsed = notionSheetSchema.safeParse(sheet);
  if (!parsed.success) return { error: 'Un champ de la fiche est vide ou trop long.' };
  await prisma.skillNotion.update({
    where: { id: notion.id },
    data: { sheet: parsed.data as Prisma.InputJsonValue, sheetEditedAt: new Date() },
  });
  revalidateSkills();
  return {};
}

export async function saveNotionNotes(notionId: string, notes: string): Promise<void> {
  const user = await requireUser();
  const notion = await ownedNotion(user.id, notionId);
  const text = z.string().max(5000).parse(notes).trim();
  await prisma.skillNotion.update({ where: { id: notion.id }, data: { notes: text || null } });
  revalidateSkills();
}

// --- Roadmap -------------------------------------------------------------------------

// « Générer la roadmap »: only for a skill whose levels have no notion yet.
export async function generateRoadmap(skillId: string): Promise<ActionResult> {
  const user = await requireUser();
  const skill = await prisma.skill.findFirst({
    where: { id: skillId, userId: user.id },
    include: { tiers: { include: { _count: { select: { notions: true } } } } },
  });
  if (!skill) throw new Error('Skill not found');
  if (skill.tiers.some((tier) => tier._count.notions > 0)) {
    return { error: 'Cette roadmap a déjà des notions : modifie-la plutôt que de la régénérer.' };
  }
  try {
    const answer = await generateJson(
      user.id,
      'skill-roadmap',
      skillRoadmapPrompt(skill.name, SKILL_CATEGORY_LABELS[skill.category]),
      roadmapAnswerSchema
    );
    await prisma.$transaction(
      answer.levels.map((level) =>
        prisma.skillTier.upsert({
          where: { skillId_level: { skillId: skill.id, level: level.level } },
          create: {
            skillId: skill.id,
            level: level.level,
            title: level.title,
            notions: { create: level.notions.map((label, position) => ({ label, position })) },
          },
          update: {
            title: level.title,
            notions: { create: level.notions.map((label, position) => ({ label, position })) },
          },
        })
      )
    );
  } catch (error) {
    return { error: aiMessage(error) };
  }
  revalidateSkills();
  return {};
}

// Edit mode: move a notion to another level (it goes to the end of that level).
export async function moveNotionToLevel(notionId: string, level: number): Promise<ActionResult> {
  const user = await requireUser();
  const notion = await ownedNotion(user.id, notionId);
  const target = notion.tier.skill.tiers.find((tier) => tier.level === level);
  if (!target) return { error: 'Niveau inconnu.' };
  await prisma.skillNotion.update({
    where: { id: notion.id },
    data: { tierId: target.id, position: target.notions.length },
  });
  revalidateSkills();
  return {};
}

// --- Reference list -------------------------------------------------------------------

// « Importer la liste » / « Mettre à jour la liste » for HTML, CSS and JavaScript (MDN data).
// New entries are added, removed ones hidden; « Je connais », favourites, edited details and
// links to notions are never touched.
export async function importMdnReference(skillId: string): Promise<ActionResult> {
  const user = await requireUser();
  const skill = await ownedSkill(user.id, skillId);
  // Loaded only here: the MDN data set is large.
  const { buildMdnEntries, isMdnSkill } = await import('@/lib/skills/reference/mdn');
  if (!isMdnSkill(skill.slug)) return { error: 'Pas de liste MDN pour cette compétence.' };

  const entries = buildMdnEntries(skill.slug);
  const existing = await prisma.referenceEntry.findMany({
    where: { skillId: skill.id, source: 'MDN' },
    select: { id: true, kind: true, name: true },
  });
  const wanted = new Set(entries.map((entry) => `${entry.kind}:${entry.name}`));

  await prisma.$transaction(
    async (tx) => {
      for (const entry of entries) {
        await tx.referenceEntry.upsert({
          where: { skillId_kind_name: { skillId: skill.id, kind: entry.kind, name: entry.name } },
          create: { skillId: skill.id, source: 'MDN', ...entry },
          update: {
            group: entry.group,
            docUrl: entry.docUrl,
            isDeprecated: entry.isDeprecated,
            isCommon: entry.isCommon,
            hidden: false,
          },
        });
      }
      const removed = existing.filter((entry) => !wanted.has(`${entry.kind}:${entry.name}`));
      if (removed.length > 0) {
        await tx.referenceEntry.updateMany({
          where: { id: { in: removed.map((entry) => entry.id) } },
          data: { hidden: true },
        });
      }
      await tx.skill.update({ where: { id: skill.id }, data: { referenceSyncedAt: new Date() } });
    },
    { timeout: 120_000 }
  );
  revalidateSkills();
  return {};
}

// « Générer la référence » for the other skills: one AI call, then the list is editable.
export async function generateReferenceList(skillId: string): Promise<ActionResult> {
  const user = await requireUser();
  const skill = await ownedSkill(user.id, skillId);
  try {
    const answer = await generateJson(
      user.id,
      'reference-list',
      referenceListPrompt(skill.name),
      referenceListAnswerSchema
    );
    await prisma.$transaction(async (tx) => {
      for (const entry of answer.entries) {
        await tx.referenceEntry.upsert({
          where: { skillId_kind_name: { skillId: skill.id, kind: entry.kind, name: entry.name } },
          create: { skillId: skill.id, source: 'AI', ...entry },
          update: { group: entry.group, isCommon: entry.isCommon, hidden: false },
        });
      }
      await tx.skill.update({ where: { id: skill.id }, data: { referenceSyncedAt: new Date() } });
    });
  } catch (error) {
    return { error: aiMessage(error) };
  }
  revalidateSkills();
  return {};
}

// Details of an entry, generated the first time it is opened.
export async function generateReferenceDetails(
  entryId: string,
  force = false
): Promise<ActionResult> {
  const user = await requireUser();
  const entry = await ownedEntry(user.id, entryId);
  if (entry.details && !force) return {};
  try {
    const { summary, ...details } = await generateJson(
      user.id,
      'reference-entry',
      referenceEntryPrompt({
        skill: entry.skill.name,
        name: entry.name,
        kind: entry.kind,
        docUrl: entry.docUrl,
      }),
      referenceEntryAnswerSchema
    );
    await prisma.referenceEntry.update({
      where: { id: entry.id },
      data: {
        details: details as Prisma.InputJsonValue,
        detailsGeneratedAt: new Date(),
        detailsEditedAt: null,
        // Keep a summary Alex already has.
        summary: entry.summary ?? summary,
      },
    });
  } catch (error) {
    return { error: aiMessage(error) };
  }
  revalidateSkills();
  return {};
}

export async function saveReferenceDetails(
  entryId: string,
  input: { summary: string; details: unknown }
): Promise<ActionResult> {
  const user = await requireUser();
  const entry = await ownedEntry(user.id, entryId);
  const details = referenceDetailsSchema.safeParse(input.details);
  const summary = z.string().trim().max(120).safeParse(input.summary);
  if (!details.success || !summary.success) {
    return { error: 'Un champ de l’entrée est vide ou trop long.' };
  }
  await prisma.referenceEntry.update({
    where: { id: entry.id },
    data: {
      details: details.data as Prisma.InputJsonValue,
      summary: summary.data || null,
      detailsEditedAt: new Date(),
    },
  });
  revalidateSkills();
  return {};
}

export async function setReferenceFlag(
  entryId: string,
  flag: 'known' | 'favorite' | 'hidden',
  value: boolean
): Promise<void> {
  const user = await requireUser();
  const entry = await ownedEntry(user.id, entryId);
  const field = z.enum(['known', 'favorite', 'hidden']).parse(flag);
  await prisma.referenceEntry.update({
    where: { id: entry.id },
    data:
      field === 'known'
        ? { knownAt: value ? (entry.knownAt ?? new Date()) : null }
        : { [field]: Boolean(value) },
  });
  revalidateSkills();
}

const manualEntrySchema = z.object({
  name: z.string().trim().min(1, 'Donne un nom à l’entrée.').max(120),
  kind: z.enum(REFERENCE_KINDS),
  group: z.string().trim().min(1, 'Indique un groupe.').max(60),
  summary: z.string().trim().max(120),
});

// « Ajouter une entrée » (MANUAL source).
export async function addReferenceEntry(
  skillId: string,
  input: { name: string; kind: string; group: string; summary: string }
): Promise<ActionResult> {
  const user = await requireUser();
  const skill = await ownedSkill(user.id, skillId);
  const parsed = manualEntrySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const existing = await prisma.referenceEntry.findUnique({
    where: {
      skillId_kind_name: { skillId: skill.id, kind: parsed.data.kind, name: parsed.data.name },
    },
  });
  if (existing) return { error: 'Cette entrée existe déjà.' };
  await prisma.referenceEntry.create({
    data: {
      skillId: skill.id,
      source: 'MANUAL',
      ...parsed.data,
      summary: parsed.data.summary || null,
    },
  });
  revalidateSkills();
  return {};
}

export async function deleteReferenceEntry(entryId: string): Promise<ActionResult> {
  const user = await requireUser();
  const entry = await ownedEntry(user.id, entryId);
  await prisma.referenceEntry.delete({ where: { id: entry.id } });
  revalidateSkills();
  return {};
}
