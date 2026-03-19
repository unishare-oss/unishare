# Real-Time Collaborative Canvas: Architecture Research

## Overview

This document details the confirmed architecture for adding real-time collaborative canvas to UniShare. The design embeds all new functionality inside the existing NestJS process — no new service, no new port, no new Dockerfile. The canvas engine is Excalidraw bound to a Yjs CRDT document; the transport is Socket.IO attached to the existing HTTP server.

---

## High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router, port 3000)                                    │
│                                                                             │
│  ┌──────────────────────┐     ┌───────────────────────────────────────┐    │
│  │  /canvas/[roomId]    │     │  Existing Feed / Post / Auth Pages    │    │
│  │                      │     └───────────────────────────────────────┘    │
│  │  ExcalidrawCanvas    │                                                   │
│  │  component           │                                                   │
│  │    │                 │                                                   │
│  │    ▼                 │                                                   │
│  │  Y.Doc (local)       │                                                   │
│  │    │                 │                                                   │
│  │    ▼                 │                                                   │
│  │  y-socket.io         │◄──── collab JWT (header / query param) ─────────┐│
│  │  provider            │                                                   ││
│  └──────────┬───────────┘                                                   ││
│             │  WebSocket (ws://api:3001)                                    ││
└─────────────┼────────────────────────────────────────────────────────────┬─┘│
              │  Socket.IO upgrade on existing HTTP server                  │  │
┌─────────────▼────────────────────────────────────────────────────────────┼──┘
│  NestJS API (port 3001)                                                   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │  CollabModule                                                     │    │
│  │                                                                   │    │
│  │  ┌──────────────────────┐   ┌──────────────────┐                │    │
│  │  │  CollabController    │   │  CollabGateway   │                │    │
│  │  │  (REST)              │   │  @WebSocket      │                │    │
│  │  │                      │   │  Gateway()       │                │    │
│  │  │  POST /collab/rooms  │   │                  │                │    │
│  │  │  GET  /collab/rooms  │   │  handleConnection│                │    │
│  │  │  POST /collab/rooms/ │   │  handleDisconnect│                │    │
│  │  │    :id/guest-token   │   │  handleYjsUpdate │                │    │
│  │  └──────────┬───────────┘   │  handleAwareness │                │    │
│  │             │               └────────┬─────────┘                │    │
│  │             ▼                        │                           │    │
│  │  ┌──────────────────────────────────▼──────────────────────┐   │    │
│  │  │  CollabService                                           │   │    │
│  │  │                                                          │   │    │
│  │  │  createRoom()        verifyRoomAccess()                  │   │    │
│  │  │  issueGuestToken()   getOrCreateYDoc()                   │   │    │
│  │  │  scheduleSnapshotFlush()                                 │   │    │
│  │  └──────────────────────────┬───────────────────────────────┘   │    │
│  │                             │                                    │    │
│  │                             ▼                                    │    │
│  │  ┌──────────────────────────────────────────────────────────┐   │    │
│  │  │  CollabRepository                                        │   │    │
│  │  │                                                          │   │    │
│  │  │  createRoom()   findRoom()   saveSnapshot()              │   │    │
│  │  │  loadSnapshot() deleteRoom()                             │   │    │
│  │  └──────────────────────────┬───────────────────────────────┘   │    │
│  │                             │                                    │    │
│  └─────────────────────────────┼────────────────────────────────────┘    │
│                                │                                          │
│  ┌─────────────────────────────▼────────────────────┐                    │
│  │  PrismaService                                    │                    │
│  │  (shared with existing modules)                  │                    │
│  └─────────────────────────────┬────────────────────┘                    │
│                                │                                          │
└────────────────────────────────┼──────────────────────────────────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │  PostgreSQL                          │
              │                                     │
              │  rooms table (id, ownerId,           │
              │    title, snapshot BYTEA,            │
              │    createdAt, updatedAt)             │
              └─────────────────────────────────────┘

In-process state (NestJS heap):
  Map<roomId, { ydoc: Y.Doc; flushTimer: NodeJS.Timeout }>
```

---

## Data Flow: Real-Time Sync

### Connection handshake

```
Client                          CollabGateway
  │                                   │
  │── WebSocket upgrade ─────────────►│
  │   (collab JWT in query/header)    │
  │                                   │── CollabService.verifyCollabToken()
  │                                   │   ├─ valid Better Auth session token?
  │                                   │   │   → resolve userId, set identity
  │                                   │   └─ valid guest JWT?
  │                                   │       → resolve guestId, set identity
  │                                   │
  │                                   │── CollabService.verifyRoomAccess()
  │                                   │   (checks room existence and visibility)
  │                                   │
  │◄── socket joins room ─────────────│
  │◄── yjs-sync-step1 (state vector) ─│  (server sends current doc state)
  │
  │── yjs-sync-step2 (missing ops) ──►│  (client sends ops server is missing)
  │                                   │── relay to all room members except sender
```

### Yjs update relay (steady state)

```
Client A                        CollabGateway                    Client B, C
  │                                   │                               │
  │── emit('yjs-update', Uint8Array) ►│                               │
  │                                   │── Y.applyUpdate(ydoc, update) │
  │                                   │── resetFlushTimer()           │
  │                                   │── to(roomId).emit('yjs-update', update) ──►│
  │                                   │                               │
```

The gateway never decodes the semantic content of Yjs update frames. It applies the raw binary to its in-memory Y.Doc (to maintain the authoritative state for new joiners and snapshot flush) and forwards the binary unchanged to the room's Socket.IO room.

### Awareness relay (cursors, presence)

```
Client A                        CollabGateway                    Client B, C
  │                                   │                               │
  │── emit('awareness', ArrayBuffer) ►│                               │
  │                                   │── to(roomId).except(socket.id)
  │                                   │   .emit('awareness', data) ──►│
  │                                   │                               │
```

Awareness frames are forwarded in-memory only. They are never written to PostgreSQL.

### Snapshot persistence

```
CollabGateway
  │
  │ [on disconnect or idle timer expiry]
  │
  ▼
CollabService.flushSnapshot(roomId)
  │
  ├── Y.encodeStateAsUpdate(ydoc)   → Uint8Array
  │
  ▼
CollabRepository.saveSnapshot(roomId, bytes)
  │
  ▼
PostgreSQL: UPDATE rooms SET snapshot = $bytes WHERE id = $roomId
```

When a new client joins an empty room (no active sockets), the gateway loads the snapshot from PostgreSQL, reconstructs the Y.Doc, then proceeds with the sync handshake above.

### Export to post

```
Client                       CollabController          Existing PostService / S3
  │                               │                            │
  │── POST /collab/rooms/:id/export ─►│                       │
  │                               │── Y.encodeStateAsUpdate()  │
  │                               │   serialize to PNG via     │
  │                               │   Excalidraw.exportToBlob  │
  │                               │   (server-side, or return  │
  │                               │   blob URL to client)      │
  │                               │── S3.getSignedPutUrl() ───►│
  │◄── { uploadUrl, postDraft } ──│◄── presignedUrl ───────────│
  │                               │                            │
  │── PUT presignedUrl (blob) ───────────────────────────────►S3
  │── POST /posts (existing flow) ─────────────────────────────┘
```

The export path reuses the existing S3 presigned upload flow without modification.

---

## Integration Points with the Existing App

### 1. HTTP server sharing (no new port)

`@WebSocketGateway()` with no port argument instructs NestJS/Socket.IO to attach to the same `http.Server` instance that serves the REST API. The existing `main.ts` `app.listen(3001)` call starts both REST and WebSocket on port 3001.

No changes to Docker Compose, Nginx, or environment variables are required.

### 2. Authentication bridge

Better Auth issues `HttpOnly` cookie sessions for browser users. The WebSocket upgrade request cannot reliably send cookies in all environments, so a separate short-lived collab JWT is used:

```
REST: POST /collab/rooms/:id/guest-token
  ├─ Authenticated user  → CollabService.issueCollabToken(userId, roomId, 'member')
  └─ Unauthenticated     → CollabService.issueGuestToken(displayName, roomId)
```

Both produce a signed JWT (`collab_secret`, distinct from Better Auth's secret) with the payload:

```json
{
  "sub": "<userId | guestId>",
  "roomId": "<roomId>",
  "role": "member | guest",
  "exp": "<now + 2h>"
}
```

`CollabGateway.handleConnection()` verifies this token. Both authenticated users and guests resolve to the same `identity` shape on the socket:

```typescript
interface CollabIdentity {
  id: string // userId or generated guestId
  displayName: string
  role: 'member' | 'guest'
  roomId: string
}
```

### 3. Prisma / PrismaService

`CollabModule` imports and injects the existing `PrismaService`. No separate database connection. The new `Room` model is added to the shared `schema.prisma`.

### 4. ResponseInterceptor / Guards

NestJS interceptors (including `ResponseInterceptor`) and guards defined at the HTTP application level do not apply to WebSocket gateways. The gateway handles auth itself in `handleConnection()`. This is confirmed default NestJS/Socket.IO behavior, but should be verified against the existing guard setup to ensure no global `APP_GUARD` tokens cause unexpected behavior on the gateway.

### 5. Helmet / CORS

Helmet's default configuration may block WebSocket upgrade headers. Verify that the existing `helmet()` call does not set `upgrade-insecure-requests` or CSP directives that interfere. Socket.IO's CORS options (`CollabGateway` decorator `cors` option) must match the Next.js origin (`http://localhost:3000` in dev, production domain in prod).

### 6. SSE notifications (existing)

The existing SSE notification system is unaffected. Collab events (user joined room, canvas shared) may optionally emit SSE notifications via the existing `NotificationService` — this is additive and does not modify existing SSE infrastructure.

---

## Prisma Schema Addition

```prisma
model Room {
  id          String    @id @default(cuid())
  title       String
  ownerId     String
  owner       User      @relation(fields: [ownerId], references: [id])
  isPublic    Boolean   @default(false)
  snapshot    Bytes?    // Yjs encoded state, null until first flush
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([ownerId])
}
```

Awareness state (cursor positions, user presence) is intentionally excluded from the schema — it is ephemeral and lives only in the Socket.IO server's memory.

---

## Frontend: Canvas Route

```
app/
  canvas/
    [roomId]/
      page.tsx              ← server component: fetches room metadata, issues collab token
      _components/
        ExcalidrawCanvas.tsx  ← 'use client'; mounts Excalidraw + y-socket.io provider
```

`page.tsx` (server component) calls `GET /collab/rooms/:id` and `POST /collab/rooms/:id/guest-token` (or member token) on the server side, passing the token as a prop to `ExcalidrawCanvas`. This avoids an extra client-side round trip and keeps the JWT out of the URL.

`ExcalidrawCanvas.tsx` flow:

```
mount
  │
  ├── new Y.Doc()
  ├── new SocketIOProvider(wsUrl, roomId, ydoc, { auth: { token } })
  ├── bind Excalidraw onChange → Y.Map updates
  └── observe Y.Map → Excalidraw updateScene()
```

---

## Suggested Build Order

### Phase 1: Database & module skeleton

1. Add `Room` model to `schema.prisma`, run migration.
2. Generate `CollabModule`, `CollabService`, `CollabRepository`, `CollabController` (empty stubs).
3. Import `CollabModule` in `AppModule`.

**Gate:** `npx prisma migrate dev` passes; app starts without errors.

### Phase 2: REST API

4. Implement `POST /collab/rooms` (create room, owner = authenticated user).
5. Implement `GET /collab/rooms/:id` (fetch room metadata + access check).
6. Write integration tests for both endpoints.

**Gate:** REST endpoints tested; no WebSocket code yet.

### Phase 3: Guest token issuance

7. Implement `CollabService.issueGuestToken()` and `issueCollabToken()`.
8. Implement `POST /collab/rooms/:id/guest-token` REST endpoint.
9. Unit test token signing and verification.

**Gate:** Token round-trip tested in isolation.

### Phase 4: Gateway auth

10. Implement `CollabGateway` with `handleConnection()` verifying the collab JWT.
11. Reject connections with invalid or missing tokens.
12. Join verified socket to Socket.IO room.

**Gate:** WebSocket connection accepted/rejected correctly; no Yjs yet.

### Phase 5: Yjs relay

13. Implement `CollabService.getOrCreateYDoc()` (in-memory map, loads snapshot from DB if cold).
14. Implement `handleYjsUpdate()` in gateway: apply to Y.Doc, broadcast to room.
15. Implement sync-step1 / sync-step2 handshake on connection.

**Gate:** Two browser tabs can open same room and see Yjs updates propagate.

### Phase 6: Awareness relay

16. Implement `handleAwareness()`: forward binary frame to room, excluding sender.

**Gate:** Cursor positions visible across tabs.

### Phase 7: Frontend canvas route

17. Implement `app/canvas/[roomId]/page.tsx` (server component, token fetch).
18. Implement `ExcalidrawCanvas.tsx` with `y-socket.io` provider and Excalidraw binding.

**Gate:** Live collaborative drawing works end-to-end in dev.

### Phase 8: Snapshot persistence

19. Implement `CollabService.scheduleSnapshotFlush()` (debounced timer, flush on last disconnect).
20. Implement `CollabRepository.saveSnapshot()`.
21. Verify cold-start: close all tabs, reopen, drawing state restored.

**Gate:** Canvas state survives full disconnect/reconnect cycle.

### Phase 9: Export to post

22. Implement `POST /collab/rooms/:id/export` (returns S3 presigned URL, reuses existing flow).
23. Add export button to `ExcalidrawCanvas.tsx`.

**Gate:** Exported canvas appears as a post with attached image.

---

## Open Questions

| Question                                                          | Status            | Notes                                                                                                                                                |
| ----------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does Helmet config need adjustment for WebSocket upgrade headers? | Unresolved        | Verify `helmet()` options in `main.ts`; may need to allow `Upgrade` header or relax CSP                                                              |
| Does `ResponseInterceptor` affect WebSocket events?               | Likely safe       | Interceptors do not apply to gateways by default, but verify no `APP_INTERCEPTOR` token is registered globally in a way that binds to the WS adapter |
| Should collab JWT secret be the same as the main JWT secret?      | Decision needed   | Recommended: separate env var `COLLAB_JWT_SECRET` to limit blast radius if leaked                                                                    |
| Rate limiting on `yjs-update` events?                             | Unresolved        | High-frequency events; consider throttle guard on the gateway to prevent abuse                                                                       |
| Maximum snapshot size?                                            | Unresolved        | Large canvases produce large Yjs state vectors; may need size cap or S3 offload for snapshots                                                        |
| Room access model (public/private/invite)?                        | Partially defined | `isPublic` flag on Room model covers basic case; invite links and ACL are future scope                                                               |

---

## Key Technical Decisions (Confirmed)

- **Single process, single port**: No new service or container. `@WebSocketGateway()` (no port) attaches to the existing NestJS HTTP server.
- **Pure relay pattern**: The gateway forwards raw binary Yjs frames. It applies them to an in-memory Y.Doc only to maintain authoritative state — it never parses Excalidraw element semantics.
- **Separate collab JWT**: Decoupled from Better Auth session cookies. Short-lived (2h), room-scoped, role-aware. Allows guests without a Better Auth session to participate.
- **Awareness is ephemeral**: Cursor and presence data is never written to the database. Loss on server restart is acceptable.
- **Snapshot on idle/disconnect**: Y.Doc state is encoded and written to PostgreSQL when the last client leaves a room or after a configurable idle timeout. This avoids per-update writes.
- **Export reuses existing S3 flow**: No new storage infrastructure. The export endpoint returns a presigned PUT URL; the client uploads the canvas blob directly to S3, then creates a post via the existing post creation endpoint.
