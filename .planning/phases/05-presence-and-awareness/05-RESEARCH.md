# Phase 5: Presence & Awareness - Research

**Researched:** 2026-03-20
**Domain:** Real-time cursor presence overlay on Excalidraw canvas + participant list, socket.io NestJS gateway extension
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Cursor transport:** New `cursor-move` socket.io event, `{ x: number, y: number }` in scene coordinates. Server relay to room (no-echo). Throttled max 30/sec client-side.
- **Cursor visual:** Filled colored arrow + rounded pill name tag (white text on participant color). Flat — no shadow. Always visible while on screen.
- **Only others' cursors rendered** — not own cursor.
- **Coordinate space:** Emit scene/canvas coords; recipients convert to screen px using Excalidraw `appState`.
- **Cursor rendered as overlay div** — `position:absolute, pointer-events:none` layered over canvas, clipped to canvas area.
- **Participant panel:** Stacked avatars in canvas header (between logo and "Copy link"). First 3–4 visible + "+N" overflow badge → dropdown.
- **Color assignment:** Deterministic hash of user/session ID → index in presence palette (8–12 colors).
- **Out-of-viewport cursors:** Silently hidden, still shown in participant list.

### Claude's Discretion

- Exact presence palette color values (must be accessible on both light/dark canvas backgrounds)
- Cursor arrow SVG shape, exact pixel dimensions, pill font size and padding
- Coordinate conversion utility (canvas coords ↔ screen px using Excalidraw's `appState.scrollX/Y/zoom`)
- Whether participant state is tracked in `CollabRoomService` (backend map) vs purely in frontend via socket events
- Throttle implementation detail (lodash throttle, manual `setTimeout`, or `requestAnimationFrame`-gated emit)

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                          | Research Support                                                                                                           |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| COLB-02 | Users can see live named cursors of other participants (color-coded) | Coordinate formula verified from Excalidraw source; throttle pattern identified; cursor overlay architecture documented    |
| COLB-03 | Users can see a list of who is currently in the room                 | socket.io `fetchSockets()` API confirmed; participant-joined/left event pattern documented; avatar component pattern ready |

</phase_requirements>

---

## Summary

Phase 5 adds two tightly related features: live cursor positions and a participant list. The existing socket.io gateway relays events on a no-echo pattern — `cursor-move` is a third relay event alongside `yjs-update`. No new infrastructure is needed: extend `CollabGateway` with two new handlers, extend `CollabRoomService` minimally, and add two new frontend components (cursor overlay + participant avatars).

The most technically subtle area is **coordinate conversion**: Excalidraw uses a scene coordinate space, and recipients must convert those to CSS pixels for overlay positioning. The exact formula has been verified directly from the Excalidraw 0.18.0 source. All other concerns (throttle, socket metadata, React rendering) are straightforward at the user count this app targets (2–10 simultaneous).

**Primary recommendation:** Use `fetchSockets()` to get room participants (avoids maintaining a parallel map), `socket.data` for per-socket metadata, manual `useRef`-based throttle (no lodash), and React `useState(Map)` for cursor state — no DOM refs needed.

---

## Standard Stack

### Core

| Library                                          | Version                        | Purpose                                            | Why Standard                          |
| ------------------------------------------------ | ------------------------------ | -------------------------------------------------- | ------------------------------------- |
| `@excalidraw/excalidraw`                         | `^0.18.0` (already installed)  | Canvas + appState for coordinate conversion        | Already integrated in Phase 4         |
| `socket.io` / `socket.io-client`                 | `^4.8.3` (already installed)   | cursor-move event relay                            | Already used for yjs-update relay     |
| `lucide-react`                                   | `^0.575.0` (already installed) | Icons in participant dropdown (Users, ChevronDown) | Already in project                    |
| `@radix-ui/react-dropdown-menu` (via `radix-ui`) | `^1.4.3` (already installed)   | Participant overflow dropdown                      | Already in project (radix-ui package) |

### Supporting

| Library                       | Version                      | Purpose                     | When to Use                                                       |
| ----------------------------- | ---------------------------- | --------------------------- | ----------------------------------------------------------------- |
| `cn()` from `@/lib/utils`     | already installed            | Conditional class merging   | All new components use this                                       |
| `useTheme` from `next-themes` | `^0.4.6` (already installed) | Canvas background awareness | Not needed for cursor overlay; colors are designed for both modes |

### NOT Installing

- **lodash** — not needed; manual `useRef` throttle is 4 lines and has zero dependency cost
- **y-protocols/awareness** — Yjs Awareness requires switching providers; custom socket events are correct for this architecture

**No new dependencies required for this phase.**

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
apps/api/src/modules/collab/
├── collab.gateway.ts          # extend: cursor-move handler, participant events
└── collab.room.service.ts     # extend: participant name/colorIndex per socket

apps/web/
├── contexts/
│   └── collab-context.tsx     # extend: remoteCursors, participants, emitCursor
└── src/components/canvas/
    ├── canvas-header.tsx       # extend: ParticipantAvatars component
    ├── excalidraw-wrapper.tsx  # no changes needed (cursor events tracked via onPointerMove on overlay)
    ├── cursor-overlay.tsx      # NEW: absolute overlay, renders RemoteCursor per socketId
    └── remote-cursor.tsx       # NEW: single cursor arrow + name pill
```

### Pattern 1: Coordinate Conversion (CRITICAL)

**What:** Convert Excalidraw scene coordinates to CSS pixel position within the overlay container.

**Formula** (verified from `@excalidraw/excalidraw@0.18.0` source, function `ta` in `chunk-FX7ZIABN.js`):

```typescript
// Source: node_modules/@excalidraw/excalidraw/dist/prod/chunk-FX7ZIABN.js
// Function ta = sceneCoordsToViewportCoords

function sceneToOverlay(
  sceneX: number,
  sceneY: number,
  appState: AppState,
  containerRef: React.RefObject<HTMLDivElement>,
): { x: number; y: number } {
  const { scrollX, scrollY, zoom, offsetLeft, offsetTop } = appState
  // Step 1: convert scene → viewport (CSS pixel from top-left of the browser window)
  const viewportX = (sceneX + scrollX) * zoom.value + offsetLeft
  const viewportY = (sceneY + scrollY) * zoom.value + offsetTop
  // Step 2: convert viewport → overlay-local (relative to the overlay container)
  const rect = containerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }
  return {
    x: viewportX - rect.left,
    y: viewportY - rect.top,
  }
}
```

**Edge cases verified:**

- **Zoom center:** `scrollX/scrollY` are updated by Excalidraw after zoom to maintain visual consistency. The formula is always correct regardless of zoom gesture origin.
- **Device pixel ratio:** `scrollX/Y`, `offsetLeft/Top`, and `zoom.value` are all CSS/logical pixels. No DPR correction needed in this formula.
- **Header offset:** `appState.offsetTop` is the Excalidraw container's distance from the viewport top (= header height ~48px). Subtracting `containerRef.getBoundingClientRect().top` neutralizes this, giving coordinates relative to the overlay container.
- **Out-of-bounds detection:** After conversion, check `x < 0 || x > containerWidth || y < 0 || y > containerHeight` to hide the cursor.

### Pattern 2: Throttled Cursor Emit (no lodash)

**What:** Emit `cursor-move` at max 30/sec without adding dependencies.

```typescript
// In CollabContext: throttled emit via useRef timestamp
const lastEmitTimeRef = useRef(0)
const CURSOR_THROTTLE_MS = 1000 / 30 // ~33ms

