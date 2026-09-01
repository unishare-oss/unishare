-- CreateEnum
CREATE TYPE "DeckStatus" AS ENUM ('QUEUED', 'GENERATING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "deck" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "title" TEXT,
    "slideCount" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'English',
    "template" TEXT NOT NULL DEFAULT 'general',
    "sourcePostId" TEXT,
    "status" "DeckStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "jobId" TEXT,
    "key" TEXT,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "deck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deck_ownerId_createdAt_idx" ON "deck"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "deck_status_idx" ON "deck"("status");

-- AddForeignKey
ALTER TABLE "deck" ADD CONSTRAINT "deck_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deck" ADD CONSTRAINT "deck_sourcePostId_fkey" FOREIGN KEY ("sourcePostId") REFERENCES "post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
