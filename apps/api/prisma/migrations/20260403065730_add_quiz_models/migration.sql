-- CreateTable
CREATE TABLE "study_material" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fileKey" TEXT,

    CONSTRAINT "study_material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studyMaterialId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionsCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_question" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "options" TEXT[],
    "explanation" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_session" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "timeSpentSec" INTEGER,

    CONSTRAINT "quiz_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentAnswer" INTEGER,
    "isCorrect" BOOLEAN,
    "timeSpentSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "study_material_courseId_idx" ON "study_material"("courseId");

-- CreateIndex
CREATE INDEX "study_material_uploadedBy_idx" ON "study_material"("uploadedBy");

-- CreateIndex
CREATE INDEX "quiz_courseId_idx" ON "quiz"("courseId");

-- CreateIndex
CREATE INDEX "quiz_isPublished_idx" ON "quiz"("isPublished");

-- CreateIndex
CREATE INDEX "quiz_createdBy_idx" ON "quiz"("createdBy");

-- CreateIndex
CREATE INDEX "quiz_question_quizId_idx" ON "quiz_question"("quizId");

-- CreateIndex
CREATE INDEX "quiz_session_quizId_idx" ON "quiz_session"("quizId");

-- CreateIndex
CREATE INDEX "quiz_session_studentId_idx" ON "quiz_session"("studentId");

-- CreateIndex
CREATE INDEX "quiz_session_attemptedAt_idx" ON "quiz_session"("attemptedAt");

-- CreateIndex
CREATE INDEX "question_attempt_sessionId_idx" ON "question_attempt"("sessionId");

-- CreateIndex
CREATE INDEX "question_attempt_questionId_idx" ON "question_attempt"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "question_attempt_sessionId_questionId_key" ON "question_attempt"("sessionId", "questionId");

-- AddForeignKey
ALTER TABLE "study_material" ADD CONSTRAINT "study_material_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_material" ADD CONSTRAINT "study_material_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_studyMaterialId_fkey" FOREIGN KEY ("studyMaterialId") REFERENCES "study_material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_session" ADD CONSTRAINT "quiz_session_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_session" ADD CONSTRAINT "quiz_session_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempt" ADD CONSTRAINT "question_attempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "quiz_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempt" ADD CONSTRAINT "question_attempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "quiz_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
