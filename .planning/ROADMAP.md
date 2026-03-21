# Roadmap: UniShare Collaborative Canvas

## Overview

Six phases build the collaborative canvas feature from data model to exportable, shareable board. Phases 1-2 establish the backend contracts (schema, REST, auth) before any WebSocket code is written — retrofitting either is expensive. Phase 3 proves real-time sync end-to-end. Phase 4 wires the Excalidraw frontend to the Yjs provider. Phase 5 layers presence on top of a working sync. Phase 6 closes the loop with persistence and the post-to-UniShare differentiator. Phase 7 adds room access control — public/private visibility, view-only shareable links, and per-room permission management.

## Phases

- [x] **Phase 1: Data Model & Module Skeleton** - Prisma Room model, CollabModule skeleton, room CRUD REST endpoints (completed 2026-03-20)
- [x] **Phase 2: Guest Identity & Auth** - Better Auth anonymous plugin; unauthenticated users get an anonymous session before joining a room (completed 2026-03-20)
- [x] **Phase 3: WebSocket Gateway & Yjs Relay** - NestJS WebSocket gateway, Yjs update relay, basic room join/leave (completed 2026-03-20)
- [x] **Phase 4: Canvas UI & Drawing Tools** - Excalidraw in Next.js canvas route, connected to Yjs provider, all drawing tools functional (completed 2026-03-20)
- [x] **Phase 5: Presence & Awareness** - Live cursor positions and participant list in real-time (completed 2026-03-21)
- [x] **Phase 6: Board Persistence & Export** - Board snapshots to PostgreSQL, PNG/PDF export, post-to-UniShare flow (completed 2026-03-21)
- [ ] **Phase 7: Room Access Control** - Public/private room visibility, view-only shareable links, per-room permission management

## Phase Details

### Phase 1: Data Model & Module Skeleton

**Goal**: Prisma Room model, CollabModule with service/repository/controller skeleton, room CRUD REST endpoints
**Depends on**: Nothing (first phase)
**Requirements**: ROOM-01, ROOM-02, ROOM-03
**Plans:** 1/1 plans complete

Plans:

- [x] 01-01-PLAN.md — Room model, collab module skeleton, CRUD endpoints, unit tests

**Success Criteria** (what must be TRUE):

1. POST /api/rooms creates a room and returns a unique slug/link
2. GET /api/rooms/:slug returns room metadata
3. Room persists in database after creation
4. Room has owner, createdAt, slug, and optional title fields

---

### Phase 2: Guest Identity & Auth

**Goal**: Better Auth anonymous plugin configured; unauthenticated users get an anonymous session before joining a room
**Depends on**: Phase 1
**Requirements**: COLB-04
**Plans:** 2/2 plans complete

Plans:

- [x] 02-01-PLAN.md — Schema + auth config + join endpoint + anonymous session creation + unit tests
- [x] 02-02-PLAN.md — Anonymous user cleanup cron + unit tests

**Success Criteria** (what must be TRUE):

1. Unauthenticated user hitting room join endpoint receives an anonymous session cookie
2. Anonymous session is valid for WebSocket connections
3. Anonymous users are distinguishable from registered users in session data
4. Cleanup job or TTL exists for anonymous sessions older than 7 days

---

### Phase 3: WebSocket Gateway & Yjs Relay

**Goal**: NestJS WebSocket gateway on port 3001 (shared), Yjs update relay between clients, basic room join/leave
**Depends on**: Phase 2
**Requirements**: COLB-01
**Plans:** 2/2 plans complete

Plans:

- [x] 03-01-PLAN.md — CollabGateway + CollabRoomService + IoAdapter setup + unit tests
- [x] 03-02-PLAN.md — Integration tests with socket.io-client verifying end-to-end relay

**Success Criteria** (what must be TRUE):

1. Two browser tabs can connect to the same room via WebSocket
2. A canvas change in one tab appears in the other tab within 200ms
3. Gateway validates session (anonymous or registered) on connection
4. Room state is maintained in-memory as a Y.Doc while participants are connected

---

### Phase 4: Canvas UI & Drawing Tools

**Goal**: Excalidraw embedded in Next.js canvas route, connected to Yjs provider, all drawing tools functional
**Depends on**: Phase 3
**Requirements**: CANV-01, CANV-02, CANV-03, CANV-04, CANV-05, CANV-06, CANV-07
**Plans:** 3/3 plans complete

