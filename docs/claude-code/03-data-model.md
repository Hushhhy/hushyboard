# 03 · Data model changes

The current schema is in `prisma/schema.prisma`, with 3 migrations already applied. **Keep every existing model.** The changes below add to it.

Conventions:

- Each model has `userId` with `onDelete: Cascade`.
- Tables are mapped to snake_case with `@@map`.
- Ids use `cuid()`.
- Dates are `DateTime`; use `@db.Date` for calendar days.

Make one migration per roadmap phase, with a clear name (for example `add_skills_and_tools`). After `migrate dev`, always run `npx prisma generate`.

## Profile and skills (phase 2)

```prisma
enum SkillCategory {
  WEB_FRONT
  BACKEND_DATA
  DATA_ENGINEERING
  SYSTEM_TOOLS
}

/// A language, framework or tool Alex learns, with 5 tiers of notions (5 = senior developer).
model Skill {
  id          String            @id @default(cuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  slug        String
  name        String
  category    SkillCategory
  position    Int               @default(0)
  projects    Project[]
  tiers       SkillTier[]
  assessments SkillAssessment[]
  courses     Course[]
  certifications Certification[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([userId, slug])
  @@map("skills")
}

model SkillTier {
  id      String        @id @default(cuid())
  skillId String
  skill   Skill         @relation(fields: [skillId], references: [id], onDelete: Cascade)
  level   Int           // 1..5
  title   String        // "Tableaux, objets et DOM"
  notions SkillNotion[]

  @@unique([skillId, level])
  @@map("skill_tiers")
}

/// A notion is "known" when checkedAt is set. The level is computed, never stored.
model SkillNotion {
  id        String    @id @default(cuid())
  tierId    String
  tier      SkillTier @relation(fields: [tierId], references: [id], onDelete: Cascade)
  label     String
  position  Int       @default(0)
  checkedAt DateTime?
  // Cheat sheet ("fiche mémo"), generated on first open, editable
  sheet            Json?     // NotionSheet: { summary, syntax: {lang, code}, example: {lang, code}, pitfalls[], docUrl? }
  sheetGeneratedAt DateTime?
  sheetEditedAt    DateTime?
  notes            String?   // "Mes notes", written by Alex
  references       ReferenceEntry[]

  @@index([tierId, position])
  @@map("skill_notions")
}

/// Snapshot saved after a guided re-evaluation, used for history charts.
model SkillAssessment {
  id         String   @id @default(cuid())
  skillId    String
  skill      Skill    @relation(fields: [skillId], references: [id], onDelete: Cascade)
  level      Int
  started    Boolean
  assessedAt DateTime @default(now())

  @@index([skillId, assessedAt])
  @@map("skill_assessments")
}

enum ToolStatus {
  DISCOVERED
  USING
  MASTERED
}

model Tool {
  id       String     @id @default(cuid())
  userId   String
  user     User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  name     String
  status   ToolStatus @default(USING)
  position Int        @default(0)

  @@unique([userId, name])
  @@map("tools")
}

model ProfileInfo {
  userId        String @id
  user          User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  headline      String // "Étudiant à 42 Paris · acarpent"
  targetRoles   String // "Full stack et/ou data engineer"
  currentSearch String // "Full stack uniquement"
  contracts     String
  zone          String
  availability  String
  githubUrl     String?

  @@map("profile_info")
}

model TimelineEntry {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  period    String  // "2026 – en cours"
  title     String
  place     String?
  isCurrent Boolean @default(false)
  position  Int     @default(0)

  @@map("timeline_entries")
}
```

## Skill reference lists (phase 2)

