-- AlterTable
-- All nullable with no default: a deck that has not started, or one generated before this
-- migration, has no progress rather than a misleading zero.
ALTER TABLE "deck" ADD COLUMN     "progressPhase" TEXT,
ADD COLUMN     "progressDone" INTEGER,
ADD COLUMN     "progressTotal" INTEGER;
