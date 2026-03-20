# Phase 4: Canvas UI & Drawing Tools - Research

**Researched:** 2026-03-20
**Domain:** Excalidraw + Yjs + socket.io-client in Next.js App Router
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Route & layout**

- Canvas lives in its own route group outside `(app)` — no AppShell nav. Route: `apps/web/app/canvas/[slug]/page.tsx`
- Route is publicly accessible — anyone with the link can join (no auth gate). The `proxy.ts` middleware must NOT block `/canvas/*` paths.
- Join-first flow: On page load, call `POST /api/rooms/:slug/join` to ensure an anonymous session cookie exists, then open the socket.io connection. If join returns 404, show error page immediately — no socket attempt.
- Canvas has a minimal UniShare header above Excalidraw (thin bar) with: UniShare logo/back-to-feed link, and a "Copy room link" button. No other chrome — Excalidraw fills the rest of the viewport.

**Yjs provider wiring**

- A `CollabProvider` React context wraps the canvas route. It holds: the socket.io client instance, the `Y.Doc`, a `Y.Array` for canvas elements, and connection state (`connecting | connected | disconnected`).
- Element sync: Excalidraw elements stored as a `Y.Array` in the `Y.Doc`. Excalidraw's `onChange` handler diffs the new element array against the current `Y.Array` and applies updates — which Yjs serializes into a binary update and the socket relays via the `yjs-update` event.
- Scope: Only elements sync. `appState` (viewport pan/zoom, selected tool, scroll position) is NOT synced.
- Applying remote updates: When `yjs-update` arrives from socket, apply it to the local `Y.Doc` via `Y.applyUpdate()`. Read the updated `Y.Array`, reconcile with local elements (remote wins on conflict), and call Excalidraw's `updateScene({ elements })`. Do NOT call `updateScene` when the update originated locally (skip self-echo).

**Connection state UX**

- Loading state: Full-screen loading overlay until socket connects AND `room-joined` is received. Excalidraw does not mount until ready.
- Disconnection: Show sonner toast ("Connection lost — reconnecting..."). Canvas stays interactive for local-only edits. On reconnect, Yjs state syncs automatically; toast updates to "Reconnected" (auto-dismisses after 2s).
- Invalid room slug: If `POST /api/rooms/:slug/join` returns 404, render error page: "Room not found" + "Back to UniShare" link. No socket connection attempted.

**Excalidraw configuration**

- Theme: Map to the active UniShare theme. Override `--color-primary` with `var(--primary)` from the active theme. Derive `theme='light'|'dark'` prop by checking if the active theme has a dark background. Use `next-themes`'s `useTheme()` hook.
- Hide built-in collab UI: Set `UIOptions` / `renderTopRightUI` to hide Excalidraw's native collaboration button/menu.
- Grid: Do not override — leave as Excalidraw's default.

### Claude's Discretion

- Exact `UIOptions` fields to set
- Excalidraw `initialData` structure
- Whether to render `<Excalidraw>` or `<ExcalidrawWithScene>`
- Exact CSS overrides for theme variables beyond `--color-primary`

### Deferred Ideas (OUT OF SCOPE)

- Presence cursors and participant list — Phase 5
- Database persistence (board state survives server restart) — Phase 6
- Export as PNG/PDF — Phase 6
- `ui-phase` design contract — not needed; Excalidraw provides its own UI
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                             | Research Support                                                                                                                                                                                    |
| ------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CANV-01 | User can pan and zoom an infinite canvas                                | Excalidraw built-in — no custom code needed. All pan/zoom built into the component.                                                                                                                 |
| CANV-02 | User can draw freehand strokes on the canvas                            | Excalidraw built-in — freedraw tool is part of default toolbar.                                                                                                                                     |
| CANV-03 | User can add and edit geometric shapes (rectangle, circle, arrow, line) | Excalidraw built-in — all standard shapes in default toolbar.                                                                                                                                       |
| CANV-04 | User can add and edit text boxes on the canvas                          | Excalidraw built-in — text tool is part of default toolbar.                                                                                                                                         |
| CANV-05 | User can add color-coded sticky notes to the canvas                     | Excalidraw built-in — sticky notes are supported as a canvas element type.                                                                                                                          |
| CANV-06 | User can select, move, resize, and delete canvas objects                | Excalidraw built-in — selection tool covers all these interactions.                                                                                                                                 |
| CANV-07 | User can undo and redo canvas actions                                   | Excalidraw built-in locally. For remote-aware undo, v0.18 ships multiplayer undo/redo. Apply remote updates with `CaptureUpdateAction.NEVER` so remote changes do not pollute the local undo stack. |

