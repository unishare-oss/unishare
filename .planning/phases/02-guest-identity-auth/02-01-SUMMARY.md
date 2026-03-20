---
phase: 02-guest-identity-auth
plan: '01'
subsystem: auth
tags: [anonymous-auth, better-auth, prisma, rest-api, unit-tests]
dependency_graph:
  requires: [01-01]
  provides: [anonymous-session-creation, join-room-endpoint, guest-display-name]
  affects: [collab-module, auth-config, prisma-schema]
tech_stack:
  added: [better-auth/anonymous-plugin]
  patterns:
    [anonymous-session-via-better-auth, returnHeaders-cookie-forwarding, OptionalAuth-decorator]
key_files:
  created:
    - apps/api/src/auth/guest-display-name.ts
    - apps/api/src/modules/collab/dto/join-room-response.dto.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/auth/auth.config.ts
    - apps/api/src/modules/collab/collab.controller.ts
    - apps/api/src/modules/collab/collab.service.ts
    - apps/api/src/modules/collab/collab.repository.ts
    - apps/api/src/modules/collab/collab.service.spec.ts
decisions:
  - 'Use OptionalAuth() not AllowAnonymous() on join endpoint — AllowAnonymous fully skips guard so @Session() cannot resolve; OptionalAuth runs session resolution but allows null'
  - 'generateName callback in anonymous() plugin sets user.name to adjective+animal; service reads user.name for displayName instead of calling generateGuestDisplayName directly'
  - 'signInAnonymous called with returnHeaders:true to get set-cookie; session retrieved via getSession(Bearer token) to obtain sessionId'
  - 'DB schema drift resolved via prisma db push (same pattern as phase 1 — pre-existing drift from untracked migration)'
metrics:
  duration_seconds: 1297
  completed_date: '2026-03-20'
  tasks_completed: 3
  files_changed: 8
---

# Phase 2 Plan 1: Guest Identity & Anonymous Auth Summary

**One-liner:** Better Auth anonymous plugin with adjective+animal display names, POST /rooms/:slug/join endpoint using OptionalAuth + returnHeaders cookie forwarding, 13 unit tests passing.

## What Was Built

- **`guest-display-name.ts`**: Utility with 20×20 adjective+animal name generator. Registered as `generateName` callback in the anonymous plugin so user.name is set on creation.
- **Prisma schema**: Added `isAnonymous Boolean?` to User, `displayName String?` + `isViewOnly Boolean?` to Session, `isGuestEditingAllowed Boolean` to Room. Synced via `prisma db push`.
- **`auth.config.ts`**: Registered `anonymous({ emailDomainName: 'guest.unishare.app', generateName })` plugin and added `session.additionalFields` for `displayName` and `isViewOnly`.
- **`collab.repository.ts`**: Added `findBySlugWithGuestFlag` method that selects `isGuestEditingAllowed`.
- **`collab.service.ts`**: Added `joinRoom` method — calls `auth.api.signInAnonymous` with `returnHeaders: true`, forwards `set-cookie` to response, retrieves full session via `auth.api.getSession(Bearer token)`, computes `isViewOnly = !room.isGuestEditingAllowed && isAnonymous`.
- **`collab.controller.ts`**: Added `@Post(':slug/join')` with `@OptionalAuth()` and `@Session() session: UserSession | null`.
- **`collab.service.spec.ts`**: 6 new joinRoom tests (anonymous creation, cookie forwarding, idempotent re-entry, isViewOnly anon/auth, NotFoundException, display name). All 13 tests pass.

## Decisions Made

| Decision                                        | Rationale                                                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OptionalAuth()` not `AllowAnonymous()` on join | `AllowAnonymous` sets PUBLIC metadata — guard fully skipped, `@Session()` cannot resolve. `OptionalAuth` allows null session but still resolves. |
| Display name via `generateName` callback        | Cleaner than calling `generateGuestDisplayName` in service; user.name is the authoritative display name for anonymous users.                     |
| `returnHeaders: true` on `signInAnonymous`      | Required to receive `set-cookie` header for forwarding to client. Session retrieved separately via Bearer token.                                 |
| `prisma db push` for migration                  | DB drift from pre-existing schema state prevents `migrate dev` without reset. Same approach as Phase 1.                                          |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `generateGuestDisplayName` import from service**

- **Found during:** Task 3 (writing tests)
- **Issue:** Service initially imported `generateGuestDisplayName` but didn't call it (display name comes from `user.name` set by the plugin's `generateName` callback)
- **Fix:** Removed the unused import
- **Files modified:** `apps/api/src/modules/collab/collab.service.ts`
- **Commit:** 4394e8c

**2. [Rule 1 - Bug] Fixed TypeScript cast for mocked auth API methods in spec**

- **Found during:** Overall verification
- **Issue:** `as jest.Mock` cast failed because the types don't overlap; needed `as unknown as jest.Mock`
- **Fix:** Added `unknown` intermediate cast
- **Files modified:** `apps/api/src/modules/collab/collab.service.spec.ts`
- **Commit:** 52ba7d0

## Self-Check: PASSED

All created files exist on disk. All task commits verified in git history.
