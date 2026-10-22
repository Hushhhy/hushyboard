// Prompt for "cv-import": the CV PDF is attached inline; the answer follows ResumeContent.
// Instructions in English, output in French (the CV language).
export const CV_IMPORT_PROMPT = `You receive a CV (résumé) as a PDF. Extract its content into the JSON schema provided.

Rules:
- Copy the text faithfully, in French, as written in the CV. Fix obvious typos only.
- Never invent anything: no experience, project, diploma, date, skill or link that is not in the CV.
- Use an empty string for a missing text field and an empty array for a missing list.
- Keep dates as written (e.g. "sept. 2023", "2023 – 2026"); use "en cours" when the CV says ongoing.
- Experiences: one bullet per achievement or task, short sentences.
- Skills: keep the CV's own grouping; if there is none, group them as "Langages", "Frameworks", "Outils".
- Put school curricula in "education" and personal or school projects in "projects".`;
