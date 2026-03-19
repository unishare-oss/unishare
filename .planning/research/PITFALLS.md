# Real-Time Collaborative Canvas: Confirmed Pitfalls

Research for adding a real-time collaborative canvas to the existing UniShare NestJS + Next.js stack.
Pitfalls are ordered by severity within each tier.

---

## Severity Tiers

| Tier     | Meaning                                                                                     |
| -------- | ------------------------------------------------------------------------------------------- |
| CRITICAL | Can trigger a full rewrite or a security incident if not addressed before the feature ships |
| MODERATE | Will cause visible degradation or crashes under real usage conditions                       |
| MINOR    | Introduces subtle bugs or operational headaches that compound over time                     |

---

## CRITICAL Pitfalls

---

### C1. CRDT Tombstone Unbounded Growth

**Summary**
CRDTs (e.g., Yjs, Automerge) never delete data — they replace deletions with tombstone markers so that distributed peers can converge. Without periodic compaction, board state documents grow without bound. Figma's engineering team has documented boards reaching gigabyte size over months of active use.

**Warning Signs**

- Board document serialization time increases noticeably after a few weeks of active use.
- Postgres JSONB column for a single board exceeds a few megabytes.
- Memory footprint of a Y.Doc rises after each reconnect because the full history is replayed.
- `Y.encodeStateAsUpdate` output size grows even when the visible canvas content stays constant.

**Prevention Strategy**

- Schedule periodic snapshot compaction: serialize only the current logical state (not the full CRDT history) and replace the stored update log with a fresh baseline.
- Store CRDT update logs in an append-only side table, separate from the canonical snapshot, so compaction can run without locking the board.
- Set a hard TTL on stale tombstones and run a background job (e.g., a NestJS `@Cron` task) that compacts boards inactive for more than N days.
- Test with a synthetic workload that generates thousands of delete operations before going to production.

**Build Phase**
Address during the **data model and persistence design phase**, before writing any board-save logic. Retrofitting compaction after boards are already large is operationally painful.

---

### C2. Guest Identity Colliding with Better Auth's Session Model

**Summary**
Collaborative canvases often allow anonymous or guest participants. Better Auth manages sessions via its own user/session tables. If a guest socket connection creates an implicit user record (or reuses a stale session token), the result is zombie accounts in the users table and unauthenticated sockets that appear authenticated to the gateway.

**Warning Signs**

- User count in the database grows faster than actual sign-ups.
- Socket connections pass `socket.handshake.auth` checks but the resolved user ID does not exist in the `users` table.
- Better Auth session refresh returns a valid token for a user that was never formally registered.
- Disconnected guest sockets leave orphaned records that block legitimate account creation with the same email.

**Prevention Strategy**

- Define an explicit guest identity contract: either issue a short-lived, signed ephemeral token for guests (not a full Better Auth session) or require sign-in before joining a canvas.
- In the WebSocket auth guard, validate that the resolved session user ID exists in the `users` table before allowing join — do not trust the JWT claims alone.
- Never allow the gateway to create user records as a side effect of a socket handshake.
- If guest sessions are required, store them in a separate `guest_sessions` table with a strict TTL and a cron cleanup job; do not intermingle with the Better Auth `sessions` table.

**Build Phase**
Address during **authentication and WebSocket gateway setup**, before any canvas-specific logic is written.

---

### C3. Cross-Site WebSocket Hijacking (CSWSH)

**Summary**
WebSocket upgrades do not enforce the Same-Origin Policy the way XHR and Fetch do. If the server relies on cookies for session identification and does not validate the `Origin` header, a malicious page on another domain can open a WebSocket to the UniShare server and impersonate the victim's session.

**Warning Signs**

- The NestJS gateway accepts connections from any origin (no `allowedOrigins` configuration).
- Cookie-based session tokens are readable by the WebSocket upgrade path without additional CSRF verification.
- Manual test: open a socket from a different origin in the browser console — if it succeeds, the server is vulnerable.

**Prevention Strategy**

- Validate the `Origin` header in the WebSocket handshake against an allowlist of trusted origins. Reject any connection whose origin is not in the list.
- Prefer sending session tokens as a bearer token in `socket.handshake.auth` (passed in the Socket.IO `auth` option) rather than relying solely on the session cookie. This token cannot be read cross-origin.
- Configure the Socket.IO server with `cors: { origin: allowedOrigins, credentials: true }` and ensure this list is not accidentally set to `*` in production.
- Add an integration test that verifies connections from a disallowed origin are rejected with a 403.

