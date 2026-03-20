---
phase: 03-websocket-gateway-yjs-relay
plan: '02'
subsystem: testing
tags: [websocket, yjs, socket.io, integration-tests, nestjs, crdt]

requires:
  - phase: 03-01
    provides: CollabGateway, CollabRoomService, IoAdapter
provides:
  - End-to-end integration tests proving COLB-01 relay, isolation, state sync, and auth rejection
affects: []

tech-stack:
  added: []
  patterns:
    - socket.io-client integration tests with live NestJS app on random port (app.listen(0))
    - Per-test unique room slugs to avoid cross-test Y.Doc state pollution
    - jest.mock('@/auth/auth.config') to stub getSession for socket.io namespace middleware
    - Valid Y.encodeStateAsUpdate() required for yjs-update relay (raw bytes fail Y.applyUpdate)

key-files:
  created:
    - apps/api/src/modules/collab/collab.gateway.integration.spec.ts
  modified: []

key-decisions:
  - 'Per-test unique room slugs required because CollabRoomService is a singleton in test module — Y.Doc state accumulates across tests sharing the same slug'
  - "Raw bytes like Buffer.from([1,2,3]) cannot be used for yjs-update relay tests — Y.applyUpdate throws 'Unexpected end of array' causing the relay to abort before emitting to other clients"

patterns-established:
  - 'Integration test pattern: Test.createTestingModule with real providers + mock repository, app.useWebSocketAdapter(new IoAdapter(app)), app.listen(0), extract port from getHttpServer().address()'

requirements-completed: [COLB-01]

duration: 8min
completed: '2026-03-20'
---

# Phase 03 Plan 02: WebSocket Gateway Integration Tests Summary

**socket.io-client integration tests booting live NestJS app verify Yjs relay, room isolation, state sync on join, and auth rejection for COLB-01**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-20T16:11:25Z
- **Completed:** 2026-03-20T16:19:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- 4 integration tests covering all COLB-01 scenarios passing in < 2 seconds
- Room isolation verified: updates from `isolation-room-1` never reach client in `isolation-room-2`
- State sync verified: new joiner receives merged Y.Doc state applied by earlier client
- Auth rejection verified: empty cookie produces `connect_error` with "Unauthorized"

## Task Commits

1. **Task 1: Integration tests for WebSocket gateway relay** - `5d99981` (test)

## Files Created/Modified

- `apps/api/src/modules/collab/collab.gateway.integration.spec.ts` - 4 integration tests using socket.io-client against live NestJS app

## Decisions Made

- Used per-test unique room slugs (`relay-room-1`, `isolation-room-1`, `state-room-1`) because `CollabRoomService` is a singleton across the test module — sharing `test-room` across tests caused Y.Doc state from test 1 to bleed into test 3
- Used `Y.encodeStateAsUpdate(sourceDoc)` for all relay test payloads — raw byte buffers like `Buffer.from([1,2,3])` cause `Y.applyUpdate` to throw "Unexpected end of array" which silently aborts the relay before `client.to(slug).emit()` fires

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] yjs-update relay test used invalid Yjs bytes causing relay abort**

- **Found during:** Task 1 (first test run)
- **Issue:** Test 1 emitted `Buffer.from([1, 2, 3])` as a `yjs-update`. The gateway calls `Y.applyUpdate(doc, update)` before relaying — this throws "Unexpected end of array" for non-Yjs bytes, so the relay to clientB never fires. Test 1 timed out after 5s.
- **Fix:** Replaced raw bytes with `Buffer.from(Y.encodeStateAsUpdate(sourceDoc))` using a real `Y.Doc` with content inserted. Changed assertion to decode the received bytes and verify the Y.Doc text content.
- **Files modified:** apps/api/src/modules/collab/collab.gateway.integration.spec.ts
- **Verification:** Test 1 passes in ~50ms with decoded content assertion
- **Committed in:** 5d99981 (Task 1 commit)

**2. [Rule 1 - Bug] Shared room slug caused Y.Doc state cross-contamination between tests**

- **Found during:** Task 1 (second test run after fixing relay test)
- **Issue:** Tests 1 and 3 both used `test-room`. CollabRoomService singleton retained the Y.Doc from test 1 (`relay-test` content). When test 3 joined `test-room` and received the state, it contained both `relay-test` and `hello integration` — assertion for exact string `hello integration` failed.
- **Fix:** Each test uses a unique room slug: `relay-room-1`, `isolation-room-1/2`, `state-room-1`. Expanded mock repository to accept slugs with these prefixes.
- **Files modified:** apps/api/src/modules/collab/collab.gateway.integration.spec.ts
- **Verification:** Test 3 passes with exact content assertion
- **Committed in:** 5d99981 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes required for test correctness. No scope creep — same 4 test scenarios as specified in plan.

## Issues Encountered

None beyond the auto-fixed bugs above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- COLB-01 fully proven end-to-end at the WebSocket layer
- Phase 3 complete: CollabGateway + CollabRoomService + 35 total tests (31 unit + 4 integration)
- Phase 4 (Canvas UI & Drawing Tools) can proceed — WebSocket relay is verified working

---

_Phase: 03-websocket-gateway-yjs-relay_
_Completed: 2026-03-20_
