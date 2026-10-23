# 01 · Product spec

All UI text is French; the French strings below are the exact labels to use. Code is English.
Layout source of truth: Figma frames and HTML mockups listed in `02-design.md`. When this spec and a mockup disagree, **this spec wins** (it is newer).

## Global

- **Auth**: GitHub OAuth via Better Auth, allowlist `ALLOWED_GITHUB_ID` (done). `/login` (neural background, done), `/legal` public; everything else behind `proxy.ts` + `requireUser()`.
- **App shell** (done in `app/(app)/layout.tsx`, update it): sidebar 244 px.
  Order: Accueil `/` · **Mails `/mail` (unread count)** · group _Carrière_: Profil `/career/profile`, **Projets `/career/projects`**, CV `/career/resume`, Certifications `/career/certifications`, Cours `/career/courses`, Recherches pro `/career/job-search` (count = offers to sort), Progression `/career/progress` · Habitudes & objectifs `/habits` · group _Loisirs_: Jeux vidéo `/leisure/games` · Finances `/finance` · account block (avatar, name, sign out).
  **No Comics anywhere** (dropped).
- **Top bar** on every page: uppercase breadcrumb label + one-sentence summary title (computed, e.g. « 7 sites carrière suivis, 2 relances à faire. ») + ⌘K trigger.
- **⌘K / Ctrl+K palette** (phase 9): modal with scrim; commands « Cocher <habitude> », « Ajouter une dépense », « Ajouter une offre », « Aller à <page> ». Accent-insensitive search. `cmdk` library allowed.
- **Tabs = one URL per tab** (links with `aria-current`, not ARIA tabs).
- **Rewards**: XP only for Career. Level toast + trophy toast (persistent until closed, `role=status`). Trophies in all areas, no XP.

## XP rules (already in `lib/xp.ts`, keep)

| Event (`XpReason`)                                                                  | XP  |
| ----------------------------------------------------------------------------------- | --- |
| APPLICATION_SENT (only if a resume is attached) — also for spontaneous applications | 15  |
| HR_INTERVIEW                                                                        | 40  |
| TECH_INTERVIEW                                                                      | 60  |
| COURSE_COMPLETED                                                                    | 60  |
| CERTIFICATION_OBTAINED                                                              | 200 |
| OFFER_RECEIVED                                                                      | 300 |

Daily cap 75 XP on applications only. Level n→n+1 costs `50 + 150 × (n − 1)`. Titles: Mousse, Rameur, Vigie, Timonier, Argonaute, Héros, Demi-dieu, Olympien. `XpEvent @@unique([reason, sourceId])` prevents double gains; undoing an action deletes its XpEvent.

---

## Career · Profil `/career/profile` (Figma `v2 · Carrière · Profil` 31:598)

Two columns.

**Left**

1. _Identité_: avatar initials, « Alexis Carpentier », « Étudiant à 42 Paris · acarpent »; key/value rows editable in a side panel (« Modifier le profil »):
   - Domaine visé: « Full stack et/ou data engineer »
   - Recherche actuelle: « Full stack uniquement »
   - Contrats: « Stage, alternance, CDI/CDD, VIE »
   - Zone: « France et Europe »
   - Disponibilité: « Dès maintenant »
   - GitHub: « github.com/Hushhhy »
     Buttons « Modifier le profil » (secondary), « Voir le CV » (link to `/career/resume`).
2. _Logiciels et outils_: chips with a status dot. Status = `DISCOVERED` « Découvert » (fg-3) / `USING` « J'utilise » (info) / `MASTERED` « Maîtrisé » (success). Click a chip → small menu to change status or remove. « Ajouter un outil » → inline input. Seed: 15 tools from `skills-catalog.json`, all `USING`.
3. _Formation et expériences_: timeline (date range, title, place); CRUD in side panel. Seed: RNCP niveau 6 · Expert en architecture informatique (2026 – en cours, École 42 Paris); Piscine Python for Data Science (2026); Tronc commun 42 : C, Unix, réseau, web (2023 – 2026); Projet perso Hushyboard (Next.js, Prisma, PostgreSQL).

**Right**

