-- AlterTable
ALTER TABLE "chat_message" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "chat_message_parentId_idx" ON "chat_message"("parentId");

-- CreateIndex
CREATE INDEX "chat_message_roomId_parentId_createdAt_idx" ON "chat_message"("roomId", "parentId", "createdAt");

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "chat_message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