```prisma
enum ReferenceKind {
  ELEMENT      // HTML tag
  ATTRIBUTE
  PROPERTY     // CSS property
  AT_RULE      // @media, @keyframes
  SELECTOR     // pseudo-classes, pseudo-elements
  FUNCTION
  METHOD
  OBJECT       // JS built-in object / DOM interface
  KEYWORD
  TYPE
  COMMAND      // git, bash, docker, sql statements
  CLASS        // Tailwind utility
  HOOK
  OTHER
}

enum ReferenceSource {
  MDN          // @mdn/browser-compat-data
  AI
  MANUAL
}

/// One entry of a skill's reference list (a CSS property, an HTML tag, a Git command…).
model ReferenceEntry {
  id          String          @id @default(cuid())
  skillId     String
  skill       Skill           @relation(fields: [skillId], references: [id], onDelete: Cascade)
  name        String          // "justify-content", "<dialog>", "Array.prototype.map", "git rebase"
  kind        ReferenceKind
  group       String          // French category label: "Mise en page", "Formulaires", "Tableaux"…
  summary     String?         // one line, French
  details     Json?           // ReferenceDetails: { description, syntax?, values[]?, example?, equivalents? }
  detailsGeneratedAt DateTime?
  detailsEditedAt    DateTime?
  docUrl      String?
  source      ReferenceSource
  isCommon    Boolean         @default(false)
  isDeprecated Boolean        @default(false)
  hidden      Boolean         @default(false)
  knownAt     DateTime?       // "Je connais"
  favorite    Boolean         @default(false)
  notions     SkillNotion[]

  @@unique([skillId, kind, name])
  @@index([skillId, group])
  @@map("reference_entries")
}
```

`Skill` gets `references ReferenceEntry[]` and `referenceSyncedAt DateTime?`. Zod schemas `NotionSheet` and `ReferenceDetails` live in `lib/skills/schemas.ts`.

## Projects (phase 2b)

```prisma
enum ProjectCategory {
  SCHOOL_42
  PERSONAL
  TEAM
}

/// A GitHub repository, as a snapshot refreshed on sync, plus Alex's own annotations.
/// Code, READMEs and commits are always fetched live from GitHub and never stored.
model Project {
  id             String          @id @default(cuid())
  userId         String
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  githubId       BigInt          // repository id from the GitHub API
  fullName       String          // "Hushhhy/hushyboard"
  name           String
  description    String?
  url            String
  homepage       String?
  defaultBranch  String
  isPrivate      Boolean
  isFork         Boolean         @default(false)
  isArchived     Boolean         @default(false)
  isExternal     Boolean         @default(false) // public repo of someone else, added by URL
  topics         String[]
  languages      Json            // { "TypeScript": 82.1, "CSS": 14.0 } in percent
  stars          Int             @default(0)
  pushedAt       DateTime?
  deletedOnGithubAt DateTime?
  syncedAt       DateTime
  // Alex's annotations
  category       ProjectCategory @default(PERSONAL)
  role           String?         // "Mon rôle et ce que j'ai fait"
  pinned         Boolean         @default(false)
  hidden         Boolean         @default(false)
  featuredOnCv   Boolean         @default(false)
  skills         Skill[]
  timelineEntries TimelineEntry[]

  @@unique([userId, githubId])
  @@index([userId, pinned, pushedAt])
  @@map("projects")
}
```

`TimelineEntry` gets an optional `projectId` (relation, `onDelete: SetNull`). The seed does not create projects; the first sync does.

Add the reverse relations on `User` (`skills`, `tools`, `profileInfo`, `timelineEntries`, `projects`), on `Course` (`skills Skill[]`) and on `Certification` (`skills Skill[]`). These are implicit many-to-many relations.

**Seed**: `prisma/seed.ts` reads `docs/claude-code/data/skills-catalog.json` and upserts for the allowed user:

- every skill, tier and notion, with `checkedAt = assessedAt` when `known: true`;
- one `SkillAssessment` per skill;
- the 15 tools;
- `ProfileInfo` and the 4 timeline entries from `01-product-spec.md`.

The seed must be idempotent. Run it with `npx prisma db seed` (configure it in `prisma.config.ts`). Before writing, check that each computed level matches `computedLevel` in the JSON.

## Career: CV, offers, letters, spontaneous applications (phases 3–4)

