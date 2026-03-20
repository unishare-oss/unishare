---
phase: 05-presence-and-awareness
plan: '01'
subsystem: api/collab-gateway
tags: [websockets, presence, cursor-relay, participant-tracking, tdd]
dependency_graph:
  requires: []
  provides:
    [
      cursor-move-relay,
      participant-list-on-join,
      participant-joined-broadcast,
      participant-left-on-disconnect,
    ]
  affects: [apps/api/src/modules/collab/collab.gateway.ts]
tech_stack:
  added: []
  patterns:
    [
      no-echo-relay,
      fetchSockets-participant-list,
      hashToColorIndex-djb2,
      socket-data-presence-metadata,
    ]
key_files:
  created: []
  modified:
    - apps/api/src/modules/collab/collab.gateway.ts
    - apps/api/src/modules/collab/collab.gateway.spec.ts
decisions:
  - 'PRESENCE_COLORS_COUNT=10 constant placed at module scope (not class) to keep implementation simple'
  - 'socket.data.colorIndex and socket.data.name assigned BEFORE client.join(slug) so fetchSockets() sees presence metadata on the joining socket'
  - 'hashToColorIndex uses djb2 bit-shifting hash (same as Phase 5 Research Pattern 5) - deterministic color per userId'
  - 'handleDisconnect gets slug BEFORE removeSocket call to avoid race where slug lookup returns undefined'
metrics:
  duration_seconds: 300
  completed_date: '2026-03-20'
  tasks_completed: 2
  files_modified: 2
---

# Phase 05 Plan 01: CollabGateway Presence Events Summary

Extended NestJS CollabGateway with cursor-move relay (no-echo), participant-list on join, participant-joined broadcast, and participant-left on disconnect using TDD.

## What Was Built

### cursor-move relay handler

A new `@SubscribeMessage('cursor-move')` handler relays `{socketId, x, y}` to all room members except the sender using the existing no-echo pattern (`client.to(slug).emit`). Returns early if the socket has no room.

### participant tracking on join

`handleJoinRoom` now:

1. Calls `hashToColorIndex(client.data.user.id)` to deterministically assign a color slot (0–9)
2. Assigns `client.data.colorIndex` and `client.data.name` **before** `client.join(slug)` so that `fetchSockets()` sees the metadata on the newly joined socket
3. After emitting `room-joined`, calls `this.server.in(slug).fetchSockets()` to build participant list
4. Emits `participant-list` (array of `{socketId, name, colorIndex}`) to the joining client
5. Emits `participant-joined` (`{socketId, name, colorIndex}`) to all other room members via `client.to(slug).emit`

### participant departure on disconnect

`handleDisconnect` now:

1. Gets `slug = getRoomForSocket(client.id)` **before** calling `removeSocket`
2. Calls `removeSocket` (existing behavior, GC logic)
3. If `slug` was found, emits `participant-left: {socketId}` to remaining room members via `this.server.to(slug).emit`

### hashToColorIndex helper

Private djb2-style hash that produces a stable color index (0–9) for any userId string:

```typescript
private hashToColorIndex(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % PRESENCE_COLORS_COUNT
}
```

## Tests (11 passing)

- `handleJoinRoom`: room-joined buffer, error on not-found, participant-list/participant-joined on join, colorIndex+name set on socket.data
- `handleCursorMove`: relays with socketId (no self-echo), returns early when no room
- `handleYjsUpdate`: apply+relay, early return (pre-existing)
- `handleDisconnect`: removeSocket called, participant-left emitted to room, no emit when no room

## Deviations from Plan

None — plan executed exactly as written. The TDD RED commit (`6cadcd2`) wrote failing tests for `handleCursorMove` and updated `handleDisconnect` tests. GREEN commit (`90e5cd2`) implemented the gateway. Task 2 commit (`621e6bf`) added comprehensive `handleJoinRoom` participant tests.

## Self-Check

- [x] `apps/api/src/modules/collab/collab.gateway.ts` — contains `handleCursorMove`, `hashToColorIndex`, `PRESENCE_COLORS_COUNT`, `fetchSockets`, `participant-left`, `participant-joined`, `participant-list`
- [x] `apps/api/src/modules/collab/collab.gateway.spec.ts` — 11 tests, all passing
- [x] Commits: `6cadcd2` (RED), `90e5cd2` (GREEN), `621e6bf` (Task 2)
