-- AlterTable
ALTER TABLE "chat_room_participant" ADD COLUMN     "encryptedRoomKey" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "publicKey" TEXT;