1. _Compétences techniques_: 4 groups in a 2-column grid — « Web front », « Data engineering » (left), « Back-end et bases de données », « Système et outils de dev » (right). Each row = link to the sub-page: name · 5-segment ruler · « 3 / 5 » (« 1+ / 5 » when the next tier is started) · chevron. Level 0 rows are dimmed (fg-3). Header meta: « niveau sur 5 · 5 = dev senior · clique pour le détail ». Footnote: « Le niveau = dernier niveau dont toutes les notions de la roadmap sont cochées. Un cran pâle et le « + » indiquent un niveau commencé. »
2. _Prochains objectifs_: up to 5 rows, computed: for each skill with level ≥ 1 or a started tier, the first unchecked notions of the current tier (« map, filter, reduce » · « termine le niveau 2 »); then level-0 skills relevant to the current search (full stack: TypeScript, React, Next.js, Node.js) with their tier-1 notions. Order: started tiers first, then by category relevance to full stack.

- Add/edit skills: « Ajouter une compétence » (name, category) creates 5 empty milestones; « Générer la roadmap » asks Gemini (`skill-roadmap`) for a first list of notions per level (junior → senior), which Alex can edit.

### Skill level computation (pure function, unit-tested)

`level = highest n such that every notion of tiers 1..n is checked` (0 if tier 1 incomplete). `started = level < 5 && some notion of tier level+1 is checked`. Ruler: `level` full segments, +1 pale segment (`career-deep`) if `started`.

## Career · Profil · skill page `/career/profile/[skillSlug]` (HTML mockup `screens-v2.html`, screens « Roadmap + fiche notion » and « Référence (ex. CSS) »)

**Replaces the « tiers » layout of Figma 32:715.** The tiers stay in the data as **level milestones (1 to 5)**, but the page shows one continuous roadmap of notions.

**Header**:

- breadcrumb « Carrière · Profil · JavaScript »;
- computed title, e.g. « JavaScript · niveau 1, plus qu'une notion avant le niveau 2 » or « …, 3 notions avant le niveau 3 »;
- « ← Profil », a small level medal, « Niveau 1 sur 5 », « 14 notions sur 34 · évalué le 22 oct. », the 5-segment ruler, « Historique » (quiet), « Me réévaluer » (secondary).

**Tabs** (URLs): « Roadmap » `/career/profile/[skill]` · « Référence · N entrées » `/career/profile/[skill]/reference`.

### Tab « Roadmap »

- **Left (380 px)**: a vertical roadmap.
  - Each milestone header: number badge, « Niveau 2 · Tableaux, objets et DOM », « 6 / 7 ». The badge is gold when complete.
  - Then its notions **one by one**, in order, as nodes on a vertical line:
    - known: gold dot;
    - **next**: the first unknown notion of the lowest incomplete level, highlighted `surface-raised`, gold ring, tag « prochaine »;
    - to learn: hollow dot.
  - Milestones up to `level + 2` are expanded. Later ones are collapsed into one caption line; click to expand.
  - Clicking a node selects it, sets the URL `?notion=<id>` and opens its sheet on the right.
  - The next notion is selected by default.
- **Right: the notion sheet (« fiche mémo »)**, a quick reminder to reread when Alex needs a notion in a project:
  - label « Niveau 2 · notion 7 sur 7 », the notion title, and a checkbox « Je sais faire » that toggles the known state (optimistic, undoable);
  - **Résumé**: 2 to 3 sentences in plain French;
  - **Syntaxe**: a code block;
  - **Exemple concret**: a realistic code block, ideally tied to Alex's world (expenses, applications, habits);
  - **Pièges**: 2 to 4 bullets;
  - **Mes notes**: free text Alex writes, saved on blur;
  - footer: « Fiche générée par l'IA, relue le … » (or « modifiée par toi le … »), « Voir aussi » (links to related reference entries), « MDN » or the official doc link, « Modifier la fiche ».
- **Sheet content**:
  - generated **on first open** by Gemini (`notion-sheet`), then stored and editable;
  - « Modifier la fiche » opens an edit mode with a Markdown field per section and a code field per block;
  - « Régénérer » (in the edit mode) asks for confirmation if Alex has edited the sheet;
  - code blocks are highlighted server-side with `shiki`, in the skill's language (C, Python, SQL, Bash, CSS, HTML, TS, JS…).
  - Loading state in the panel: « Préparation de la fiche… ».
