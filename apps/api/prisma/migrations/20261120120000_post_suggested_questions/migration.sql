-- AlterTable
ALTER TABLE "post" ADD COLUMN     "suggestedQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[];
