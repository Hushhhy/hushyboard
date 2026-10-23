# 04 · Integrations

## Environment variables

Add every variable to `.env.example` with a placeholder value. Also validate them all in `lib/env.ts`: a Zod schema, parsed once and imported by the server code.

| Variable                                                        | Used for                                                                                                                                                                                                                                                                   | Where Alex gets it                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `DATABASE_URL`, `POSTGRES_*`                                    | DB (existing)                                                                                                                                                                                                                                                              | —                                          |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`                         | Auth (existing)                                                                                                                                                                                                                                                            | —                                          |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ALLOWED_GITHUB_ID` | GitHub sign-in (existing)                                                                                                                                                                                                                                                  | —                                          |
| `GITHUB_TOKEN`                                                  | Read Alex's repos (projects): **fine-grained** personal access token, read-only, _All repositories_, permissions _Metadata: read_ + _Contents: read_                                                                                                                       | github.com → Settings → Developer settings |
| `GEMINI_API_KEY`                                                | AI features                                                                                                                                                                                                                                                                | Google AI Studio                           |
| `GEMINI_MODEL`                                                  | Main models, comma-separated and tried in order, default `gemini-3.8-flash,gemini-3.6-flash` (about 20 requests a day each): CV import, analysis and adaptation, cover letter, skill roadmap, notion sheets, reference list.                                               | —                                          |
| `GEMINI_MODEL_LITE`                                             | Lite models, same format, default `gemini-3.5-flash-lite,gemini-3.1-flash-lite` (about 500 a day each): offer extraction, mail classification, reference entries, and the fallback when every main model is out of quota. Mapping in `FEATURE_TIERS` (`lib/ai/gemini.ts`). | —                                          |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                      | Gmail OAuth                                                                                                                                                                                                                                                                | Google Cloud Console                       |
| `TOKEN_ENCRYPTION_KEY`                                          | AES-256-GCM key for OAuth tokens: 32 random bytes, base64                                                                                                                                                                                                                  | `openssl rand -base64 32`                  |

The Gmail callback URL is `${BETTER_AUTH_URL}/api/gmail/callback`. In development that is `http://localhost:3000/api/gmail/callback`; in production, `https://hushyboard.vercel.app/api/gmail/callback`.

## Gemini (free tier)

- **SDK**: `@google/genai`. Put a single wrapper in `lib/ai/gemini.ts`, exposing `generateJson<T>(feature, prompt, zodSchema, files?)` and `generateText(feature, prompt)`. Every call:
  - goes through `requireUser()` at the caller and logs an `AiUsage` row;
  - uses structured output (`responseMimeType: 'application/json'` + `responseJsonSchema` built from the Zod schema with `z.toJSONSchema`), then validates the response with the same Zod schema;
  - sets `export const maxDuration = 60` on the route or action that calls it;
  - maps a 429 or quota error to a persistent French error: « Limite gratuite de l'IA atteinte. Réessaie dans une minute. »
- **Free-tier privacy**: Google may use content sent on the free tier to improve its products. **Never send** finance data, habits, Alex's personal notes (« Mes notes »), or mails that do not match an application. One exception, decided by Alex on 23/10/2026: the job-alert mails of the label chosen in « Veille » (offers only) are sent to extract their offers (`job-alert`). This is stated on `/legal`.
- Prompts live in `lib/ai/prompts/*.ts`. Instructions are in English and the output must be French. Features:

| Feature           | Input                                                                                                           | Output (Zod)                                                                                                                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cv-import`       | Alex's CV PDF (inline `application/pdf`, base64, never stored)                                                  | `ResumeContent`                                                                                                                                                                                                                             |
| `offer-extract`   | pasted offer text + URL                                                                                         | `{ title, company, location, contractType, remotePolicy, requiredSkills[], summary }`                                                                                                                                                       |
| `cv-analysis`     | offer + base `ResumeContent` + skills with computed levels                                                      | `{ score (0–100), strengths[], gaps[], changes[] }`                                                                                                                                                                                         |
| `cv-adapt`        | offer + base `ResumeContent` + analysis                                                                         | `ResumeContent`. **Rewrite and reorder only. Never invent** an experience, project, diploma, date or skill. Level-0 skills may only appear if a tier is started, labelled « en cours d'apprentissage ».                                     |
| `cover-letter`    | offer + adapted `ResumeContent` + style guide                                                                   | plain text, 180–250 words                                                                                                                                                                                                                   |
| `skill-roadmap`   | skill name + category + level definitions (1 = bases … 5 = senior)                                              | `{ levels: [{ level, title, notions[] }] }`, 3–8 notions per level, ordered for learning                                                                                                                                                    |
| `notion-sheet`    | skill, level, notion label, the notions before and after it                                                     | `NotionSheet`: French summary (2–3 sentences), syntax block, one realistic example (prefer Alex's domains: expenses, applications, habits), 2–4 pitfalls, an official doc URL. The code must be correct and idiomatic for current versions. |
| `reference-list`  | skill name (only for skills without an MDN source)                                                              | `[{ name, kind, group, summary, isCommon }]`, 60–250 entries, no duplicates                                                                                                                                                                 |
| `reference-entry` | skill, entry name and kind, MDN URL if any                                                                      | `ReferenceDetails` (description, syntax, common values, example, Tailwind or other equivalents)                                                                                                                                             |
| `mail-classify`   | sender, subject, plain-text body (truncated to 4,000 characters) + the matched application (company, position)  | `{ classification: INTERVIEW \| REJECTION \| OTHER, confidence, reason }`                                                                                                                                                                   |
| `job-alert`       | a job-alert mail of the chosen Gmail label: sender, subject, plain text (12,000 characters) and its https links | `{ offers: [{ title, company, location, contractType, url }] }` — the URL must be one of the mail's links; offers are deduplicated by clean URL or company + title (`lib/job-alerts.ts`)                                                    |

### Alex's writing style (`lib/ai/style-guide.ts`, used by `cover-letter`)

Put this guide in the prompt verbatim. It was drawn from Alex's real professional emails.

```
Write as Alexis Carpentier, in French.
- Opening: "Bonjour," on its own line. Formal "vous" throughout.
- Polite and direct, never stiff or servile. No marketing clichés ("passionné", "dynamique",
  "rigoureux et motivé", "relever de nouveaux défis"), no bullet points, no emojis.
- Concrete facts and numbers over adjectives: school (École 42 Paris, tronc commun terminé),
  named projects (Transcendance: plateforme web multijoueur en équipe), technologies actually known.
- Recurring turns of phrase he uses: "Je tiens à…", "je me permets de…",
  "Cela m'aiderait sincèrement à…", "Je me forme en continu sur…", "Je suis disponible dès maintenant".
- Medium-length sentences, 4 to 5 short paragraphs: why this company/role, what he has done,
  what he is learning now (honest about level), availability, polite closing.
- Closing: "Bien cordialement,\nAlexis Carpentier".
- Spelling and grammar must be perfect (he sometimes writes "j'ai vu passer" — always correct it).
```

## Gmail API

- **Separate OAuth, not Better Auth.** Sign-in stays GitHub-only, because `validateUserInfo` rejects every other provider. Gmail is a _connection_:
  - `app/api/gmail/connect/route.ts` redirects to Google with `access_type=offline`, `prompt=consent`, scope `https://www.googleapis.com/auth/gmail.modify`, and a `state` value stored in an httpOnly cookie;
  - `app/api/gmail/callback/route.ts` checks `state`, exchanges the code, reads the profile email, stores the **encrypted** refresh token in `GmailConnection`, then redirects to `/mail`;
  - « Déconnecter Gmail » revokes the token and deletes the row.