- **Edit the roadmap** (pencil on the left column): rename milestones, add, remove and reorder notions (drag and drop or up/down buttons), move a notion to another level.
- **« Me réévaluer »**: guided mode, notion by notion in roadmap order (« Sais-tu faire ça sans aide, sans tutoriel et sans IA ? » Oui / Non). It stops at the first level with 2 or more « Non » after that level. At the end it saves a `SkillAssessment`. « Historique » lists the snapshots (date and level; a line chart is optional).
- **Level computation**: unchanged (see above). The milestones are the tiers.

### Tab « Référence »

A complete, searchable reference list for the language: CSS properties, HTML elements and attributes, JS built-in methods and DOM APIs, Python built-ins and standard modules, SQL commands and functions, Git commands, Bash commands, Docker commands and Dockerfile instructions, Tailwind classes, TypeScript utility types, React hooks and APIs, Next.js functions and file conventions, C standard library functions, C++ STL…

- **Left (440 px)**:
  - a search field (matches the name or description, accent-insensitive);
  - filter chips: « Toutes », « Courantes » (default), « Non connues », « Favoris »; deprecated entries are hidden unless « Afficher les obsolètes »;
  - entries grouped by category (for CSS: Mise en page, Boîte, Texte, Couleurs et fonds, Bordures, Animations, …) with « known / total » per group;
  - row = checkbox « je connais » · name in mono · one-line description.
- **Right**: entry detail:
  - kind and group (« Propriété CSS · Mise en page »), the name in mono, a checkbox « Je connais », a star for favourite;
  - **Description**;
  - **Syntaxe** or **Valeurs courantes** (value chips);
  - **Exemple**;
  - optional **En Tailwind** (for CSS) or other equivalents;
  - footer: « Notion liée : Flexbox (CSS niveau 2) » (link back to the roadmap), the source (« Liste : MDN · description : IA »), the official doc link.
  - Details are generated on first open by Gemini (`reference-entry`) and stored; Alex can edit them.
- **Header counts**: « 103 propriétés connues sur 520 ». They also feed the skill page title on the Référence tab. They **don't** change the level: the level is driven only by the roadmap notions.
- **Where the lists come from**: see `04-integrations.md` → « Reference lists ». The short version:
  - official open data for the web (HTML, CSS, JS, DOM) from `@mdn/browser-compat-data`;
  - a Gemini-generated list for the other skills, created once with « Générer la référence » and editable (« Ajouter une entrée », hide or delete);
  - « Mettre à jour la liste » re-imports and keeps Alex's known, favourite and notes flags.

## Career · Projets `/career/projects` (HTML mockup `screens-v2.html`, screens « Liste des projets », « Projet · README », « Projet · Code »)

Automatic list of Alex's GitHub repositories, to show his work and feed his CV. **No XP.**

### List `/career/projects`

- Title, computed: « 12 dépôts GitHub, 2 épinglés, synchronisés il y a 4 min. »
- Filter chips with counts: « Tous », « Épinglés », « Projets 42 », « Perso », « Masqués ». Search by name, description or topic. Sort by last push, pinned first.
- Buttons: « Synchroniser » (secondary), « Ajouter un dépôt » (quiet). The second one adds a **public repo owned by someone else**, by URL, for team projects hosted on a teammate's account (for example Transcendance).
- Grid of 3 columns of cards. Each card shows:
  - repo name, a pin icon when pinned, and a « Public » / « Privé » badge;
  - description (2 lines), a language bar with the top 3 languages in %, linked-skill tags, « Modifié il y a … » and stars when > 0.
    Click opens the detail page. Forks and archived repos are hidden by default (under « Masqués »).
- Automatic sync:
  - on page load when the last sync is older than 1 hour, plus the button;
  - new repos appear on their own; repos deleted on GitHub are flagged « Supprimé de GitHub » and kept until Alex removes them.
- Empty state: « Aucun dépôt trouvé. Vérifie le jeton GitHub dans les réglages. » When the token is missing, show a persistent error with the steps.

### Detail `/career/projects/[repo]` (tabs = URLs)

- Header:
  - breadcrumb « Carrière · Projets · <repo> » and the description as title;
  - « ← Projets », the visibility badge, stars, default branch and last push;
  - « Épingler » / « Désépingler » (quiet), « Ouvrir sur GitHub » (secondary).
