-- AlterTable
ALTER TABLE "deck" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "includeTableOfContents" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "includeTitleSlide" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "pdfKey" TEXT,
ADD COLUMN     "tone" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "verbosity" TEXT NOT NULL DEFAULT 'standard',
ADD COLUMN     "webSearch" BOOLEAN NOT NULL DEFAULT false;
