# Phase 3: WebSocket Gateway & Yjs Relay - Research

**Researched:** 2026-03-20
**Domain:** NestJS WebSocket gateway (socket.io), Yjs CRDT relay, session auth over WS
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Transport:** Use socket.io via `@nestjs/platform-socket.io` — not native `ws`
- **Namespace:** Single `/collab` namespace; clients join rooms by slug using socket.io's `join()` (not one namespace per room)
- **Yjs event:** Custom `yjs-update` event carrying a `Uint8Array` binary payload; server relays to all other sockets in same room
- **No third-party y-socket.io** — custom relay only
- **State sync on connect/reconnect:** Server sends full Y.Doc state vector (`encodeStateAsUpdate`) to joining client immediately
- **In-memory Y.Doc per room:** Gateway holds one merged `Y.Doc` per room as source of truth; on server restart all state is lost (acceptable — Phase 6 adds persistence)
- **Auth at connection time:** Read Better Auth session cookie from `handshake.headers.cookie`; validate via `auth.api.getSession()`; reject 401 if no valid session
- **Anonymous sessions are valid** — they have a `better-auth.session` cookie from the Phase 2 join endpoint
- **Testing:** No frontend work. Jest integration tests using `socket.io-client`. Test: two clients same room relay; third client different room does NOT receive; unit tests for gateway event handlers

### Claude's Discretion

- Whether to use a NestJS `WsGuard` or a socket.io middleware for the auth check
- Exact Yjs `Y.Doc` per-room storage structure (Map in gateway vs singleton service)
- CORS configuration for the socket.io server (must mirror existing HTTP CORS allowlist from `main.ts`)
- Room lifecycle: when to garbage-collect an in-memory doc after all clients leave (simple timeout is fine)

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                                     | Research Support                                                                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| COLB-01 | Multiple users can edit the same canvas simultaneously with changes appearing in real-time for all participants | Yjs CRDT update relay over socket.io rooms; Y.Doc per-room merge; encodeStateAsUpdate for initial sync enables all participants to converge on identical state |

</phase_requirements>

---

## Summary

This phase wires a NestJS socket.io gateway onto the existing Express server (port 3001). Clients connect to the `/collab` namespace, authenticate via their Better Auth session cookie during the handshake, join a room by slug, and exchange binary Yjs document updates. The server maintains one `Y.Doc` per active room: every inbound `yjs-update` is applied to the server's doc (so new joiners can receive full state), then relayed to all other sockets in the same room via `socket.to(roomSlug).emit()`. Room docs are garbage-collected after a configurable idle timeout.

The auth check happens in a socket.io namespace middleware registered in `afterInit`. This is the correct pattern — guards run only on message events and cannot reject the initial connection; middleware runs before the connection is fully established. The Better Auth session cookie (`better-auth.session`) is accessible via `socket.handshake.headers.cookie` and validated with the existing `auth.api.getSession()` call using a synthesised `Headers` object.

Testing uses Jest + `socket.io-client` integration tests. Because the app already boots on a real port during e2e tests (see `test/app.e2e-spec.ts`), the same pattern works: spin up `NestFactory.create(AppModule)`, call `app.listen(0)` on a random port, then connect two `io()` clients to verify relay behaviour. Unit tests mock the socket object to test handler logic in isolation.

**Primary recommendation:** Register the gateway in the existing `CollabModule`. Use a socket.io namespace middleware (not a WsGuard) for auth. Store `Y.Doc` instances in a `CollabRoomService` (a plain `@Injectable()` service), not directly on the gateway class.

---

## Standard Stack

### Core

