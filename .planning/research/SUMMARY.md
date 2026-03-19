# Project Research Summary

**Project:** UniShare — Real-Time Collaborative Canvas
**Domain:** WebSocket-based collaborative whiteboard embedded in an existing NestJS + Next.js platform
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

UniShare is adding a real-time collaborative canvas to an existing NestJS (port 3001) + Next.js App Router (port 3000) + PostgreSQL/Prisma + Better Auth stack. The research-backed approach is to use Excalidraw as the canvas renderer (MIT, no commercial fees), Yjs as the CRDT sync layer (proven at scale, 5000x faster than alternatives), and a custom NestJS WebSocket gateway as the sync server — all without introducing new infrastructure, new services, or new ports. All sync state persists to the existing PostgreSQL database via a binary `Bytes` column on a new `Room` model. No SaaS vendors are required.

The recommended build sequence follows architectural dependency order: data model and auth contracts must be locked in before any real-time sync code is written, because retrofitting either is expensive. The core loop — WebSocket gateway + Yjs relay + Excalidraw binding — is well-documented and achievable incrementally. The product differentiation payoff (exporting a canvas board directly into a UniShare post) reuses the existing S3 presigned upload and post creation pipeline with no modifications to those systems.

The primary risks are not technical complexity but operational discipline: CRDT tombstone growth must be addressed from day one in the persistence layer, the guest identity model must be kept strictly separate from Better Auth's session tables, and the WebSocket origin allowlist must be in place before any deployment outside localhost. A cross-cutting Redis dependency emerges from multiple pitfalls simultaneously — it resolves horizontal scaling, per-socket rate limiting, presence state, and export job queuing. Introducing Redis early eliminates the root cause of four separate pitfalls.

---

## Key Findings

### Recommended Stack

The stack is entirely additions to existing infrastructure — no new services or containers. Excalidraw (`@excalidraw/excalidraw` 0.17.x, MIT) provides infinite canvas, shapes, freehand drawing, sticky notes, text, and PNG/SVG export out of the box. Yjs (`yjs` 13.6.x, MIT) provides the CRDT layer; its `Y.Array`/`Y.Map` primitives map naturally to Excalidraw's element array. A custom NestJS `@WebSocketGateway()` (no port argument) attaches to the existing HTTP server and uses `y-websocket`'s `setupWSConnection` utility for the Yjs binary protocol. tldraw (SDK 4.0, $6,000/year commercial license) and Liveblocks (SaaS, vendor lock-in) are explicitly disqualified.

**Core technologies:**

- `@excalidraw/excalidraw` 0.17.x: canvas renderer — MIT, rich primitive set, clean `onChange` API, native export
- `yjs` 13.6.x + `y-websocket` 2.x: CRDT sync engine — best-in-class performance, awareness protocol included
- NestJS `@WebSocketGateway()` (native `ws` adapter): sync server — attaches to existing HTTP server, no new port
- PostgreSQL `Bytes` column (existing Prisma): persistence — Yjs binary snapshot, sufficient for study-group scale
- `jsonwebtoken` 9.x: short-lived collab JWT — decouples WebSocket auth from Better Auth cookie sessions

**Open spike required:** Excalidraw `onChange` fires the full element array on every change. A prototype must validate that the O(n) diff-to-Yjs-transaction cycle stays under 8ms at 1000+ elements. If not, a `Map<id, element>` ref cache is the fix.

### Expected Features

**Must have (table stakes):**

- Infinite canvas with pan/zoom — expected baseline; absence signals prototype quality
- Freehand drawing, geometric shapes, arrows — core whiteboard verbs
- Sticky notes and text boxes (rich text) — brainstorm and annotation primitives
- Select/move/resize/delete + undo/redo — basic object manipulation
- Live cursor presence with named colored cursors — defines the "collaborative" feel
- Real-time sync via WebSocket — latency kills trust; this is the core infrastructure bet
- Board persistence (survive everyone leaving) — users expect to return to their work
- Share via link + guest access (no account required) — study groups include non-registered users
- Export as PNG and PDF — post-session capture for notes

**Should have (differentiators):**

- Export board directly to a UniShare post — the core "why build this instead of linking to Miro" payoff
- Attach room to an existing post — context-first collaboration on existing content
- Math/equation input (LaTeX/KaTeX) — STEM students cannot work without this; defer to v2 but reserve a custom shape type slot
- PDF/image drop onto canvas — annotate lecture slides directly on the board
- Study templates (concept map, exam prep, timeline) — eliminates blank canvas paralysis