**Build Phase**
Address during **WebSocket gateway setup and security hardening**, before any deployment to a shared or staging environment.

---

### C4. Horizontal Scaling Silently Breaks Room State

**Summary**
NestJS WebSocket gateways maintain room membership and user-presence maps in process memory. When multiple NestJS instances run behind a load balancer (e.g., on Railway, Fly.io, or any container platform with replicas), two users in the same board may land on different instances. Their operations never reach each other because the in-memory room maps are not shared.

**Warning Signs**

- Two users in the same board see different canvas states after a deployment that spun up a second instance.
- Presence indicators show a user as "offline" even though they are actively editing.
- Board operations work correctly in local development (single instance) but break in staging.
- Socket.IO `to(roomId).emit(...)` calls silently drop events for users on a different instance.

**Prevention Strategy**

- Replace in-memory room maps with a Redis-backed pub/sub adapter from day one. Socket.IO's `@socket.io/redis-adapter` broadcasts events across all instances automatically.
- Use Redis also for presence state (connected user sets per board), keyed by board ID with a short TTL so stale presence entries expire automatically.
- Never use `socket.rooms` or gateway-level `Map<boardId, Set<userId>>` as the source of truth for presence — these are local to one process.
- Smoke-test with two NestJS instances pointing at the same Redis instance before shipping any canvas feature.

**Build Phase**
Address during **infrastructure and WebSocket gateway design**, before writing any room-join or presence logic.

---

## MODERATE Pitfalls

---

### M1. JWT Token Expiry During a Long Study Session

**Summary**
A student may open a collaborative board at the start of a 3-hour study session. If the JWT access token expires mid-session (typical expiry: 15–60 minutes) and the client does not silently refresh it before the WebSocket reconnects, the reconnect attempt will fail authentication, dropping the user from the session mid-edit.

**Warning Signs**

- Users report being "kicked out" of a board after an hour without touching the page.
- The WebSocket auth guard logs token expiry errors on reconnect attempts.
- The client's token refresh logic only runs on HTTP requests, not before WebSocket reconnects.

**Prevention Strategy**

- Implement proactive token refresh on the client: use a `setInterval` or a refresh-before-expiry timer (e.g., refresh at 80% of the token lifetime) that runs independently of HTTP requests.
- When a socket disconnect is detected, the client should attempt a token refresh before reconnecting, not after.
- The gateway should return a specific close code for auth failure (e.g., `4001`) so the client can distinguish an expired token from a network drop and handle each case correctly.
- Consider using refresh tokens with sliding expiry for collaborative sessions where long inactivity is expected.

**Build Phase**
Address during **client-side socket connection management and auth integration**, before user testing.

---

### M2. Cursor/Presence Event Flooding

**Summary**
Broadcasting raw `mousemove` or `pointermove` events from every client to every other client in a room generates a very high message rate. At 10 simultaneous users moving cursors, the server can receive approximately 600 messages per second. This saturates the WebSocket event loop and causes latency for higher-priority canvas operation events.

**Warning Signs**

- Canvas operation latency increases noticeably as more users join a board.
- Server CPU spikes during active collaborative sessions, even with simple canvas content.
- Network tab in DevTools shows hundreds of WebSocket frames per second for cursor movement alone.
- Other event types (e.g., shape updates) are delayed behind cursor floods in the event queue.

**Prevention Strategy**

- Throttle cursor position emission on the client to a maximum of 30–50ms intervals using `lodash.throttle` or a `requestAnimationFrame`-based scheduler.
- Use a separate, lower-priority event namespace or channel for presence/cursor events so they cannot block canvas operation delivery.
- On the server, debounce or drop cursor updates older than the most recent received position for each user — there is no value in replaying stale cursor positions.
- Consider using UDP-like unreliable channels (Socket.IO volatile events: `socket.volatile.emit(...)`) for cursor positions, explicitly accepting occasional loss.

**Build Phase**
Address during **real-time event design**, before the first performance test with multiple concurrent users.

---

### M3. Reconnect Race Condition: Duplicate or Dropped Operations

