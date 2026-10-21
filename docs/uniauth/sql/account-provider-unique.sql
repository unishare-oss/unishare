-- MANUAL STEP: not a Prisma migration. Run by hand, once, after scripts/uniauth-mapping-report.ts exits 0
-- (docs/uniauth/migration-runbook.md). One local user per uniauth account: the constraint that makes provisioning by
-- directory lookup and the first OIDC sign-in converge on a single user under concurrency.
--
--   psql "$DATABASE_URL" -f docs/uniauth/sql/account-provider-unique.sql
--
-- Run it WITHOUT a wrapping transaction (CREATE INDEX CONCURRENTLY cannot run inside one): the first statement refuses to
-- continue if duplicate (providerId, accountId) rows exist; the second builds the index without blocking writes.
-- Rollback: DROP INDEX "account_providerId_accountId_key";
-- The application works without it (it is a safety net, not a dependency). Afterwards add
-- `@@unique([providerId, accountId])` to model Account in schema.prisma (no migration: the index already exists).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "account" GROUP BY "providerId", "accountId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate (providerId, accountId) rows in "account": resolve them (see the mapping report) first';
  END IF;
END $$;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "account_providerId_accountId_key" ON "account"("providerId", "accountId");
