-- AlterTable
ALTER TABLE "job_offers" ADD COLUMN     "importedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "job_alert_settings" (
    "userId" TEXT NOT NULL,
    "gmailLabelId" TEXT,
    "gmailLabelName" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "job_alert_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "job_alert_mails" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "offersFound" INTEGER NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_alert_mails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_alert_mails_userId_gmailMessageId_key" ON "job_alert_mails"("userId", "gmailMessageId");

-- AddForeignKey
ALTER TABLE "job_alert_settings" ADD CONSTRAINT "job_alert_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_alert_mails" ADD CONSTRAINT "job_alert_mails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