Plans:

- [x] 04-01-PLAN.md — Canvas route shell, join-first flow, header/loading/error surfaces, dependency install
- [x] 04-02-PLAN.md — CollabProvider context (Y.Doc + socket.io), vitest setup, sync logic unit tests
- [x] 04-03-PLAN.md — ExcalidrawWrapper with two-way Yjs sync, page wiring, human verification

**Success Criteria** (what must be TRUE):

1. User can navigate to /canvas/:slug and see the Excalidraw canvas
2. All 7 canvas tools work: pan/zoom, freehand, shapes, text, sticky notes, select/move/resize/delete, undo/redo
3. Canvas state syncs to the Yjs document on every change
4. Canvas loads existing board state on page load

---

### Phase 5: Presence & Awareness

**Goal**: Live cursor positions and participant list displayed in real-time
**Depends on**: Phase 4
**Requirements**: COLB-02, COLB-03
**Plans:** 4/4 plans executed

Plans:

- [x] 05-01-PLAN.md — Backend gateway: cursor-move relay, participant join/leave events, tests
- [x] 05-02-PLAN.md — Frontend utilities: presence colors, hashToColorIndex, sceneToOverlay, TDD tests
- [x] 05-03-PLAN.md — CollabContext extensions: remote cursors, participants, throttled cursor emit
- [x] 05-04-PLAN.md — UI components: CursorOverlay, RemoteCursor, ParticipantAvatars, page wiring

**Success Criteria** (what must be TRUE):

1. User sees named, color-coded cursors for all other participants moving in real-time
2. Participant list in UI shows everyone currently in the room
3. Cursor updates are throttled (max 30/sec per client) to prevent flooding
4. Participant list updates within 1s when someone joins or leaves

---

### Phase 6: Board Persistence & Export

**Goal**: Board snapshots saved to PostgreSQL, PNG/PDF export, post-to-UniShare flow
**Depends on**: Phase 5
**Requirements**: ROOM-03 (persistence), ROOM-04, EXPO-01, EXPO-02
**Plans:** 3/3 plans complete

Plans:

- [x] 06-01-PLAN.md — Backend Yjs snapshot persistence (save on idle + disconnect, restore on rejoin)
- [x] 06-02-PLAN.md — Race condition fix, isAnonymous plumbing, export utilities, Export dropdown (PNG + PDF)
- [x] 06-03-PLAN.md — Post to UniShare flow (sessionStorage handoff + posts/new pre-fill + human verify)

**Success Criteria** (what must be TRUE):

1. Board state is saved to database on idle (30s after last change) and on last participant disconnect
2. Reopening a room URL shows the exact board state from the previous session
3. User can export the board as a PNG image
4. User can export the board as a PDF
5. User can click "Post to UniShare" which opens the post creation flow with the exported image pre-filled

---

### Phase 7: Room Access Control

**Goal**: Public/private room visibility, view-only shareable links, and per-room permission management
**Depends on**: Phase 6
**Requirements**: SHARE-01, SHARE-02, SHARE-03
**Plans:** 1/3 plans executed

Plans:

- [ ] 07-01-PLAN.md — DB migration (RoomVisibility enum), service layer, PATCH endpoint, unit tests
- [ ] 07-02-PLAN.md — Gateway isViewOnly guard + PRIVATE block + gateway tests
- [ ] 07-03-PLAN.md — Frontend: private gate, context expansion, Excalidraw viewMode, settings popover

**Success Criteria** (what must be TRUE):

1. Room owner can set a room to public (anyone with link can view without an account) or private (edit-only, current behaviour)
2. A view-only link lets non-editors see the live board but not draw or modify it
3. Room owner can manage access — revoke links or change visibility at any time

---

## Progress

**Execution Order:** 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase                            | Status   | Completed  |
| -------------------------------- | -------- | ---------- |
| 1. Data Model & Module Skeleton  | Complete | 2026-03-20 |
| 2. Guest Identity & Auth         | Complete | 2026-03-20 |
| 3. WebSocket Gateway & Yjs Relay | Complete | 2026-03-20 |
| 4. Canvas UI & Drawing Tools     | Complete | 2026-03-20 |
| 5. Presence & Awareness          | Complete | 2026-03-21 |
| 6. Board Persistence & Export    | Complete | 2026-03-21 |
| 7. Room Access Control           | Planned  | -          |
