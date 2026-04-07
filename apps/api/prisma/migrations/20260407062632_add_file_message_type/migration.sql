-- AlterEnum
ALTER TYPE "ChatMessageType" ADD VALUE 'FILE';

-- AlterTable
ALTER TABLE "chat_message" ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileUrl" TEXT;