| Library                      | Version | Purpose                                                                                        | Why Standard                                                        |
| ---------------------------- | ------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `@nestjs/websockets`         | 11.1.17 | Gateway decorator infrastructure, `@WebSocketGateway`, `@SubscribeMessage`, `@WebSocketServer` | NestJS first-party; already at matching version with rest of NestJS |
| `@nestjs/platform-socket.io` | 11.1.17 | Socket.io adapter for NestJS; provides `IoAdapter`                                             | Locked decision; same version family as installed NestJS 11         |
| `socket.io`                  | 4.8.3   | Underlying WS server; rooms, namespaces, binary transport                                      | Peer dep of `@nestjs/platform-socket.io`                            |
| `yjs`                        | 13.6.30 | CRDT Y.Doc, `encodeStateAsUpdate`, `applyUpdate`, `encodeStateVector`                          | Locked decision; current stable                                     |
| `socket.io-client`           | 4.8.3   | Integration test client                                                                        | Matches server version; no surprises                                |

### Supporting

| Library  | Version                    | Purpose                                         | When to Use                                                       |
| -------- | -------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| `cookie` | built-in Node / npm `^0.7` | Parse cookie header string in socket middleware | Needed to extract `better-auth.session` from raw `Cookie:` header |

**Installation:**

```bash
cd apps/api
npm install @nestjs/websockets @nestjs/platform-socket.io yjs
npm install --save-dev socket.io-client @types/cookie
npm install cookie
```

**Version verification (confirmed 2026-03-20 against npm registry):**

| Package                      | Verified Version                        |
| ---------------------------- | --------------------------------------- |
| `@nestjs/websockets`         | 11.1.17                                 |
| `@nestjs/platform-socket.io` | 11.1.17                                 |
| `socket.io`                  | 4.8.3                                   |
| `socket.io-client`           | 4.8.3                                   |
| `yjs`                        | 13.6.30                                 |
| `better-auth`                | 1.5.5 (existing dep, no install needed) |

---

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/modules/collab/
├── collab.controller.ts        # existing — REST endpoints (unchanged)
├── collab.gateway.ts           # NEW — @WebSocketGateway, socket event handlers
├── collab.module.ts            # updated — add gateway + room service to providers
├── collab.repository.ts        # existing — room DB queries (reused for slug verification)
├── collab.room.service.ts      # NEW — in-memory Y.Doc map, room lifecycle/GC
├── collab.service.ts           # existing — REST business logic (unchanged)
└── dto/ entities/              # existing
```

The `IoAdapter` is configured in `main.ts`. The `CollabModule` registers `CollabGateway` and `CollabRoomService` as providers. No new top-level module needed.

### Pattern 1: IoAdapter Registration in main.ts

NestJS does NOT automatically use socket.io. You must call `app.useWebSocketAdapter(new IoAdapter(app))` before `app.listen()`.

```typescript
// Source: NestJS docs — https://docs.nestjs.com/websockets/adapter
import { IoAdapter } from '@nestjs/platform-socket.io'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // ... existing setup ...
  app.useWebSocketAdapter(new IoAdapter(app))
  await app.listen(port)
}
```

**CORS is passed via `@WebSocketGateway` decorator options, NOT through `IoAdapter`.** The gateway decorator directly accepts socket.io `ServerOptions`:

```typescript
@WebSocketGateway({
  namespace: '/collab',
  cors: { origin: allowedOrigins, credentials: true },
})
```

However, `allowedOrigins` lives in `main.ts`. The cleanest approach is to read `process.env.FRONTEND_URL` inside the gateway decorator factory or inject a `ConfigService`. See Pitfall 2 for the details.

### Pattern 2: Socket.io Namespace Middleware for Auth (Recommended over WsGuard)

**Why middleware, not WsGuard:**

- Guards execute on each `@SubscribeMessage` call — they do NOT reject the initial connection
- A socket can connect and sit idle without being authenticated if a guard is used
- Namespace middleware runs once per connection, before the socket is admitted, and calling `next(new Error(...))` drops the connection cleanly

```typescript
// Source: https://preetmishra.com/blog/the-best-way-to-authenticate-websockets-in-nestjs
// and socket.io docs: https://socket.io/docs/v4/middlewares/
import { parse } from 'cookie'
import { auth } from '@/auth/auth.config'