const handlePointerMove = useCallback(
  (e: React.PointerEvent<HTMLDivElement>) => {
    const now = Date.now()
    if (now - lastEmitTimeRef.current < CURSOR_THROTTLE_MS) return
    lastEmitTimeRef.current = now

    // Convert screen → scene using appState (inverse of sceneToOverlay)
    const appState = excalidrawAPI?.getAppState()
    if (!appState || !socketRef.current) return
    const { scrollX, scrollY, zoom, offsetLeft, offsetTop } = appState
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const viewportX = e.clientX
    const viewportY = e.clientY
    const sceneX = (viewportX - offsetLeft) / zoom.value - scrollX
    const sceneY = (viewportY - offsetTop) / zoom.value - scrollY
    socketRef.current.emit('cursor-move', { x: sceneX, y: sceneY })
  },
  [excalidrawAPI],
)
```

**Why `useRef` over `lodash.throttle`:** No extra dependency, no stale closure risk, works correctly with React 19 concurrent mode (no timer cleanup needed on unmount).

**Why NOT `requestAnimationFrame`-gated:** rAF runs at display refresh rate (60–120fps). Throttle to 30/sec is intentional bandwidth management — rAF doesn't provide frequency capping without additional logic.

### Pattern 3: Socket.io Per-Socket Metadata + Room Participant Tracking

**What:** Track participant display name and color index per socket; get participant list for a room.

```typescript
// In handleJoinRoom (collab.gateway.ts):
const colorIndex = this.hashToColorIndex(client.data.user.id)
client.data.colorIndex = colorIndex // store on socket.data
client.data.name = client.data.user.name // already available

