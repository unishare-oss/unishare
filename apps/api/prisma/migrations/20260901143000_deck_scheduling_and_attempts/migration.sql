-- AlterTable
ALTER TABLE "deck" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduledFor" TIMESTAMP(3);
