-- AlterTable
ALTER TABLE "user" ADD COLUMN     "universityId" TEXT;

-- CreateTable
CREATE TABLE "university" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "logoUrl" TEXT,

    CONSTRAINT "university_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "university_name_key" ON "university"("name");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "university"("id") ON DELETE SET NULL ON UPDATE CASCADE;
