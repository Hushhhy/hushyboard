-- CreateEnum
CREATE TYPE "MailClassification" AS ENUM ('INTERVIEW', 'REJECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "MailDecision" AS ENUM ('ACCEPTED', 'IGNORED');

-- CreateTable
CREATE TABLE "gmail_connections" (
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastErrorAt" TIMESTAMP(3),

    CONSTRAINT "gmail_connections_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "mail_matches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "applicationId" TEXT,
    "classification" "MailClassification" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "decision" "MailDecision",
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mail_unsubscribes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "unsubscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_unsubscribes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mail_matches_userId_gmailMessageId_key" ON "mail_matches"("userId", "gmailMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "mail_unsubscribes_userId_sender_key" ON "mail_unsubscribes"("userId", "sender");

-- AddForeignKey
ALTER TABLE "gmail_connections" ADD CONSTRAINT "gmail_connections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_matches" ADD CONSTRAINT "mail_matches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_matches" ADD CONSTRAINT "mail_matches_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_unsubscribes" ADD CONSTRAINT "mail_unsubscribes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

