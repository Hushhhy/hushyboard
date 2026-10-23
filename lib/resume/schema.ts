import { z } from 'zod';

// Structured content of a CV. Stored as JSON on Resume.content, filled by the PDF import
// (Gemini), corrected by Alex in the form editor, and rendered to PDF.
// Field descriptions are sent to Gemini with the JSON schema: keep them precise.

const text = (max: number) => z.string().trim().max(max);

export const resumeHeaderSchema = z.object({
  fullName: text(80).min(1, 'Indique ton nom.').describe('First and last name'),
  title: text(120).describe('Target job title shown under the name, e.g. "Développeur full stack"'),
  email: text(120).describe('Email address, empty if absent'),
  phone: text(40).describe('Phone number as written, empty if absent'),
  location: text(80).describe('City or area, e.g. "Paris"'),
  github: text(160).describe('GitHub URL or handle, empty if absent'),
  linkedin: text(160).describe('LinkedIn URL, empty if absent'),
  website: text(160).describe('Personal website or portfolio URL, empty if absent'),
});

export const resumeSkillGroupSchema = z.object({
  name: text(60).min(1, 'Nomme le groupe.').describe('Group name, e.g. "Langages"'),
  items: z.array(text(60)).max(30).describe('Skills of the group, one per item'),
});

export const resumeExperienceSchema = z.object({
  title: text(120).min(1, 'Indique le poste.').describe('Job or role title'),
  organization: text(120).describe('Company or school'),
  location: text(80),
  start: text(30).describe('Start date as written, e.g. "sept. 2023"'),
  end: text(30).describe('End date as written, or "en cours" / empty if ongoing'),
  bullets: z.array(text(300)).max(10).describe('Achievements, one sentence each'),
});

export const resumeProjectSchema = z.object({
  name: text(120).min(1, 'Nomme le projet.'),
  description: text(400).describe('One or two sentences'),
  technologies: z.array(text(40)).max(15),
  url: text(200).describe('Link to the project or repository, empty if absent'),
});

export const resumeEducationSchema = z.object({
  degree: text(160).min(1, 'Indique le diplôme ou la formation.'),
  school: text(120),
  start: text(30),
  end: text(30),
  details: text(300).describe('Optional short details, empty if none'),
});

export const resumeLanguageSchema = z.object({
  name: text(40).min(1, 'Indique la langue.'),
  level: text(60).describe('e.g. "natif", "B2", "courant"'),
});

export const resumeContentSchema = z.object({
  header: resumeHeaderSchema,
  summary: text(800).describe('Short profile paragraph, empty if absent'),
  skillGroups: z.array(resumeSkillGroupSchema).max(12),
  experiences: z.array(resumeExperienceSchema).max(15),
  projects: z.array(resumeProjectSchema).max(15),
  education: z.array(resumeEducationSchema).max(10),
  languages: z.array(resumeLanguageSchema).max(8),
  interests: z.array(text(60)).max(12),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;

export const EMPTY_RESUME: ResumeContent = {
  header: {
    fullName: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    github: '',
    linkedin: '',
    website: '',
  },
  summary: '',
  skillGroups: [],
  experiences: [],
  projects: [],
  education: [],
  languages: [],
  interests: [],
};

// Reads Resume.content from the database. Returns null when missing or invalid
// (the page then offers to import or edit instead of crashing).
export function parseResumeContent(value: unknown): ResumeContent | null {
  const result = resumeContentSchema.safeParse(value);
  return result.success ? result.data : null;
}

// --- Answers from Gemini ------------------------------------------------------------

type Loose = Record<string, unknown>;
const asObject = (value: unknown): Loose =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Loose) : {};
const asText = (value: unknown, max: number): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : '';
const asList = (value: unknown, max: number): unknown[] =>
  Array.isArray(value) ? value.slice(0, max) : [];
const asTexts = (value: unknown, maxItems: number, maxLength: number): string[] =>
  asList(value, Number.POSITIVE_INFINITY)
    .map((item) => asText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);

// Tidies a CV read or adapted by Gemini before validation: null or missing fields become
// empty, texts and lists are cut to their limits, entries without their required field take
// a neighbouring one (an experience with no title takes its organisation) or are dropped.
// Nothing is invented. Pure, unit-tested.
export function coerceResumeContent(value: unknown, fallbackName = ''): unknown {
  const data = asObject(value);
  const header = asObject(data.header);
  return {
    header: {
      fullName: asText(header.fullName, 80) || fallbackName.trim().slice(0, 80),
      title: asText(header.title, 120),
      email: asText(header.email, 120),
      phone: asText(header.phone, 40),
      location: asText(header.location, 80),
      github: asText(header.github, 160),
      linkedin: asText(header.linkedin, 160),
      website: asText(header.website, 160),
    },
    summary: asText(data.summary, 800),
    skillGroups: asList(data.skillGroups, Number.POSITIVE_INFINITY)
      .map(asObject)
      .map((group) => ({
        name: asText(group.name, 60) || 'Compétences',
        items: asTexts(group.items, 30, 60),
      }))
      .filter((group) => group.items.length > 0)
      .slice(0, 12),
    experiences: asList(data.experiences, Number.POSITIVE_INFINITY)
      .map(asObject)
      .map((item) => {
        const organization = asText(item.organization, 120);
        return {
          title: asText(item.title, 120) || organization,
          organization,
          location: asText(item.location, 80),
          start: asText(item.start, 30),
          end: asText(item.end, 30),
          bullets: asTexts(item.bullets, 10, 300),
        };
      })
      .filter((item) => item.title)
      .slice(0, 15),
    projects: asList(data.projects, Number.POSITIVE_INFINITY)
      .map(asObject)
      .map((item) => ({
        name: asText(item.name, 120),
        description: asText(item.description, 400),
        technologies: asTexts(item.technologies, 15, 40),
        url: asText(item.url, 200),
      }))
      .filter((item) => item.name)
      .slice(0, 15),
    education: asList(data.education, Number.POSITIVE_INFINITY)
      .map(asObject)
      .map((item) => {
        const school = asText(item.school, 120);
        return {
          degree: asText(item.degree, 160) || school,
          school,
          start: asText(item.start, 30),
          end: asText(item.end, 30),
          details: asText(item.details, 300),
        };
      })
      .filter((item) => item.degree)
      .slice(0, 10),
    languages: asList(data.languages, Number.POSITIVE_INFINITY)
      .map(asObject)
      .map((item) => ({ name: asText(item.name, 40), level: asText(item.level, 60) }))
      .filter((item) => item.name)
      .slice(0, 8),
    interests: asTexts(data.interests, 12, 60),
  };
}
