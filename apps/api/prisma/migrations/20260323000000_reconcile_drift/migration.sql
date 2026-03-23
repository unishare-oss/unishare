-- AlterTable: add passwordHash to room
ALTER TABLE "room" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- AlterTable: add displayName and isViewOnly to session
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "isViewOnly" BOOLEAN DEFAULT false;

-- AlterTable: add isAnonymous to user
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN DEFAULT false;

-- AlterTable: drop searchVector generated default (now managed by trigger/application)
ALTER TABLE "post" ALTER COLUMN "searchVector" DROP DEFAULT;
