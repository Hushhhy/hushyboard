import { prisma } from '@/lib/prisma';
import {
  computeSkillLevel,
  nextObjectives,
  type SkillCategoryKey,
  type SkillLevel,
  type TierInput,
} from '@/lib/skills';

const tiersInclude = {
  tiers: {
    orderBy: { level: 'asc' },
    // Light: sheets and notes are read only for the selected notion.
    include: {
      notions: { orderBy: { position: 'asc' }, select: { id: true, label: true, checkedAt: true } },
    },
  },
} as const;

type TierRow = {
  id: string;
  level: number;
  title: string;
  notions: { id: string; label: string; checkedAt: Date | null }[];
};

function toTierInputs(tiers: TierRow[]): TierInput[] {
  return tiers.map((tier) => ({
    level: tier.level,
    title: tier.title,
    notions: tier.notions.map((notion) => ({
      label: notion.label,
      checked: notion.checkedAt !== null,
    })),
  }));
}

export type SkillSummary = {
  id: string;
  slug: string;
  name: string;
  category: SkillCategoryKey;
  computed: SkillLevel;
};

// Everything /career/profile shows, read in parallel.
export async function getProfileData(userId: string) {
  const [profile, tools, timeline, skills, projects] = await Promise.all([
    prisma.profileInfo.findUnique({ where: { userId } }),
    prisma.tool.findMany({ where: { userId }, orderBy: [{ position: 'asc' }, { name: 'asc' }] }),
    prisma.timelineEntry.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: { project: { select: { name: true, fullName: true, isExternal: true } } },
    }),
    prisma.skill.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: tiersInclude,
    }),
    prisma.project.findMany({
      where: { userId, hidden: false },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const summaries: SkillSummary[] = skills.map((skill) => ({
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    category: skill.category,
    computed: computeSkillLevel(toTierInputs(skill.tiers)),
  }));

  const objectives = nextObjectives(
    skills.map((skill) => ({
      slug: skill.slug,
      name: skill.name,
      category: skill.category,
      position: skill.position,
      tiers: toTierInputs(skill.tiers),
    }))
  );

  return { profile, tools, timeline, skills: summaries, objectives, projects };
}

export type ProfileData = Awaited<ReturnType<typeof getProfileData>>;

// One skill with its tiers, history and links, or null if it is not Alex's.
export async function getSkillPageData(userId: string, slug: string) {
  const skill = await prisma.skill.findUnique({
    where: { userId_slug: { userId, slug } },
    include: {
      ...tiersInclude,
      assessments: { orderBy: { assessedAt: 'desc' } },
      courses: { select: { id: true, title: true }, orderBy: { title: 'asc' } },
      certifications: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
      projects: {
        where: { hidden: false },
        select: { id: true, name: true, fullName: true, isExternal: true },
        orderBy: { name: 'asc' },
      },
    },
  });
  if (!skill) return null;

  // Header counts of the « Référence » tab (deprecated entries are not counted).
  const listed = { skillId: skill.id, hidden: false, isDeprecated: false };
  const [allCourses, referenceTotal, referenceKnown] = await Promise.all([
    prisma.course.findMany({
      where: { userId },
      select: { id: true, title: true, provider: true },
      orderBy: { title: 'asc' },
    }),
    prisma.referenceEntry.count({ where: listed }),
    prisma.referenceEntry.count({ where: { ...listed, knownAt: { not: null } } }),
  ]);

  return {
    skill,
    computed: computeSkillLevel(toTierInputs(skill.tiers)),
    allCourses,
    reference: { total: referenceTotal, known: referenceKnown },
  };
}

export type SkillPageData = NonNullable<Awaited<ReturnType<typeof getSkillPageData>>>;

// The sheet of one notion of a skill already loaded for the user.
export function getNotionSheetData(skillId: string, notionId: string) {
  return prisma.skillNotion.findFirst({
    where: { id: notionId, tier: { skillId } },
    select: {
      id: true,
      sheet: true,
      sheetGeneratedAt: true,
      sheetEditedAt: true,
      notes: true,
      references: {
        where: { hidden: false },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      },
    },
  });
}

// Rows of the « Référence » list (details are read only for the selected entry).
export function getReferenceRows(skillId: string) {
  return prisma.referenceEntry.findMany({
    where: { skillId, hidden: false },
    select: {
      id: true,
      name: true,
      kind: true,
      group: true,
      summary: true,
      isCommon: true,
      isDeprecated: true,
      knownAt: true,
      favorite: true,
      source: true,
    },
    orderBy: { name: 'asc' },
  });
}

export function getReferenceEntry(skillId: string, entryId: string) {
  return prisma.referenceEntry.findFirst({
    where: { id: entryId, skillId, hidden: false },
    include: {
      notions: {
        select: { id: true, label: true, tier: { select: { level: true } } },
        orderBy: { label: 'asc' },
      },
    },
  });
}