// In CollabGateway:
async afterInit(server: Server) {
  server.use(async (socket: Socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie ?? ''
    const cookies = parse(cookieHeader)
    const sessionToken = cookies['better-auth.session']

    if (!sessionToken) {
      return next(new Error('Unauthorized'))
    }

    const session = await auth.api.getSession({
      headers: new Headers({ cookie: cookieHeader }),
    })

    if (!session) {
      return next(new Error('Unauthorized'))
    }

    // Attach to socket for downstream handlers
    ;(socket as AuthenticatedSocket).user = session.user
    ;(socket as AuthenticatedSocket).sessionData = session.session
    next()
  })
}
```

The `Headers` constructor is available in Node 18+. Pass the raw `cookie` header string — Better Auth reads the standard `cookie` header internally.

### Pattern 3: Room Join and Yjs Relay

```typescript
@SubscribeMessage('join-room')
async handleJoinRoom(
  @ConnectedSocket() client: AuthenticatedSocket,
  @MessageBody() slug: string,
) {
  // 1. Verify room exists
  const room = await this.collabRepository.findBySlug(slug)
  if (!room) {
    client.emit('error', { message: 'Room not found' })
    return
  }

  // 2. Join socket.io room
  await client.join(slug)

  // 3. Send current state to joining client
  const doc = this.roomService.getOrCreate(slug)
  const state = Y.encodeStateAsUpdate(doc)
  client.emit('room-joined', { slug, state })
}

@SubscribeMessage('yjs-update')
handleYjsUpdate(
  @ConnectedSocket() client: AuthenticatedSocket,
  @MessageBody() update: Uint8Array,
) {
  const slug = this.roomService.getRoomForSocket(client.id)
  if (!slug) return

  // 1. Apply to server doc (so new joiners get merged state)
  const doc = this.roomService.getOrCreate(slug)
  Y.applyUpdate(doc, update)

  // 2. Relay to all OTHER sockets in room — NOT back to sender
  client.to(slug).emit('yjs-update', update)
}
```

**Critical:** `client.to(slug).emit(...)` excludes the sender. Do NOT use `this.server.to(slug).emit(...)` which includes the sender and causes update loops.

### Pattern 4: CollabRoomService (Y.Doc per Room)

```typescript
@Injectable()
export class CollabRoomService {
  private rooms = new Map<string, { doc: Y.Doc; timer: NodeJS.Timeout | null }>()
  private socketToRoom = new Map<string, string>()

  getOrCreate(slug: string): Y.Doc {
    if (!this.rooms.has(slug)) {
      this.rooms.set(slug, { doc: new Y.Doc(), timer: null })
    }
    return this.rooms.get(slug)!.doc
  }

  getRoomForSocket(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId)
  }

  registerSocket(socketId: string, slug: string): void {
    this.socketToRoom.set(socketId, slug)
    // Cancel any pending GC
    const entry = this.rooms.get(slug)
    if (entry?.timer) {
      clearTimeout(entry.timer)
      entry.timer = null
    }
  }

  removeSocket(socketId: string): void {
    const slug = this.socketToRoom.get(socketId)
    this.socketToRoom.delete(socketId)
    if (!slug) return
    // Schedule GC if no remaining sockets
    const remaining = [...this.socketToRoom.values()].filter((s) => s === slug)
    if (remaining.length === 0) {
      const entry = this.rooms.get(slug)
      if (entry) {
        entry.timer = setTimeout(() => this.rooms.delete(slug), 5 * 60 * 1000)
      }
    }
  }
}
```

**Note:** `socketToRoom` only tracks the current room for a socket. If a socket can join only one room at a time (simplest design for Phase 3), this is sufficient. If sockets could be in multiple rooms, a `Map<string, Set<string>>` is needed.

### Pattern 5: Integration Test Pattern

```typescript
// Source: https://dev.to/jfrancai/demystifying-nestjs-websocket-gateways-a-step-by-step-guide-to-effective-testing-1a1f
import { io, Socket } from 'socket.io-client'
import { NestFactory } from '@nestjs/core'
import { IoAdapter } from '@nestjs/platform-socket.io'