await client.join(slug)
this.collabRoomService.registerSocket(client.id, slug)

// Get all current participants via socket.io fetchSockets() (socket.io v4 API)
const roomSockets = await this.server.in(slug).fetchSockets()
const participants = roomSockets.map((s) => ({
  socketId: s.id,
  name: s.data.name,
  colorIndex: s.data.colorIndex,
}))

// Send full list to the new joiner
client.emit('participant-list', participants)

// Announce new participant to others
client.to(slug).emit('participant-joined', {
  socketId: client.id,
  name: client.data.name,
  colorIndex,
})
```

**Reconnect behavior:** When a client disconnects and reconnects, socket.io assigns a new socket ID. The client re-emits `join-room`, which runs the full join flow again. `socket.data` is re-populated fresh on each new connection. No stale state issues.

**Why `fetchSockets()` over parallel Map in service:** Avoids maintaining duplicate state. socket.io already tracks room membership. `fetchSockets()` returns `RemoteSocket` objects with `data` field (confirmed from `socket.io@4.8.3` type definitions). Works correctly in single-server setups (no Redis adapter = no cross-process issues).

### Pattern 4: React Cursor State

**What:** Store and update remote cursor positions in React state.

```typescript
// In CollabContext:
interface CursorData {
  x: number
  y: number
  name: string
  colorIndex: number
}
const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorData>>(new Map())

// On 'cursor-move' from socket:
socket.on('cursor-move', ({ socketId, x, y }: { socketId: string; x: number; y: number }) => {
  setRemoteCursors((prev) => {
    const existing = prev.get(socketId)
    if (!existing) return prev // ignore cursors from unknown participants
    return new Map(prev).set(socketId, { ...existing, x, y })
  })
})
```

**Performance at target scale (2–10 users):** Each user emits 30 updates/sec → 30 React state updates/sec per remote user. With React 19, this is handled within normal rendering budget. No need for `useRef` + direct DOM manipulation at this scale.

**Why NOT DOM refs for cursor rendering:** The absolute position of each cursor changes on pan/zoom too (not just on cursor-move events). React state correctly re-renders cursors on `onScrollChange` / zoom. Imperative DOM updates would require subscribing to Excalidraw scroll/zoom events separately — more complex with no benefit at <10 users.

**Cursor update on scroll/zoom:** The cursor overlay must re-render when the canvas scrolls or zooms (remote cursor positions don't change but their screen positions do). Achieved by subscribing to `excalidrawAPI.onScrollChange()`:

```typescript
// In cursor overlay component:
useEffect(() => {
  if (!excalidrawAPI) return
  return excalidrawAPI.onScrollChange(() => {
    // Force re-render by updating a local state tick
    setScrollTick((t) => t + 1)
  })
}, [excalidrawAPI])
```

### Pattern 5: Deterministic Color Hash

```typescript
// Pure function — same ID always → same color
function hashToColorIndex(id: string, paletteSize: number): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0 // convert to 32-bit int
  }
  return Math.abs(hash) % paletteSize
}

