-- Fix searchVector: was dropped in reconcile_drift migration with no replacement trigger.
-- All posts have NULL searchVector, breaking full-text search entirely.
-- This migration:
--   1. Creates a trigger function that populates searchVector including the course code
--   2. Recreates the GIN index
--   3. Backfills all existing rows

-- Trigger function: rebuilds searchVector on each post insert/update.
-- Joins the course table to include the course code (e.g. "CSC217") so users
-- can search by course code. Uses 'simple' dictionary (no stemming) so that
-- alphanumeric codes like "csc217" are preserved as-is and match correctly.
CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS trigger AS $$
DECLARE
  course_code TEXT;
BEGIN
  SELECT c.code INTO course_code FROM "course" c WHERE c.id = NEW."courseId";

  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(course_code, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to post table
DROP TRIGGER IF EXISTS post_search_vector_update ON "post";
CREATE TRIGGER post_search_vector_update
  BEFORE INSERT OR UPDATE OF title, description, "courseId"
  ON "post"
  FOR EACH ROW EXECUTE FUNCTION update_post_search_vector();

-- Recreate GIN index for fast FTS lookups
CREATE INDEX IF NOT EXISTS "post_search_vector_idx" ON "post" USING gin("searchVector");

-- Backfill all existing posts
UPDATE "post" p
SET "searchVector" =
  setweight(to_tsvector('simple', coalesce(p.title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(c.code, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(p.description, '')), 'B')
FROM "course" c
WHERE c.id = p."courseId";