**Summary**
When a client reconnects after a network drop, the standard approach is to send a full state snapshot to bring the rejoining client up to date. If an outgoing operation was in-flight when the disconnect occurred, it may be applied both from the snapshot and again as an explicit op replay, resulting in duplicate operations. Alternatively, ops received during the disconnect window may be missed entirely if the snapshot was taken before they were applied.

**Warning Signs**

- Shapes appear duplicated on the canvas after a reconnect.
- Undo history is inconsistent between clients after one client reconnects.
- Clients occasionally show different final states for the same board after a reconnect cycle.
- CRDT vector clock or Yjs `clientID` counters do not match across peers after reconnect.

**Prevention Strategy**

- Assign a monotonically increasing server-side sequence number to every operation applied to a board.
- On reconnect, the client sends its last acknowledged sequence number; the server replays only the operations after that number (a "catch-up" diff, not a full snapshot).
- Use idempotency keys on operations so that replayed ops are safe to apply more than once.
- The CRDT library itself (Yjs) handles convergence, but the transport layer must ensure no operation is silently dropped during the reconnect window — buffer outgoing ops on the client until the server acknowledges the reconnect.

**Build Phase**
Address during **WebSocket operation protocol design**, before implementing reconnect logic.

---

### M4. Canvas Export Blocking the Main API Process

**Summary**
Exporting a board as PNG or PDF using Puppeteer or html2canvas is CPU- and memory-intensive. Running this synchronously in the main NestJS API process will block the event loop for several seconds, degrading response times for all other users during the export.

**Warning Signs**

- API response times for unrelated endpoints spike when a user triggers a board export.
- Puppeteer launches a headless Chromium process inside the same container as the API server.
- Memory usage of the NestJS process jumps sharply during export operations.
- Under load, export requests time out before completing.

**Prevention Strategy**

- Move export jobs to a dedicated worker process or a separate microservice, connected via a job queue (e.g., BullMQ backed by Redis).
- The API endpoint should enqueue the export job and return a job ID immediately. The client polls or receives a WebSocket notification when the export is ready.
- If a separate service is not feasible, use Node.js `worker_threads` to isolate the Puppeteer work from the main event loop.
- Rate-limit export requests per user to prevent abuse.

**Build Phase**
Address during **export feature design**, before implementing any export functionality in the main API process.

---

## MINOR Pitfalls

---

### Mi1. NestJS OnGatewayDisconnect Memory Leak from Duplicate Listener Registration

**Summary**
If a NestJS WebSocket gateway registers disconnect listeners inside a per-connection handler (e.g., inside `handleConnection`) rather than using the `@SubscribeMessage` decorator or the `OnGatewayDisconnect` lifecycle interface correctly, the same socket object accumulates duplicate event listeners over the lifetime of the connection. This causes memory leaks that are slow and hard to detect.

**Warning Signs**

- Node.js emits `MaxListenersExceededWarning` for socket objects.
- Memory usage of the gateway process grows slowly but never drops between sessions.
- Heap snapshots show a large number of anonymous functions attached to socket instances.
- The leak only appears under long-running conditions, not in short test sessions.

**Prevention Strategy**

- Implement disconnect handling exclusively via the `OnGatewayDisconnect` interface and its `handleDisconnect(client: Socket)` method. Never register `client.on('disconnect', ...)` manually inside `handleConnection`.
- Audit all gateway code for any imperative `socket.on(...)` calls and replace them with NestJS decorator-based subscriptions.
- Add a test that connects and disconnects 100 sockets and asserts that the gateway's listener count does not grow.

**Build Phase**
Address during **WebSocket gateway implementation and code review**.

---

### Mi2. JSONB Blob for Board State Makes Querying and Search Impossible

**Summary**
Storing the entire board state as a single opaque JSONB column in Postgres is convenient initially, but makes it impossible to query individual elements (e.g., "find all boards containing a specific image URL") or to build full-text search across board content. It also makes migrations painful when the schema of embedded objects changes.

**Warning Signs**

- Any feature that requires searching or filtering board content requires deserializing entire boards in application code.
- Database queries that should be simple (e.g., "boards containing text X") require fetching and parsing every board row.
- Board schema migrations require a data migration script that iterates every row.

**Prevention Strategy**

- Separate the CRDT/binary update log (which must be opaque) from the indexed metadata. Store structured metadata — text content, asset references, element counts, tags — in typed columns or a separate `board_elements` table.
- Use Postgres `tsvector` or a dedicated search index (e.g., Meilisearch) built from structured metadata, not from the raw blob.
- Design the persistence layer with two layers from the start: a binary/JSONB layer for CRDT state and a structured layer for queryable data.

