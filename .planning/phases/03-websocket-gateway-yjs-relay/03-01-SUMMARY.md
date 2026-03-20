---
phase: 03-websocket-gateway-yjs-relay
plan: '01'
subsystem: collab
tags: [websocket, yjs, socket.io, gateway, nestjs, crdt]
dependency_graph:
  requires: []
  provides: [CollabGateway, CollabRoomService, IoAdapter]
  affects: [apps/api/src/modules/collab, apps/api/src/main.ts]
tech_stack:
  added:
    - '@nestjs/websockets@11.1.17'
    - '@nestjs/platform-socket.io@11.1.17'
    - 'socket.io@4.8.3'
    - 'yjs@13.6.30'
    - 'cookie@^0.7'
    - 'socket.io-client@4.8.3 (dev)'
    - '@types/cookie (dev)'
    - '@types/socket.io (dev)'
  patterns:
    - socket.io namespace middleware for connection-time auth (not WsGuard)
    - Y.Doc per-room in CollabRoomService with GC timer on idle
    - client.to(slug).emit() to relay updates excluding sender
key_files:
  created:
    - apps/api/src/modules/collab/collab.gateway.ts
    - apps/api/src/modules/collab/collab.room.service.ts
    - apps/api/src/modules/collab/collab.room.service.spec.ts
    - apps/api/src/modules/collab/collab.gateway.spec.ts
  modified:
    - apps/api/src/modules/collab/collab.module.ts
    - apps/api/src/main.ts
    - apps/api/package.json
decisions:
  - socket.io namespace middleware used in afterInit() for connection-time auth rejection (not WsGuard which only runs per-message)
  - socket.io added as explicit direct dep to apps/api to satisfy pnpm strict resolution for TypeScript
  - Valid Yjs update (from Y.encodeStateAsUpdate) used in gateway test instead of raw Buffer.from([1,2,3]) to avoid Yjs decode error
metrics:
  duration_seconds: 595
  completed_date: '2026-03-20'
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 3
---

# Phase 03 Plan 01: WebSocket Gateway & Yjs Relay — Core Implementation Summary

Socket.io CollabGateway with Better Auth session middleware, CollabRoomService Y.Doc lifecycle (5-min GC on idle), IoAdapter wired in main.ts, and 18 passing unit tests across both new files.

## Tasks Completed

| Task | Name                                                                   | Commit  | Files                                                                              |
| ---- | ---------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| 1    | Install deps, create CollabRoomService + CollabGateway, wire IoAdapter | 27b75e9 | collab.gateway.ts, collab.room.service.ts, collab.module.ts, main.ts, package.json |
| 2    | Unit tests for CollabRoomService and CollabGateway                     | c908ab3 | collab.room.service.spec.ts, collab.gateway.spec.ts                                |

## What Was Built

**CollabGateway** (`apps/api/src/modules/collab/collab.gateway.ts`):

- `@WebSocketGateway({ namespace: '/collab', cors: { origin: allowedOrigins, credentials: true } })`
- `afterInit(server)` registers a namespace middleware that reads the `better-auth.session` cookie from `socket.handshake.headers.cookie`, calls `auth.api.getSession()`, and calls `next(new Error('Unauthorized'))` if no valid session
- `handleJoinRoom` verifies room exists via `CollabRepository.findBySlug`, joins socket.io room, calls `CollabRoomService.registerSocket`, and emits the full Y.Doc state (`Y.encodeStateAsUpdate`) to the joining client
- `handleYjsUpdate` applies the incoming binary update to the server doc and relays via `client.to(slug).emit()` (excludes sender)
- `handleDisconnect` calls `CollabRoomService.removeSocket(client.id)`

**CollabRoomService** (`apps/api/src/modules/collab/collab.room.service.ts`):

- Maintains `Map<slug, { doc: Y.Doc, timer }>` and `Map<socketId, slug>`
- `getOrCreate` creates a Y.Doc on first access
- `registerSocket` records socket-to-room mapping and cancels any pending GC timer
- `removeSocket` deletes mapping and schedules Y.Doc destruction (5-min delay) when last socket leaves

**CollabModule** updated to include `CollabGateway` and `CollabRoomService` as providers.

**main.ts** updated: `app.useWebSocketAdapter(new IoAdapter(app))` inserted before `app.listen()`.

## Test Results

- `collab.room.service.spec.ts`: 11 tests — Y.Doc creation/reuse, socket registration, GC scheduling, GC cancellation
- `collab.gateway.spec.ts`: 7 tests — join-room (valid + not-found), yjs-update relay, yjs-update no-room early return, handleDisconnect
- `collab.service.spec.ts`: 13 tests (pre-existing, all still pass)
- **Total: 31 tests passing**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] socket.io not resolvable as TypeScript module from apps/api**

- **Found during:** Task 1 (TypeScript compile check)
- **Issue:** pnpm strict hoisting puts socket.io in workspace root's virtual store; not directly accessible as import from apps/api. `npx tsc --noEmit` gave `Cannot find module 'socket.io'`
- **Fix:** Added `socket.io` as an explicit direct dependency in `apps/api/package.json` via `pnpm add socket.io`
- **Files modified:** apps/api/package.json, pnpm-lock.yaml
- **Commit:** 27b75e9

**2. [Rule 1 - Bug] Implicit `any` type on middleware `next` parameter**

- **Found during:** Task 1 (TypeScript compile check)
- **Issue:** `server.use(async (socket, next) => ...)` — strict mode requires explicit type on `next`
- **Fix:** Added `next: (err?: Error) => void` type annotation
- **Files modified:** apps/api/src/modules/collab/collab.gateway.ts
- **Commit:** 27b75e9

**3. [Rule 1 - Bug] Invalid Yjs update in gateway test caused decode error**

- **Found during:** Task 2 (test run)
- **Issue:** Test used `Buffer.from([1, 2, 3])` as a Yjs update — Yjs decode throws "Unexpected end of array" because it's not a valid CRDT update
- **Fix:** Changed test to create a real `Y.Doc`, insert content, and call `Y.encodeStateAsUpdate()` to produce a valid binary update for the test
- **Files modified:** apps/api/src/modules/collab/collab.gateway.spec.ts
- **Commit:** c908ab3

## Verification

- `cd apps/api && npx tsc --noEmit` — exits 0 (clean)
- `cd apps/api && npx jest --testPathPatterns="collab" --no-coverage` — 31 tests pass

## Self-Check: PASSED

All created files exist on disk. Both task commits verified in git history.
