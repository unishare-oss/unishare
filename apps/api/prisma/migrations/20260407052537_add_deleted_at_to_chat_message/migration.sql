-- DropForeignKey
ALTER TABLE "chat_message" DROP CONSTRAINT "chat_message_parentId_fkey";

-- AlterTable
ALTER TABLE "chat_message" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "chat_message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
