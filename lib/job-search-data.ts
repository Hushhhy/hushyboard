import { prisma } from '@/lib/prisma';
import { offerCutoff } from '@/lib/job-search';
import { computeSkillLevel } from '@/lib/skills';

// Reads of the « Recherches pro » pages. Every query filters by userId.

const resumeName = { select: { id: true, name: true } } as const;

export function getApplications(userId: string) {
  return prisma.application.findMany({
    where: { userId },
    orderBy: [{ sentAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      resume: resumeName,
      jobOffer: { select: { id: true } },
      events: { orderBy: { occurredAt: 'asc' } },
    },
  });
}
export type ApplicationRow = Awaited<ReturnType<typeof getApplications>>[number];

// CV versions Alex can attach: base versions first (default on top), then adapted ones.
export function getResumeChoices(userId: string) {
  return prisma.resume.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { jobOfferId: 'asc' }, { updatedAt: 'desc' }],
    select: { id: true, name: true, isDefault: true, jobOfferId: true },
  });
}
export type ResumeChoice = Awaited<ReturnType<typeof getResumeChoices>>[number];

// The base CV used for analyses: the default one, else the latest base version.
export async function getBaseResume(userId: string) {
  return prisma.resume.findFirst({
    where: { userId, jobOfferId: null },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getWatchData(userId: string, now: Date) {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const cutoff = offerCutoff(now);
  const [pending, recentlyDecided, sources, keywords, weekOffers] = await Promise.all([
    prisma.jobOffer.findMany({
      where: { userId, decision: 'PENDING', foundAt: { gte: cutoff } },
      orderBy: { foundAt: 'desc' },
    }),
    // Sorted during the last week: shown below, with « Annuler ».
    prisma.jobOffer.findMany({
      where: {
        userId,
        decidedAt: { gte: weekAgo },
        OR: [{ decision: 'APPLIED' }, { decision: 'DISMISSED', foundAt: { gte: cutoff } }],
      },
      orderBy: { decidedAt: 'desc' },
      take: 10,
    }),
    prisma.watchSource.findMany({
      where: { userId },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
    }),
    prisma.watchKeyword.findMany({ where: { userId }, orderBy: { label: 'asc' } }),
    prisma.jobOffer.groupBy({
      by: ['source'],
      where: { userId, foundAt: { gte: weekAgo } },
      _count: { _all: true },
    }),
  ]);
  const weekCounts = new Map(
    weekOffers.map((group) => [group.source?.toLowerCase() ?? '', group._count._all])
  );
  return {
    pending,
    recentlyDecided,
    keywords,
    sources: sources.map((source) => ({
      ...source,
      thisWeek: weekCounts.get(source.name.toLowerCase()) ?? 0,
    })),
  };
}

export function getOffer(userId: string, offerId: string) {
  return prisma.jobOffer.findFirst({
    where: { id: offerId, userId },
    include: {
      coverLetter: true,
      adaptedResume: { select: { id: true, name: true } },
      application: { select: { id: true, status: true, sentAt: true } },
    },
  });
}
export type OfferWithExtras = NonNullable<Awaited<ReturnType<typeof getOffer>>>;

export function countOffersToSort(userId: string) {
  return prisma.jobOffer.count({
    where: { userId, decision: 'PENDING', foundAt: { gte: offerCutoff(new Date()) } },
  });
}

// Skills with their computed level, for the CV analysis and adaptation prompts.
export async function getSkillLevels(userId: string) {
  const skills = await prisma.skill.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
    select: {
      name: true,
      tiers: {
        select: {
          level: true,
          title: true,
          notions: { select: { label: true, checkedAt: true } },
        },
      },
    },
  });
  return skills.map((skill) => {
    const computed = computeSkillLevel(
      skill.tiers.map((tier) => ({
        level: tier.level,
        title: tier.title,
        notions: tier.notions.map((n) => ({ label: n.label, checked: n.checkedAt !== null })),
      }))
    );
    return { name: skill.name, level: computed.level, started: computed.started };
  });
}
