-- CreateTable
CREATE TABLE "reading_list" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_list_post" (
    "listId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_list_post_pkey" PRIMARY KEY ("listId","postId")
);

-- CreateIndex
CREATE INDEX "reading_list_userId_idx" ON "reading_list"("userId");

-- CreateIndex
CREATE INDEX "reading_list_post_postId_idx" ON "reading_list_post"("postId");

-- AddForeignKey
ALTER TABLE "reading_list" ADD CONSTRAINT "reading_list_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_list_post" ADD CONSTRAINT "reading_list_post_listId_fkey" FOREIGN KEY ("listId") REFERENCES "reading_list"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_list_post" ADD CONSTRAINT "reading_list_post_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
