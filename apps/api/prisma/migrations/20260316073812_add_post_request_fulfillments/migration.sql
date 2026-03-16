-- CreateTable
CREATE TABLE "post_request_fulfillment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_request_fulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_request_fulfillment_requestId_idx" ON "post_request_fulfillment"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "post_request_fulfillment_requestId_userId_key" ON "post_request_fulfillment"("requestId", "userId");

-- AddForeignKey
ALTER TABLE "post_request_fulfillment" ADD CONSTRAINT "post_request_fulfillment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "post_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_request_fulfillment" ADD CONSTRAINT "post_request_fulfillment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_request_fulfillment" ADD CONSTRAINT "post_request_fulfillment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
