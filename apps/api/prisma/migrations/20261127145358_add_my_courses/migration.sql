-- CreateEnum
CREATE TYPE "StudentCourseChangeKind" AS ENUM ('ADDED', 'REMOVED');

-- CreateTable
CREATE TABLE "student_course_change" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "kind" "StudentCourseChangeKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_course_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_course_check" (
    "userId" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_course_check_pkey" PRIMARY KEY ("userId","academicYear")
);

-- CreateIndex
CREATE INDEX "student_course_change_userId_academicYear_idx" ON "student_course_change"("userId", "academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "student_course_change_userId_courseId_academicYear_key" ON "student_course_change"("userId", "courseId", "academicYear");

-- AddForeignKey
ALTER TABLE "student_course_change" ADD CONSTRAINT "student_course_change_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_change" ADD CONSTRAINT "student_course_change_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_course_check" ADD CONSTRAINT "student_course_check_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