</phase_requirements>

---

## Summary

Phase 4 embeds Excalidraw (v0.18.0, released 2025-03-11) into a Next.js App Router route, wires it to the socket.io/Yjs relay from Phase 3, and exposes all drawing tools. All seven CANV requirements (pan/zoom, freehand, shapes, text, sticky notes, select/move/resize/delete, undo/redo) are satisfied by Excalidraw's built-in toolbar — no custom drawing code is required. The implementation effort is concentrated on: (1) the Next.js route setup with `dynamic()` and `ssr: false`, (2) the `CollabProvider` context managing Y.Doc + socket.io-client, and (3) the two-way sync loop between Excalidraw's `onChange` and the Yjs `update` event.

The critical v0.18 breaking change is that `updateScene`'s `commitToHistory` boolean was replaced by `captureUpdate: CaptureUpdateAction`. Remote updates applied from the Yjs relay MUST use `CaptureUpdateAction.NEVER` to keep the local undo stack clean. The CSS import path has also changed in v0.18 — import `@excalidraw/excalidraw/index.css` in the wrapper component, not globally.

**Primary recommendation:** Install `@excalidraw/excalidraw@^0.18.0`, `yjs@^13.6.30`, and `socket.io-client@^4.8.3`. Build the `CollabProvider` first (context + socket + Y.Doc), then mount Excalidraw once connected, and wire the two-way sync last.

---

## Standard Stack

### Core

| Library                  | Version          | Purpose                                                  | Why Standard                                                           |
| ------------------------ | ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `@excalidraw/excalidraw` | 0.18.0 (latest)  | Whiteboard UI — all drawing tools, canvas, undo/redo     | The canonical Excalidraw React package; no wrapper alternatives needed |
| `yjs`                    | 13.6.30 (latest) | CRDT document — Y.Doc, Y.Array, update encoding/applying | Already used server-side in Phase 3; same library client-side          |
| `socket.io-client`       | 4.8.3 (latest)   | Connect to the `/collab` namespace from Phase 3          | Matches the server's socket.io version                                 |

**Version verification (run 2026-03-20):**

- `@excalidraw/excalidraw`: 0.18.0 (released 2025-03-11)
- `yjs`: 13.6.30
- `socket.io-client`: 4.8.3

### Supporting

| Library                           | Version | Purpose                                                            | When to Use                        |
| --------------------------------- | ------- | ------------------------------------------------------------------ | ---------------------------------- |
| `next-themes` (already installed) | 0.4.6   | `useTheme()` to derive `theme` prop and `--color-primary` override | Already in `apps/web/package.json` |
| `sonner` (already installed)      | 2.0.7   | Disconnect / reconnect toasts                                      | Already in root layout             |

### Alternatives Considered

| Instead of             | Could Use                   | Tradeoff                                                                                                            |
| ---------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Y.Array` for elements | `Y.Map` keyed by element ID | Y.Map gives O(1) updates per element; Y.Array is simpler and sufficient since we sync full element list via updates |
| socket.io-client       | native WebSocket            | socket.io-client matches Phase 3 server exactly; native WS cannot talk to socket.io server                          |

**Installation:**

```bash
pnpm --filter web add @excalidraw/excalidraw yjs socket.io-client
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/web/app/canvas/
├── [slug]/
│   ├── layout.tsx          # Mounts CollabProvider, wraps page
│   └── page.tsx            # Canvas page: join-first flow, loading overlay, error page, canvas mount
apps/web/src/
├── contexts/
│   └── collab-context.tsx  # CollabProvider: Y.Doc, Y.Array, socket, connectionStatus
└── components/canvas/
    ├── excalidraw-wrapper.tsx  # 'use client' wrapper imported with dynamic(); imports @excalidraw/excalidraw/index.css
    └── canvas-header.tsx       # Thin header: logo/back link, copy room link button
