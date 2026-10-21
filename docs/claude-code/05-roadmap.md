# 05 · Roadmap

Work through the phases in order. Each phase is one branch and one PR. A phase is **done** when:

- its acceptance list passes;
- `npm run lint && npm run typecheck && npm run format:check && npm run build` and `npx vitest run` are green;
- the PR contains a French « Comment tester » checklist for Alex.

When a phase needs an action from Alex (⚑), stop, list exactly what he must do (link to `06-alex-actions.md`), and wait.

## Current state (22/10/2026)

**Done:**

- login with the neural background;
- GitHub auth restricted to Alex's account;
- `proxy.ts`;
- design tokens;
- Prisma schema with Career, Habits, Leisure and Finance models (3 migrations);
- `lib/xp.ts`, `lib/finance.ts`, `lib/dates.ts`, `lib/session.ts`;
- the app shell `app/(app)/layout.tsx` (sidebar, nav links, account menu, sign out);
- the home dashboard with real data and empty states (`components/home/home-dashboard.tsx`);
- `app/not-found.tsx` (« Cette page arrive bientôt. »).

Deployed on Vercel (`hushyboard.vercel.app`) with Neon.

## Phase 0: housekeeping

- Make sure the old `app/page.tsx` is gone. `app/(app)/page.tsx` serves `/`.
- Set the brand to `Hushyboard` everywhere (sidebar, layout title, package name `hushyboard`).
- Add `zod` and `lib/env.ts`.
- Add Vitest: tests for `lib/xp.ts` (levels, cap, curve) and `lib/dates.ts`.
- Add a GitHub Actions CI: lint, typecheck, format:check, test, build with a dummy `DATABASE_URL`. Never touch the database in CI.
- Update the sidebar to v2: add Mails (an item with no count yet), remove Comics, rename the Career « Analyses » item to « Progression » (`/career/progress`), and keep the order from `01-product-spec.md`.
- **Done when** CI is green on the PR and the sidebar matches the v2 Figma frames.

## Phase 1: shared UI kit

From `design/components.md`, build `components/ui/*` in English:

- Button (primary, secondary, quiet, icon);
- StatusPill;
- Checkbox (habit style);
- Ruler (segments, partial);
- BarRow;
- Tabs (link tabs);
- MonthPicker;
- LevelMedal;
- Trophy;
- EmptyState and ErrorState (both exist, extend them);
- Skeleton;
- UndoStatus (`role=status`);
- SidePanel (non-modal, URL state `?panel=`);
- DeleteDialog (native `<dialog>`);
- Chip and Tag;
- KeyValueList.

Also add a reward context (`useRewards`) with the persistent toast.

**Done when** each component is used on at least one real page in later phases. No `/styleguide` page is needed.

## Phase 2: profile and skills

- Migration from `03-data-model.md` (skills, tools, profile info, timeline), plus the idempotent seed from `data/skills-catalog.json`.
- `lib/skills.ts`: `computeSkillLevel(tiers)` → `{ level, started, currentTier, remaining }`, unit-tested on the 18 seeded skills.
- `/career/profile` (Figma 31:598), including « Modifier le profil » (side panel), tools menu, timeline CRUD, « Prochains objectifs ».
- `/career/profile/[skillSlug]` (Figma 32:715): checking a notion (optimistic, undoable), collapse and expand tiers, guided « Me réévaluer » saving `SkillAssessment`, « Historique », edit mode, « Ajouter une compétence ».

**Done when:**

- JavaScript shows level 1 with the pale 2nd segment and « 1+ / 5 »;
- checking « map, filter, reduce » turns it into level 2 everywhere, including the profile and the objectives card;
- Git shows « 1+ / 5 »;
- HTML shows 5 / 5.

## Phase 3: CV, AI base, certifications, courses ⚑

- ⚑ Alex creates the Gemini API key.
- `lib/ai/*` (wrapper, prompts, style guide), `AiUsage`, `lib/resume/schema.ts` (`ResumeContent`).
- `/career/resume` (Figma 15:923 adapted):
  - import the CV PDF, have Gemini extract it, review it in a form editor and save;
  - versions with a default one;
  - PDF download.
- `/career/certifications` (Figma 15:1371) and `/career/courses` (mockup « Cours »): CRUD, progress, XP on completion and on obtention, links to skills.

**Done when** Alex imports his real CV, corrects one field, downloads a clean PDF, and completing a test course grants 60 XP exactly once.

## Phase 4: job search (full stack)

- Migration (resume adaptation, offer fields, cover letter, application kind, `FOLLOWED_UP`, watch sources and keywords).
- Tabs: Candidatures (Figma 11:101), Veille (13:169 + paste and extract), offer detail (33:789: CV analysis, adapted CV PDF, cover letter copy, download and regenerate, editable letter), Candidatures spontanées (`screens-v2.html`), Analyses (14:310).
- Follow-up logic (+14 days, « À relancer »), status changes with events and XP (cap of 75 per day on applications).

**Done when:**

- pasting a real full-stack offer fills the fields;
- the analysis and the letter generate in under 30 s;
- the letter reads like Alex (style guide) and invents nothing;
- « Marquer postulée » creates the application and +15 XP (only with a CV attached);
- a spontaneous application appears in the table and in « À relancer » after 14 days.

## Phase 5: mails ⚑

- ⚑ Alex creates the Google Cloud project, enables the Gmail API, sets up the consent screen (Testing, himself as test user), creates the OAuth client with both redirect URIs, and adds the env vars locally and on Vercel.
- `lib/crypto.ts` (AES-256-GCM), the connect, callback and disconnect routes, `lib/gmail/*`, `/mail` (`screens-v2.html`): labels, list with search and pagination, reader (sanitized iframe), file into a label (undo), new label, unsubscribe (with unit-tested parsing), recruiter-reply banner with validation, unread count in the sidebar.

**Done when:**

- Alex connects Gmail;
- he reads a mail;
- he files it into a label created from the app, and sees it in Gmail;
- he unsubscribes from a real newsletter;
- a test mail sent from another address with a company name matching an application shows the banner, and accepting it updates the application.

## Phase 6: habits and goals

`/habits`, `/habits/history` and `/habits/goals` (mockups « Habitudes ×3 »):

- check-in with a server action (optimistic, undo) and an optional quantity;
- pauses;
- computed streaks (unit-tested, including pauses and non-active days);
- heatmap with an accessible table;
- goals and steps;
- streak trophies.

## Phase 7: leisure, video games

`/leisure/games` (mockup « Jeux vidéo »): franchise grouping and story order, status, progress, play time, « Ensuite dans la franchise ».

## Phase 8: finances

`/finance`, `/finance/transactions` and `/finance/import` (mockups « Finances ×3 »):

- CSV import with papaparse: column mapping, preview, dedupe with `importHash`, the file never stored, unit-tested parser;
- categories (default list, editable);
- month view;
- manual entries.

## Phase 9: rewards, analytics, palette, polish

- Trophy catalog and unlocks, `/trophies` (vitrine and history), level-up celebration (reduced motion respected).
- `/career/progress` « Progression » (`v1-career-progress.png`).
- ⌘K palette.
- Home additions: recruiter replies, follow-ups due.
- `/legal` update (processors, Gemini free-tier notice).
- « Supprimer toutes mes données ».
- Responsive pass at 1024 px and on a phone.
- Lighthouse accessibility ≥ 95 on the main pages.
