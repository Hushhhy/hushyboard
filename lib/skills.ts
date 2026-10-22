// Skill levels, computed from checked notions (never stored).
// No "@/" imports here: prisma/seed.ts runs this file directly with Node.

export const MAX_SKILL_LEVEL = 5;

export type SkillCategoryKey = 'WEB_FRONT' | 'BACKEND_DATA' | 'DATA_ENGINEERING' | 'SYSTEM_TOOLS';

export const SKILL_CATEGORY_LABELS: Record<SkillCategoryKey, string> = {
  WEB_FRONT: 'Web front',
  BACKEND_DATA: 'Back-end et bases de données',
  DATA_ENGINEERING: 'Data engineering',
  SYSTEM_TOOLS: 'Système et outils de dev',
};

export type NotionInput = { label: string; checked: boolean };
export type TierInput = { level: number; title: string; notions: NotionInput[] };

export type SkillLevel = {
  // Highest n such that every notion of tiers 1..n is checked (0 if tier 1 is incomplete).
  level: number;
  // The next tier has at least one checked notion.
  started: boolean;
  // Tier being worked on (level + 1), or null at level 5.
  currentTier: TierInput | null;
  // Unchecked notions of the current tier, in order.
  remaining: string[];
};

// A tier counts as acquired only if it has notions and they are all checked:
// an empty tier (a skill just created) never counts.
function isTierAcquired(tier: TierInput | undefined): boolean {
  return !!tier && tier.notions.length > 0 && tier.notions.every((notion) => notion.checked);
}

export function computeSkillLevel(tiers: TierInput[]): SkillLevel {
  const byLevel = new Map(tiers.map((tier) => [tier.level, tier]));
  let level = 0;
  while (level < MAX_SKILL_LEVEL && isTierAcquired(byLevel.get(level + 1))) level += 1;

  const currentTier = level < MAX_SKILL_LEVEL ? (byLevel.get(level + 1) ?? null) : null;
  const started = !!currentTier && currentTier.notions.some((notion) => notion.checked);
  const remaining = currentTier
    ? currentTier.notions.filter((notion) => !notion.checked).map((notion) => notion.label)
    : [];

  return { level, started, currentTier, remaining };
}

// "3 / 5", or "1+ / 5" when the next tier is started.
export function formatSkillLevel({
  level,
  started,
}: Pick<SkillLevel, 'level' | 'started'>): string {
  return `${level}${started ? '+' : ''} / ${MAX_SKILL_LEVEL}`;
}

// Page title of a skill (« Roadmap » tab):
// "JavaScript · niveau 1, plus qu'une notion avant le niveau 2", "…, 3 notions avant le niveau 3".
export function describeSkillLevel(name: string, skill: SkillLevel): string {
  const { level, remaining, currentTier } = skill;
  if (!currentTier) return `${name} · niveau ${MAX_SKILL_LEVEL} sur ${MAX_SKILL_LEVEL}`;
  const next = currentTier.level;
  if (remaining.length === 0) return `${name} · niveau ${level}`;
  if (remaining.length === 1) {
    return `${name} · niveau ${level}, plus qu’une notion avant le niveau ${next}`;
  }
  return `${name} · niveau ${level}, ${remaining.length} notions avant le niveau ${next}`;
}

// Title on the « Référence » tab: "CSS · niveau 3, 103 propriétés connues sur 520".
// The noun and its agreement depend on what the list holds.
const REFERENCE_NOUNS: Record<string, { noun: string; known: string; one: string }> = {
  css: { noun: 'propriétés', known: 'connues', one: 'une propriété' },
  html: { noun: 'éléments', known: 'connus', one: 'un élément' },
  javascript: { noun: 'méthodes et objets', known: 'connus', one: 'une méthode' },
  git: { noun: 'commandes', known: 'connues', one: 'une commande' },
  docker: { noun: 'commandes', known: 'connues', one: 'une commande' },
  'linux-bash': { noun: 'commandes', known: 'connues', one: 'une commande' },
};
const DEFAULT_NOUN = { noun: 'entrées', known: 'connues', one: 'une entrée' };

export function referenceNoun(slug: string): string {
  return (REFERENCE_NOUNS[slug] ?? DEFAULT_NOUN).noun;
}

// Placeholder of the search field: « Rechercher une propriété ».
export function referenceSearchLabel(slug: string): string {
  return `Rechercher ${(REFERENCE_NOUNS[slug] ?? DEFAULT_NOUN).one}`;
}

export function describeReference(
  name: string,
  slug: string,
  level: number,
  known: number,
  total: number
): string {
  const { noun, known: agreement } = REFERENCE_NOUNS[slug] ?? DEFAULT_NOUN;
  return `${name} · niveau ${level}, ${known} ${noun} ${agreement} sur ${total}`;
}

