---
phase: 06-board-persistence-export
plan: 01
subsystem: api
tags: [yjs, websocket, postgres, prisma, snapshot, persistence]

# Dependency graph
requires:
  - phase: 03-websocket-gateway
    provides: CollabRoomService, CollabGateway, CollabRepository skeleton
  - phase: 01-data-model
    provides: Room.snapshot Bytes? column in Prisma schema

provides:
  - CollabRepository.saveSnapshot and getSnapshot methods (Uint8Array ↔ DB)
  - CollabRoomService.getOrCreate async with DB snapshot restore on fresh doc
  - CollabRoomService.resetIdleTimer — debounced 30s idle save
  - CollabRoomService.flushSnapshot — immediate save + cancel idle timer
  - CollabRoomService.getDoc — sync in-memory lookup for handleYjsUpdate
  - removeSocket flushes snapshot when room empties before GC
  - 19 unit tests covering snapshot restore, idle debounce, flush

affects:
  - 06-02 (export): reads Room.snapshot for PDF/image export
  - any future room recovery or backup feature

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Idle-debounce save: resetIdleTimer sets 30s timeout on each Yjs update; flushSnapshot cancels and saves immediately
    - In-memory canonical: room already in Map is NEVER re-loaded from DB — snapshot only restores on cold start
    - GC-safe flush: removeSocket calls flushSnapshot before scheduling 5-min GC timer

key-files:
  created: []
  modified:
    - apps/api/src/modules/collab/collab.repository.ts
    - apps/api/src/modules/collab/collab.room.service.ts
    - apps/api/src/modules/collab/collab.gateway.ts
    - apps/api/src/modules/collab/collab.room.service.spec.ts
    - apps/api/src/modules/collab/collab.gateway.spec.ts
    - apps/api/src/modules/collab/collab.gateway.integration.spec.ts

key-decisions:
  - 'saveSnapshot/getSnapshot use Uint8Array to avoid Buffer<ArrayBufferLike> Prisma type mismatch'
  - 'getDoc(slug) added as sync in-memory lookup — handleYjsUpdate uses it instead of async getOrCreate (room guaranteed in memory post-join)'
  - 'In-memory Y.Doc is canonical — rooms.has(slug) guard prevents redundant DB restore'

patterns-established:
  - 'Idle-debounce + flush-on-disconnect pattern for Yjs snapshot persistence'
  - 'Async getOrCreate with snapshot restore, sync getDoc for hot path'

requirements-completed: [ROOM-03]

# Metrics
duration: 18min
completed: 2026-03-21
---

# Phase 6 Plan 01: Board Snapshot Persistence Summary

**Yjs snapshot persistence via 30s idle debounce and disconnect flush, with DB restore on cold room start using CollabRepository.saveSnapshot/getSnapshot**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-21T12:38:35Z
- **Completed:** 2026-03-21T12:56:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added `saveSnapshot(slug, Uint8Array)` and `getSnapshot(slug)` to CollabRepository — reads/writes Room.snapshot Bytes column
- Refactored CollabRoomService: async `getOrCreate` loads DB snapshot on cold start, `resetIdleTimer` debounces 30s save, `flushSnapshot` saves immediately on disconnect
- Wired CollabGateway: `handleJoinRoom` awaits async `getOrCreate`, `handleYjsUpdate` uses sync `getDoc` + calls `resetIdleTimer`
- Extended spec to 19 tests covering snapshot restore, idle-timer debounce, and flush behavior

## Task Commits

1. **Task 1: Add repository methods and refactor CollabRoomService** - `40d3fe5` (feat)
2. **Task 2: Wire gateway and extend unit tests** - `4728870` (feat)
3. **Spec fixes: update gateway specs for new API** - `8f10f7b` (fix)

## Files Created/Modified

