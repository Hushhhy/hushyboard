import { STYLE_GUIDE } from '@/lib/ai/style-guide';
import type { CvAnalysis, OfferExtract } from '@/lib/job-search-schemas';
import type { ResumeContent } from '@/lib/resume/schema';

// Prompts of the job search. Instructions in English, output in French.
// Sent: the offer text and Alex's CV (professional data he chose to share with the AI).

// Offer texts can be long (whole job board pages): the useful part comes first.
const MAX_OFFER_CHARS = 12_000;
const clip = (text: string) => text.slice(0, MAX_OFFER_CHARS);

export type OfferForPrompt = {
  title: string;
  company: string;
  location: string | null;
  contract: string | null;
  remotePolicy: string | null;
  skills: string[];
  description: string | null;
};

function offerBlock(offer: OfferForPrompt): string {
  return `Job offer:
- Title: ${offer.title}
- Company: ${offer.company}
- Location: ${offer.location ?? 'unknown'}
- Contract: ${offer.contract ?? 'unknown'}
- Remote: ${offer.remotePolicy ?? 'unknown'}
- Required skills: ${offer.skills.join(', ') || 'unknown'}
Full text:
"""
${clip(offer.description ?? '')}
"""`;
}

export function offerExtractPrompt(text: string, url: string | null): string {
  return `Extract the job offer below into the JSON fields. Use only what the text says; leave a field
empty when it is absent. The company is the employer, never the job board.${url ? `\nOffer URL: ${url}` : ''}
"""
${clip(text)}
"""`;
}

export type SkillLevelForPrompt = { name: string; level: number; started: boolean };

function skillLines(skills: SkillLevelForPrompt[]): string {
  return skills
    .map(
      (skill) =>
        `- ${skill.name}: level ${skill.level}/5${skill.level === 0 && skill.started ? ' (started, being learned)' : ''}`
    )
    .join('\n');
}

export function cvAnalysisPrompt(input: {
  offer: OfferForPrompt;
  resume: ResumeContent;
  skills: SkillLevelForPrompt[];
}): string {
  return `You compare a junior developer's CV with a job offer, honestly.
${offerBlock(input.offer)}

CV (JSON):
${JSON.stringify(input.resume)}

Self-assessed skill levels (1 = bases, 5 = senior):
${skillLines(input.skills)}

- score: realistic match from 0 to 100 for this junior profile; do not flatter.
- strengths: skills of the offer the CV or the levels prove (level 1 or more).
- gaps: skills of the offer that are missing or at level 0.
- changes: 3 to 5 concrete changes an adapted CV would make (title, order of projects and skills,
  wording of the summary, the offer's exact keywords for ATS). Only rewriting and reordering:
  never add an experience, project, diploma, date or skill that is not in the CV or the
  levels above.`;
}

export function cvAdaptPrompt(input: {
  offer: OfferForPrompt;
  resume: ResumeContent;
  analysis: CvAnalysis;
  skills: SkillLevelForPrompt[];
}): string {
  return `Adapt this CV to the job offer. Answer with the full CV in the same JSON format.
${offerBlock(input.offer)}

Base CV (JSON):
${JSON.stringify(input.resume)}

Planned changes:
${input.analysis.changes.map((change) => `- ${change}`).join('\n')}

Skill levels (1 = bases, 5 = senior):
${skillLines(input.skills)}

Strict rules:
- Rewrite and reorder only. Never invent an experience, project, diploma, date, company,
  link or skill. Keep every experience, project and diploma of the base CV.
- Keep names, companies, schools and dates exactly as in the base CV.
- You may change the job title (printed first, above the name), the summary, bullet wording,
  and the order of experiences, projects, skill groups and skills to put what the offer asks first.
- A skill at level 0 may appear only if it is marked "started", followed by
  " (en cours d’apprentissage)".
- Everything in French, concise, no clichés.

The CV is read by an applicant tracking system (ATS) before a recruiter:
- Job title: reuse the offer's job title word for word when it honestly fits the profile
  (e.g. "Développeur Full Stack Junior"), without "(H/F)" or the contract type.
- Keywords: write each skill or technology the candidate really has exactly as the offer
  spells it ("PostgreSQL", not "Postgres"; "Node.js", not "Node"). Put them in the summary,
  the skill groups and the bullets where they are true.
- Summary: 2 or 3 plain sentences with the title and the main matching keywords.
- Bullets: start with an action verb, one fact per bullet, no symbols or emojis.
- Skill group names: short and standard ("Langages", "Front-end", "Back-end",
  "Bases de données", "Outils").
- Spell out an acronym once when the offer does ("API REST", "CI/CD").`;
}

export function coverLetterPrompt(input: { offer: OfferForPrompt; resume: ResumeContent }): string {
  return `Write a cover letter for this job offer.
${offerBlock(input.offer)}

Candidate's CV, adapted to the offer (JSON) — the only source of facts:
${JSON.stringify(input.resume)}

${STYLE_GUIDE}

Constraints:
- 180 to 250 words, plain text, paragraphs separated by one empty line.
- Use only facts from the CV: never invent an experience, a figure, a skill or a date.
  Skills marked "en cours d’apprentissage" are presented as being learned.
- Mention the company and the role; say why this offer in one concrete sentence based on the
  offer text, without praising the company.
- No subject line, no address block, no date: start with "Bonjour,".`;
}

export type { OfferExtract };
