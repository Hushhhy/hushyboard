import type { ResumeContent } from './schema';

// Guard on a CV adapted by Gemini: it may rewrite and reorder, never invent.
// Pure, unit-tested. Everything factual comes back from the base CV:
// - header, education, languages and interests are the base ones (only the title may change);
// - experiences and projects must match a base one, and keep its dates, place and links;
//   base items the AI dropped are put back at the end;
// - a skill must be on the base CV or be a known skill (level ≥ 1); a skill Alex has only
//   started (level 0) is allowed with the « en cours d'apprentissage » mention.

export const LEARNING_SUFFIX = ' (en cours d’apprentissage)';

const norm = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\(en cours d['’]apprentissage\)/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .trim();

export function guardAdaptedResume(
  base: ResumeContent,
  adapted: ResumeContent,
  skills: { known: string[]; learning: string[] }
): ResumeContent {
  // Experiences: matched on organization and title.
  const experienceKey = (item: { organization: string; title: string }) =>
    `${norm(item.organization)}|${norm(item.title)}`;
  const baseExperiences = new Map(base.experiences.map((item) => [experienceKey(item), item]));
  const experiences = adapted.experiences
    .filter((item) => baseExperiences.has(experienceKey(item)))
    .map((item) => {
      const original = baseExperiences.get(experienceKey(item))!;
      return { ...original, bullets: item.bullets.length > 0 ? item.bullets : original.bullets };
    });
  const keptExperiences = new Set(experiences.map(experienceKey));
  experiences.push(...base.experiences.filter((item) => !keptExperiences.has(experienceKey(item))));

  // Projects: matched on name; technologies only from the base project.
  const baseProjects = new Map(base.projects.map((item) => [norm(item.name), item]));
  const projects = adapted.projects
    .filter((item) => baseProjects.has(norm(item.name)))
    .map((item) => {
      const original = baseProjects.get(norm(item.name))!;
      const allowed = new Map(original.technologies.map((tech) => [norm(tech), tech]));
      const technologies = item.technologies
        .map((tech) => allowed.get(norm(tech)))
        .filter((tech): tech is string => tech !== undefined);
      const missing = original.technologies.filter((tech) => !technologies.includes(tech));
      return {
        ...original,
        description: item.description || original.description,
        technologies: [...new Set([...technologies, ...missing])],
      };
    });
  const keptProjects = new Set(projects.map((item) => norm(item.name)));
  projects.push(...base.projects.filter((item) => !keptProjects.has(norm(item.name))));

  // Skills.
  const onCv = new Set(base.skillGroups.flatMap((group) => group.items.map(norm)));
  const known = new Set(skills.known.map(norm));
  const learning = new Set(skills.learning.map(norm));
  const skillGroups = adapted.skillGroups
    .map((group) => ({
      name: group.name,
      items: [
        ...new Set(
          group.items.flatMap((item) => {
            const key = norm(item);
            const label = item.replace(/\s*\(en cours d['’]apprentissage\)/i, '').trim();
            if (onCv.has(key) || known.has(key)) return [label];
            if (learning.has(key)) return [`${label}${LEARNING_SUFFIX}`];
            return [];
          })
        ),
      ],
    }))
    .filter((group) => group.items.length > 0);
  // Base skills the AI dropped stay on the CV, in a last group.
  const listed = new Set(skillGroups.flatMap((group) => group.items.map(norm)));
  const dropped = base.skillGroups
    .flatMap((group) => group.items)
    .filter((item) => !listed.has(norm(item)));
  if (dropped.length > 0) skillGroups.push({ name: 'Autres compétences', items: dropped });

  return {
    header: { ...base.header, title: adapted.header.title || base.header.title },
    summary: adapted.summary || base.summary,
    skillGroups: skillGroups.slice(0, 12),
    experiences: experiences.slice(0, 15),
    projects: projects.slice(0, 15),
    education: base.education,
    languages: base.languages,
    interests: base.interests,
  };
}
