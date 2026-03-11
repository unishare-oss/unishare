/*
  Warnings:

  - A unique constraint covering the columns `[code,departmentId]` on the table `course` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "course_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "course_code_departmentId_key" ON "course"("code", "departmentId");
