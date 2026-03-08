/*
  Warnings:

  - You are about to drop the column `startYear` on the `user` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('POST_APPROVED', 'POST_REJECTED', 'COMMENT_ADDED');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('HELPFUL', 'LOVE', 'FIRE', 'WOW', 'SALUTE', 'FUNNY');

-- AlterTable
ALTER TABLE "file" ADD COLUMN     "downloads" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "post" ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "session" ADD COLUMN     "impersonatedBy" TEXT;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "startYear",
ADD COLUMN     "banExpires" TIMESTAMP(3),
ADD COLUMN     "banReason" TEXT,
ADD COLUMN     "banned" BOOLEAN DEFAULT false,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "enrollmentYear" INTEGER;

-- CreateTable
CREATE TABLE "post_view" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "post_view_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "reaction" (
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,

    CONSTRAINT "reaction_pkey" PRIMARY KEY ("userId","postId")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "postId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_view_postId_idx" ON "post_view"("postId");

-- CreateIndex
CREATE INDEX "reaction_postId_idx" ON "reaction"("postId");

-- CreateIndex
CREATE INDEX "notification_userId_idx" ON "notification"("userId");

-- AddForeignKey
ALTER TABLE "post_view" ADD CONSTRAINT "post_view_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_view" ADD CONSTRAINT "post_view_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaction" ADD CONSTRAINT "reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
