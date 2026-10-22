import { describe, expect, it } from 'vitest';
import catalog from '../docs/claude-code/data/skills-catalog.json';
import {
  codeLanguage,
  computeSkillLevel,
  describeReference,
  describeSkillLevel,
  formatSkillLevel,
  lowerFirst,
  nextNotionId,
  nextObjectives,
  referenceSearchLabel,
  shouldStopAssessment,
  slugifySkillName,
  tierStatus,
  type ObjectiveSkill,
  type SkillCategoryKey,
  type TierInput,
} from './skills';

// The seeded skills, with "known" mapped to "checked".
const seeded: ObjectiveSkill[] = catalog.skills.map((skill) => ({
  slug: skill.slug,
  name: skill.name,
  category: skill.category as SkillCategoryKey,
  position: skill.position,
  tiers: skill.tiers.map((tier) => ({
    level: tier.level,
    title: tier.title,
    notions: tier.notions.map((notion) => ({ label: notion.label, checked: notion.known })),
  })),
}));

const bySlug = (slug: string) => seeded.find((skill) => skill.slug === slug)!;

// Returns a copy of the skill with one notion checked.
function check(skill: ObjectiveSkill, label: string): ObjectiveSkill {
  return {
    ...skill,
    tiers: skill.tiers.map((tier) => ({
      ...tier,
      notions: tier.notions.map((notion) =>
        notion.label === label ? { ...notion, checked: true } : notion
      ),
    })),
  };
}

describe('computeSkillLevel on the 18 seeded skills', () => {
  it.each(catalog.skills.map((skill) => [skill.slug, skill.computedLevel]))(
    '%s is level %i',
    (slug, expected) => {
      expect(computeSkillLevel(bySlug(slug as string).tiers).level).toBe(expected);
    }
  );

  it('JavaScript is level 1 with tier 2 started, one notion left', () => {
    const js = computeSkillLevel(bySlug('javascript').tiers);
    expect(js).toMatchObject({ level: 1, started: true, remaining: ['map, filter, reduce'] });
    expect(js.currentTier?.level).toBe(2);
    expect(formatSkillLevel(js)).toBe('1+ / 5');
  });

  it('checking "map, filter, reduce" moves JavaScript to level 2', () => {
    const js = computeSkillLevel(check(bySlug('javascript'), 'map, filter, reduce').tiers);
    expect(js.level).toBe(2);
    expect(js.started).toBe(false);
    expect(formatSkillLevel(js)).toBe('2 / 5');
  });

  it('Git shows 1+ / 5 and HTML 5 / 5', () => {
    expect(formatSkillLevel(computeSkillLevel(bySlug('git').tiers))).toBe('1+ / 5');
    const html = computeSkillLevel(bySlug('html').tiers);
    expect(formatSkillLevel(html)).toBe('5 / 5');
    expect(html.currentTier).toBeNull();
    expect(html.remaining).toEqual([]);
  });
});

describe('computeSkillLevel edge cases', () => {
  const tier = (level: number, ...checked: boolean[]): TierInput => ({
    level,
    title: `Palier ${level}`,
    notions: checked.map((value, index) => ({ label: `n${level}.${index}`, checked: value })),
  });

  it('a new skill with empty tiers is level 0, not level 5', () => {
    const result = computeSkillLevel([1, 2, 3, 4, 5].map((level) => tier(level)));
    expect(result).toMatchObject({ level: 0, started: false, remaining: [] });
  });

  it('a gap stops the level even if later tiers are checked', () => {
    expect(computeSkillLevel([tier(1, true), tier(2, false), tier(3, true)]).level).toBe(1);
  });

  it('does not depend on tier order', () => {
    expect(computeSkillLevel([tier(2, true), tier(1, true), tier(3, false, true)])).toMatchObject({
      level: 2,
      started: true,
    });
  });

  it('gives tier statuses', () => {
    expect(tierStatus(tier(1, true, true))).toBe('ACQUIRED');
    expect(tierStatus(tier(1, true, false))).toBe('IN_PROGRESS');
    expect(tierStatus(tier(1, false))).toBe('TO_DISCOVER');
    expect(tierStatus(tier(1))).toBe('TO_DISCOVER');
  });
});

describe('describeSkillLevel', () => {
  it('says "plus qu’une notion" when one notion is left before the next level', () => {
    expect(describeSkillLevel('JavaScript', computeSkillLevel(bySlug('javascript').tiers))).toBe(
      'JavaScript · niveau 1, plus qu’une notion avant le niveau 2'
    );
  });

  it('counts the notions left before the next level', () => {
    expect(describeSkillLevel('Git', computeSkillLevel(bySlug('git').tiers))).toBe(
      'Git · niveau 1, 2 notions avant le niveau 2'
    );
    expect(describeSkillLevel('CSS', computeSkillLevel(bySlug('css').tiers))).toBe(
      'CSS · niveau 3, 4 notions avant le niveau 4'
    );
  });

  it('handles the top level', () => {
    expect(describeSkillLevel('HTML', computeSkillLevel(bySlug('html').tiers))).toBe(
      'HTML · niveau 5 sur 5'
    );
  });
});