**Build Phase**
Address during **data model design**, before writing any board persistence code.

---

### Mi3. WebSocket Messages Bypass HTTP Rate Limiting

**Summary**
HTTP rate limiting middleware (e.g., NestJS `ThrottlerModule`, nginx rate limiting) does not apply to WebSocket messages. A client can send thousands of canvas operations per second over an established socket connection without any throttling, enabling denial-of-service from a single connection.

**Warning Signs**

- Load testing with a single WebSocket client sending rapid messages saturates the server.
- The NestJS gateway processes messages as fast as they arrive with no backpressure.
- No per-connection message rate metrics exist in logs or monitoring.

**Prevention Strategy**

- Implement per-socket rate limiting at the gateway level: track message counts per socket per sliding window and disconnect or drop messages from sockets that exceed the threshold.
- Use a token bucket or sliding window counter stored in Redis (so it works across instances) rather than an in-memory counter.
- Define separate rate limits for different message types: canvas operations can have a higher limit than admin-level messages, but both must have a limit.
- Emit a `rate_limit_warning` event to the client before disconnecting, giving the client a chance to back off gracefully.

**Build Phase**
Address during **WebSocket gateway hardening**, before any public-facing deployment.

---

## Phase-Specific Warnings Table

| Build Phase                                      | Highest-Risk Pitfall                            | Why It's Highest Risk in This Phase                                                                                                         |
| ------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Data model and persistence design                | C1 — CRDT tombstone unbounded growth            | The schema and storage strategy are locked in during this phase; retrofitting compaction later requires a full data migration               |
| Authentication and WebSocket gateway setup       | C2 — Guest identity / Better Auth collision     | Auth contracts established here propagate to every downstream feature; a broken identity model requires rewriting the gateway auth guard    |
| WebSocket gateway setup and security hardening   | C3 — Cross-Site WebSocket Hijacking             | The origin allowlist and auth token strategy must be in place before any endpoint is reachable outside localhost                            |
| Infrastructure and gateway design                | C4 — Horizontal scaling breaks room state       | In-memory room maps written in this phase become load-bearing; replacing them with Redis later requires touching every room-join code path  |
| Real-time event design                           | M2 — Cursor/presence event flooding             | The event volume model is defined here; adding throttling after the protocol is finalized requires client and server changes simultaneously |
| WebSocket operation protocol design              | M3 — Reconnect race condition                   | The sequence numbering and catch-up protocol must be designed before any op-handling code is written                                        |
| Client-side connection management                | M1 — JWT expiry during long session             | Token refresh timing is a client concern set up during this phase; fixing it later requires coordinating client releases                    |
| Export feature design                            | M4 — Export blocking the main process           | The job queue architecture must be chosen before any export code is written in the API process                                              |
| WebSocket gateway implementation and code review | Mi1 — Duplicate disconnect listener memory leak | Gateway lifecycle methods are written here; the pattern is easy to get right initially but expensive to audit across a large codebase later |
| Board persistence code                           | Mi2 — JSONB blob kills queryability             | Once boards are being saved as blobs in production, adding structured columns requires a migration and backfill                             |
| Pre-deployment / security hardening              | Mi3 — WebSocket bypasses HTTP rate limiting     | Rate limiting is often added as a late hardening step; missing it before public deployment leaves an obvious DoS surface                    |

---

## Cross-Cutting Mitigations

The following mitigations address multiple pitfalls simultaneously and should be established as foundational infrastructure before canvas development begins:

**Redis (required):** Resolves C4 (room state), M2 (presence rate limiting), M3 (op sequencing), Mi3 (per-socket rate limiting). A single Redis instance eliminates the root cause of several pitfalls.

**Sequence numbers on all operations (required):** Resolves M3 (reconnect race). Every operation must carry a server-assigned sequence number from the first day of implementation.

**Structured metadata alongside CRDT blob (required):** Resolves Mi2 (JSONB queryability). Design two persistence layers in the data model phase.

**Origin allowlist + bearer token in handshake auth (required):** Resolves C3 (CSWSH). Both controls together are defense in depth; either alone is insufficient.

**Background job queue (recommended):** Resolves M4 (export blocking). BullMQ + Redis is already implied by the Redis requirement above.
