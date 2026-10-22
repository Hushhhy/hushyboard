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
    include: { notions: { orderBy: { position: 'asc' } } },
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
  const [profile, tools, timeline, skills] = await Promise.all([
    prisma.profileInfo.findUnique({ where: { userId } }),
    prisma.tool.findMany({ where: { userId }, orderBy: [{ position: 'asc' }, { name: 'asc' }] }),
    prisma.timelineEntry.findMany({ where: { userId }, orderBy: { position: 'asc' } }),
    prisma.skill.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: tiersInclude,
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

  return { profile, tools, timeline, skills: summaries, objectives };
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
    },
  });
  if (!skill) return null;

  const allCourses = await prisma.course.findMany({
    where: { userId },
    select: { id: true, title: true, provider: true },
    orderBy: { title: 'asc' },
  });

  return {
    skill,
    computed: computeSkillLevel(toTierInputs(skill.tiers)),
    allCourses,
  };
}

export type SkillPageData = NonNullable<Awaited<ReturnType<typeof getSkillPageData>>>;