describe('describeReference', () => {
  it('uses the noun of the skill', () => {
    expect(describeReference('CSS', 'css', 3, 103, 520)).toBe(
      'CSS · niveau 3, 103 propriétés connues sur 520'
    );
    expect(describeReference('HTML', 'html', 5, 40, 160)).toBe(
      'HTML · niveau 5, 40 éléments connus sur 160'
    );
    expect(describeReference('SQL', 'sql', 3, 12, 90)).toBe(
      'SQL · niveau 3, 12 entrées connues sur 90'
    );
  });

  it('is singular for 0 and 1, and says when there is no list yet', () => {
    expect(describeReference('CSS', 'css', 3, 1, 726)).toBe(
      'CSS · niveau 3, 1 propriété connue sur 726'
    );
    expect(describeReference('HTML', 'html', 5, 0, 160)).toBe(
      'HTML · niveau 5, 0 élément connu sur 160'
    );
    expect(describeReference('Git', 'git', 1, 0, 0)).toBe(
      'Git · niveau 1, référence pas encore créée'
    );
  });

  it('gives the search placeholder', () => {
    expect(referenceSearchLabel('css')).toBe('Rechercher une propriété');
    expect(referenceSearchLabel('sql')).toBe('Rechercher une entrée');
  });
});

describe('shouldStopAssessment', () => {
  it('stops after a level with 2 « Non » or more', () => {
    expect(shouldStopAssessment([true, true, false])).toBe(false);
    expect(shouldStopAssessment([true, false, false])).toBe(true);
    expect(shouldStopAssessment([])).toBe(false);
  });
});

describe('nextObjectives', () => {
  it('matches the profile mockup on the seeded skills', () => {
    expect(nextObjectives(seeded)).toEqual([
      {
        slug: 'javascript',
        name: 'JavaScript',
        notions: 'map, filter, reduce',
        hint: 'termine le niveau 2',
      },
      expect.objectContaining({ slug: 'git', hint: 'termine le niveau 2' }),
      expect.objectContaining({ slug: 'css', hint: 'niveau 4' }),
      expect.objectContaining({ slug: 'typescript', hint: 'niveau 1' }),
      expect.objectContaining({ slug: 'react', hint: 'niveau 1' }),
    ]);
  });

  it('updates once JavaScript reaches level 2', () => {
    const skills = seeded.map((skill) =>
      skill.slug === 'javascript' ? check(skill, 'map, filter, reduce') : skill
    );
    const objectives = nextObjectives(skills);
    expect(objectives.map((objective) => objective.slug)).toEqual([
      'git',
      'css',
      'javascript',
      'typescript',
      'react',
    ]);
    expect(objectives.find((objective) => objective.slug === 'javascript')?.hint).toBe('niveau 3');
  });

  it('never lists a skill at level 5 or a level-0 skill outside the full-stack focus', () => {
    const slugs = nextObjectives(seeded, 50).map((objective) => objective.slug);
    expect(slugs).not.toContain('html');
    expect(slugs).not.toContain('php-symfony');
    expect(slugs).not.toContain('prisma');
  });

  it('shows at most 3 notions', () => {
    const css = nextObjectives(seeded, 50).find((o) => o.slug === 'css');
    expect(css?.notions.split(', ').length).toBeLessThanOrEqual(3);
  });
});

describe('slugifySkillName', () => {
  it('builds URL-safe slugs', () => {
    expect(slugifySkillName('PHP / Symfony')).toBe('php-symfony');
    expect(slugifySkillName('C++')).toBe('cpp');
    expect(slugifySkillName('Linux / Bash')).toBe('linux-bash');
    expect(slugifySkillName('Écosystème Node.js')).toBe('ecosysteme-node-js');
    expect(slugifySkillName('C#')).toBe('csharp');
  });
});

describe('lowerFirst', () => {
  it('lowercases a capitalised word but keeps acronyms', () => {
    expect(lowerFirst('Types de base')).toBe('types de base');
    expect(lowerFirst('Écrire un test')).toBe('écrire un test');
    expect(lowerFirst('JSX')).toBe('JSX');
    expect(lowerFirst('map, filter, reduce')).toBe('map, filter, reduce');
  });
});

describe('nextNotionId', () => {
  it('is the first unknown notion of the lowest incomplete level', () => {
    const tiers = [
      { level: 2, notions: [{ id: 'b1', checked: false }] },
      {
        level: 1,
        notions: [
          { id: 'a1', checked: true },
          { id: 'a2', checked: false },
        ],
      },
    ];
    expect(nextNotionId(tiers)).toBe('a2');
  });

  it('skips empty and complete levels, and is null when all is known', () => {
    expect(
      nextNotionId([
        { level: 1, notions: [{ id: 'a1', checked: true }] },
        { level: 2, notions: [] },
        { level: 3, notions: [{ id: 'c1', checked: false }] },
      ])
    ).toBe('c1');
    expect(nextNotionId([{ level: 1, notions: [{ id: 'a1', checked: true }] }])).toBeNull();
  });
});

describe('codeLanguage', () => {
  it('keeps the language given by the sheet, with shell aliases', () => {
    expect(codeLanguage('JavaScript', 'css')).toBe('javascript');
    expect(codeLanguage('bash', 'git')).toBe('shellscript');
  });

  it('falls back to the skill language, then plain text', () => {
    expect(codeLanguage('', 'python')).toBe('python');
    expect(codeLanguage('not a language!', 'react')).toBe('tsx');
    expect(codeLanguage(undefined, 'unknown-skill')).toBe('text');
  });
});