- « README » `/career/projects/[repo]`: README rendered as on GitHub, sanitized. Relative links and images point to GitHub. Right column:
  - **Langages** (bar + list with %);
  - **Compétences liées** (chips): suggested from languages and topics through a mapping (TypeScript → TypeScript, Dockerfile → Docker, …), editable in « Fiche projet »;
  - **Sur le CV**: checkbox « Mis en avant sur le CV ».
    No README: « Ce dépôt n'a pas de README. »
- « Code » `/career/projects/[repo]/code?path=…`: read-only browser. File tree on the left (folders collapsible, current file highlighted, « main · 48 fichiers »). File view on the right:
  - path, language, line count, « Copier », « Voir sur GitHub »;
  - line numbers and server-side syntax highlighting.
    Edge cases:
  - files > 1 MB or binary: « Fichier trop volumineux ou binaire. » + link to GitHub;
  - images: rendered;
  - Markdown: rendered;
  - truncated trees (huge repos): message + link.
- « Commits » `/career/projects/[repo]/commits`: the last 30 commits (message, short SHA, date, author) with links to GitHub.
- « Fiche projet » `/career/projects/[repo]/details`: editable Hushyboard-only info:
  - category: « Projet 42 » / « Perso » / « Équipe », defaulting from the topic `42` or the name;
  - « Mon rôle et ce que j'ai fait », free text (used by the CV);
  - linked skills (multi-select of the user's skills);
  - « Mis en avant sur le CV », « Épingler », « Masquer ».

### Links with the rest of the app

- **Skill sub-page**: « Lié à <skill> » lists the projects linked to that skill. This replaces the free `projects` labels.
- **CV and offers**: projects marked « Mis en avant sur le CV » (name, description, languages, role text) are given to `cv-import` review, `cv-analysis`, `cv-adapt` and `cover-letter` as **true facts** they may use. The AI picks the projects most relevant to each offer. Private-repo code and READMEs are never sent to the AI; only those metadata and the role text are.
- **Profile timeline**: an entry can link to a project.

## Career · CV `/career/resume` (Figma v1 `Carrière · CV` 15:923)

- **Base CV** = structured content (JSON validated by Zod `ResumeContent`: header, title, summary, skills groups, experiences, projects, education, languages, interests). Created once by **importing Alex's existing CV PDF**: upload → Gemini extracts `ResumeContent` → Alex reviews in a form editor → saved. The PDF itself is not stored.
- Several named versions allowed (« Full stack · oct. 2026 », « Data · oct. 2026 »); one is the default.
- Preview + « Télécharger en PDF » renders `ResumeContent` with `@react-pdf/renderer` (one clean template, A4, matching the brand fonts IBM Plex Sans / Bricolage Grotesque).
- Adapted CVs (per job offer, see below) appear in a « Versions adaptées » list linked to their offer.

## Career · Certifications `/career/certifications` and Cours `/career/courses`

As in Figma v1 `Carrière · Certifications` (15:1371) and the HTML mockup « Cours ». Certification: name, provider, status (PLANNED / IN_PROGRESS / OBTAINED), total courses, obtained date. Course: title, provider, status, progress %, position in the certification path, notes (CourseNote). Completing a course → COURSE_COMPLETED XP; obtaining a certification → CERTIFICATION_OBTAINED XP. A course or certification can be linked to skills (shown on the skill sub-page).

## Career · Recherches pro `/career/job-search/*`

Tabs (one URL each): « Candidatures » `/career/job-search` · « Veille » `/career/job-search/watch` · « Candidatures spontanées » `/career/job-search/spontaneous` · « Analyses » `/career/job-search/analytics`.

**Search scope: full stack only for now.** Default watch keywords: « développeur full stack », « fullstack », « React », « Node.js », « TypeScript », « alternance », « junior ». No data-engineering sample data.

### Candidatures (Figma v1 11:101)

List/board of applications with status pills (7 statuses + new `FOLLOWED_UP` « Relancée »), filters, side panel with timeline (ApplicationEvent), status change (creates event + XP when applicable), follow-up date (default sentAt + 14 days, shown as « À relancer » when passed).

### Veille (Figma v1 13:169, content updated)

- « Ajouter une offre »: dialog with a URL field + a big textarea « Colle le texte de l'offre ». On submit, **Gemini extracts** title, company, location, contract type, remote policy, required skills (array), and a 2-line summary. Alex can correct the fields before saving. The pasted text is stored on the offer (needed for analysis).
- Offer cards: source · age, title, company · location, tag chips, actions « Postulé » / « Refusé » (secondary) and the whole title links to the offer detail page.
- **Freshness (Alex, 23/10/2026)**: the watch shows offers of the last 7 days only (age from the alert mail date, or the day the offer was added). An offer not applied to is deleted after 7 days, with its analysis, adapted CV and letter. Job-alert mails older than 7 days are not imported.
- Right column: « Sources suivies » (manual list with counts this week), « Mots-clés de la veille » (editable chips).

### Offer detail `/career/job-search/offers/[offerId]` (Figma `v2 · Recherches pro · Offre` 33:789)

- « Retour à la veille »; header card: source line, title, company · location · contract · remote, skill chips; actions « Voir l'offre » (external link), « Refuser » (quiet), « Marquer postulée » (secondary → creates Application with the chosen resume version, XP if resume attached).
- **Analyse du CV** card (left, 420 px): match score % (ruler 10 segments), « Points forts » chips (success dot), « À renforcer » chips (warning dot), « Ce que change le CV adapté » checklist (3–5 concrete changes), buttons « Télécharger le CV adapté (PDF) » (primary) and « Régénérer » (quiet). Footer meta: which base CV was used. Analysis is generated on first open (loading state in the card) and cached on the offer; « Régénérer » recomputes.
  - The adapted CV = a new `ResumeContent` derived from the base one by Gemini: **rewrite and reorder only; never invent experience, skills, dates or diplomas**. Skills at level 0 may only appear as « en cours d'apprentissage » if Alex has started them. Rendered to PDF on download.
- **Lettre de motivation** card (right): letter in a sunken « paper » block, buttons « Copier la lettre » (primary on that card — clipboard), « Télécharger » (PDF or .txt), « Régénérer » (quiet), meta « Gemini · N mots ». Editable inline (textarea) before copying; edits are saved.
  - Written **in Alex's own style** (see `04-integrations.md` → style guide). ~180–250 words, vouvoiement, concrete facts, no marketing clichés, signature « Bien cordialement, / Alexis Carpentier ».
- **Sending is manual**: Alex copies the letter, downloads the CV and applies on the company site. No email sending from the app.

### Candidatures spontanées `/career/job-search/spontaneous` (HTML mockup `docs/claude-code/mockups/screens-v2.html`, screen « Candidatures spontanées »)

- Table: « Entreprise et page carrière » (name + careers URL link), « Envoyée le », « CV » (resume version name), « Statut » pill (Envoyée / Sans réponse / Relancée / Refus / Entretien), « Relance » (date, or « À relancer » in warning color when due).
- « Ajouter un site » → side panel form (company, careers page URL, sent date, resume version, notes).
- Right column: « Bilan » (envoyées, entretiens, refus), « À relancer cette semaine » (rows with a quiet « Relancée » button that sets status FOLLOWED_UP and the next follow-up +14 days), note « Relance proposée 14 jours après l'envoi. Une réponse détectée dans Mails met le statut à jour après ta validation. »
- Stored as `Application` with `kind = SPONTANEOUS` (see data model); counts toward XP and analytics like other applications.

### Analyses (Figma v1 14:310)

Funnel and response rates by status, by source, by contract, per week; spontaneous vs offer-based split.

## Career · Progression `/career/progress` (Figma v1 13:1062, PNG `v1-career-progress.png`)

Nav label « Progression » (renamed from « Analyses » to avoid confusion with the job-search « Analyses » tab).

XP over time, level history, XP by reason, skill level history from `SkillAssessment`.

## Mails `/mail` (HTML mockup `screens-v2.html`, screens « Mails · … »)

Requires Gmail connection (see `04-integrations.md`). If not connected: empty state « Connecte ta boîte Gmail pour suivre tes mails ici. » + button « Connecter Gmail ». If the token is revoked/expired: persistent error banner « Connexion Gmail expirée. » + « Reconnecter ».

Three columns:

1. **Labels** (214 px): « Boîte de réception » (unread count), user labels with their color and unread count, « Tous les mails », then « Nouveau libellé ». System labels other than INBOX are hidden except « Tous les mails ».
2. **List** (340 px): search field (Gmail query syntax passed through, e.g. `from:qonto`), rows = unread dot, sender, time, subject, snippet, label chips; ✨ icon on subjects detected as a recruiter reply. Infinite scroll / « Charger plus » with Gmail `pageToken`. URL holds state: `/mail?label=<id>&q=<query>&m=<messageId>`.
3. **Reader**: action bar « Ranger dans… » (menu of labels with a check on current ones + « Nouveau libellé… »), « Se désabonner » (only when the message has `List-Unsubscribe`), « Ouvrir dans Gmail » (external link `https://mail.google.com/mail/u/0/#all/<threadId>`), date. Subject, from, to. Body: HTML sanitized and rendered in a sandboxed `iframe srcdoc` (no scripts, remote images blocked by default with « Afficher les images »), plain text fallback. Opening marks the mail as read.

- **Ranger dans** = add the label and remove INBOX (archive) — confirm with an undoable status line « Rangé dans Candidatures. Annuler ».
- **Nouveau libellé**: dialog (name, color from Gmail's allowed palette) → creates the label in Gmail.
- **Se désabonner**: RFC 8058 one-click POST when `List-Unsubscribe-Post: List-Unsubscribe=One-Click` and an https URL exist; else `mailto:` → send the unsubscribe mail via Gmail API; else open the https URL in a new tab. After success: « Désabonné de Welcome to the Jungle. Archiver ses 23 anciens mails ? » (Archiver / Non merci). Remember the sender as unsubscribed (`MailUnsubscribe`) to hide the button next time.
- **Recruiter reply detection**: for each listed message, match the sender's domain or display name against companies of Applications (both kinds). For matches, ask Gemini to classify the mail: `INTERVIEW` | `REJECTION` | `OTHER` (+ confidence). If INTERVIEW/REJECTION, show the banner in the reader: « Réponse à ta candidature « <position> · <company> » » + one-line reason + buttons « Marquer « Entretien RH » » (primary) / « Marquer « Refus » » / « Ignorer ». Validation updates the Application (event + XP rules). Store the decision in `MailMatch` so a mail is classified and decided once. Nothing is updated without Alex's click.
- Unread counts in the sidebar = INBOX unread from Gmail (cached 60 s).

## Habits & goals `/habits` (+ `/habits/history`, `/habits/goals`)

HTML mockup « Habitudes ×3 ». Today: habits scheduled today (weekday habits or N-times-a-week), yes/no checkbox + optional quantity with unit, week strip, streak (computed; pauses freeze it). History: heatmap + accessible table. Goals: goals with steps and progress. No XP. Trophies for streak milestones (7, 30, 100 days).

## Leisure · Jeux vidéo `/leisure/games`

HTML mockup « Jeux vidéo ». Games by franchise in story order, status (À faire / En cours / Terminé / Abandonné), progress current/total, minutes played. Home shows the current game and « Ensuite dans la franchise ». No XP.

## Finances `/finance` (+ `/finance/transactions`, `/finance/import`)

HTML mockup « Finances ×3 ». Month view (income, expenses, balance, by category bars, month picker), transactions list (filters, add/edit manual expense), CSV import (bank statement → preview → dedupe by `importHash` → save; the CSV file is never stored). Editable default category list (Logement, Alimentation, Transports, Abonnements, Loisirs, Santé, Divers as EXPENSE; Revenus as INCOME; Épargne as SAVINGS). Amounts in cents, displayed with `formatEuros`.

## Home `/` (done, extend)

Already shows Career/XP, habits, applications, offer to sort, finances, leisure, trophies. Add: unread recruiter replies count (link to `/mail`), spontaneous follow-ups due. Keep the grid filling the viewport.

## Trophies & vitrine

Trophy catalog in code (`lib/trophies.ts`): key, area, name (mythology flavour allowed), condition text, check function. Unlock is idempotent (`TrophyUnlock @@unique([userId, trophyKey])`). Vitrine page `/trophies` (grid by area + reward history). Examples: first application, 10 applications, first interview, 7-day streak, first course completed, first month imported, first game finished.

## Legal `/legal`

Public page (mockup « Mentions légales »). Add processors: Google (Gmail API for mail reading/labels; **Gemini API free tier — content sent to it may be used by Google to improve its products**, so only skill and notion names, CV, featured projects, offers and recruiter mails are sent, never bank data or personal notes), Vercel, Neon, GitHub. Data retention and deletion: « Supprimer toutes mes données » in profile settings deletes all rows of the user.