```

### Pattern 1: SSR-Safe Excalidraw Import

Excalidraw uses browser-only APIs (canvas, ResizeObserver) and crashes on the server. Use `next/dynamic` with `ssr: false`. The wrapper component must also import the Excalidraw CSS.

```typescript
// src/components/canvas/excalidraw-wrapper.tsx
'use client'
import { Excalidraw, CaptureUpdateAction } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
// ... rest of component

// app/canvas/[slug]/page.tsx
import dynamic from 'next/dynamic'
const ExcalidrawWrapper = dynamic(() => import('@/components/canvas/excalidraw-wrapper'), {
  ssr: false,
})
```

**Why wrapper pattern:** If you use `dynamic(() => import('@excalidraw/excalidraw').then(m => m.Excalidraw))` directly, you cannot import the CSS or other named exports (like `CaptureUpdateAction`) in the same dynamic call. The wrapper centralizes all Excalidraw imports.

### Pattern 2: CollabProvider Context

```typescript
// src/contexts/collab-context.tsx
'use client'
import * as Y from 'yjs'
import { io, Socket } from 'socket.io-client'
import { createContext, useContext, useEffect, useRef, useState } from 'react'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface CollabContextValue {
  ydoc: Y.Doc
  yElements: Y.Array<unknown>
  socket: Socket | null
  connectionStatus: ConnectionStatus
}

// Instantiate Y.Doc once (stable ref)
// Connect socket with withCredentials: true to pass the session cookie
// Emit 'join-room' after connect, wait for 'room-joined', apply state, set status → 'connected'
// On 'yjs-update': Y.applyUpdate(ydoc, data, 'remote') — origin tag prevents self-relay
// On ydoc 'update' with origin !== 'remote': socket.emit('yjs-update', update)
```

### Pattern 3: Two-Way Sync Loop

The sync loop has two directions:

**Local → Remote (onChange):**

1. Excalidraw's `onChange(elements, appState)` fires on every canvas change
2. Read current `yElements.toArray()` and diff against new `elements`
3. If changed: wrap elements in a `ydoc.transact(() => { yElements.delete(0, yElements.length); yElements.insert(0, elements) })` with a local origin tag
4. The `ydoc.on('update', ...)` handler picks this up and emits it over the socket (origin is NOT 'remote', so it is relayed)

**Remote → Local (yjs-update socket event):**

1. `socket.on('yjs-update', (data) => { Y.applyUpdate(ydoc, new Uint8Array(data), 'remote') })`
2. `ydoc.on('update', (update, origin) => { if (origin === 'remote') return; /* relay */ })`
3. Observer on `yElements` reads updated elements and calls `excalidrawAPI.updateScene({ elements: yElements.toArray(), captureUpdate: CaptureUpdateAction.NEVER })`

**Critical:** `CaptureUpdateAction.NEVER` on remote updates prevents remote changes from entering the local undo/redo stack.

### Pattern 4: Join-First Flow

```typescript
// In canvas page.tsx (or layout.tsx)
// 1. Call POST /api/rooms/:slug/join
// 2. If 404 → render error UI, stop
// 3. If success → render CollabProvider (which opens socket)
// 4. CollabProvider emits 'join-room', waits for 'room-joined' event
// 5. 'room-joined' payload: { slug, state: Buffer } — apply with Y.applyUpdate(ydoc, new Uint8Array(state))
// 6. Set connectionStatus → 'connected', unmount loading overlay, mount Excalidraw
```

### Pattern 5: Theme Mapping

The `useTheme()` hook from `next-themes` returns the active theme class name (e.g. `'theme-catppuccin-mocha'`). Derive the Excalidraw `theme` prop by checking if the theme name contains a known dark theme:

```typescript
const DARK_THEMES = [
  'theme-catppuccin-mocha',
  'theme-nord',
  'theme-tokyo-night',
  'theme-dracula',
  'theme-gruvbox-dark',
  'theme-midnight-library',
  'theme-ocean-depth',
]

