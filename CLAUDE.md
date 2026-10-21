@AGENTS.md

# Hushyboard: instructions for Claude Code

Hushyboard is the private life dashboard of Alexis Carpentier, called Alex below. It covers four areas:

- **Career**, the only area that earns XP: profile and skills, CV, certifications, courses, job search, mails.
- **Habits and goals.**
- **Leisure**: video games only.
- **Finances.**

It has a single user. Alex signs in with GitHub, and only his GitHub account is allowed.

From now on **you write all the code**. Alex is the product owner and tester. He handles anything that needs his accounts: GitHub, Vercel, Google Cloud, API keys, and testing in the browser. When a task needs one of those actions, stop and tell him exactly what to do. The list is in `docs/claude-code/06-alex-actions.md`.

## Read before coding

| File                                        | What it gives you                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `docs/claude-code/01-product-spec.md`       | Every page, feature, data rule and acceptance criterion                           |
| `docs/claude-code/02-design.md`             | Design system, Figma node IDs, HTML mockups, component inventory                  |
| `docs/claude-code/03-data-model.md`         | Prisma changes to make, with existing models to keep                              |
| `docs/claude-code/04-integrations.md`       | Gemini (AI), Gmail API, PDF generation, env vars                                  |
| `docs/claude-code/05-roadmap.md`            | The order of work, phase by phase, with done criteria                             |
| `docs/claude-code/data/skills-catalog.json` | Seed data: 18 skills × 5 tiers of notions, plus Alex's evaluation from 22/10/2026 |

## Non-negotiable rules

1. **Code is 100% English**: identifiers, files, folders, URLs, CSS tokens, classes, comments, commit messages, enum values. **Only text displayed in the UI is French.** Some older docs and the Figma file use French names; translate them, and never copy them into code.
2. **Stack.** Do not add a framework, and do not change the versions without asking:
   - Next.js 16.4 App Router with `cacheComponents: true`. `proxy.ts` replaces middleware. Read `node_modules/next/dist/docs/` first, as AGENTS.md says.
   - React 19.3 and TypeScript strict.
   - Tailwind 4: tokens live in `app/globals.css` under `@theme static`, so use the existing token classes only. Never use raw colors or Tailwind's default palette, which is disabled.
   - Prisma 7.10: the `prisma-client` generator outputs to `generated/prisma` and uses `@prisma/adapter-pg`. **`prisma migrate dev` does not run generate**, so run `npx prisma generate` after it.
   - Better Auth 1.7 with GitHub only.
   - PostgreSQL: Docker locally (`npm run db:up`), Neon in production, deployed on Vercel. `vercel-build` runs `migrate deploy`.
3. **Free to run.** Use only free tiers: Vercel Hobby, Neon free, Gemini API free tier, Gmail API. Never add a paid service.
4. **GDPR and minimal data.**
   - Mail bodies are read live from Gmail and never stored in the database.
   - Uploaded files (bank CSV, CV PDF) are parsed and then discarded; only the extracted data is stored.
   - OAuth tokens are stored encrypted.
   - The legal page `/legal` must list the processors: Vercel, Neon, GitHub, Google (Gmail and Gemini).
5. **Computed, not stored.** XP level, skill level, streaks and balances are computed from source rows. Store events and checks, not totals.
6. **Money is integer cents.** Dates are "Europe/Paris"; use the helpers in `lib/dates.ts`.
7. **Server first.** Pages are server components that read Prisma directly inside `<Suspense>` with a static skeleton. Writes go through Server Actions with Zod validation and `revalidatePath`. Use `'use client'` only for interactivity.
8. **Every server action and route handler starts with `requireUser()`** from `lib/session.ts`. Every query filters by `userId`.
9. **Accessibility.** Follow `docs/claude-code/design/components.md`: real buttons and links, a visible focus ring, labels on inputs, `aria-current` on navigation, and no meaning carried by color alone.
10. **Brand spelling** is `Hushyboard` everywhere: UI, `<title>` and `package.json` name. Fix the old "HushyBoard".

## Commands

```bash
npm run db:up                 # start local Postgres (Docker)
npm run dev                   # http://localhost:3000
npx prisma migrate dev --name <change>   # then:
npx prisma generate
npm run lint && npm run typecheck && npm run format:check && npm run build
```

## How to work

- Follow `05-roadmap.md` in order. **One phase = one branch = one pull request.** Inside a phase, make small commits using Conventional Commits in English (`feat:`, `fix:`, `chore:`…).
- Before finishing a phase:
  - `lint`, `typecheck`, `format:check`, `build` and the unit tests (Vitest, added in phase 0) must all pass;
  - write a short **"How to test"** checklist in French for Alex in the PR description;
  - stop there, because Alex tests and merges.
- Unit-test every pure function: XP and levels, skill level computation, streaks, CSV parsing, `List-Unsubscribe` parsing, follow-up dates.
- When a design detail is missing:
  - copy the closest existing screen;
  - keep one primary button per screen;
  - give every list an empty state with an action;
  - show errors persistently, never as a toast.
- Never commit `.env`. Every new environment variable goes into `.env.example` (with a placeholder) and into `lib/env.ts` (Zod-validated).
- If a decision is genuinely product-level and not covered by the docs, ask Alex. Don't guess on anything irreversible, such as deleting data or sending mail.
