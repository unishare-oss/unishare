---
phase: 07-room-access-control
plan: 02
subsystem: collab-gateway
tags: [websocket, access-control, view-only, tdd]
dependency_graph:
  requires: [07-01]
  provides: [server-side-view-only-enforcement]
  affects: [collab.gateway.ts]
tech_stack:
  added: []
  patterns: [socket.data-guard, early-return-guard]
key_files:
  created: []
  modified:
    - apps/api/src/modules/collab/collab.gateway.ts
    - apps/api/src/modules/collab/collab.gateway.spec.ts
decisions:
  - isViewOnly computed at join time from room.visibility + client.data.user.isAnonymous (string comparison — no RoomVisibility enum import needed)
  - isViewOnly guard placed as first line of handleYjsUpdate for lowest-cost early return
  - PRIVATE room blocks anonymous at join time via emit('error') + return before client.join
metrics:
  duration_s: 103
  completed: '2026-03-21'
  tasks_completed: 1
  files_modified: 2
---

# Phase 07 Plan 02: Gateway isViewOnly Enforcement Summary

Server-side view-only enforcement added to the WebSocket gateway: `isViewOnly` stored on `socket.data` at join time, early-return guard in `handleYjsUpdate` silently drops updates from view-only sockets, and PRIVATE rooms block anonymous connections at the gateway level.

## Tasks Completed

| Task      | Name                                                      | Commit  | Files                  |
| --------- | --------------------------------------------------------- | ------- | ---------------------- |
| 1 (RED)   | Gateway isViewOnly guard + PRIVATE block — failing tests  | c96d7f2 | collab.gateway.spec.ts |
| 1 (GREEN) | Gateway isViewOnly guard + PRIVATE block — implementation | 31d4945 | collab.gateway.ts      |

## What Was Built

### collab.gateway.ts — handleJoinRoom

After assigning `colorIndex` and `name` on `socket.data`, the gateway now:

1. Checks `room.visibility === 'PRIVATE' && isAnonymous` — emits `error` and returns early (never calls `client.join`)
2. Sets `client.data.isViewOnly = room.visibility === 'VIEW_ONLY' && isAnonymous`

### collab.gateway.ts — handleYjsUpdate

First line of the method body: `if (client.data.isViewOnly) return` — silently drops updates from view-only sockets before any room lookup or doc mutation.

### collab.gateway.spec.ts — updated makeSocket + new tests

- `makeSocket` now accepts `isAnonymous` param and includes `isViewOnly` on `data`
- All existing `findBySlug.mockResolvedValue` calls updated with `visibility: 'OPEN'`
- 5 new test cases covering all behavior scenarios (16 total, all green)

## Decisions Made

| Decision                                                    | Rationale                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| String comparison for `room.visibility` (`=== 'VIEW_ONLY'`) | Prisma returns enum values as strings at runtime; avoids importing `RoomVisibility` enum  |
| `isViewOnly` guard as first line of `handleYjsUpdate`       | Lowest-cost short-circuit — skips room lookup and doc access entirely                     |
| PRIVATE block at join time (not connection time)            | Connection-time auth only validates session; room policy is known only after `findBySlug` |

## Verification

```
collab.gateway.spec.ts: 16 passed, 0 failed
Full API suite: 61 passed, 0 failed (app.controller.spec pre-existing import error unrelated to this plan)
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `apps/api/src/modules/collab/collab.gateway.ts` modified with `client.data.isViewOnly` and `if (client.data.isViewOnly) return`
- [x] `apps/api/src/modules/collab/collab.gateway.spec.ts` modified with new test cases
- [x] Commit `c96d7f2` exists (RED)
- [x] Commit `31d4945` exists (GREEN)
- [x] All gateway tests pass (16/16)
