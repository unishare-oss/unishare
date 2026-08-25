-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'EXAM_REMINDER';

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "examId" TEXT;

-- AlterTable
ALTER TABLE "quiz" ADD COLUMN     "moduleNumber" INTEGER;

-- CreateTable
CREATE TABLE "course_module_outline" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "moduleNumber" INTEGER NOT NULL,
    "topics" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_module_outline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "examRoom" TEXT,
    "notes" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_module_outline_courseId_moduleNumber_key" ON "course_module_outline"("courseId", "moduleNumber");

-- CreateIndex
CREATE INDEX "exam_courseId_idx" ON "exam"("courseId");

-- CreateIndex
CREATE INDEX "exam_startsAt_idx" ON "exam"("startsAt");

-- AddForeignKey
ALTER TABLE "course_module_outline" ADD CONSTRAINT "course_module_outline_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam" ADD CONSTRAINT "exam_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