**Defer (v2+):**

- Math/equation input (high complexity, reserve architecture slot)
- Named rooms with course context and browse UI (ship link-only rooms first)
- Session history / who-was-here log (needs room metadata to be useful)
- Video/audio, AI summarization, flashcard maker, version history with diffs — explicitly out of scope

### Architecture Approach

The entire feature lives inside a single new `CollabModule` added to the existing NestJS process. The module contains `CollabController` (REST: create room, fetch room, issue guest token, trigger export), `CollabGateway` (WebSocket: Yjs update relay, awareness relay, sync handshake), `CollabService` (business logic: token issuance, Y.Doc lifecycle, snapshot scheduling), and `CollabRepository` (Prisma: room CRUD, snapshot read/write). An in-process `Map<roomId, { ydoc: Y.Doc; flushTimer }>` holds live room state. The frontend has a single new route: `app/canvas/[roomId]/page.tsx` (server component that fetches room metadata and issues a collab token) and `ExcalidrawCanvas.tsx` (client component binding Excalidraw to a Yjs document via a Socket.IO provider).

**Major components:**

1. `CollabGateway` — pure relay: applies raw Yjs binary frames to in-memory Y.Doc, broadcasts to room; never parses Excalidraw semantics
2. `CollabService` — owns Y.Doc lifecycle, collab JWT issuance/verification, debounced snapshot flush to PostgreSQL
3. `CollabRepository` — Prisma adapter for Room model CRUD and binary snapshot persistence
4. `ExcalidrawCanvas.tsx` — binds Excalidraw `onChange` to Y.Map mutations; observes Y.Map to call `updateScene()`
5. `CollabController` — REST surface: room creation, token issuance, export trigger (reuses existing S3 presigned flow)

### Critical Pitfalls

1. **CRDT tombstone unbounded growth (C1)** — Yjs never deletes data; design a two-layer persistence model (binary CRDT blob + structured metadata columns) and a background compaction job from day one. Do not retrofit.
2. **Guest identity colliding with Better Auth (C2)** — issue a separate short-lived collab JWT for guests; never allow the gateway handshake to create rows in Better Auth's `users` or `sessions` tables; store guest sessions in a separate table with TTL.
3. **Cross-site WebSocket hijacking (C3)** — validate `Origin` header against an allowlist on every connection; pass the collab JWT as a bearer token in `socket.handshake.auth`, not as a cookie; set `cors: { origin: allowedOrigins }` on the gateway — never `*` in production.
4. **Horizontal scaling breaks room state (C4)** — in-memory `Map<roomId, Y.Doc>` is process-local; introduce Redis pub/sub adapter (`@socket.io/redis-adapter`) before writing any room-join logic, not after; this also unblocks export job queuing (BullMQ) and per-socket rate limiting.
5. **JWT expiry during long study sessions (M1)** — collab JWTs must be proactively refreshed on the client at 80% of lifetime; the gateway must return close code `4001` for auth failure so the client can distinguish expired token from network drop.

---

## Implications for Roadmap

Based on research, the architecture's dependency graph and pitfall phase warnings suggest a 9-phase build order. Each phase has a hard gate before the next begins.

### Phase 1: Data Model and Module Skeleton

**Rationale:** Schema and persistence strategy are locked in here; retrofitting CRDT compaction or the two-layer persistence model after boards exist in production requires a full data migration (C1, Mi2).
**Delivers:** `Room` model in Prisma with `snapshot Bytes?` column and structured metadata fields; empty `CollabModule`, `CollabService`, `CollabRepository`, `CollabController` stubs imported into `AppModule`.
**Addresses:** Board persistence (table stakes), structured metadata for future search
**Avoids:** C1 (tombstone growth — two-layer design from start), Mi2 (JSONB blob kills queryability)

### Phase 2: REST API — Room Management

**Rationale:** REST endpoints must exist and be tested before any WebSocket code is written; this decouples room creation from sync complexity.
**Delivers:** `POST /collab/rooms` (create), `GET /collab/rooms/:id` (fetch + access check), integration tests for both.
**Addresses:** Named rooms, standalone rooms as first-class objects
**Avoids:** Auth contracts being entangled with sync logic

### Phase 3: Auth and Guest Token Issuance

