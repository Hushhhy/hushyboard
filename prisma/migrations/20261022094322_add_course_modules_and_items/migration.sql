-- CreateEnum
CREATE TYPE "CourseItemKind" AS ENUM ('PART', 'QUIZ', 'SOLO_PROJECT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "XpReason" ADD VALUE 'QUIZ_PASSED';
ALTER TYPE "XpReason" ADD VALUE 'SOLO_PROJECT_COMPLETED';

-- AlterTable
ALTER TABLE "course_notes" ADD COLUMN     "itemId" TEXT;

-- CreateTable
CREATE TABLE "course_modules" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_items" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "kind" "CourseItemKind" NOT NULL DEFAULT 'PART',
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,

    CONSTRAINT "course_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_modules_courseId_position_idx" ON "course_modules"("courseId", "position");

-- CreateIndex
CREATE INDEX "course_items_moduleId_position_idx" ON "course_items"("moduleId", "position");

-- AddForeignKey
ALTER TABLE "course_notes" ADD CONSTRAINT "course_notes_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "course_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_items" ADD CONSTRAINT "course_items_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
