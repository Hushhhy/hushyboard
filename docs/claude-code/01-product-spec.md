# 01 · Product spec

All UI text is French; the French strings below are the exact labels to use. Code is English.
Layout source of truth: Figma frames and HTML mockups listed in `02-design.md`. When this spec and a mockup disagree, **this spec wins** (it is newer).

## Global

- **Auth**: GitHub OAuth via Better Auth, allowlist `ALLOWED_GITHUB_ID` (done). `/login` (neural background, done), `/legal` public; everything else behind `proxy.ts` + `requireUser()`.
- **App shell** (done in `app/(app)/layout.tsx`, update it): sidebar 244 px.
  Order: Accueil `/` · **Mails `/mail` (unread count)** · group _Carrière_: Profil `/career/profile`, CV `/career/resume`, Certifications `/career/certifications`, Cours `/career/courses`, Recherches pro `/career/job-search` (count = offers to sort), Analyses `/career/analytics` · Habitudes & objectifs `/habits` · group _Loisirs_: Jeux vidéo `/leisure/games` · Finances `/finance` · account block (avatar, name, sign out).
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

1. _Compétences techniques_: 4 groups in a 2-column grid — « Web front », « Data engineering » (left), « Back-end et bases de données », « Système et outils de dev » (right). Each row = link to the sub-page: name · 5-segment ruler · « 3 / 5 » (« 1+ / 5 » when the next tier is started) · chevron. Level 0 rows are dimmed (fg-3). Header meta: « niveau sur 5 · 5 = dev senior · clique pour le détail ». Footnote: « Le niveau = dernier palier dont toutes les notions sont cochées. Un cran pâle et le « + » indiquent un palier commencé. »
2. _Prochains objectifs_: up to 5 rows, computed: for each skill with level ≥ 1 or a started tier, the first unchecked notions of the current tier (« map, filter, reduce » · « termine le palier 2 »); then level-0 skills relevant to the current search (full stack: TypeScript, React, Next.js, Node.js) with their tier-1 notions. Order: started tiers first, then by category relevance to full stack.

- Add/edit skills: « Ajouter une compétence » (name, category) creates 5 empty tiers to fill.

### Skill level computation (pure function, unit-tested)

`level = highest n such that every notion of tiers 1..n is checked` (0 if tier 1 incomplete). `started = level < 5 && some notion of tier level+1 is checked`. Ruler: `level` full segments, +1 pale segment (`career-deep`) if `started`.

## Career · Profil · sub-page `/career/profile/[skillSlug]` (Figma `v2 · Carrière · Profil · JavaScript` 32:715)

- Breadcrumb « Carrière · Profil · JavaScript », title e.g. « JavaScript · niveau 1, palier 2 presque terminé » (computed: « presque terminé » when ≤ 1 notion left).
- Left: « Retour au profil » link; level card (big number medal, « Niveau 1 sur 5 », tier title of the current level « Bases acquises », « Palier 2 : 6 notions sur 7 », 5-segment ruler, « Prochain objectif » box listing the remaining notions of the current tier, « Dernière évaluation : 22 oct. 2026 », buttons « Me réévaluer » (primary) and « Historique » (quiet)). Card « Lié à JavaScript »: linked courses, projects, certifications (+ « Lier un cours »).
- Right: card « Paliers et notions » — 5 tier sections. Status chip: « Acquis » (all checked, success), « En cours » (some checked, career, section highlighted `surface-raised`), « À découvrir » (none). Tiers 1..level+2 expanded with checkboxes (habit checkbox style); further tiers collapsed (show the notions as one caption line, expand on click). Checking a notion is optimistic, saved with a server action, undoable.
- « Me réévaluer »: guided mode that walks tier by tier (« Sais-tu faire ça sans aide, sans tutoriel et sans IA ? » Oui / Non per notion), then saves a `SkillAssessment` snapshot (date, level, started). « Historique » lists snapshots (date + level) — a line chart is optional.
- Edit mode (pencil): rename tiers, add/remove/reorder notions.

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

## Career · Analyses `/career/analytics` (Figma v1 13:1062 « Progression »)

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

Public page (mockup « Mentions légales »). Add processors: Google (Gmail API for mail reading/labels; **Gemini API free tier — content sent to it may be used by Google to improve its products**, so only CV, offers and recruiter mails are sent, never bank data), Vercel, Neon, GitHub. Data retention and deletion: « Supprimer toutes mes données » in profile settings deletes all rows of the user.
