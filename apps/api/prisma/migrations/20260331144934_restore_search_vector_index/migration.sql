-- Restore GIN index on searchVector (dropped by Prisma drift reconciliation).
-- This index is on an Unsupported("tsvector") column so it cannot be declared
-- in schema.prisma and must be managed manually here.
CREATE INDEX IF NOT EXISTS "post_search_vector_idx" ON "post" USING gin("searchVector");