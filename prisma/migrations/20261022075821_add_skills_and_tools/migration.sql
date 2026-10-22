-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('WEB_FRONT', 'BACKEND_DATA', 'DATA_ENGINEERING', 'SYSTEM_TOOLS');

-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('DISCOVERED', 'USING', 'MASTERED');

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "projects" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_tiers" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "skill_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_notions" (
    "id" TEXT NOT NULL,
    "tierId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "checkedAt" TIMESTAMP(3),

    CONSTRAINT "skill_notions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_assessments" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "started" BOOLEAN NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ToolStatus" NOT NULL DEFAULT 'USING',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_info" (
    "userId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "targetRoles" TEXT NOT NULL,
    "currentSearch" TEXT NOT NULL,
    "contracts" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "githubUrl" TEXT,

    CONSTRAINT "profile_info_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "timeline_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "place" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "timeline_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CertificationToSkill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CertificationToSkill_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CourseToSkill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CourseToSkill_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_userId_slug_key" ON "skills"("userId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "skill_tiers_skillId_level_key" ON "skill_tiers"("skillId", "level");

-- CreateIndex
CREATE INDEX "skill_notions_tierId_position_idx" ON "skill_notions"("tierId", "position");

-- CreateIndex
CREATE INDEX "skill_assessments_skillId_assessedAt_idx" ON "skill_assessments"("skillId", "assessedAt");

-- CreateIndex
CREATE UNIQUE INDEX "tools_userId_name_key" ON "tools"("userId", "name");

-- CreateIndex
CREATE INDEX "timeline_entries_userId_position_idx" ON "timeline_entries"("userId", "position");

-- CreateIndex
CREATE INDEX "_CertificationToSkill_B_index" ON "_CertificationToSkill"("B");

-- CreateIndex
CREATE INDEX "_CourseToSkill_B_index" ON "_CourseToSkill"("B");

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_tiers" ADD CONSTRAINT "skill_tiers_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_notions" ADD CONSTRAINT "skill_notions_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "skill_tiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tools" ADD CONSTRAINT "tools_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_info" ADD CONSTRAINT "profile_info_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CertificationToSkill" ADD CONSTRAINT "_CertificationToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "certifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CertificationToSkill" ADD CONSTRAINT "_CertificationToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToSkill" ADD CONSTRAINT "_CourseToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToSkill" ADD CONSTRAINT "_CourseToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