```prisma
// Resume: add
  content    Json?     // ResumeContent (Zod schema in lib/resume/schema.ts)
  isDefault  Boolean   @default(false)
  basedOnId  String?   // the base resume an adapted version derives from
  basedOn    Resume?   @relation("ResumeAdaptations", fields: [basedOnId], references: [id], onDelete: SetNull)
  adaptations Resume[] @relation("ResumeAdaptations")
  jobOfferId String?   @unique // set for a CV adapted to one offer
  jobOffer   JobOffer? @relation("AdaptedResume", fields: [jobOfferId], references: [id], onDelete: Cascade)
// fileUrl stays, unused. Original PDFs are never stored.

// JobOffer: add
  description   String?   // pasted offer text
  summary       String?
  remotePolicy  String?
  analysis      Json?     // { score, strengths[], gaps[], changes[], baseResumeId, model }
  analyzedAt    DateTime?
  adaptedResume Resume?   @relation("AdaptedResume")
  coverLetter   CoverLetter?
// `tags` keeps holding the required skills.

model CoverLetter {
  id         String   @id @default(cuid())
  jobOfferId String   @unique
  jobOffer   JobOffer @relation(fields: [jobOfferId], references: [id], onDelete: Cascade)
  content    String
  model      String
  editedAt   DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("cover_letters")
}

enum ApplicationKind {
  OFFER
  SPONTANEOUS
}
// ApplicationStatus: add FOLLOWED_UP ("Relancée")
// Application: add
  kind       ApplicationKind @default(OFFER)
  careersUrl String?          // spontaneous: the company's careers page
// Application.position becomes optional (String?) because a spontaneous application may have none.

model WatchSource {
  id       String  @id @default(cuid())
  userId   String
  user     User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  name     String
  url      String?
  position Int     @default(0)

  @@map("watch_sources")
}

model WatchKeyword {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  label  String

  @@unique([userId, label])
  @@map("watch_keywords")
}
```

Seed watch keywords: « développeur full stack », « fullstack », « React », « Node.js », « TypeScript », « alternance », « junior ».

## AI usage (phase 3)

```prisma
model AiUsage {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  feature      String   // "offer-extract" | "cv-import" | "cv-analysis" | "cv-adapt" | "cover-letter" | "mail-classify" | "project-skills" | "skill-roadmap" | "notion-sheet" | "reference-list" | "reference-entry"
  model        String
  inputTokens  Int?
  outputTokens Int?
  createdAt    DateTime @default(now())

  @@index([userId, createdAt])
  @@map("ai_usage")
}
```

## Mail (phase 5)

```prisma
model GmailConnection {
  userId                String    @id
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  email                 String
  encryptedRefreshToken String    // AES-256-GCM, see lib/crypto.ts
  scope                 String
  connectedAt           DateTime  @default(now())
  lastErrorAt           DateTime?

  @@map("gmail_connections")
}

enum MailClassification {
  INTERVIEW
  REJECTION
  OTHER
}

enum MailDecision {
  ACCEPTED
  IGNORED
}

/// One classified Gmail message that matched an application. Mail content is never stored.
model MailMatch {
  id             String              @id @default(cuid())
  userId         String
  user           User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  gmailMessageId String
  applicationId  String?
  application    Application?        @relation(fields: [applicationId], references: [id], onDelete: SetNull)
  classification MailClassification
  confidence     Float
  reason         String              // one short French sentence shown in the banner
  decision       MailDecision?
  decidedAt      DateTime?
  createdAt      DateTime            @default(now())

  @@unique([userId, gmailMessageId])
  @@map("mail_matches")
}

model MailUnsubscribe {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  sender         String   // email address
  method         String   // "one-click" | "mailto" | "link"
  unsubscribedAt DateTime @default(now())

  @@unique([userId, sender])
  @@map("mail_unsubscribes")
}
```

## Account deletion

Add a server action « Supprimer toutes mes données » that deletes every user-owned row in one transaction. Keep the user row and the session so Alex can start again. Put it behind the delete modal.
