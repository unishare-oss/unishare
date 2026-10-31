-- AlterTable: nullable first so existing universities can be backfilled
ALTER TABLE "university" ADD COLUMN "slug" TEXT;

-- Backfill: the uniauth slug is the lowercased short name (KMUTT -> kmutt, MFU -> mfu)
UPDATE "university" SET "slug" = lower(regexp_replace("shortName", '[^A-Za-z0-9]+', '-', 'g'));

ALTER TABLE "university" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
-- Unique: two universities with the same short name fail here instead of guessing.
CREATE UNIQUE INDEX "university_slug_key" ON "university"("slug");

-- DropIndex
DROP INDEX "university_uniauthOrgId_key";

-- AlterTable: universities are matched by slug now, so the organization id isn't stored
ALTER TABLE "university" DROP COLUMN "uniauthOrgId";
