---
phase: 09-canvas-password-protection-for-link-shared-rooms
plan: '01'
subsystem: backend/collab
tags: [password-protection, bcryptjs, prisma, tdd, dto, unit-tests]
dependency_graph:
  requires: []
  provides: [backend-password-enforcement, hasPassword-api-contract]
  affects: [collab.service, collab.controller, collab.repository, room.entity]
tech_stack:
  added: [bcryptjs, '@types/bcryptjs']
  patterns: [TDD-red-green, toRoomResponse-helper, owner-bypass-D07, pwVerified-sentinel-D22]
key_files:
  created:
    - apps/api/src/modules/collab/dto/join-room-body.dto.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/modules/collab/dto/update-room.dto.ts
    - apps/api/src/modules/collab/entities/room.entity.ts
    - apps/api/src/modules/collab/collab.repository.ts
    - apps/api/src/modules/collab/collab.service.ts
    - apps/api/src/modules/collab/collab.controller.ts
    - apps/api/src/modules/collab/collab.service.spec.ts
decisions:
  - 'toRoomResponse() private helper strips passwordHash and computes hasPassword for all room responses'
  - 'Password check placed AFTER PRIVATE visibility guard so PRIVATE takes precedence over password for anonymous users (D-04)'
  - 'Owner bypass uses activeSession.user.id !== room.ownerId to skip bcrypt entirely (D-07)'
  - 'pwVerified: true sentinel skips bcrypt check for already-verified tabs (D-22)'
  - 'bcryptjs v3 installed; bcrypt salt rounds = 10 per plan spec'
  - 'prisma db push used to apply passwordHash column (consistent with prior phases)'
metrics:
  duration_seconds: 327
  completed_date: '2026-03-21'
  tasks_completed: 2
  files_changed: 8
---

# Phase 09 Plan 01: Backend Password Protection Summary

**One-liner:** bcryptjs password hashing on room join/update with owner bypass and pwVerified sentinel, returning `hasPassword: boolean` without ever exposing the hash.

## What Was Built

Complete backend password protection layer for the collab module:

1. **Prisma migration** — `passwordHash String?` column added to Room model via `prisma db push`
2. **`JoinRoomBodyDto`** — New DTO with `password?: string` and `pwVerified?: boolean` fields
3. **`UpdateRoomDto` extended** — `password?: string | null` with `@ValidateIf`/`@MinLength(1)` validation
4. **`RoomEntity` extended** — `hasPassword: boolean` field added
5. **Repository extended** — `findBySlugWithVisibility` now selects `passwordHash`; `updateRoom` accepts `passwordHash?: string | null`
6. **Service password logic** — `joinRoom` enforces password checks for non-owners; `updateRoom` hashes/clears passwords; `toRoomResponse()` strips hash and adds `hasPassword`
7. **Controller updated** — `joinRoom` now accepts `@Body() body: JoinRoomBodyDto`
8. **Unit tests** — 10 new tests + 27 existing all pass (37 total)

## Tasks Completed

| Task | Name                                                                 | Commit  | Files                                                                                                        |
| ---- | -------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| 1    | Install bcryptjs, Prisma migration, DTO/entity/repository extensions | 5f44b16 | schema.prisma, join-room-body.dto.ts, update-room.dto.ts, room.entity.ts, collab.repository.ts, package.json |
| 2    | Service password logic, controller @Body, unit tests (TDD)           | 8235dda | collab.service.ts, collab.controller.ts, collab.service.spec.ts                                              |

## Decisions Made

| Decision                                 | Rationale                                                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toRoomResponse()` private helper        | Centralizes passwordHash stripping and hasPassword computation for all room responses (getRoomBySlug, getRoomsByOwner, updateRoom)                          |
| Password check after PRIVATE guard       | PRIVATE room guard throws 403 for anonymous users before password check — owner always has access regardless of visibility                                  |
| Owner bypass: `user.id !== room.ownerId` | Owners can always join their own password-protected room without re-entering the password (D-07)                                                            |
| `pwVerified: true` sentinel              | Frontend uses sessionStorage to signal that the current tab already verified the password for a room, enabling seamless re-join without re-prompting (D-22) |
| `bcrypt.hash(password, 10)`              | Standard 10 salt rounds; bcryptjs v3 used (pure JS, no native bindings needed in monorepo)                                                                  |
| `prisma db push` for migration           | Consistent with prior phases (Phase 7) that resolved drift via `db push` — avoids `migrate dev` drift errors                                                |

## Deviations from Plan

None — plan executed exactly as written.

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       37 passed, 37 total (27 existing + 10 new password tests)
Time:        0.733s
```

## Self-Check

**Status: PASSED**

- ✅ `apps/api/src/modules/collab/dto/join-room-body.dto.ts` — exists
- ✅ `apps/api/src/modules/collab/collab.service.ts` — exists
- ✅ `.planning/phases/09-canvas-password-protection-for-link-shared-rooms/09-01-SUMMARY.md` — exists
- ✅ Commit `5f44b16` (Task 1) — exists
- ✅ Commit `8235dda` (Task 2) — exists
- ✅ `passwordHash String?` in schema.prisma
- ✅ `hasPassword: boolean` in room.entity.ts
- ✅ `import * as bcrypt from 'bcryptjs'` in collab.service.ts
- ✅ `UnauthorizedException('Password required')` in collab.service.ts
- ✅ `@Body() body: JoinRoomBodyDto` in collab.controller.ts
