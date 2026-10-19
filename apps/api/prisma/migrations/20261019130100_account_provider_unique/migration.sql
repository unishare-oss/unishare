-- One local user per uniauth account, and one account row per (provider, id): the constraint that makes
-- provisioning by directory lookup and the first OIDC sign-in converge on a single user under concurrency.
-- Run scripts/uniauth-mapping-report.ts first (docs/uniauth/migration-runbook.md): it lists any duplicates
-- this would reject. Expand step: the application keeps working without it, and rolling it back is a DROP INDEX.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "account" GROUP BY "providerId", "accountId" HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate (providerId, accountId) rows in "account": resolve them (see the mapping report) before this migration';
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");
