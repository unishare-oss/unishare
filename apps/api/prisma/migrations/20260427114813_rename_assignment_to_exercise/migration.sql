/*
  Warnings:

  - The values [ASSIGNMENT] on the enum `PostType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PostType_new" AS ENUM ('NOTE', 'OLD_QUESTION', 'EXERCISE');
ALTER TABLE "post" ALTER COLUMN "type" TYPE "PostType_new" USING (CASE WHEN "type"::text = 'ASSIGNMENT' THEN 'EXERCISE' ELSE "type"::text END::"PostType_new");
ALTER TYPE "PostType" RENAME TO "PostType_old";
ALTER TYPE "PostType_new" RENAME TO "PostType";
DROP TYPE "public"."PostType_old";
COMMIT;
