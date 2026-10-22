-- CreateEnum
CREATE TYPE "ApplicationKind" AS ENUM ('OFFER', 'SPONTANEOUS');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'FOLLOWED_UP';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "careersUrl" TEXT,
ADD COLUMN     "kind" "ApplicationKind" NOT NULL DEFAULT 'OFFER',
ALTER COLUMN "position" DROP NOT NULL;

-- AlterTable
ALTER TABLE "job_offers" ADD COLUMN     "analysis" JSONB,
ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "remotePolicy" TEXT,
ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN     "basedOnId" TEXT,
ADD COLUMN     "jobOfferId" TEXT;

-- CreateTable
CREATE TABLE "cover_letters" (
    "id" TEXT NOT NULL,
    "jobOfferId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cover_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_sources" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "watch_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watch_keywords" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "watch_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cover_letters_jobOfferId_key" ON "cover_letters"("jobOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "watch_sources_userId_name_key" ON "watch_sources"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "watch_keywords_userId_label_key" ON "watch_keywords"("userId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "resumes_jobOfferId_key" ON "resumes"("jobOfferId");

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_basedOnId_fkey" FOREIGN KEY ("basedOnId") REFERENCES "resumes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_jobOfferId_fkey" FOREIGN KEY ("jobOfferId") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_jobOfferId_fkey" FOREIGN KEY ("jobOfferId") REFERENCES "job_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_sources" ADD CONSTRAINT "watch_sources_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watch_keywords" ADD CONSTRAINT "watch_keywords_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

