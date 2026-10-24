-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MENTION';

-- AlterTable
ALTER TABLE "notification" ADD COLUMN "commentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "notification_commentId_userId_key" ON "notification"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
