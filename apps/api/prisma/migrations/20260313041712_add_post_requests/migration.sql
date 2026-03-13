-- CreateEnum
CREATE TYPE "PostRequestStatus" AS ENUM ('OPEN', 'FULFILLED');

-- CreateTable
CREATE TABLE "post_request" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "courseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" "PostRequestStatus" NOT NULL DEFAULT 'OPEN',
    "fulfilledByPostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_request_upvote" (
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_request_upvote_pkey" PRIMARY KEY ("userId","requestId")
);

-- CreateIndex
CREATE INDEX "post_request_authorId_idx" ON "post_request"("authorId");

-- CreateIndex
CREATE INDEX "post_request_courseId_idx" ON "post_request"("courseId");

-- CreateIndex
CREATE INDEX "post_request_status_idx" ON "post_request"("status");

-- CreateIndex
CREATE INDEX "post_request_upvote_requestId_idx" ON "post_request_upvote"("requestId");

-- AddForeignKey
ALTER TABLE "post_request" ADD CONSTRAINT "post_request_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_request" ADD CONSTRAINT "post_request_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_request" ADD CONSTRAINT "post_request_fulfilledByPostId_fkey" FOREIGN KEY ("fulfilledByPostId") REFERENCES "post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_request_upvote" ADD CONSTRAINT "post_request_upvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_request_upvote" ADD CONSTRAINT "post_request_upvote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "post_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