- `apps/api/src/modules/collab/collab.repository.ts` - Added saveSnapshot/getSnapshot using Uint8Array
- `apps/api/src/modules/collab/collab.room.service.ts` - Async getOrCreate, resetIdleTimer, flushSnapshot, getDoc, idleTimer in RoomEntry
- `apps/api/src/modules/collab/collab.gateway.ts` - await getOrCreate in handleJoinRoom; getDoc + resetIdleTimer in handleYjsUpdate
- `apps/api/src/modules/collab/collab.room.service.spec.ts` - Updated to async, added 9 new tests (restore, idle, flush)
- `apps/api/src/modules/collab/collab.gateway.spec.ts` - Added getDoc/resetIdleTimer mocks, updated assertions
- `apps/api/src/modules/collab/collab.gateway.integration.spec.ts` - Added getSnapshot/saveSnapshot to mock repository

## Decisions Made

- `saveSnapshot` / `getSnapshot` accept/return `Uint8Array` (not `Buffer`) to satisfy Prisma's strict Bytes type — `Buffer.from(snapshot)` used only at the Prisma call site
- `getDoc(slug)` added as a synchronous in-memory lookup for `handleYjsUpdate` since the room is guaranteed to be in memory after `join-room`; avoids unnecessary async in the hot update path
- In-memory Y.Doc remains canonical — if room already exists in the Map, `getOrCreate` returns it immediately without querying DB

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma Bytes type mismatch for snapshot field**

- **Found during:** Task 1 (repository implementation)
- **Issue:** `Buffer<ArrayBufferLike>` not assignable to Prisma's `Uint8Array<ArrayBuffer>` — TS strict mode rejected the assignment
- **Fix:** Changed saveSnapshot parameter to `Uint8Array`, convert to `Buffer.from()` at Prisma call site; getSnapshot returns `new Uint8Array(room.snapshot)` instead of raw Bytes
- **Files modified:** collab.repository.ts, collab.room.service.ts
- **Verification:** tsc --noEmit passes
- **Committed in:** 40d3fe5 (Task 1 commit)

**2. [Rule 3 - Blocking] Updated collab.gateway.ts to compile after getOrCreate became async**

- **Found during:** Task 1 verification (tsc --noEmit)
- **Issue:** Gateway called sync `getOrCreate` in both handleJoinRoom and handleYjsUpdate; making it async broke compilation
- **Fix:** handleJoinRoom got `await`; handleYjsUpdate switched to `getDoc` + `resetIdleTimer` (both Task 2 changes, applied early to unblock compilation)
- **Files modified:** collab.gateway.ts
- **Verification:** tsc --noEmit passes; all tests pass
- **Committed in:** 4728870 (Task 2 commit)

**3. [Rule 1 - Bug] Updated gateway spec mocks and integration spec repository mock**

- **Found during:** Full test suite run after Task 2
- **Issue:** collab.gateway.spec.ts mock didn't have `getDoc`/`resetIdleTimer`; collab.gateway.integration.spec.ts mock repository missing `getSnapshot`/`saveSnapshot` causing NestJS DI injection failures
- **Fix:** Added missing mock methods to both spec files; updated handleYjsUpdate test assertions from `getOrCreate` to `getDoc`
- **Files modified:** collab.gateway.spec.ts, collab.gateway.integration.spec.ts
- **Verification:** 50/50 tests pass (1 pre-existing unrelated failure in app.controller.spec.ts)
- **Committed in:** 8f10f7b (fix commit)

---

**Total deviations:** 3 auto-fixed (1 type error, 1 blocking compilation, 1 test mock update)
**Impact on plan:** All auto-fixes necessary for TypeScript correctness and test integrity. No scope creep.

## Issues Encountered

- `app.controller.spec.ts` is a pre-existing failure (ESM/CJS transform issue with `better-auth` in Jest) — unrelated to this plan, not introduced by our changes (verified via git stash)

## Next Phase Readiness

- Room snapshot persistence fully implemented and tested (ROOM-03 satisfied)
- `Room.snapshot` column is now read and written; Phase 06-02 (export) can read this snapshot for PDF/image generation
- No blockers

---

_Phase: 06-board-persistence-export_
_Completed: 2026-03-21_
