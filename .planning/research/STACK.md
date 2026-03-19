# Real-Time Collaborative Canvas: Stack Research

_Researched: 2026-03-20. Applies to the existing NestJS (port 3001) + Next.js App Router (port 3000) + PostgreSQL/Prisma + Better Auth stack._

---

## Summary

Add real-time collaborative canvas to UniShare using **Excalidraw** (MIT) as the canvas renderer, **Yjs** as the CRDT layer, and a **custom NestJS WebSocket Gateway** as the sync server. Persistence uses the existing PostgreSQL/Prisma setup. No new SaaS vendors, no new infrastructure primitives.

---

## Recommended Stack

### 1. Canvas Renderer — Excalidraw

| Attribute      | Detail                                  |
| -------------- | --------------------------------------- |
| Package        | `@excalidraw/excalidraw`                |
| Current stable | `0.17.x` (MIT)                          |
| License        | MIT — no watermarks, no commercial fees |

**Why Excalidraw:**

- Ships sticky notes, shapes, freehand drawing, arrows, and rich text (TipTap-backed text nodes in recent versions) out of the box.
- `<Excalidraw onChange={handler} initialData={snapshot} />` is the entire integration surface. `initialData` accepts a serialized element array and `appState`; `onChange` receives the full current element array on every mutation.
- Exports PNG and SVG natively via `exportToCanvas` / `exportToSvg` helpers — no third-party renderer needed.
- Actively maintained by the Excalidraw team (Meta alumni) with frequent releases and a large community.
- Zero friction with Next.js: dynamic import with `ssr: false` handles the `window`-dependent internals cleanly.

**Confidence: High**

---

### 2. CRDT / Sync Engine — Yjs

| Attribute                   | Detail                    |
| --------------------------- | ------------------------- |
| Package                     | `yjs`                     |
| Current stable              | `13.6.x` (MIT)            |
| Awareness package           | `y-protocols` `1.x`       |
| WebSocket provider (client) | `y-websocket` `2.x` (MIT) |

**Why Yjs:**

- 5000x+ faster than Automerge on real-world editing traces (published benchmarks from the Yjs team and independent replications). At study-group concurrency levels (2–20 peers) this margin is overkill, but it means zero latency budget concerns.
- `Y.Array` and `Y.Map` map naturally to Excalidraw's element array. Each canvas element can be stored as a `Y.Map` keyed by element `id`.
- The entire collaborative editing ecosystem (Hocuspocus, Liveblocks internals, BlockSuite) builds on Yjs. Choosing Yjs means never being stranded.
- Awareness protocol (`y-protocols/awareness`) gives free cursor/presence propagation with no extra design work.
- Binary encoding via `Y.encodeStateAsUpdate` produces compact snapshots suitable for PostgreSQL `bytea` column storage.

**Confidence: High**

---

### 3. WebSocket Sync Server — Custom NestJS Gateway

| Attribute          | Detail                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| NestJS adapter     | `@nestjs/platform-ws` (native `ws` adapter)                                                         |
| WebSocket library  | `ws` `8.x` (MIT) — already a transitive dep in most NestJS projects                                 |
| Yjs server utility | `y-websocket/bin/utils` — the `setupWSConnection` helper is importable as a library, not just a CLI |

**Why a custom NestJS gateway and not a third-party server:**

- **Liveblocks**: SaaS pricing ($0 → paid tiers based on monthly active users). Vendor lock-in on the sync layer. No self-host option.
- **PartyKit**: Cloudflare Workers-only after its 2024 acquisition. Incompatible with a Node.js NestJS server.
- **Hocuspocus**: Designed as a standalone Express-adjacent server. Lifecycle hooks (`onConnect`, `onDisconnect`, `onChange`) conflict with NestJS's `@WebSocketGateway` lifecycle. Running both means managing two HTTP listeners and two port-binding concerns. Not worth the friction for a project already owning NestJS.

**Architecture:**

```
Client (y-websocket provider)
  │  wss://api.unishare.app/rooms/:slug/ws?token=<jwt>
  ▼
NestJS @WebSocketGateway('/rooms')
  │  verify JWT from query param
  │  route to RoomSyncService
  ▼
RoomSyncService
  │  Y.Doc per room (in-memory Map<slug, Y.Doc>)
  │  setupWSConnection(ws, req, { docName: slug, gc: true })
  │  on Y.Doc update → debounced PostgreSQL snapshot write
  ▼
PostgreSQL (Prisma) — rooms table, snapshot: Bytes column
```

The `setupWSConnection` function from `y-websocket` handles the Yjs binary protocol (sync step 1/2, awareness updates) without coupling to any server framework. The NestJS gateway just wraps the raw `ws.WebSocket` instance.