- **Packages**: `@googleapis/gmail` + `google-auth-library` (the lighter alternative to `googleapis`). Wrap them in `lib/gmail/client.ts` with `getGmail(userId)`. When it throws `invalid_grant`, set `lastErrorAt` and show the « Connexion Gmail expirée » banner.
- **Calls used**:
  - **Labels**: `users.labels.list`, `users.labels.create` (colors must come from Gmail's fixed palette: textColor/backgroundColor pairs listed in the API reference).
  - **List**: `users.messages.list` with `labelIds`, `q`, `pageToken` and `maxResults: 25`. Then fetch each message with `format: 'metadata'` and `metadataHeaders` set to `From, To, Subject, Date, List-Unsubscribe, List-Unsubscribe-Post`, in parallel (limit 10 at a time).
  - **Read**: `users.messages.get format: 'full'`. Decode the parts (base64url) and prefer `text/html`. Sanitize with `sanitize-html` and render in `<iframe sandbox srcdoc>` (no `allow-scripts`). Block remote images by default through a CSP `<meta>` inside `srcdoc` (`img-src data:`); « Afficher les images » re-renders with `img-src https:`.
  - **Mark read / file**: `users.messages.modify` (`removeLabelIds: ['UNREAD']`; « Ranger dans » = `addLabelIds: [label]`, `removeLabelIds: ['INBOX']`). Undo reverses the modify.
  - **Unsubscribe**:
    1. Parse the headers in `lib/gmail/unsubscribe.ts` (a pure function, unit-tested with real header samples: `<mailto:…>, <https://…>`, a single URL, `mailto:` with a subject, malformed input).
    2. When `List-Unsubscribe-Post: List-Unsubscribe=One-Click` is present with an https URL, the server POSTs `List-Unsubscribe=One-Click`.
    3. Otherwise, for a `mailto:`, send through `users.messages.send` (raw RFC 2822, base64url).
    4. Otherwise, return the URL so the client opens it in a new tab.
    5. Then offer to archive the sender's old mails: `messages.list q=from:<address>` + `messages.batchModify`.
  - **Unread count** for the sidebar: `users.labels.get('INBOX').messagesUnread`, cached 60 s (`unstable_cache` or a `'use cache'` function with `cacheLife`, following Next 16 docs).
- **Recruiter-reply detection** (`lib/gmail/match.ts`):
  1. Normalize the company names of the user's applications, both kinds (lowercase, strip accents, legal suffixes and spaces).
  2. For each message in the list, compare the sender's domain and display name.
  3. On a match with no existing `MailMatch`, call `mail-classify` (at most 5 per page load, to protect the free quota), then store a `MailMatch`.
  4. The reader shows the banner when `classification ≠ OTHER` and `decision` is null. Accepting runs the same server action as a status change on the application.
- **Consent screen mode**: start in **Testing** (Alex added as test user). In Testing mode Google expires refresh tokens after 7 days, so expect a weekly « Reconnecter ». If that gets annoying, Alex can switch the app to **In production**: an unverified app stays usable for its owner after a warning screen. Handle both cases cleanly.
- Mail content is never written to the database or to logs.

## PDF generation

- **Library**: `@react-pdf/renderer`, server-side in route handlers:
  - `app/api/resume/[resumeId]/pdf/route.ts`: CV, filename `CV-Alexis-Carpentier-<company>.pdf`;
  - `app/api/job-offers/[offerId]/letter/pdf/route.ts`: cover letter.
- **Runtime**: `nodejs`, `requireUser()` first, `Content-Disposition: attachment`.
- **Fonts**: register IBM Plex Sans (400/500/600) and Bricolage Grotesque (700) as local TTF files in `public/fonts/` (OFL licence, from Google Fonts).
- **CV template**: A4, one page when possible:
  - header: name, title, contact, GitHub;
  - left column: skills by group, languages;
  - main column: summary, projects, experience, education;
  - colors: ivory paper with graphite text and a gold accent rule (a print version of the brand, not dark mode).

## Reference lists (skill « Référence » tab)

- **Web skills: official open data.** Use the npm package `@mdn/browser-compat-data` (CC0, versioned and updated often). Import it in a server-only script, `lib/skills/reference/mdn.ts`:
  - **HTML**: `html.elements.*` → `ELEMENT` (`<dialog>`), `html.global_attributes.*` → `ATTRIBUTE`;
  - **CSS**: `css.properties.*` → `PROPERTY`, `css['at-rules'].*` → `AT_RULE`, `css.selectors.*` → `SELECTOR`;
  - **JavaScript**: `javascript.builtins.*` and their sub-features → `OBJECT` / `METHOD` (`Array.prototype.map`), plus a curated list of DOM interfaces from `api.*` (`Document`, `Element`, `EventTarget`, `Window`, `Node`, `HTMLElement`, `fetch`, `Response`, `URL`, `localStorage`, `FormData`, …).
  - Keep `mdn_url` as `docUrl`, and `status.deprecated` → `isDeprecated`. Skip non-standard entries.
  - **Groups, one-line summaries and `isCommon`**: ask Gemini in **batches of about 100 names** (`reference-list` with a "classify these names" variant). That is about 6 calls for CSS and about 15 for JS, once per import.
  - « Mettre à jour la liste » diffs on `(kind, name)`: it adds new entries, marks removed ones `hidden`, and **never** touches `knownAt`, `favorite`, edited `details` or links to notions.
- **Other skills** (SQL, Python, pandas, Node.js, PHP/Symfony, Prisma, C, C++, Git, Docker, Linux/Bash, TypeScript, React, Next.js, Tailwind): « Générer la référence » calls `reference-list` once, with `source: AI`. Alex can add entries (`MANUAL`), hide them or delete them. For Tailwind, React and Next.js, prefer reading the installed packages' type definitions or docs if that is simpler and more exact, and use Gemini only for the summaries.
- **Details**: generated on first open with `reference-entry` and stored. Show « Généré par l'IA » with the official link, so Alex can check it.
- **Linking notions and entries**: when `notion-sheet` generates a sheet, it also returns up to 5 entry names. Link the ones that exist (`SkillNotion.references`). They appear as « Voir aussi » on the sheet and « Notion liée » on the entry.

## GitHub API (projects)

- `lib/github/client.ts`: plain `fetch` to `https://api.github.com` with `Authorization: Bearer ${GITHUB_TOKEN}`, `X-GitHub-Api-Version: 2022-11-28` and a `User-Agent`. Server-only. With no token: a persistent error on `/career/projects` that explains how to create one. Don't fall back to unauthenticated calls (60 requests per hour is too low).
- **Sync** (`syncProjects(userId)`, a server action and an automatic call when `syncedAt` is older than 1 hour):
  1. `GET /user/repos?affiliation=owner&per_page=100` (paginate) for Alex's own repos;
  2. refresh external repos with `GET /repos/{owner}/{repo}`;
  3. get each repo's languages with `GET /repos/{o}/{r}/languages`, converted from bytes to % (only for repos whose `pushed_at` changed, to save calls);
  4. upsert the `Project` rows by `githubId`; set `deletedOnGithubAt` for repos that disappeared;
  5. guess the default `category` (topic `42`, or a name matching a known list of 42 projects such as `libft`, `minishell`, `cub3d`, `ft_transcendence`, `cpp-modules`…) only on first insert, and never overwrite Alex's choice afterwards;
  6. suggest skills from a language/topic → skill-slug map (`lib/github/skill-map.ts`), on first insert only.
- **Live reads** (each wrapped in a `'use cache'` function with `cacheLife('hours')` and `cacheTag('project:'+fullName)`; « Synchroniser » calls `revalidateTag`):
  - README: `GET /repos/{o}/{r}/readme` with `Accept: application/vnd.github.html+json` (GitHub renders the Markdown). Sanitize it with `sanitize-html` (keep headings, lists, code, tables, images, links). Rewrite relative `href`/`src` to `https://github.com/{o}/{r}/blob/{branch}/…` and `raw.githubusercontent.com`. For private repos, serve images through `app/api/projects/[id]/raw/route.ts`, which streams the file with the token after `requireUser()`.
  - Tree: `GET /repos/{o}/{r}/git/trees/{branch}?recursive=1`. Handle `truncated: true`.
  - File: `GET /repos/{o}/{r}/contents/{path}?ref={branch}` with `Accept: application/vnd.github.raw+json`. Limit to 1 MB. Detect binary files (a NUL byte in the first 8 kB).
  - Commits: `GET /repos/{o}/{r}/commits?per_page=30`.
- **Syntax highlighting**: `shiki`, server-side, with a theme built from the design tokens (dark graphite background `surface-sunken`). Choose the language from the file extension and fall back to plain text.
- **Rate limit**: read the `x-ratelimit-remaining` header. Under 100, skip the automatic sync and show « Limite GitHub presque atteinte, réessaie dans une heure. »

## Other packages allowed

`zod` (v4), `vitest` (+ `@vitest/coverage-v8` optional), `sanitize-html`, `@react-pdf/renderer`, `@google/genai`, `@googleapis/gmail`, `google-auth-library`, `cmdk` (palette), `papaparse` (CSV), `shiki` (code highlighting), `@mdn/browser-compat-data` (reference lists). Ask before adding anything else heavier than about 50 kB.
