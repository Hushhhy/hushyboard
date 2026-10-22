// Starting data for Alex's profile: skills (from the 22/10/2026 evaluation), tools,
// profile info and timeline. Run with `npx prisma db seed` (also runs on each Vercel build).
//
// Idempotent and create-only: if the profile already exists, nothing is written,
// so Alex's own changes are never overwritten.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import catalog from '../docs/claude-code/data/skills-catalog.json' with { type: 'json' };
import { computeSkillLevel, type SkillCategoryKey } from '../lib/skills.ts';

const PROFILE = {
  headline: 'Étudiant à 42 Paris · acarpent',
  targetRoles: 'Full stack et/ou data engineer',
  currentSearch: 'Full stack uniquement',
  contracts: 'Stage, alternance, CDI/CDD, VIE',
  zone: 'France et Europe',
  availability: 'Dès maintenant',
  githubUrl: 'https://github.com/Hushhhy',
};

const TIMELINE = [
  {
    period: '2026 – en cours',
    title: 'RNCP niveau 6 · Expert en architecture informatique',
    place: 'École 42 Paris',
    isCurrent: true,
  },
  { period: '2026', title: 'Piscine Python for Data Science', place: 'École 42 Paris' },
  {
    period: '2023 – 2026',
    title: 'Tronc commun 42 : C, Unix, réseau, web',
    place: 'École 42 Paris',
  },
  {
    period: 'Projet perso',
    title: 'Hushyboard : Next.js, Prisma, PostgreSQL',
    place: 'github.com/Hushhhy',
  },
];

const WATCH_KEYWORDS = [
  'développeur full stack',
  'fullstack',
  'React',
  'Node.js',
  'TypeScript',
  'alternance',
  'junior',
];

// The evaluation day, at noon in Paris.
const assessedAt = new Date(`${catalog.assessedAt}T12:00:00+02:00`);

function checkCatalog() {
  for (const skill of catalog.skills) {
    const { level } = computeSkillLevel(
      skill.tiers.map((tier) => ({
        level: tier.level,
        title: tier.title,
        notions: tier.notions.map((notion) => ({ label: notion.label, checked: notion.known })),
      }))
    );
    if (level !== skill.computedLevel) {
      throw new Error(
        `${skill.slug}: computed level ${level}, catalog says ${skill.computedLevel}`
      );
    }
  }
}

async function main() {
  checkCatalog();

  const allowedGithubId = process.env.ALLOWED_GITHUB_ID;
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!allowedGithubId || !connectionString) {
    throw new Error('ALLOWED_GITHUB_ID and DATABASE_URL are required to seed.');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const account = await prisma.account.findFirst({
      where: { providerId: 'github', accountId: allowedGithubId },
      select: { userId: true },
    });
    if (!account) {
      console.log('Seed skipped: sign in once with GitHub, then run `npx prisma db seed`.');
      return;
    }
    const userId = account.userId;

    // Watch keywords (full-stack search), only while the watch is untouched: once Alex has
    // a keyword, a source or an offer, his own choices are never overwritten.
    const [keywords, sources, offers] = await Promise.all([
      prisma.watchKeyword.count({ where: { userId } }),
      prisma.watchSource.count({ where: { userId } }),
      prisma.jobOffer.count({ where: { userId } }),
    ]);
    if (keywords + sources + offers === 0) {
      await prisma.watchKeyword.createMany({
        data: WATCH_KEYWORDS.map((label) => ({ userId, label })),
        skipDuplicates: true,
      });
      console.log(`Seeded ${WATCH_KEYWORDS.length} watch keywords.`);
    }

    if (await prisma.profileInfo.findUnique({ where: { userId } })) {
      console.log('Seed skipped: the profile already exists.');
      return;
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.profileInfo.create({ data: { userId, ...PROFILE } });

        await tx.timelineEntry.createMany({
          data: TIMELINE.map((entry, position) => ({ userId, position, ...entry })),
        });

        await tx.tool.createMany({
          data: catalog.tools.map((tool, position) => ({
            userId,
            position,
            name: tool.name,
            status: tool.status as 'DISCOVERED' | 'USING' | 'MASTERED',
          })),
          skipDuplicates: true,
        });

        for (const skill of catalog.skills) {
          if (await tx.skill.findUnique({ where: { userId_slug: { userId, slug: skill.slug } } })) {
            continue;
          }
          await tx.skill.create({
            data: {
              userId,
              slug: skill.slug,
              name: skill.name,
              category: skill.category as SkillCategoryKey,
              position: skill.position,
              tiers: {
                create: skill.tiers.map((tier) => ({
                  level: tier.level,
                  title: tier.title,
                  notions: {
                    create: tier.notions.map((notion, position) => ({
                      label: notion.label,
                      position,
                      checkedAt: notion.known ? assessedAt : null,
                    })),
                  },
                })),
              },
              assessments: {
                create: {
                  level: skill.computedLevel,
                  started: computeSkillLevel(
                    skill.tiers.map((tier) => ({
                      level: tier.level,
                      title: tier.title,
                      notions: tier.notions.map((n) => ({ label: n.label, checked: n.known })),
                    }))
                  ).started,
                  assessedAt,
                },
              },
            },
          });
        }
      },
      { timeout: 60_000 }
    );

    console.log(
      `Seeded: profile, ${TIMELINE.length} timeline entries, ${catalog.tools.length} tools, ${catalog.skills.length} skills.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