**Confidence: High** (pattern is well-documented; the only non-obvious part is extracting the raw `ws` socket from NestJS's abstraction, which is a two-line adapter shim)

---

### 4. Persistence — PostgreSQL via Prisma (existing)

Store room state as a Yjs binary snapshot in a `bytea` / `Bytes` column.

```prisma
model Room {
  id        String   @id @default(cuid())
  slug      String   @unique
  snapshot  Bytes?   // Y.encodeStateAsUpdate(ydoc)
  updatedAt DateTime @updatedAt
  // ... existing relations
}
```

On server side:

- On first connection to a room, load snapshot from DB and apply via `Y.applyUpdate(ydoc, snapshot)`.
- On Y.Doc `update` event, debounce 2–5 seconds, then write `Y.encodeStateAsUpdate(ydoc)` back to DB.
- On server restart, Y.Doc is rebuilt from the stored snapshot. No in-flight state is lost beyond the debounce window.

This is sufficient for study-group scale (2–20 simultaneous users per room). Horizontal scaling across multiple API instances is out of scope until needed; if required later, Redis pub/sub (using a permissive-licensed Redis client) can broadcast Y updates between instances without y-redis's AGPL constraint.

**Confidence: High**

---

### 5. Guest / Anonymous Identity — Short-Lived JWT

Better Auth manages authenticated sessions via HTTP-only cookies. Cookies do not reliably survive the WebSocket upgrade handshake in all environments (proxies strip `Cookie` headers; Next.js middleware runs only on HTTP).

**Pattern:**

1. Client calls `POST /api/rooms/:slug/join` (authenticated or anonymous).
2. Server issues a short-lived JWT (15–60 min, HS256, signed with a `ROOM_JWT_SECRET` env var) containing `{ sub: userId | guestId, roomSlug, role, exp }`.
3. Client opens WebSocket as `wss://.../rooms/:slug/ws?token=<jwt>`.
4. NestJS gateway middleware verifies JWT from `req.url` query param before `setupWSConnection`. Invalid token → socket closed with code 4001.
5. Guest users get a `guestId` (random UUID, stored in `localStorage`) that persists within a browser session. No account required for read/comment roles.

**Package:** `jsonwebtoken` `9.x` (MIT) — already likely present; alternatively `jose` `5.x` for Edge-compatible usage.

**Confidence: High** (standard pattern; JWT verification in WS upgrade is well-documented)

---

## What NOT to Use

### tldraw — DISQUALIFIED

- SDK 4.0 (released September 2025) introduced a commercial license requirement: **$6,000/year** for production use.
- The "Hobby" tier requires a "made with tldraw" watermark on all canvases — unacceptable for a branded product.
- The SDK's recommended backend is Cloudflare Durable Objects, which directly conflicts with NestJS's Node.js process model.

### Automerge — DISQUALIFIED

- Benchmarks show 5000x+ slower than Yjs on standard editing traces.
- No canvas-domain data structures. Would require building the entire element array sync model from scratch.
- Smaller ecosystem; fewer bindings and less tooling.

### y-redis — DISQUALIFIED

- AGPL-3.0 licensed (or commercial license required). Incompatible with a proprietary product without a paid license.
- Not needed at study-group scale; PostgreSQL snapshot persistence is sufficient.

### Hocuspocus — NOT RECOMMENDED

- Designed as a standalone server. Integrating it into a NestJS process requires shimming its internal HTTP server, which fights NestJS's lifecycle and conflicts with existing route handling.
- Adds Yjs server logic that can be achieved more transparently with `y-websocket`'s `setupWSConnection` utility directly.

### Liveblocks — NOT RECOMMENDED

- SaaS product. Sync state lives on Liveblocks servers, not in the project's own PostgreSQL.
- Pricing scales with monthly active users. Unpredictable cost at growth.
- No self-host option.

### PartyKit — NOT RECOMMENDED

- Cloudflare Workers runtime only after its 2024 acquisition by Cloudflare.
- Cannot run alongside a NestJS Node.js server.

---

## Integration Path

### Backend (NestJS, port 3001)

1. **Add dependencies:**

   ```
   yjs, y-websocket, @nestjs/platform-ws, ws, jsonwebtoken
   ```

2. **Switch WS adapter** in `main.ts`:

   ```ts
   app.useWebSocketAdapter(new WsAdapter(app))
   ```

   (NestJS ships `WsAdapter` in `@nestjs/platform-ws` — replaces Socket.IO adapter if currently used)

3. **Create `RoomsGateway`** decorated with `@WebSocketGateway({ path: '/rooms' })`. On connection:
   - Extract `token` from `request.url`.
   - Verify JWT, close socket with 4001 on failure.
   - Look up or create a `Y.Doc` for `roomSlug` in a `Map<string, Y.Doc>`.
   - Load snapshot from Prisma if doc is newly created.
   - Call `setupWSConnection(socket, request, { docName: roomSlug })`.
   - Register debounced update listener to write snapshots to Prisma.

4. **Add `POST /api/rooms/:slug/join`** endpoint that issues the short-lived JWT. This endpoint is authenticated (Better Auth session) for known users, and open (creates a guest identity) for anonymous visitors.

5. **Prisma migration:** add `snapshot Bytes?` and `updatedAt` to the `Room` model (or create a `RoomSnapshot` table if rooms don't exist yet).

### Frontend (Next.js App Router, port 3000)

1. **Add dependencies:**

   ```
   @excalidraw/excalidraw, yjs, y-websocket
   ```

2. **Dynamic import** Excalidraw (required — uses browser APIs):

   ```ts
   const Excalidraw = dynamic(() => import('@excalidraw/excalidraw').then((m) => m.Excalidraw), {
     ssr: false,
   })
   ```

3. **Canvas page** (`/rooms/[slug]/canvas`):
   - On mount, call `POST /api/rooms/:slug/join` to obtain a room JWT.
   - Instantiate `Y.Doc` and `WebsocketProvider` pointing to `wss://api.../rooms/:slug/ws?token=<jwt>`.
   - Bind `Y.Array<ExcalidrawElement>` to component state.
   - Pass current elements as `initialData` to `<Excalidraw />`.
   - In `onChange`, diff incoming element array against Y.Array and apply mutations transactionally (see Open Questions §1).
   - Render awareness cursors using the `WebsocketProvider.awareness` map.

4. **Export button:** call `exportToSvg` / `exportToCanvas` from `@excalidraw/excalidraw` directly in-browser. No server round-trip needed for client-side export. For server-side export (e.g., generating a thumbnail), use `@excalidraw/utils` in a Node.js context.

---

## Confidence Levels Summary

| Decision                               | Confidence | Notes                                                                                                  |
| -------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| Excalidraw as canvas renderer          | High       | MIT, actively maintained, clean API                                                                    |
| Yjs as CRDT                            | High       | Performance and ecosystem proven                                                                       |
| Custom NestJS WS gateway               | High       | `setupWSConnection` is library-importable                                                              |
| PostgreSQL for persistence             | High       | Sufficient for study-group scale                                                                       |
| Short-lived JWT for WS auth            | High       | Standard pattern, well-documented                                                                      |
| `Y.Array` ↔ Excalidraw element mapping | Medium     | Needs spike to confirm onChange diffing performance                                                    |
| Rich text via Excalidraw text nodes    | Medium     | Excalidraw's TipTap-backed text is embedded in canvas — may not satisfy a "structured doc" requirement |

---

## Open Questions / Spike Items

### OQ-1: Excalidraw `onChange` Diffing Performance (MUST SPIKE)

Excalidraw's `onChange` fires the **full element array** on every change — there is no incremental diff provided. To sync via Yjs, the client must:

1. Receive the new element array from `onChange`.
2. Diff it against the current `Y.Array` state (by `id`).
3. Apply adds, updates, and deletes as a single `Y.Doc` transaction.

At small canvas sizes (< 500 elements) this should be trivial. At large sizes (thousands of elements) the O(n) diff on every keystroke or drag could cause frame drops.

**Spike:** Build a prototype that creates 1000 elements and measures `onChange` → Yjs transaction time. If > 8ms (one 120Hz frame), switch to a `ref`-based previous-state cache using `Map<id, element>` for O(1) lookup.

### OQ-2: Structured Document Scope Clarification (DESIGN QUESTION)

The product requirement mentions "structured docs." Excalidraw is a canvas, not a document editor. Two interpretations exist:

**Option A:** Structured docs = rich text inside canvas shapes. Excalidraw supports multi-line text elements backed by TipTap. This covers bullet lists and formatted text embedded in shapes, but the result is not a traditional document (no page flow, no headings hierarchy outside of shapes).

**Option B:** Structured docs = a separate rich-text document editor (e.g., TipTap, BlockNote, or Lexical) rendered alongside or separately from the canvas. This would require a second Yjs document type and a second editor component.

**Action:** Product decision needed before implementation begins. If Option B, add BlockNote (`@blocknote/core`, MIT) or TipTap (`@tiptap/core`, MIT) to the stack for the doc editor surface, using a separate `Y.XmlFragment` for that document's content.

### OQ-3: Multi-Instance Scaling (DEFERRED)

The current design stores Y.Doc in-memory per NestJS process. With a single API instance this is correct. If multiple API instances run behind a load balancer (e.g., Fly.io with 2+ machines), WebSocket connections to different instances will not share the same in-memory Y.Doc.

**Deferred solution when needed:** Use Redis pub/sub to broadcast raw Yjs update bytes between instances. The licensing concern is y-redis (AGPL) — not Redis itself or the `ioredis` / `@redis/client` npm packages (both MIT). A custom Redis broadcast adapter is ~50 lines.

### OQ-4: Room Snapshot Compaction

`Y.encodeStateAsUpdate` produces a snapshot that grows monotonically if updates accumulate without compaction. Yjs provides `Y.encodeStateAsUpdate(doc, origin)` and GC (garbage collection) settings. At study-group scale this is unlikely to matter for months, but a scheduled job (or on-disconnect trigger) that re-encodes as a clean state vector should be planned.

---

## Package Install Reference

**Backend (`apps/api`):**

```bash
pnpm add yjs y-websocket @nestjs/platform-ws ws jsonwebtoken
pnpm add -D @types/ws @types/jsonwebtoken
```

**Frontend (`apps/web`):**

```bash
pnpm add @excalidraw/excalidraw yjs y-websocket
```

_No additional infrastructure (no new databases, no new cloud services, no new runtime environments) is required beyond what the project already operates._
