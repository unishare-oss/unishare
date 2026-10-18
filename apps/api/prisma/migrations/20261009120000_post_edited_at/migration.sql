-- Set only when the author edits a post. updatedAt also changes on views, trending and summaries.
ALTER TABLE "post" ADD COLUMN "editedAt" TIMESTAMP(3);
