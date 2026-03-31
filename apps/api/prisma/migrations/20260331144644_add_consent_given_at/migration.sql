-- DropIndex
DROP INDEX "post_search_vector_idx";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "consentGivenAt" TIMESTAMP(3);
