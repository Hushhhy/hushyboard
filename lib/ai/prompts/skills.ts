// Prompts for the skill pages. Instructions in English, output in French.
// Only skill names and notions are sent: no personal data.

const LEVELS = `Levels: 1 = bases (first contact), 2 = junior autonomous on simple tasks, 3 = comfortable in a real project,
4 = internals and advanced use, 5 = senior (architecture, performance, teaching others).`;

export function skillRoadmapPrompt(skill: string, category: string): string {
  return `You build a learning roadmap for the skill "${skill}" (category: ${category}) for a French student
of École 42 who wants to become a full-stack developer.
${LEVELS}
Return exactly 5 levels. For each: a short French title and 3 to 8 notions in learning order.
A notion is a concrete thing one can check off ("map, filter, reduce", "Jointures INNER et LEFT"),
not a vague theme. No duplicates between levels.`;
}

export function notionSheetPrompt(input: {
  skill: string;
  level: number;
  levelTitle: string;
  notion: string;
  before: string[];
  after: string[];
}): string {
  return `Write a short cheat sheet ("fiche mémo") in French about the notion "${input.notion}"
of the skill "${input.skill}", level ${input.level} ("${input.levelTitle}").
The reader already knows: ${input.before.join(', ') || 'nothing yet in this skill'}.
Coming next: ${input.after.join(', ') || 'nothing'}.

Rules:
- It is a reminder to reread during a project, not a course: concise and precise.
- Code must be correct and idiomatic for current versions, and use the language of the skill.
- The example should come from everyday life: expenses, job applications, habits.
- Comments inside code in French, identifiers in English.
- "related": up to 5 exact names of reference entries (properties, methods, commands) the notion uses,
  written as in the official docs, e.g. "Array.prototype.map", "justify-content", "git rebase".`;
}

export function referenceListPrompt(skill: string): string {
  return `List the reference entries of "${skill}" a developer looks up: commands, functions, methods,
keywords, types, hooks or classes, depending on the skill. Between 60 and 250 entries, no duplicates.
Use the exact name as written in code or a terminal. Group them under short French category labels
(5 to 12 groups). The summary is one short line in French. Mark as common what a junior developer
uses every week.`;
}

export function referenceEntryPrompt(input: {
  skill: string;
  name: string;
  kind: string;
  docUrl: string | null;
}): string {
  return `Explain the ${input.kind.toLowerCase()} "${input.name}" of ${input.skill} in French, for a junior
developer.${input.docUrl ? ` Official documentation: ${input.docUrl}` : ''}
- description: 2 to 4 sentences, what it does and when to use it;
- syntax: the syntax or signature, empty if not relevant;
- values: the common values or options, empty if none;
- example: one short realistic example (code comments in French);
- equivalents: for a CSS property, the Tailwind classes; otherwise close equivalents, or empty;
- summary: one short line for a list.
Be exact; if unsure, say less rather than invent.`;
}