describe('CollabGateway (integration)', () => {
  let app: INestApplication
  let port: number

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useWebSocketAdapter(new IoAdapter(app))
    await app.listen(0) // random port
    const addr = app.getHttpServer().address()
    port = addr.port
  })

  afterAll(() => app.close())

  it('relays yjs-update to other clients in same room', (done) => {
    const clientA = io(`http://localhost:${port}/collab`, {
      // auth cookie set in extraHeaders
      extraHeaders: { cookie: 'better-auth.session=valid-session-token' },
    })
    const clientB = io(`http://localhost:${port}/collab`, {
      extraHeaders: { cookie: 'better-auth.session=valid-session-token-2' },
    })

    clientB.on('yjs-update', (data: ArrayBuffer) => {
      expect(new Uint8Array(data)).toEqual(new Uint8Array([1, 2, 3]))
      clientA.disconnect()
      clientB.disconnect()
      done()
    })

    clientA.emit('join-room', 'test-slug')
    clientB.emit('join-room', 'test-slug')
    clientA.emit('yjs-update', new Uint8Array([1, 2, 3]))
  })
})
```

Note: cookie-based auth in integration tests requires the test to either mock `auth.api.getSession` or use real session tokens. Use `jest.mock('@/auth/auth.config')` to stub `getSession` for tests.

### Anti-Patterns to Avoid

- **Using `this.server.to(room).emit()` for relay:** Echoes back to sender, causing the sender's Yjs doc to process its own update a second time — silent duplicate data corruption.
- **Storing Y.Doc directly as a property on the gateway class:** Gateway classes can be instantiated differently in tests; move to a dedicated service.
- **Passing CORS config to IoAdapter constructor arguments:** NestJS IoAdapter CORS must be set on the `@WebSocketGateway` decorator, not in the adapter itself.
- **Using a WsGuard for connection-time auth:** Guards run per-message, not at connection. A connected-but-unauthenticated socket is a resource leak and security issue.
- **Emitting Y.Doc state as JSON:** Yjs binary encoding (`Uint8Array`) must be sent as binary. Socket.io supports `Buffer`/`Uint8Array` natively — receive as `ArrayBuffer` on the browser client side, convert with `new Uint8Array(buf)`.

---

## Don't Hand-Roll

| Problem                           | Don't Build             | Use Instead                               | Why                                                                                      |
| --------------------------------- | ----------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| CRDT merge / conflict resolution  | Custom OT/merge logic   | `yjs` — `Y.applyUpdate`, `Y.mergeUpdates` | CRDTs have subtle edge cases; Yjs has been hardened over years                           |
| Binary serialisation of doc state | Custom format           | `Y.encodeStateAsUpdate(doc)`              | Yjs uses compact binary encoding; custom formats lose interop with Phase 4 canvas client |
| Room broadcast excluding sender   | Manual socket list loop | `socket.to(room).emit()`                  | Socket.io built-in; avoids O(n) loops, handles disconnects gracefully                    |
| Cookie string parsing             | Manual string split     | npm `cookie` package (`parse()`)          | Cookie parsing has edge cases (quoted values, semicolons in values)                      |

**Key insight:** Yjs update encoding is the heart of this phase. Never base64-encode or JSON-stringify Yjs updates — always keep them as `Uint8Array`/`Buffer` through the entire relay chain.

---

## Common Pitfalls

### Pitfall 1: CORS Configuration for Socket.io

**What goes wrong:** The frontend (port 3000) cannot connect to the socket.io gateway. Connection is rejected with a CORS error.

**Why it happens:** `app.enableCors()` in `main.ts` applies to HTTP routes only. The `IoAdapter` has its own socket.io `ServerOptions` and needs CORS configured independently via the `@WebSocketGateway` decorator's `cors` option.

**How to avoid:** Pass `cors: { origin: allowedOrigins, credentials: true }` directly in the `@WebSocketGateway({ namespace: '/collab', cors: { ... } })` decorator. Read `FRONTEND_URL` from `process.env` or inject `ConfigService` inside the gateway to match the `allowedOrigins` array in `main.ts`.

**Warning signs:** Browser console shows `Cross-Origin Request Blocked` on the socket.io connection attempt.

### Pitfall 2: allowedOrigins Duplication / Drift

**What goes wrong:** The gateway's CORS allowlist gets out of sync with `main.ts`'s `allowedOrigins`.

**Why it happens:** `allowedOrigins` is constructed inline in `main.ts` bootstrap function — not exported or injectable.

**How to avoid:** Either export `allowedOrigins` from a shared config file, or construct the same array from `process.env.FRONTEND_URL` + `'http://localhost:3000'` directly in the gateway decorator. Since these are two lines of code, duplication is acceptable in Phase 3; refactor in Phase 4 if needed.

### Pitfall 3: Binary Data Type Mismatch (Uint8Array vs Buffer vs ArrayBuffer)

**What goes wrong:** The server receives a Yjs update as a plain object `{}` instead of a `Uint8Array`, so `Y.applyUpdate()` throws or silently corrupts state.

**Why it happens:** socket.io receives `Uint8Array` from the browser client as an `ArrayBuffer` on the Node.js side. When destructuring `@MessageBody()`, NestJS may pass it as a Buffer or keep it as ArrayBuffer depending on the version and parser.

**How to avoid:** In the `yjs-update` handler, defensively convert the incoming value: `const update = Buffer.isBuffer(data) ? data : Buffer.from(data)` before calling `Y.applyUpdate(doc, update)`. Then when relaying, emit the raw `update` buffer directly — socket.io handles binary natively.

**Warning signs:** `Y.applyUpdate` throws `"update is not a Uint8Array"` or room state never diverges.

### Pitfall 4: Namespace Middleware vs Engine Middleware

**What goes wrong:** Auth middleware registered via `io.engine.use()` runs on every HTTP request including the polling phase, not just WS upgrade; or middleware registered on the wrong scope.

**Why it happens:** socket.io has three middleware layers: engine (`io.engine.use()`), namespace (`server.use()` / `io.of('/collab').use()`), and socket-level (`socket.use()`). They have different scopes.

**How to avoid:** In `afterInit(server: Server)`, `server` is the namespace server (already scoped to `/collab`). Call `server.use(middleware)` to run auth on all incoming connections to the namespace only. This is the right layer.

### Pitfall 5: Gateway Not Receiving Uint8Array from Test Client

**What goes wrong:** Integration tests emit a `Uint8Array` but the gateway receives an empty object or ArrayBuffer.

**Why it happens:** `socket.io-client` on Node.js may serialise `Uint8Array` differently from browsers. The `socket.io-client` v4 supports binary; the key is not wrapping it in a plain JS object.

**How to avoid:** Emit directly: `clientA.emit('yjs-update', Buffer.from([1,2,3]))` in tests. On the server, accept `Buffer`. Both are interchangeable in Node.js.

### Pitfall 6: handleDisconnect Does Not Clean Up Room Membership

**What goes wrong:** Disconnected sockets remain in `socketToRoom` map; GC timer never fires; in-memory docs leak.

**Why it happens:** `handleDisconnect` must be explicitly implemented. socket.io removes the socket from its internal rooms automatically, but application-level maps need manual cleanup.

**How to avoid:** Always implement `handleDisconnect(@ConnectedSocket() client: Socket)` and call `this.roomService.removeSocket(client.id)`.

---

## Code Examples

Verified patterns from official sources:

### Yjs: Apply Update and Get Full State

```typescript
// Source: https://docs.yjs.dev/api/document-updates
import * as Y from 'yjs'