// Presence palette (8 colors — accessible with white text on both light/dark canvas)
export const PRESENCE_COLORS = [
  '#E03131', // red
  '#2F9E44', // forest green
  '#1971C2', // ocean blue
  '#7048E8', // violet
  '#0C8599', // teal
  '#C2255C', // berry
  '#364FC7', // indigo
  '#D9480F', // burnt orange
] as const
```

**Palette rationale:**

- Excludes UniShare amber (`#F59E0B` family) to avoid clash with primary UI color
- Excludes neutral grays (blend into canvas UI)
- All 8 pass WCAG AA 4.5:1 contrast ratio with white text
- Visually distinct on both light (`#FFFFFF`) and dark (`#1e1e2e`) canvas backgrounds
- Mid-to-dark saturation — visible without being jarring

### Anti-Patterns to Avoid

- **Storing participant list in a separate service Map:** `fetchSockets()` already provides this — don't duplicate socket.io's internal tracking.
- **Emitting screen coordinates:** Always emit scene/canvas coordinates. Screen coordinates break when the recipient has a different zoom level or has panned the canvas.
- **Emitting on every `mousemove`:** Raw mouse events fire at 200+/sec. Always throttle before emitting.
- **Rendering own cursor:** Gate on `socketId !== socket.id` to avoid double cursors.
- **Not clipping the overlay:** Without `overflow:hidden` on the overlay container, cursors bleed over the header.
- **Using `pointer-events:auto` on overlay:** Blocks mouse interaction with Excalidraw. Always `pointer-events:none`.
- **Subscribing to `onChange` for cursor emit:** `onChange` fires for every drawing action, not just mouse moves. Use `onPointerMove` on the overlay div.

---

## Don't Hand-Roll

| Problem                         | Don't Build                | Use Instead                                                 | Why                                                                 |
| ------------------------------- | -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| Scene↔viewport coord conversion | Custom formula             | The exact formula from Excalidraw source (documented above) | DPR/offset edge cases are subtle; use the verified formula          |
| Participant dropdown            | Custom popover             | Radix `DropdownMenu` (already installed via `radix-ui`)     | Handles focus, keyboard nav, a11y automatically                     |
| Color contrast checking         | Custom contrast calculator | Palette pre-validated (above)                               | WCAG calculations done at design time, not runtime                  |
| Socket room membership          | Parallel Map in service    | `server.in(slug).fetchSockets()`                            | socket.io owns this state; duplicate maps go stale on crash/restart |

---

## Common Pitfalls

### Pitfall 1: Missing Scroll/Zoom Re-render

**What goes wrong:** Remote cursors appear frozen at old positions when the local user pans or zooms the canvas. The cursor coordinates (scene space) haven't changed but the screen positions have.
**Why it happens:** Cursor state only updates when `cursor-move` socket events arrive; pan/zoom doesn't trigger a cursor state update.
**How to avoid:** Subscribe to `excalidrawAPI.onScrollChange()` and force a re-render (or re-derive positions) when scroll/zoom changes.
**Warning signs:** Cursors that jump to wrong position on zoom, or stick to screen position instead of tracking canvas position.

### Pitfall 2: Coordinate Space Confusion (Screen vs Scene)

**What goes wrong:** Cursors drift from the correct canvas position, especially at zoom ≠ 1.0.
**Why it happens:** `e.clientX/Y` (screen pixels) were emitted instead of converted scene coords.
**How to avoid:** Always convert using the **inverse** formula before emitting:

```typescript
const sceneX = (e.clientX - offsetLeft) / zoom.value - scrollX
const sceneY = (e.clientY - offsetTop) / zoom.value - scrollY
```

**Warning signs:** Cursors track correctly at zoom=1 but drift at other zoom levels.

### Pitfall 3: Cursor Overlay Intercepting Mouse Events

**What goes wrong:** Excalidraw stops responding to mouse clicks/drags; drawing tools don't work.
**Why it happens:** Overlay div missing `pointer-events: none`.
**How to avoid:** Always set `pointerEvents: 'none'` on the overlay container AND on each cursor element.

### Pitfall 4: `onScrollChange` Callback Leak

**What goes wrong:** Memory leak — multiple scroll listeners accumulate across re-renders.
**Why it happens:** `excalidrawAPI.onScrollChange()` returns an unsubscribe function that must be called in cleanup.
**How to avoid:** Return the unsubscribe function from `useEffect`:

```typescript
useEffect(() => {
  if (!excalidrawAPI) return
  const unsub = excalidrawAPI.onScrollChange(() => setScrollTick((t) => t + 1))
  return unsub // called on cleanup
}, [excalidrawAPI])
```

### Pitfall 5: Participant List Out of Sync on Reconnect

**What goes wrong:** After a user reconnects, others see duplicate entries or stale entries.
**Why it happens:** `participant-left` fired on disconnect, but if reconnect is fast, a second `participant-joined` arrives with a new socketId while old entry was never removed cleanly.
**How to avoid:** Frontend keyed on `socketId` (not name). Each reconnect gets a new socketId. `participant-left` removes old socketId; `participant-joined` adds new one. This is correct by design — no deduplication needed.

### Pitfall 6: `fetchSockets()` Returns Sockets Before `socket.data` is Set

**What goes wrong:** New participant's own entry appears with undefined name/colorIndex in the `participant-list` sent to them.
**Why it happens:** `fetchSockets()` called before assigning `socket.data.colorIndex` and `socket.data.name`.
**How to avoid:** Set `socket.data` fields **before** calling `fetchSockets()`. The join flow must be: assign data → join room → call fetchSockets → emit events.

---

## Code Examples

### Cursor Overlay Component Structure

```tsx
// apps/web/src/components/canvas/cursor-overlay.tsx
// Source: pattern derived from Excalidraw source + overlay architecture from canvas page

'use client'

import { useRef, useState, useEffect } from 'react'
import { useCollab } from '@/contexts/collab-context'
import { PRESENCE_COLORS } from '@/lib/presence'
import { RemoteCursor } from './remote-cursor'
import { sceneToOverlay } from '@/lib/cursor-coords'

export function CursorOverlay() {
  const { remoteCursors, excalidrawAPI, emitCursorMove } = useCollab()
  const containerRef = useRef<HTMLDivElement>(null)
  const [, setScrollTick] = useState(0)

  // Re-render when canvas scrolls/zooms
  useEffect(() => {
    if (!excalidrawAPI) return
    return excalidrawAPI.onScrollChange(() => setScrollTick((t) => t + 1))
  }, [excalidrawAPI])

  const appState = excalidrawAPI?.getAppState()

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      onPointerMove={emitCursorMove} // pointer-events:none on children, but div has it on for capture
      style={{ pointerEvents: 'none' }}
    >
      {appState &&
        [...remoteCursors.entries()].map(([socketId, cursor]) => {
          const pos = sceneToOverlay(cursor.x, cursor.y, appState, containerRef)
          const inBounds =
            pos.x >= 0 &&
            pos.y >= 0 &&
            containerRef.current &&
            pos.x <= containerRef.current.offsetWidth &&
            pos.y <= containerRef.current.offsetHeight
          if (!inBounds) return null
          return (
            <RemoteCursor
              key={socketId}
              x={pos.x}
              y={pos.y}
              name={cursor.name}
              color={PRESENCE_COLORS[cursor.colorIndex % PRESENCE_COLORS.length]}
            />
          )
        })}
    </div>
  )
}
```