**Rationale:** Auth contracts established here propagate to every downstream feature; a broken identity model requires rewriting the gateway auth guard (C2, C3). Must be done before any WebSocket code.
**Delivers:** `POST /collab/rooms/:id/guest-token` endpoint; `CollabService.issueCollabToken()` and `issueGuestToken()` with separate `COLLAB_JWT_SECRET`; unit tests for token round-trip.
**Addresses:** Guest access (table stakes), C2 (guest identity isolation), C3 (bearer token over cookie)
**Avoids:** C2 (no zombie accounts in Better Auth tables), C3 (token-based auth in handshake)

### Phase 4: WebSocket Gateway — Auth and Room Join

**Rationale:** Verify connection security in isolation before adding any Yjs complexity; origin allowlist and token verification must be in place before this is reachable outside localhost (C3, C4).
**Delivers:** `CollabGateway.handleConnection()` verifying collab JWT; origin allowlist; socket joining Socket.IO room; `4001` close code on auth failure; Redis adapter configured.
**Addresses:** C3 (CSWSH), C4 (Redis adapter from day one prevents scaling breakage)
**Avoids:** C4 (Redis pub/sub adapter introduced before any room-join logic is load-bearing)

### Phase 5: Yjs Relay — Real-Time Sync

**Rationale:** The core infrastructure bet; all drawing features depend on this working correctly. Reconnect protocol and sequence numbering must be designed here, not retrofitted (M3).
**Delivers:** `handleYjsUpdate()` relay; sync-step1/step2 handshake on connection; `getOrCreateYDoc()` loading from DB snapshot on cold start; sequence numbers on all operations.
**Addresses:** Real-time sync (table stakes — the defining feature), M3 (reconnect race condition)
**Uses:** `yjs` 13.6.x, `y-websocket` `setupWSConnection`, in-process Y.Doc map

### Phase 6: Awareness Relay — Presence and Cursors

**Rationale:** Awareness is simpler than Yjs sync but depends on the gateway room infrastructure from Phase 5. Cursor throttling must be designed here, not after (M2).
**Delivers:** `handleAwareness()` forwarding binary frames to room except sender; client-side `mousemove` throttled to 30–50ms intervals; Socket.IO volatile events for cursor positions.
**Addresses:** Live cursor presence, participant awareness (both table stakes)
**Avoids:** M2 (cursor event flooding — throttle designed at protocol design time)

### Phase 7: Frontend Canvas Route

**Rationale:** Backend sync is proven end-to-end before frontend complexity is added; the server component token-fetch pattern avoids a client-side round trip and keeps JWT out of the URL.
**Delivers:** `app/canvas/[roomId]/page.tsx` (server component); `ExcalidrawCanvas.tsx` with Excalidraw + y-socket.io binding; proactive collab JWT refresh at 80% of lifetime.
**Addresses:** Infinite canvas, shapes, freehand, sticky notes, text (all table stakes), M1 (JWT expiry during long sessions)
**Uses:** `@excalidraw/excalidraw` 0.17.x (dynamic import, `ssr: false`), `y-socket.io` provider

### Phase 8: Snapshot Persistence and Compaction

**Rationale:** Persistence is validated after the sync layer works; the compaction job must be introduced before boards accumulate significant tombstone history (C1).
**Delivers:** `scheduleSnapshotFlush()` (debounced, flush on last disconnect); `CollabRepository.saveSnapshot()`; `@Cron` compaction job; cold-start verified (close all tabs, reopen, state restored).
**Addresses:** Board persistence (table stakes), C1 (tombstone growth compaction)
**Avoids:** C1 (compaction job in place before boards grow large)

### Phase 9: Export to UniShare Post

**Rationale:** Export is the product-differentiation payoff and depends on all prior phases; export jobs must be offloaded to BullMQ to avoid blocking the main event loop (M4).
**Delivers:** `POST /collab/rooms/:id/export` returning S3 presigned URL; BullMQ export worker; export button in `ExcalidrawCanvas.tsx`; exported canvas appears as a UniShare post with attached image.
**Addresses:** Export as PNG (table stakes), export board to post (primary differentiator)
**Avoids:** M4 (export not running in main API process)

### Phase Ordering Rationale

- Phases 1-3 establish contracts (schema, REST, auth) that all later phases depend on; no WebSocket code touches auth before the contract is defined.
- Phase 4 introduces Redis before any room-join logic is load-bearing, eliminating C4 as a future retrofit.
- Phases 5-6 build sync bottom-up (Yjs relay before awareness) so each layer is independently testable.
- Phase 7 adds frontend only after the backend sync is end-to-end proven, reducing debugging surface.
- Phase 8 adds persistence durability after sync is proven, keeping the critical path clear.
- Phase 9 adds the differentiator last, when all foundations are stable.