// Merge incoming update into server doc
Y.applyUpdate(doc, incomingUpdate) // incomingUpdate: Uint8Array

// Get full state for new joiners
const fullState: Uint8Array = Y.encodeStateAsUpdate(doc)

// Merge multiple updates into one (useful for compact storage)
const merged: Uint8Array = Y.mergeUpdates([update1, update2])
```

### NestJS Gateway Skeleton

```typescript
// Source: NestJS docs — https://docs.nestjs.com/websockets/gateways
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  namespace: '/collab',
  cors: { origin: ['http://localhost:3000'], credentials: true },
})
export class CollabGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server

  afterInit(server: Server) {
    // Register namespace middleware here
  }

  handleConnection(client: Socket) {
    /* ... */
  }
  handleDisconnect(client: Socket) {
    /* ... */
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() slug: string) {
    /* ... */
  }

  @SubscribeMessage('yjs-update')
  handleYjsUpdate(@ConnectedSocket() client: Socket, @MessageBody() update: Uint8Array) {
    /* ... */
  }
}
```

### Socket.io Namespace Middleware for Cookie Auth

```typescript
// Source: https://socket.io/docs/v4/middlewares/ (verified 2026-03-20)
// and https://preetmishra.com/blog/the-best-way-to-authenticate-websockets-in-nestjs
import { parse } from 'cookie'

