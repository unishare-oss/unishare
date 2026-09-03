-- AlterTable
-- Only the default for NEW rows; existing decks keep whatever they were generated with, so
-- their stored options still describe how they were actually made.
ALTER TABLE "deck" ALTER COLUMN "verbosity" SET DEFAULT 'concise';
