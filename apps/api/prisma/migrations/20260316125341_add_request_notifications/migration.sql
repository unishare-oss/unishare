-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'REQUEST_SUGGESTION_ADDED';
ALTER TYPE "NotificationType" ADD VALUE 'REQUEST_FULFILLED';

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "requestId" TEXT;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "post_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