const excalidrawTheme = DARK_THEMES.includes(theme ?? '') ? 'dark' : 'light'
```

CSS override for `--color-primary` in the wrapper component's container:

```css
/* In the canvas page wrapper element — inline style or scoped CSS */
.canvas-container .excalidraw {
  --color-primary: var(--primary);
  --color-primary-darker: var(--primary); /* fallback; Excalidraw computes contrast */
}
```

Or via inline style on the container div:

```tsx
<div style={{ '--color-primary': 'var(--primary)' } as React.CSSProperties}>
  <Excalidraw ... />
</div>
```

### Pattern 6: Hiding Built-in Collab Button

The Excalidraw native collaboration button is NOT in `UIOptions`. It is controlled via the `renderTopRightUI` prop. To hide it, simply do not render `<LiveCollaborationTrigger />`:

```typescript
<Excalidraw
  renderTopRightUI={() => null}   // hides the collab trigger entirely
  UIOptions={{
    canvasActions: {
      toggleTheme: false,   // we control theme; user cannot toggle it in-canvas
    },
  }}
  ...
/>
```

### Anti-Patterns to Avoid

- **Importing Excalidraw at module level (without dynamic):** Crashes SSR — Next.js attempts to render on server, hits canvas APIs, throws. Always `dynamic(() => ..., { ssr: false })`.
- **Importing the CSS globally in `globals.css` or `layout.tsx`:** Excalidraw's CSS must be imported inside the `'use client'` wrapper where it's used. Global import works but can conflict with Tailwind resets on non-canvas routes.
- **Using `commitToHistory: boolean` in updateScene:** This was removed in v0.18.0. Use `captureUpdate: CaptureUpdateAction.NEVER` for remote updates.
- **Calling `updateScene` from both the onChange handler and the remote update path without guards:** Creates infinite sync loops. The origin tag on `Y.applyUpdate` and checking origin in `ydoc.on('update')` is the only reliable guard.
- **Mounting Excalidraw before socket is connected and `room-joined` received:** Results in a flash of empty canvas that then gets overwritten. The loading overlay prevents this.
- **Setting `withCredentials: false` on socket.io-client:** The Phase 3 gateway auth middleware reads the `better-auth.session` cookie. Without `withCredentials: true`, the cookie is not sent and the connection is rejected as Unauthorized.

---

## Don't Hand-Roll

| Problem                  | Don't Build                             | Use Instead                              | Why                                                                                                                                                        |
| ------------------------ | --------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drawing canvas / tools   | Custom canvas with drawing primitives   | `@excalidraw/excalidraw`                 | Free-hand, shapes, text, sticky notes, select/resize/delete, undo/redo, pan/zoom — all built in                                                            |
| CRDT conflict resolution | Custom merge logic for concurrent edits | `yjs` Y.Doc                              | Yjs CRDT guarantees eventual consistency; hand-rolling CRDTs is extremely error-prone                                                                      |
| Undo/redo stack          | Custom command pattern                  | Excalidraw's built-in undo/redo          | Excalidraw tracks its own history; v0.18 adds multiplayer undo. Using `CaptureUpdateAction.NEVER` on remote updates keeps stacks clean without custom code |
| WebSocket reconnection   | Reconnect-on-close loop                 | socket.io-client reconnection (built-in) | socket.io-client has exponential backoff reconnection built in; use `socket.on('connect')` and `socket.on('disconnect')` events                            |

**Key insight:** This phase is almost entirely wiring, not building. Excalidraw and Yjs each solve a hard problem; the implementation is connecting them.

---

## Common Pitfalls

### Pitfall 1: Infinite Sync Loop

**What goes wrong:** onChange fires → updates Y.Array → triggers ydoc update event → calls updateScene → triggers onChange again → loop.
**Why it happens:** The Yjs observer and Excalidraw's onChange are both reactive and cross-fire each other.
**How to avoid:** Use a `isApplyingRemote` ref flag. Set it to `true` before calling `updateScene` from a remote update, check it at the top of `onChange` and skip if true. Alternatively, use the Yjs transaction origin approach: in `ydoc.on('update', (update, origin) => ...)`, only emit to socket when `origin !== 'remote'`, and only call `updateScene` from the Y.Array observer when you know it was triggered by a remote update.
**Warning signs:** Canvas becomes laggy or stutters; browser console shows rapid re-renders.

### Pitfall 2: CaptureUpdateAction Import Missing

**What goes wrong:** `CaptureUpdateAction` is a named export from `@excalidraw/excalidraw`. If the dynamic import only imports `Excalidraw`, you cannot use `CaptureUpdateAction` in the module.
**Why it happens:** The dynamic import wrapper and the rest of the component are in different module scopes.
**How to avoid:** Import both in the wrapper component: `import { Excalidraw, CaptureUpdateAction } from '@excalidraw/excalidraw'` inside the `'use client'` wrapper file. Use `CaptureUpdateAction` from that same file.

### Pitfall 3: CSS Not Applied / Styles Broken

**What goes wrong:** Excalidraw renders but toolbar is invisible, colors are wrong, or layout breaks.
**Why it happens:** In v0.18.0, the CSS must be explicitly imported as `@excalidraw/excalidraw/index.css`. Tailwind CSS v4 resets can also strip Excalidraw's base styles if the import order is wrong.
**How to avoid:** Import the CSS at the top of the wrapper component file. Verify the import appears before any Tailwind-generated CSS by checking the browser DevTools Sources panel.
**Warning signs:** Excalidraw renders a blank white box; toolbar items are invisible.

### Pitfall 4: Socket Auth Failure on Canvas Route

**What goes wrong:** socket.io connection is rejected by the Phase 3 gateway with "Unauthorized" error.
**Why it happens:** The proxy middleware blocked `/canvas/*` before the join call set the session cookie, OR socket.io-client was initialized without `withCredentials: true`.
**How to avoid:** (1) Add `/canvas` to the `proxy.ts` public allowlist. (2) The join-first flow ensures the cookie exists before the socket connects. (3) Always pass `{ withCredentials: true }` to `io()`.

### Pitfall 5: Binary Buffer Type Mismatch

**What goes wrong:** `Y.applyUpdate` throws or silently does nothing because the data type is wrong.
**Why it happens:** socket.io may deliver binary data as Buffer (Node) or ArrayBuffer (browser). `Y.applyUpdate` expects `Uint8Array`.
**How to avoid:** Always wrap incoming data: `Y.applyUpdate(ydoc, new Uint8Array(data), 'remote')`. This mirrors the pattern in Phase 3's gateway: `new Uint8Array(data)`.
**Warning signs:** Canvas does not sync across clients even though events are firing.

### Pitfall 6: excalidrawAPI Used Before Excalidraw Mounts

**What goes wrong:** Calling `excalidrawAPI?.updateScene(...)` when the API ref is null (Excalidraw not yet mounted) silently does nothing — initial state from `room-joined` is lost.
**Why it happens:** The loading overlay hides Excalidraw, but the `CollabProvider` may receive `room-joined` before Excalidraw mounts.
**How to avoid:** Pass initial elements from the `room-joined` state vector to Excalidraw's `initialData.elements` prop rather than calling `updateScene` after mount. Use `initialData` as the delivery mechanism for initial state.

---

## Code Examples

### Socket.io-client Connection to /collab Namespace

```typescript
// Source: https://socket.io/docs/v4/client-options/ (verified 2026-03-20)
import { io } from 'socket.io-client'

const socket = io(`${process.env.NEXT_PUBLIC_API_URL}/collab`, {
  withCredentials: true, // sends better-auth.session cookie
  autoConnect: false, // manual connect after join-first flow
})
```

### Room Join + Yjs State Apply Pattern

```typescript
// After POST /api/rooms/:slug/join succeeds:
socket.connect()
socket.once('connect', () => {
  socket.emit('join-room', slug)
})
socket.once('room-joined', ({ state }: { slug: string; state: ArrayBuffer | Buffer }) => {
  Y.applyUpdate(ydoc, new Uint8Array(state), 'init')
  // Now read yElements to derive initialData for Excalidraw
  setConnectionStatus('connected')
})
```

### Excalidraw updateScene for Remote Updates (v0.18 API)

```typescript
// Source: https://github.com/excalidraw/excalidraw/releases/tag/v0.18.0 (verified 2026-03-20)
import { CaptureUpdateAction } from '@excalidraw/excalidraw'

// Called when Y.Array observer fires from a remote update
excalidrawAPI.updateScene({
  elements: yElements.toArray() as ExcalidrawElement[],
  captureUpdate: CaptureUpdateAction.NEVER, // remote changes never enter undo stack
})
```

### Yjs Update Event with Origin Guard

```typescript
// Source: https://docs.yjs.dev/api/document-updates (verified 2026-03-20)
ydoc.on('update', (update: Uint8Array, origin: unknown) => {
  if (origin === 'remote' || origin === 'init') return // skip self-echo and init
  socket.emit('yjs-update', update)
})

socket.on('yjs-update', (data: ArrayBuffer | Buffer) => {
  Y.applyUpdate(ydoc, new Uint8Array(data), 'remote') // origin='remote' suppresses relay
})
```

### Excalidraw Props Configuration

```typescript
// Source: https://docs.excalidraw.com/ (verified 2026-03-20)
<Excalidraw
  excalidrawAPI={(api) => setExcalidrawAPI(api)}
  initialData={{
    elements: initialElements,   // from room-joined Y.Doc state
    scrollToContent: true,
  }}
  onChange={(elements) => {
    // diff and sync to Y.Array — only elements, not appState
    syncElementsToYjs(elements)
  }}
  theme={excalidrawTheme}       // 'light' | 'dark' derived from next-themes
  renderTopRightUI={() => null} // hides LiveCollaborationTrigger
  UIOptions={{
    canvasActions: {
      toggleTheme: false,        // we own theme; disable in-canvas toggle
    },
  }}
/>
```

---

## State of the Art

| Old Approach                                                                       | Current Approach                                                              | When Changed         | Impact                                                              |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| `commitToHistory: boolean` in updateScene                                          | `captureUpdate: CaptureUpdateAction` enum                                     | v0.18.0 (2025-03-11) | Must import `CaptureUpdateAction`; old code throws TypeScript error |
| UMD bundle (`excalidraw.production.min.js`)                                        | ESM bundle (`dist/prod/`)                                                     | v0.18.0 (2025-03-11) | Tree-shakable; better Next.js compatibility                         |
| `ref` passed to Excalidraw for API                                                 | `excalidrawAPI` callback prop                                                 | v0.17.0              | Ref API removed; use callback                                       |
| `renderTopRightUI` must render `<LiveCollaborationTrigger/>` to show collab button | Omit `<LiveCollaborationTrigger/>` from `renderTopRightUI` to hide the button | Ongoing              | Collab button is opt-in via rendering, not via a flag               |

**Deprecated/outdated:**

- `commitToHistory: boolean` — removed in v0.18; use `CaptureUpdateAction`
- Excalidraw `ref` API — removed in v0.17; use `excalidrawAPI` callback prop
- UMD import path (`@excalidraw/excalidraw/dist/excalidraw.production.min.js`) — removed; use ESM named imports

---

## Open Questions

1. **Y.Array vs Y.Map for elements**
   - What we know: Y.Array stores all elements; updating requires delete + re-insert. Y.Map would allow per-element updates.
   - What's unclear: Whether the performance difference matters at canvas scale (hundreds of elements).
   - Recommendation: Use Y.Array per the CONTEXT.md decision. The full delete+insert per change is fine because Yjs computes a binary delta internally, not the array itself.

2. **NEXT_PUBLIC_API_URL environment variable**
   - What we know: socket.io-client needs the API base URL for the `/collab` namespace.
   - What's unclear: Whether this env var already exists in the web app.
   - Recommendation: Check `apps/web/.env.local` / verify against existing `customFetch` usage to determine the correct env var name. Likely `NEXT_PUBLIC_API_URL`.

3. **Excalidraw + React 19 style conflicts**
   - What we know: v0.18.0 added React 19 support; some users on Next.js 15 + React 19 reported style issues.
   - What's unclear: Whether the current Next.js 16.1.6 + React 19.2.3 combination is fully stable with Excalidraw 0.18.
   - Recommendation: Import `@excalidraw/excalidraw/index.css` only inside the `'use client'` wrapper and test immediately after install. If styles are broken, check that the import appears before Tailwind CSS.

---

## Validation Architecture

`nyquist_validation` is enabled. The canvas route is primarily UI — no existing test framework exists in `apps/web`. This phase requires Wave 0 to establish a minimal test harness.

### Test Framework

| Property           | Value                                     |
| ------------------ | ----------------------------------------- |
| Framework          | None in `apps/web` (needs Wave 0 setup)   |
| Config file        | None — Wave 0 creates `vitest.config.ts`  |
| Quick run command  | `pnpm --filter web test --run`            |
| Full suite command | `pnpm --filter web test --run --coverage` |

### Phase Requirements → Test Map

| Req ID  | Behavior                                     | Test Type   | Automated Command                                                  | File Exists? |
| ------- | -------------------------------------------- | ----------- | ------------------------------------------------------------------ | ------------ |
| CANV-01 | Pan and zoom canvas available                | smoke       | Manual verify in browser                                           | ❌ Wave 0    |
| CANV-02 | Freehand strokes                             | smoke       | Manual verify in browser                                           | ❌ Wave 0    |
| CANV-03 | Shapes (rect, circle, arrow, line)           | smoke       | Manual verify in browser                                           | ❌ Wave 0    |
| CANV-04 | Text boxes                                   | smoke       | Manual verify in browser                                           | ❌ Wave 0    |
| CANV-05 | Sticky notes                                 | smoke       | Manual verify in browser                                           | ❌ Wave 0    |
| CANV-06 | Select, move, resize, delete                 | smoke       | Manual verify in browser                                           | ❌ Wave 0    |
| CANV-07 | Undo/redo                                    | smoke       | Manual verify in browser                                           | ❌ Wave 0    |
| Sync    | CollabProvider sync logic                    | unit        | `pnpm --filter web test --run src/contexts/collab-context.test.ts` | ❌ Wave 0    |
| Route   | Canvas route loads, proxy allows `/canvas/*` | integration | Manual verify after proxy change                                   | ❌ Wave 0    |

**Note:** CANV-01 through CANV-07 are all Excalidraw built-in tools. Testing them requires a real browser with Excalidraw mounted — they are manual-only smoke tests. The only automatable unit test is the CollabProvider's sync logic (pure TypeScript, no DOM needed).

### Sampling Rate

- **Per task commit:** `pnpm --filter web test --run` (unit tests only, < 10s)
- **Per wave merge:** `pnpm --filter web test --run --coverage`
- **Phase gate:** Full suite green + manual browser smoke test of all 7 tools before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/web/vitest.config.ts` — test framework setup for web app
- [ ] `apps/web/src/contexts/collab-context.test.ts` — unit tests for sync logic (Y.Doc update → socket emit, socket event → Y.applyUpdate)
- [ ] Framework install: `pnpm --filter web add -D vitest @vitejs/plugin-react jsdom @testing-library/react`

---

## Sources

### Primary (HIGH confidence)

- Official Excalidraw docs — https://docs.excalidraw.com/ — integration, props, UIOptions, initialData, excalidrawAPI, customizing-styles
- Excalidraw v0.18.0 release notes — https://github.com/excalidraw/excalidraw/releases/tag/v0.18.0 — breaking changes, CaptureUpdateAction, ESM migration
- Yjs document updates docs — https://docs.yjs.dev/api/document-updates — applyUpdate, encodeStateAsUpdate, update event origin
- Socket.IO v4 client options — https://socket.io/docs/v4/client-options/ — withCredentials, namespace connection

### Secondary (MEDIUM confidence)

- npm registry (verified 2026-03-20): `@excalidraw/excalidraw@0.18.0`, `yjs@13.6.30`, `socket.io-client@4.8.3`
- LiveCollaborationTrigger docs — https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/live-collaboration-trigger — confirmed: omit from renderTopRightUI to hide button

### Tertiary (LOW confidence)

- Community patterns for Excalidraw + Yjs sync loop (multiple GitHub issues and discussions consulted; exact implementations vary — the pattern documented here is derived from Yjs core docs and Excalidraw API docs, not a single community source)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — versions verified against npm registry 2026-03-20; official docs confirm API
- Architecture: HIGH — patterns derived from official Excalidraw docs and Yjs docs; gateway contract verified from Phase 3 source code
- Pitfalls: HIGH (CaptureUpdateAction, CSS import, socket auth) / MEDIUM (Y.Array type mismatch edge cases)

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (Excalidraw moves fast; re-verify if more than 30 days pass)