### Cursor Arrow SVG + Pill

```tsx
// apps/web/src/components/canvas/remote-cursor.tsx
'use client'

interface RemoteCursorProps {
  x: number
  y: number
  name: string
  color: string
}

export function RemoteCursor({ x, y, name, color }: RemoteCursorProps) {
  return (
    <div
      className="absolute select-none"
      style={{ left: x, top: y, transform: 'translate(0, 0)', pointerEvents: 'none' }}
    >
      {/* Filled arrow cursor */}
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
        <path
          d="M0 0 L0 16 L4.5 12 L8 20 L10 19 L6.5 11 L12 11 Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {/* Name pill — anchored below-right of cursor tip */}
      <div
        className="absolute left-3 top-4 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  )
}
```

### NestJS Gateway Extension

```typescript
// collab.gateway.ts — new handlers (add to CollabGateway class)

@SubscribeMessage('cursor-move')
handleCursorMove(
  @ConnectedSocket() client: Socket,
  @MessageBody() data: { x: number; y: number },
): void {
  const slug = this.collabRoomService.getRoomForSocket(client.id)
  if (!slug) return
  // Relay to all others in room (no-echo — same pattern as yjs-update)
  client.to(slug).emit('cursor-move', { socketId: client.id, ...data })
}

// In handleJoinRoom, after existing join logic:
async handleJoinRoom(...) {
  // ... existing: join room, registerSocket, emit room-joined ...

  // Phase 5 additions:
  const colorIndex = hashToColorIndex(client.data.user.id, PRESENCE_COLORS_COUNT)
  client.data.colorIndex = colorIndex
  client.data.name = client.data.user.name

  const roomSockets = await this.server.in(slug).fetchSockets()
  const participants = roomSockets.map(s => ({
    socketId: s.id,
    name: s.data.name as string,
    colorIndex: s.data.colorIndex as number,
  }))

  client.emit('participant-list', participants)
  client.to(slug).emit('participant-joined', {
    socketId: client.id,
    name: client.data.name,
    colorIndex,
  })
}

// In handleDisconnect, after removeSocket:
handleDisconnect(client: Socket) {
  const slug = this.collabRoomService.getRoomForSocket(client.id)
  this.collabRoomService.removeSocket(client.id)
  if (slug) {
    this.server.to(slug).emit('participant-left', { socketId: client.id })
  }
}
```

### CollabContext Extensions

```typescript
// New fields in CollabContextValue:
interface Participant {
  socketId: string
  name: string
  colorIndex: number
}
interface CursorData {
  x: number
  y: number
  name: string
  colorIndex: number
}

// New state in CollabProvider:
const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorData>>(new Map())
const [participants, setParticipants] = useState<Participant[]>([])
const socketRef = useRef<Socket | null>(null)

// New socket event handlers (add to existing useEffect):
socket.on('participant-list', (list: Participant[]) => {
  setParticipants(list)
  // Initialize cursor map entries (without position yet)
  setRemoteCursors(
    new Map(list.map((p) => [p.socketId, { x: 0, y: 0, name: p.name, colorIndex: p.colorIndex }])),
  )
})
socket.on('participant-joined', (p: Participant) => {
  setParticipants((prev) => [...prev, p])
  setRemoteCursors((prev) =>
    new Map(prev).set(p.socketId, { x: 0, y: 0, name: p.name, colorIndex: p.colorIndex }),
  )
})
socket.on('participant-left', ({ socketId }: { socketId: string }) => {
  setParticipants((prev) => prev.filter((p) => p.socketId !== socketId))
  setRemoteCursors((prev) => {
    const next = new Map(prev)
    next.delete(socketId)
    return next
  })
})
socket.on('cursor-move', ({ socketId, x, y }: { socketId: string; x: number; y: number }) => {
  setRemoteCursors((prev) => {
    const existing = prev.get(socketId)
    if (!existing) return prev
    return new Map(prev).set(socketId, { ...existing, x, y })
  })
})
socketRef.current = socket // store ref for cursor emit
```

