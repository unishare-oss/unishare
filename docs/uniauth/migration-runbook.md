# Runbook: moving Unishare to the uniauth identity contracts (staging first)

Not exercised against real data yet: the steps below were rehearsed only against synthetic data in a throwaway database.
Everything marked **staging** needs a real run before production.

## Before you start

- A backup/snapshot of the Unishare database, and the same for uniauth (the other side of the mapping).
- uniauth running a version with the directory, change feed and v1 events (identity foundation + admin dashboard).
- An administrator in uniauth to register the machine credential.

## 1. Dry run: the mapping report (read only)

```bash
DATABASE_URL=… pnpm --filter api exec ts-node scripts/uniauth-mapping-report.ts --json > report.json
# with the machine credential, also compare against uniauth's directory:
DATABASE_URL=… UNIAUTH_ISSUER=… UNIAUTH_DIRECTORY_CLIENT_ID=… UNIAUTH_DIRECTORY_CLIENT_SECRET=… \
  pnpm --filter api exec ts-node scripts/uniauth-mapping-report.ts --directory
```

Exit code 0 means nothing needs a decision. Exit code 2 lists conflicts; fix them by hand (never by matching emails):

| Conflict                                                  | Meaning                                          | What to do                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| unmapped registered user                                  | no `uniauth` link: cannot sign in after the move | link them in uniauth (same id) or leave them out, deliberately                                   |
| user with several links / one uniauth id on several users | would be refused by the unique constraint        | decide which local user owns the uniauth account; merge or unlink the other (a product decision) |
| duplicate emails (case-insensitive)                       | two local users, one mailbox                     | reconcile in uniauth first                                                                       |
| a foreign key NOT VALID / orphaned rows                   | product data pointing at a missing user          | fix the rows before anything else                                                                |
| linked id unknown or deleted in uniauth, email differs    | `--directory` only                               | the link is stale; do not auto-fix                                                               |

Ids are preserved by design: `idPreserved` counts users whose uniauth id equals their Unishare id (imported with
`scripts/import-unishare.ts` in the uniauth repo); `idDiffers` counts people created through a uniauth sign-in, which is
normal. No primary key is ever rewritten.

## 2. Expand (additive, reversible)

1. `pnpm --filter api db:deploy` applies `…_uniauth_identity_events` (new columns and two tables; nothing changes for the
   running app). `…_account_provider_unique` refuses to run if duplicate `(providerId, accountId)` rows exist, which the report
   lists; it is a `DROP INDEX` to undo.
2. Deploy the API with the new receiver. The legacy notices keep working; nothing is delivered to the new endpoint yet.
3. In the uniauth dashboard: add a machine credential to the Unishare environment (`directory:read`, `identity:events`), set
   `identity_events_uri`, run **Connection check**, store the secret as `UNIAUTH_DIRECTORY_CLIENT_*`, redeploy.
   (Unishare only: leave `identity_events_uri` unset until memberships are in the directory, see integration.md.)
4. Watch the receiver and the reconcile log for a day: duplicates and stale answers are normal; 401/503 are not.

## 3. Verify (staging)

- Suspend a test account in uniauth: its Unishare sessions end, it cannot get a new one, content and ban state are intact;
  reactivate and sign in again.
- Delete a test account: Unishare deletes it exactly as before.
- Stop the API for longer than the retry window (72 h) or break the receiver, change a profile, restart: reconciliation
  (or the 410 batch resync after the 7-day feed retention) brings it back.
- A guest session is unaffected throughout.

## Rollback

Each step is independent and loses nothing:

1. **Stop using v1 events**: clear `identity_events_uri` on the uniauth environment (the legacy notices resume for the login
   client), unset `UNIAUTH_DIRECTORY_CLIENT_*`, redeploy. Pending deliveries stay queued in uniauth and may be replayed or
   dropped; receipts and the cursor are kept.
2. **Roll back the code**: the previous API image ignores the new columns and tables. Do not drop them.
3. **Constraint**: `DROP INDEX "account_providerId_accountId_key";` only if it blocks something.
4. Never reactivate a suspended account, restore a deleted one or rewrite ids as part of a rollback; those stay as uniauth
   says. Sessions ended by a suspension are not restored.

## Needs staging (cannot be proven in a throwaway database)

Real mapping report and `--directory` comparison, the duplicate/conflict decisions, the rollback exercise above, observed
propagation latency, and the university membership gap.