### Research Flags

Phases needing deeper research during planning:

- **Phase 5 (Yjs Relay):** Spike required — validate `onChange` full-array diff performance at 1000+ elements (OQ-1 from STACK.md). If > 8ms, switch to `Map<id, element>` ref cache.
- **Phase 5 (Yjs Relay):** Clarify "structured docs" scope (OQ-2 from STACK.md) — canvas text nodes vs. separate TipTap/BlockNote document editor. Decision changes Phase 7 scope significantly.
- **Phase 4 (Gateway):** Verify existing `helmet()` configuration does not block WebSocket upgrade headers; verify no `APP_GUARD` token inadvertently binds to the gateway.

Phases with standard, well-documented patterns (skip research-phase):

- **Phase 1 (Data Model):** Prisma schema additions and migrations are routine.
- **Phase 2 (REST API):** Standard NestJS controller/service/repository pattern.
- **Phase 3 (Auth):** JWT issuance and verification with `jsonwebtoken` is well-documented.
- **Phase 6 (Awareness):** Socket.IO room broadcast with volatile events is standard.
- **Phase 9 (Export):** Reuses existing S3 presigned upload flow without modification.

---

## Confidence Assessment

| Area         | Confidence | Notes                                                                                                                                                                                          |
| ------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack        | HIGH       | All major decisions verified: Excalidraw MIT confirmed, Yjs benchmarks published, NestJS WS gateway pattern documented. tldraw and Liveblocks disqualification confirmed from primary sources. |
| Features     | HIGH       | Table stakes derived from competitive analysis of Miro, tldraw, Excalidraw; differentiators grounded in UniShare's existing content graph.                                                     |
| Architecture | HIGH       | Component boundaries, data flow, and integration points are fully specified. The Socket.IO-on-existing-HTTP pattern is confirmed NestJS behavior.                                              |
| Pitfalls     | HIGH       | All critical pitfalls are documented engineering problems (Figma CRDT growth, CSWSH) with confirmed prevention strategies, not speculative risks.                                              |

**Overall confidence:** HIGH

### Gaps to Address

- **Excalidraw onChange diffing performance at scale:** Must spike before Phase 7 implementation begins. Failure mode is frame drops at 1000+ elements; mitigation is a `Map<id, element>` ref cache (see STACK.md OQ-1).
- **"Structured docs" product definition:** Canvas text nodes (Option A) vs. separate rich-text editor (Option B) is a product decision, not a technical one. Must be resolved before Phase 7 scope is finalized (see STACK.md OQ-2).
- **Helmet configuration compatibility:** Verify `helmet()` options in `main.ts` do not block WebSocket upgrade headers. Low-risk but must be confirmed before Phase 4 (see ARCHITECTURE.md open questions).
- **Snapshot size cap:** Large canvases may produce large Yjs state vectors. At study-group scale this is unlikely to matter near-term, but a size cap or S3 offload strategy for snapshots should be defined during Phase 8 planning (see ARCHITECTURE.md open questions).
- **Room access model:** `isPublic` flag covers the basic case. Invite links and per-room ACL are future scope; the data model must not foreclose these options.

---

## Sources

### Primary (HIGH confidence)

- Excalidraw GitHub / npm (`@excalidraw/excalidraw` 0.17.x) — MIT license confirmed, API surface verified
- Yjs GitHub / npm (`yjs` 13.6.x) — performance benchmarks, `Y.Array`/`Y.Map` API, awareness protocol
- NestJS docs — `@WebSocketGateway()` no-port attachment, `OnGatewayDisconnect` lifecycle, `WsAdapter`
- tldraw SDK 4.0 release notes (September 2025) — commercial license pricing ($6,000/year) confirmed
- `y-websocket` source — `setupWSConnection` is library-importable (not CLI-only)

### Secondary (MEDIUM confidence)

- Miro vs. Excalidraw feature comparison — feature landscape for table stakes
- G2 collaborative whiteboard category — user expectations benchmarking
- Ably blog — collaborative UX best practices (cursor throttling, presence patterns)
- University of Melbourne digital whiteboard comparison guide — study-context feature validation
- OpenAlternative Excalidraw vs tldraw comparison — competitive positioning

### Tertiary (LOW confidence)

- Figma engineering blog (referenced) — CRDT tombstone growth at scale; not directly verified for Yjs specifically, but the Yjs GC mechanism addresses the same root cause
- ClickUp best whiteboard software 2026 — general market trends only

---

_Research completed: 2026-03-20_
_Ready for roadmap: yes_