server.use(async (socket: Socket, next) => {
  const cookieStr = socket.handshake.headers.cookie ?? ''
  const session = await auth.api.getSession({
    headers: new Headers({ cookie: cookieStr }),
  })
  if (!session) return next(new Error('Unauthorized'))
  ;(socket.data as any).user = session.user
  next()
})
```

`socket.data` is socket.io's built-in per-socket data bag (v4+) — preferred over monkey-patching the socket object.

### IoAdapter Registration

```typescript
// Source: NestJS docs — https://docs.nestjs.com/websockets/adapter
import { IoAdapter } from '@nestjs/platform-socket.io'

// In main.ts bootstrap(), before app.listen():
app.useWebSocketAdapter(new IoAdapter(app))
```

---

## State of the Art

| Old Approach                             | Current Approach                                            | When Changed                              | Impact                                                               |
| ---------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| y-websocket (external server)            | Custom NestJS gateway with manual relay                     | Always an option; chosen here for control | Full control over auth, room lifecycle, event shape                  |
| WsGuard for connection auth              | socket.io namespace middleware in `afterInit`               | Recognised best practice ~2022+           | Guards cannot reject connections; middleware is the only safe option |
| Echoing updates back to all room members | `socket.to(room).emit()` (excludes sender)                  | socket.io v3+                             | Prevents sender from receiving its own update twice                  |
| Base64 Yjs updates over JSON             | Binary `Uint8Array`/`Buffer` via socket.io binary transport | socket.io v1+                             | ~30–60% bandwidth reduction, no encode/decode overhead               |

**Deprecated/outdated:**

- y-webrtc: peer-to-peer only, no server authority — not relevant for server-relay architecture
- socket.io v2 patterns: socket.io v4 `socket.data` replaces monkey-patching socket with user properties

---

## Open Questions

1. **Cookie name for Better Auth sessions**
   - What we know: The spec file shows `better-auth.session=xyz` as the cookie name (from `collab.service.spec.ts` line 44)
   - What's unclear: Whether the cookie name is configurable in `auth.config.ts` or always `better-auth.session`
   - Recommendation: The `auth.api.getSession()` call with a `Headers({ cookie: rawCookieHeader })` works regardless of the cookie name because Better Auth parses the cookie itself — no need to extract the token manually. Just pass the raw `Cookie:` header string.

2. **IoAdapter CORS and dynamic origins**
   - What we know: `@WebSocketGateway` decorator accepts static CORS config; `allowedOrigins` in `main.ts` is runtime-constructed
   - What's unclear: Whether `IoAdapter` can be subclassed to inject dynamic CORS from the NestJS DI context
   - Recommendation: Duplicate the two-line `allowedOrigins` construction (`['http://localhost:3000', ...(FRONTEND_URL ? [FRONTEND_URL] : [])]`) directly in the gateway decorator. Acceptable for Phase 3.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| Framework          | Jest 30 + ts-jest 29                                                    |
| Config file        | `apps/api/package.json` (`jest` key)                                    |
| Quick run command  | `cd apps/api && npx jest src/modules/collab/ --testPathPattern=gateway` |
| Full suite command | `cd apps/api && npx jest`                                               |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                             | Test Type   | Automated Command                                                         | File Exists? |
| ------- | -------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------- | ------------ |
| COLB-01 | Two clients same room: update sent by A is received by B             | integration | `cd apps/api && npx jest --testPathPattern=collab.gateway.integration -x` | Wave 0       |
| COLB-01 | Client in different room does NOT receive update                     | integration | same file                                                                 | Wave 0       |
| COLB-01 | New joiner receives full Y.Doc state (room-joined event)             | integration | same file                                                                 | Wave 0       |
| COLB-01 | Connection rejected when no valid session cookie                     | integration | same file                                                                 | Wave 0       |
| COLB-01 | Gateway event handler unit tests (join-room, yjs-update, disconnect) | unit        | `cd apps/api && npx jest --testPathPattern=collab.gateway.spec -x`        | Wave 0       |

### Sampling Rate

- **Per task commit:** `cd apps/api && npx jest --testPathPattern=collab -x`
- **Per wave merge:** `cd apps/api && npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/modules/collab/collab.gateway.spec.ts` — unit tests for gateway handlers
- [ ] `apps/api/src/modules/collab/collab.room.service.spec.ts` — unit tests for room lifecycle service
- [ ] `apps/api/test/collab.gateway.integration.spec.ts` or `apps/api/src/modules/collab/collab.gateway.integration.spec.ts` — socket.io-client integration tests
- [ ] Add `socket.io-client` to devDependencies if not present

---

## Sources

### Primary (HIGH confidence)

- npm registry — verified package versions 2026-03-20
- [Yjs document-updates docs](https://docs.yjs.dev/api/document-updates) — `encodeStateAsUpdate`, `applyUpdate`, `encodeStateVector`, `mergeUpdates` API signatures
- [Socket.io Middlewares docs](https://socket.io/docs/v4/middlewares/) — namespace middleware pattern, rejecting connections with `next(new Error(...))`

### Secondary (MEDIUM confidence)

- [The Best Way to Authenticate WebSockets in NestJS](https://preetmishra.com/blog/the-best-way-to-authenticate-websockets-in-nestjs) — socket.io middleware > WsGuard recommendation; verified against socket.io docs
- [Demystifying NestJS WebSocket Gateways Testing](https://dev.to/jfrancai/demystifying-nestjs-websocket-gateways-a-step-by-step-guide-to-effective-testing-1a1f) — integration test pattern with `socket.io-client`; consistent with existing `test/app.e2e-spec.ts` pattern
- [Socket.io Rooms docs](https://socket.io/docs/v3/rooms/) — `socket.to(room).emit()` excludes sender (confirmed)
- [Socket.io Cookie handling](https://socket.io/how-to/deal-with-cookies) — `socket.handshake.headers.cookie` access pattern

### Tertiary (LOW confidence)

- Yjs community forum and GitHub discussions re: server relay patterns — consistent but anecdotal

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all versions confirmed against npm registry 2026-03-20
- Architecture: HIGH — NestJS gateway patterns from official docs; auth middleware pattern from verified blog + socket.io docs
- Yjs API: HIGH — verified from official docs.yjs.dev
- Pitfalls: MEDIUM — some from verified sources, some from code inspection and known socket.io binary quirks

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (30 days — all libraries stable; better-auth could change session cookie semantics on major bump)
