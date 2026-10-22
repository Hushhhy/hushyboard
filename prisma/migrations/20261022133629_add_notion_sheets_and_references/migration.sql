-- CreateEnum
CREATE TYPE "ReferenceKind" AS ENUM ('ELEMENT', 'ATTRIBUTE', 'PROPERTY', 'AT_RULE', 'SELECTOR', 'FUNCTION', 'METHOD', 'OBJECT', 'KEYWORD', 'TYPE', 'COMMAND', 'CLASS', 'HOOK', 'OTHER');

-- CreateEnum
CREATE TYPE "ReferenceSource" AS ENUM ('MDN', 'AI', 'MANUAL');

-- AlterTable
ALTER TABLE "skill_notions" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "sheet" JSONB,
ADD COLUMN     "sheetEditedAt" TIMESTAMP(3),
ADD COLUMN     "sheetGeneratedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "referenceSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "reference_entries" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ReferenceKind" NOT NULL,
    "group" TEXT NOT NULL,
    "summary" TEXT,
    "details" JSONB,
    "detailsGeneratedAt" TIMESTAMP(3),
    "detailsEditedAt" TIMESTAMP(3),
    "docUrl" TEXT,
    "source" "ReferenceSource" NOT NULL,
    "isCommon" BOOLEAN NOT NULL DEFAULT false,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "knownAt" TIMESTAMP(3),
    "favorite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "reference_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ReferenceEntryToSkillNotion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ReferenceEntryToSkillNotion_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "reference_entries_skillId_group_idx" ON "reference_entries"("skillId", "group");

-- CreateIndex
CREATE UNIQUE INDEX "reference_entries_skillId_kind_name_key" ON "reference_entries"("skillId", "kind", "name");

-- CreateIndex
CREATE INDEX "_ReferenceEntryToSkillNotion_B_index" ON "_ReferenceEntryToSkillNotion"("B");

-- AddForeignKey
ALTER TABLE "reference_entries" ADD CONSTRAINT "reference_entries_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReferenceEntryToSkillNotion" ADD CONSTRAINT "_ReferenceEntryToSkillNotion_A_fkey" FOREIGN KEY ("A") REFERENCES "reference_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReferenceEntryToSkillNotion" ADD CONSTRAINT "_ReferenceEntryToSkillNotion_B_fkey" FOREIGN KEY ("B") REFERENCES "skill_notions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
