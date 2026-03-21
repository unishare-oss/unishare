-- CreateEnum
CREATE TYPE "RoomVisibility" AS ENUM ('OPEN', 'VIEW_ONLY', 'PRIVATE');

-- AlterTable
ALTER TABLE "room" DROP COLUMN IF EXISTS "isGuestEditingAllowed",
ADD COLUMN "visibility" "RoomVisibility" NOT NULL DEFAULT 'OPEN';