// The roadmap's « prochaine » notion: the first unknown one, in roadmap order
// (that is, in the lowest incomplete level). Null when everything is known.
export function nextNotionId(
  tiers: { level: number; notions: { id: string; checked: boolean }[] }[]
): string | null {
  const ordered = [...tiers].sort((a, b) => a.level - b.level);
  for (const tier of ordered) {
    const notion = tier.notions.find((item) => !item.checked);
    if (notion) return notion.id;
  }
  return null;
}

// Highlighting language of a skill's code, when a sheet does not give one (shiki ids).
const SKILL_CODE_LANGUAGES: Record<string, string> = {
  html: 'html',
  css: 'css',
  javascript: 'javascript',
  typescript: 'typescript',
  react: 'tsx',
  nextjs: 'tsx',
  tailwind: 'html',
  sql: 'sql',
  nodejs: 'javascript',
  'php-symfony': 'php',
  prisma: 'prisma',
  python: 'python',
  pandas: 'python',
  c: 'c',
  cpp: 'cpp',
  git: 'shellscript',
  docker: 'docker',
  'linux-bash': 'shellscript',
};

export function codeLanguage(lang: string | undefined, skillSlug: string): string {
  const given = lang?.trim().toLowerCase();
  if (given && /^[a-z0-9+#-]+$/.test(given)) {
    if (given === 'bash' || given === 'shell' || given === 'sh') return 'shellscript';
    return given;
  }
  return SKILL_CODE_LANGUAGES[skillSlug] ?? 'text';
}

// Guided re-evaluation, level by level: it stops after the first level with 2 « Non » or more.
export const STOP_AFTER_NO = 2;

export function shouldStopAssessment(answers: boolean[]): boolean {
  return answers.filter((known) => !known).length >= STOP_AFTER_NO;
}

// Status of one tier, shown as a chip on the skill page.
export type TierStatus = 'ACQUIRED' | 'IN_PROGRESS' | 'TO_DISCOVER';

export function tierStatus(tier: TierInput): TierStatus {
  const checked = tier.notions.filter((notion) => notion.checked).length;
  if (tier.notions.length > 0 && checked === tier.notions.length) return 'ACQUIRED';
  if (checked > 0) return 'IN_PROGRESS';
  return 'TO_DISCOVER';
}

// --- "Prochains objectifs" -------------------------------------------------------

// Current search is full stack: these level-0 skills still deserve an objective.
export const FULL_STACK_FOCUS = ['typescript', 'react', 'nextjs', 'nodejs'];

// Category order for a full-stack search (most relevant first).
const FULL_STACK_CATEGORY_ORDER: SkillCategoryKey[] = [
  'WEB_FRONT',
  'BACKEND_DATA',
  'SYSTEM_TOOLS',
  'DATA_ENGINEERING',
];

export type ObjectiveSkill = {
  slug: string;
  name: string;
  category: SkillCategoryKey;
  position: number;
  tiers: TierInput[];
};

export type Objective = {
  slug: string;
  name: string;
  // "map, filter, reduce"
  notions: string;
  // "termine le niveau 2" when the tier is started, else "niveau 4".
  hint: string;
};

const NOTIONS_PER_OBJECTIVE = 3;

// "Types de base" → "types de base" inside a sentence; acronyms ("JSX", "DOM") stay as they are.
export function lowerFirst(label: string): string {
  return /^\p{Lu}\p{Ll}/u.test(label) ? label[0].toLocaleLowerCase('fr') + label.slice(1) : label;
}

// Up to 5 objectives: started tiers first, then the next tier of known skills and of
// full-stack skills not started yet, ordered by relevance to a full-stack search.
export function nextObjectives(skills: ObjectiveSkill[], limit = 5): Objective[] {
  const relevance = (skill: ObjectiveSkill) =>
    FULL_STACK_CATEGORY_ORDER.indexOf(skill.category) * 1000 + skill.position;

  const candidates = skills
    .map((skill) => ({ skill, computed: computeSkillLevel(skill.tiers) }))
    .filter(({ skill, computed }) => {
      if (!computed.currentTier || computed.remaining.length === 0) return false;
      return computed.level >= 1 || computed.started || FULL_STACK_FOCUS.includes(skill.slug);
    })
    .sort((a, b) => {
      if (a.computed.started !== b.computed.started) return a.computed.started ? -1 : 1;
      return relevance(a.skill) - relevance(b.skill);
    });

  return candidates.slice(0, limit).map(({ skill, computed }) => ({
    slug: skill.slug,
    name: skill.name,
    notions: computed.remaining.slice(0, NOTIONS_PER_OBJECTIVE).map(lowerFirst).join(', '),
    hint: computed.started
      ? `termine le niveau ${computed.currentTier!.level}`
      : `niveau ${computed.currentTier!.level}`,
  }));
}

// URL slug from a skill name: "PHP / Symfony" → "php-symfony", "C++" → "cpp".
export function slugifySkillName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\+/g, 'p')
    .replace(/#/g, 'sharp')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
