# Phase 3: WebSocket Gateway & Yjs Relay - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a NestJS socket.io gateway that relays Yjs document updates between clients sharing a room. Clients connect, join a room by slug, send binary Yjs updates, and receive relayed updates from other participants. Basic room join/leave lifecycle is included. No canvas UI (Phase 4), no presence indicators (Phase 5), no PostgreSQL persistence (Phase 6). This phase is purely the real-time relay plumbing.

</domain>

<decisions>
## Implementation Decisions

### WebSocket transport

- Use **socket.io** (via `@nestjs/platform-socket.io`) — not native `ws`
- Single `/collab` namespace; clients join rooms by slug using socket.io's `join()` call (not one namespace per room)
- Yjs updates flow via a custom **`yjs-update` event** carrying a `Uint8Array` binary payload; the server relays it to all other sockets in the same room
- No third-party y-socket.io library — custom relay is explicit and easier to extend

### Reconnect / state sync

- On connect or reconnect, the server sends a **full Y.Doc state vector** to the joining client so they merge and are current immediately
- The gateway holds the latest merged `Y.Doc` per room in memory — this is the source of truth for Phase 3
- On server restart all in-memory state is lost; clients start from an empty doc (acceptable for Phase 3 — Phase 6 adds PostgreSQL persistence)

### Authentication at WS connection

- Read the Better Auth session cookie from the HTTP upgrade headers (`handshake.headers.cookie`)
- Validate via `auth.api.getSession()` (same pattern as Phase 2's REST endpoints)
- Anonymous sessions are valid for WS connections (they have a `set-cookie` from the join endpoint)
- If no valid session is present: reject the connection with a `401` disconnect event
- Claude's discretion: exact middleware structure for the auth check (NestJS WS guard vs adapter middleware)

### Testing approach

- **No frontend work in Phase 3** — gateway is backend-only
- End-to-end verification via **Jest integration tests using `socket.io-client`**
- Test scenario: two client connections to the same room, one emits a `yjs-update`, verify the other receives it; also verify a third client in a different room does NOT receive it
- Unit tests for gateway event handlers in isolation

### Claude's Discretion

- Whether to use a NestJS `WsGuard` or a socket.io middleware for the auth check
- Exact Yjs `Y.Doc` per-room storage structure (Map in gateway vs singleton service)
- CORS configuration for the socket.io server (should mirror existing HTTP CORS allowlist)
- Room lifecycle: when to garbage-collect an in-memory doc after all clients leave (simple timeout is fine)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing API bootstrap & CORS

- `apps/api/src/main.ts` — Express adapter setup, CORS allowlist (`allowedOrigins`), port 3001. WS gateway shares this port and must use the same CORS origins.

### Auth session validation pattern

- `apps/api/src/auth/auth.config.ts` — `auth.api.getSession()` is the server-side session lookup used in Phase 2. WS auth middleware should follow the same pattern.
- `apps/api/src/modules/collab/collab.service.ts` — Phase 2's `joinRoom` implementation shows how `signInAnonymous` and `getSession` are called; the WS handshake auth should reuse `getSession`.

### Existing collab module

- `apps/api/src/modules/collab/collab.controller.ts` — Houses `POST /rooms/:slug/join`; the WS gateway joins this module or is a peer module.
- `apps/api/src/modules/collab/collab.repository.ts` — Room lookup by slug; the WS gateway needs to verify a room exists before allowing a client to join.

### Phase 2 anonymous session design

- `.planning/phases/02-guest-identity-auth/02-CONTEXT.md` — Decisions section: anonymous session is cookie-based, `isAnonymous` flag on User, `displayName` on Session. WS auth must handle both authenticated and anonymous cookies.

### Requirements

- `.planning/REQUIREMENTS.md` — COLB-01 (the sole requirement for this phase): multiple users edit the same canvas simultaneously with changes appearing in real-time.

### App module (for gateway registration)

- `apps/api/src/app.module.ts` — Where the new CollabGateway module must be imported.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `auth.api.getSession()` from `apps/api/src/auth/auth.config.ts` — server-side session lookup, already used in Phase 2; WS auth middleware reuses this directly
- `CollabRepository.findBySlug()` from `apps/api/src/modules/collab/collab.repository.ts` — room existence check needed before allowing WS join
- `allowedOrigins` array in `apps/api/src/main.ts` — must be passed to the socket.io CORS config

### Established Patterns

- NestJS module structure: controller + service + repository; the WS gateway follows the same module pattern (`CollabGateway` inside `CollabModule` or a new `CollabWsModule`)
- `@nestjs/schedule` cron pattern (Phase 2's `TasksService`) — if an in-memory doc TTL cleanup is needed, same cron approach applies
- `@OptionalAuth()` / session cookie pattern from Phase 2 — WS auth reads the same cookie

### Integration Points

- `apps/api/src/app.module.ts` — gateway module must be imported here
- `apps/api/src/main.ts` — socket.io adapter must be set (`app.useWebSocketAdapter(new IoAdapter(app))`) before `app.listen()`
- `apps/api/src/modules/collab/` — gateway logically belongs here alongside the existing collab module

</code_context>

<specifics>
## Specific Ideas

- socket.io CORS config must mirror the existing `allowedOrigins` from `main.ts` so the frontend on port 3000 can connect
- The `yjs-update` relay should NOT echo back to the sender — only broadcast to other room members
- A `room-joined` acknowledgement event should be emitted to the connecting client after successful join, carrying the current room state vector

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

_Phase: 03-websocket-gateway-yjs-relay_
_Context gathered: 2026-03-20_
