-- CreateTable
CREATE TABLE "faculty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,

    CONSTRAINT "faculty_pkey" PRIMARY KEY ("id")
);

-- AlterTable: nullable first so existing departments can be backfilled
ALTER TABLE "department" ADD COLUMN "facultyId" TEXT;

-- Backfill: only when departments already exist (a fresh database gets everything from the seed)
INSERT INTO "university" ("id", "name", "shortName", "logoUrl")
SELECT
    gen_random_uuid()::text,
    'King Mongkut''s University of Technology Thonburi',
    'KMUTT',
    'https://upload.wikimedia.org/wikipedia/en/7/76/Seal_of_King_Mongkut''s_University_of_Technology_Thonburi.svg'
WHERE EXISTS (SELECT 1 FROM "department")
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "faculty" ("id", "name", "universityId")
SELECT gen_random_uuid()::text, f.name, u."id"
FROM "university" u
CROSS JOIN (VALUES
    ('School of Information Technology'),
    ('Faculty of Engineering'),
    ('School of Architecture and Design')
) AS f(name)
WHERE u."name" = 'King Mongkut''s University of Technology Thonburi'
  AND EXISTS (SELECT 1 FROM "department");

UPDATE "department" d
SET "facultyId" = f."id"
FROM "faculty" f
JOIN "university" u ON u."id" = f."universityId"
JOIN (VALUES
    ('Computer Science', 'School of Information Technology'),
    ('Information Technology', 'School of Information Technology'),
    ('Digital Service Innovation', 'School of Information Technology'),
    ('Computer Engineering (International Program)', 'Faculty of Engineering'),
    ('Electronic and Infocommunication Engineering (International Program)', 'Faculty of Engineering'),
    ('Automation Engineering (International Program)', 'Faculty of Engineering'),
    ('Civil Engineering (International Program)', 'Faculty of Engineering'),
    ('Chemical Engineering (International Program)', 'Faculty of Engineering'),
    ('Environmental Engineering (International Program)', 'Faculty of Engineering'),
    ('Architecture (International Program)', 'School of Architecture and Design'),
    ('Digital Design (International Program)', 'School of Architecture and Design'),
    ('Creative Technology (International Program)', 'School of Architecture and Design')
) AS m(department, faculty) ON m.faculty = f."name"
WHERE u."name" = 'King Mongkut''s University of Technology Thonburi'
  AND d."name" = m.department;

-- Departments outside the known KMUTT list go into a KMUTT "Other" faculty, created only if needed
INSERT INTO "faculty" ("id", "name", "universityId")
SELECT gen_random_uuid()::text, 'Other', u."id"
FROM "university" u
WHERE u."name" = 'King Mongkut''s University of Technology Thonburi'
  AND EXISTS (SELECT 1 FROM "department" WHERE "facultyId" IS NULL);

UPDATE "department" d
SET "facultyId" = f."id"
FROM "faculty" f
JOIN "university" u ON u."id" = f."universityId"
WHERE u."name" = 'King Mongkut''s University of Technology Thonburi'
  AND f."name" = 'Other'
  AND d."facultyId" IS NULL;

-- AlterTable
ALTER TABLE "department" ALTER COLUMN "facultyId" SET NOT NULL;

-- DropIndex
DROP INDEX "department_name_key";

-- CreateIndex
CREATE INDEX "faculty_universityId_idx" ON "faculty"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_universityId_name_key" ON "faculty"("universityId", "name");

-- CreateIndex
CREATE INDEX "department_facultyId_idx" ON "department"("facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "department_facultyId_name_key" ON "department"("facultyId", "name");

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "faculty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "university"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