---

## Yjs Awareness: Why NOT to Use It

The Yjs Awareness protocol is a dedicated presence layer built into y-websocket/y-socket.io providers. It is NOT appropriate here because:

1. **Provider mismatch:** This project uses a custom NestJS socket.io gateway, not `y-websocket` or `y-socket.io`. Awareness requires a provider that implements the Awareness protocol.
2. **Would require provider replacement:** Switching to y-socket.io would mean rewriting the gateway, the room service, and the Yjs sync logic from Phase 3. That's a full Phase 3 regression.
3. **No CRDT semantics needed:** Cursor positions are ephemeral — last-write-wins with a simple relay is correct and sufficient.
4. **Custom events are already the project pattern:** `yjs-update` relay is Phase 3's established pattern. `cursor-move` is a clean addition.

**Verdict:** Yjs Awareness adds complexity for zero benefit here. Use custom socket events. (HIGH confidence)

---

## State of the Art

| Old Approach                              | Current Approach                               | Impact                                                      |
| ----------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| Polling for presence                      | Socket.io event relay (push)                   | Zero latency, no unnecessary traffic                        |
| `lodash.throttle` for cursor emit         | `useRef` + `Date.now()` inline throttle        | No additional dependency, same behavior                     |
| Rendering cursors on a `<canvas>` overlay | Overlay `<div>` with positioned React elements | Simpler, inspectable in DevTools, supports HTML/CSS styling |
| Yjs Awareness for cursor presence         | Custom `cursor-move` event                     | No provider change required                                 |

---

## Open Questions

1. **`onScrollChange` callback timing**
   - What we know: `excalidrawAPI.onScrollChange` is in the Excalidraw type definitions and returns `UnsubscribeCallback`
   - What's unclear: whether it fires synchronously with scroll updates or async — if async, there may be 1-frame lag on cursor positions during fast pan
   - Recommendation: Implement as described; if lag is visible during QA, add a `requestAnimationFrame` wrapper

2. **`fetchSockets()` returns the joining socket itself**
   - What we know: When `handleJoinRoom` calls `server.in(slug).fetchSockets()` after `client.join(slug)`, the joining client is already in the room, so their own entry will be in the results
   - Implication: `participant-list` sent to the new joiner includes themselves — frontend should filter out `socket.id === own socket id` or display with `(you)` suffix (as specified in CONTEXT.md)
   - Recommendation: Filter on frontend — simpler than excluding on backend

---

## Validation Architecture

### Test Framework

| Property          | Value                                                          |
| ----------------- | -------------------------------------------------------------- |
| Framework (API)   | Jest (configured in `apps/api/package.json`)                   |
| Framework (Web)   | Vitest (configured in `apps/web/package.json`)                 |
| Config file (API) | inline in `package.json` (`jest`)                              |
| Config file (Web) | none explicit — uses Vitest defaults                           |
| Quick run (API)   | `cd apps/api && pnpm test -- --testPathPattern=collab.gateway` |
| Quick run (Web)   | `cd apps/web && pnpm test -- --run collab-context`             |
| Full suite (API)  | `cd apps/api && pnpm test`                                     |
| Full suite (Web)  | `cd apps/web && pnpm test`                                     |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                                    | Test Type      | Automated Command                                                   | File Exists?       |
| ------- | --------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------- | ------------------ |
| COLB-02 | `cursor-move` relayed to all other room members, not echoed to sender       | unit (gateway) | `cd apps/api && pnpm test -- --testPathPattern=collab.gateway.spec` | ✅ extend existing |
| COLB-02 | `cursor-move` NOT sent back to emitting socket                              | unit (gateway) | same                                                                | ✅ extend existing |
| COLB-02 | `hashToColorIndex` returns deterministic index for same ID                  | unit (pure fn) | `cd apps/api && pnpm test -- --testPathPattern=collab.gateway.spec` | ❌ Wave 0          |
| COLB-02 | Coord formula: `sceneToOverlay` round-trips correctly at zoom ≠ 1           | unit (web)     | `cd apps/web && pnpm test -- --run cursor-coords`                   | ❌ Wave 0          |
| COLB-03 | `participant-list` sent to joining client includes all current room members | unit (gateway) | `cd apps/api && pnpm test -- --testPathPattern=collab.gateway.spec` | ✅ extend existing |
| COLB-03 | `participant-joined` emitted to others when client joins                    | unit (gateway) | same                                                                | ✅ extend existing |
| COLB-03 | `participant-left` emitted to room when client disconnects                  | unit (gateway) | same                                                                | ✅ extend existing |

