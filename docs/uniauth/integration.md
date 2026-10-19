# uniauth identity contracts in Unishare

Unishare signs people in through uniauth (OIDC, own session; see [planning-oidc.md](planning-oidc.md)) and, since the
identity platform work, follows uniauth's **v1 identity contracts**. Uniauth owns passwords, provider links, profile, email
verification and suspension. Unishare owns posts, roles, local bans, universities and everything else; a person is a local
`User` linked by `Account(providerId = 'uniauth', accountId = <uniauth user id>)`. Never match by email.

## What was added

| Piece                                                                                         | Where                                                                          |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `POST /api/uniauth/identity-events` receiver                                                  | `apps/api/src/modules/uniauth/uniauth-identity-events.service.ts` + controller |
| Directory client (read, batch, change feed), vendored                                         | `uniauth-directory.client.ts`                                                  |
| Reconciliation (startup + every `UNIAUTH_RECONCILE_HOURS`, default 6)                         | `uniauth-reconcile.service.ts`                                                 |
| `user.identityVersion`, `user.identityStatus`, `identity_event_receipt`, `identity_reconcile` | migration `…_uniauth_identity_events`                                          |
| Unique `(providerId, accountId)` on `account`                                                 | manual SQL `docs/uniauth/sql/account-provider-unique.sql`, not a migration     |
| Dry-run mapping report                                                                        | `apps/api/scripts/uniauth-mapping-report.ts`                                   |

The directory client is a small copy of the one in uniauth's `@unishare-oss/uniauth-client` (`packages/integration` in the
uniauth repo), which is not published yet; replace it with the package once it is.

## Environment

```
UNIAUTH_DIRECTORY_CLIENT_ID=        # machine client issued in the uniauth dashboard (directory:read, identity:events)
UNIAUTH_DIRECTORY_CLIENT_SECRET=    # server secret storage only; set both or neither
UNIAUTH_EVENTS_EXTRA_AUDIENCES=     # the OLD machine client id, only while a credential rotation overlaps
UNIAUTH_RECONCILE_HOURS=6
```

In the uniauth dashboard the Unishare environment needs `identity_events_uri = <api origin>/api/uniauth/identity-events`
and a machine credential holding `identity:events` and `directory:read`. On a rotation uniauth issues a new client id and
secret: update both within the overlap (7 days by default).

## Behavior

- **Events** are verified (uniauth keys, issuer, audience = the machine client) and applied in one transaction with their
  event id, so a redelivery changes nothing; a change applies only if its `identityVersion` is higher than the user's.
  Answers: 204 done/duplicate/stale/about nobody here, 401 unverifiable (uniauth retries), 400 unusable (final), 503 profile
  could not be fetched (uniauth retries).
- `identity.updated`: name, email, avatar, verification and **university** are refreshed from the directory read, which
  carries the memberships (`urn:uniauth:organizations`) with the same rule as sign-in (a university only changes when a
  membership maps). Unishare can therefore use v1 events fully: set `identity_events_uri`. The version stored is the
  directory's if newer than the event's; a read older than the event answers 503 so uniauth retries. A tombstone read is the
  existing deletion. An email another user holds is kept as it was; the rest still applies.
- `identity.suspended`: sessions end at once, new sessions are refused (`databaseHooks.session.create`) and a
  still-valid MCP bearer token gets `403 account_suspended` while `identityStatus = 'suspended'`. This is uniauth's account state; Unishare's own ban (`banned`), roles and content are never
  touched. `identity.reactivated` allows sign-in again (old sessions are not restored).
- `identity.deleted`: exactly the existing deletion (`UniauthUserDeletedService.deleteLocalUser`, with its audit record);
  deletion behavior is unchanged. An older update arriving afterwards cannot bring the person back.
- **Guests** (Better Auth anonymous users) have no uniauth account, so no event, resync or report row can concern them.
- Back-channel logout and the legacy `user-updated` / `user-deleted` notices are unchanged and keep working; uniauth stops
  sending them to a client only once its v1 events are fully set up.
- Concurrency: the user row is locked (`SELECT ... FOR UPDATE`) while a change applies, so an older event never overwrites a
  newer one. Receipts older than 14 days are pruned daily (cron lock).
- **Reconciliation** (once across the pods, never overlapping; `UNIAUTH_RECONCILE_HOURS` is validated) reads uniauth's change feed from a saved cursor (events only for accounts Unishare knows, in commit
  order). A `410 resync_required` (cursor older than the 7-day retention) refreshes every linked account with batch reads
  and reads the feed again from the start. A malformed entry or unreadable profile is skipped, logged and counted so it cannot
  wedge the cursor; only a directory lagging behind the feed stops the run (cursor kept, retried next run).
