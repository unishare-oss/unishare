-- AlterTable
-- Null means "not shared", which is every existing deck: sharing is always an explicit act by
-- the owner, so there is no backfill.
ALTER TABLE "deck" ADD COLUMN "shareToken" TEXT;

-- CreateIndex
-- Unique because an unauthenticated caller is resolved BY this column alone. A duplicate would
-- make one student's deck reachable through another student's link.
CREATE UNIQUE INDEX "deck_shareToken_key" ON "deck"("shareToken");
