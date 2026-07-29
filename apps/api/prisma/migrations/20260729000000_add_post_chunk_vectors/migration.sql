-- Must come first: the post_chunk.embedding column type does not exist without it.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "IngestStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED', 'UNSUPPORTED');

-- AlterTable
ALTER TABLE "file" ADD COLUMN     "ingestError" TEXT,
ADD COLUMN     "ingestStartedAt" TIMESTAMP(3),
ADD COLUMN     "ingestStatus" "IngestStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "ingestedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "post_chunk" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "pageNum" INTEGER,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_chunk_postId_idx" ON "post_chunk"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "post_chunk_fileId_chunkIndex_key" ON "post_chunk"("fileId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "post_chunk" ADD CONSTRAINT "post_chunk_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "file"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_chunk" ADD CONSTRAINT "post_chunk_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vector index. Cosine, matching the <=> operator used by RetrievalService.
-- Note: with WHERE "postId" = $1 the planner will usually prefer post_chunk_postId_idx
-- plus a sort, since one post has few chunks. This index earns its keep in phase 2
-- (cross-corpus search); it is created now to avoid a second migration against a
-- larger table later.
CREATE INDEX "post_chunk_embedding_idx"
  ON "post_chunk" USING hnsw ("embedding" vector_cosine_ops);