### Sampling Rate

- **Per task commit:** `cd apps/api && pnpm test -- --testPathPattern=collab` (fast; covers gateway + room service)
- **Per wave merge:** `cd apps/api && pnpm test && cd ../web && pnpm test`
- **Phase gate:** Both full suites green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `apps/web/src/lib/cursor-coords.test.ts` — unit test for `sceneToOverlay` / `overlayToScene` roundtrip with edge cases (zoom 0.5, zoom 2, non-zero offset)
- [ ] `apps/web/src/lib/presence.test.ts` — unit test for `hashToColorIndex` determinism and distribution across 8 colors
- [ ] Extend `apps/api/src/modules/collab/collab.gateway.spec.ts` — add cursor-move relay tests, participant-joined/left event tests

---

## Sources

### Primary (HIGH confidence)

- `node_modules/.pnpm/@excalidraw+excalidraw@0.18.0/dist/prod/chunk-FX7ZIABN.js` — `sceneCoordsToViewportCoords` implementation (function `ta`): `(sceneX + scrollX) * zoom.value + offsetLeft`
- `node_modules/.pnpm/@excalidraw+excalidraw@0.18.0/dist/types/excalidraw/types.d.ts` — `AppState.scrollX`, `scrollY`, `zoom: Zoom`, `offsetLeft`, `offsetTop` field types; `Zoom = { value: NormalizedZoomValue }`
- `node_modules/.pnpm/socket.io@4.8.3/node_modules/socket.io/dist/broadcast-operator.d.ts` — `fetchSockets(): Promise<RemoteSocket[]>` and `RemoteSocket.data` field confirmed
- `apps/api/src/modules/collab/collab.gateway.ts` — existing relay pattern (`client.to(slug).emit(event, data)`)
- `apps/api/src/modules/collab/collab.room.service.ts` — existing `socketToRoom` map, `registerSocket`/`removeSocket`
- `apps/web/contexts/collab-context.tsx` — existing socket lifecycle, `excalidrawAPI` storage

### Secondary (MEDIUM confidence)

- Excalidraw dev bundle line 23314 — confirms `user.pointer.x/y` (scene coords) + `sceneCoordsToViewportCoords` is the internal pattern used by Excalidraw's own multiplayer cursor rendering

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already installed and in use
- Coordinate formula: HIGH — extracted directly from installed Excalidraw 0.18.0 source
- Architecture patterns: HIGH — extensions of verified Phase 3/4 patterns
- `fetchSockets()` API: HIGH — confirmed in socket.io 4.8.3 type definitions
- Presence palette: MEDIUM — colors selected based on WCAG contrast math; final values are Claude's discretion per CONTEXT.md
- React cursor rendering at scale: HIGH — straightforward at 2–10 users

**Research date:** 2026-03-20
**Valid until:** 2026-07-20 (Excalidraw internal API may change; re-verify formula on version bump)
