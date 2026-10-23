-- AlterTable
ALTER TABLE "trophy_unlocks" ADD COLUMN     "seenAt" TIMESTAMP(3);


-- Trophies unlocked before this change were already announced.
UPDATE "trophy_unlocks" SET "seenAt" = "unlockedAt";
