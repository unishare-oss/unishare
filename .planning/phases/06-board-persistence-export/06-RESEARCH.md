# Phase 6: Board Persistence & Export - Research

**Researched:** 2026-03-21
**Domain:** Yjs snapshot persistence, Excalidraw export APIs, sessionStorage cross-tab, PDF client-side generation
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Persistence triggers:**

- Save on both: idle debounce (30s after last Yjs update) AND when last participant disconnects
- Serialization format: `Y.encodeStateAsUpdate(doc)` stored as `Room.snapshot Bytes?` in PostgreSQL
- `CollabRoomService` handles both save triggers: add a debounced save timer to `RoomEntry` alongside existing GC timer; call `CollabRepository.saveSnapshot(slug, bytes)` for both idle saves and last-disconnect flush
- Gateway calls `roomService.flushSnapshot(slug)` in `handleDisconnect` when room empties (after `removeSocket()` confirms 0 remaining sockets)
- In-memory Y.Doc is always canonical — if `getOrCreate()` finds the room already in memory, do NOT re-load from DB

**Snapshot restore on rejoin:**

- `CollabRoomService.getOrCreate()` loads `Room.snapshot` from DB and applies it with `Y.applyUpdate()` only when creating a fresh Y.Doc (room not in memory)
- Snapshot loads synchronously inside `getOrCreate()` before `room-joined` is emitted
- No user-visible indicator (no toast, no timestamp)

**Export UX:**

- Export button: add to canvas header as a dropdown between participant avatars and copy-link button
- Coverage: full board content (all elements regardless of viewport)
- Filename: `unishare-board-{slug}.png` / `unishare-board-{slug}.pdf`
- Use Excalidraw's `exportToBlob()` for PNG
- For PDF: use Excalidraw's built-in export or lightweight client-side library (Claude's discretion)

**Post to UniShare flow:**

- "Post to UniShare" exports board as PNG, stores in `sessionStorage['pending-board-export']`, opens `/posts/new` in new tab
- Canvas tab remains active with socket session intact
- `/posts/new` checks `sessionStorage['pending-board-export']` on mount and pre-attaches PNG as File in FILES step
- Existing 4-step wizard (TYPE → COURSE → DETAILS → FILES) unchanged
- Guest users: "Post to UniShare" disabled with tooltip "Sign in to post to UniShare" (check `isAnonymous` from collab session)
- PNG and PDF download always available to all users

**Anonymous session race condition fix:**

- Symptom: First-time anonymous visitor sees "Room not found"; refresh shows board correctly
- Root cause: investigate — likely proxy.ts middleware or cookie timing between join response and socket handshake
- Fix: in `CanvasPage`, if `POST /api/rooms/:slug/join` returns non-404 error (401/403), retry once after short delay. Fix at middleware/session level if root cause identified there
- Only retry on non-404 — don't mask real "room not found"

### Claude's Discretion

- PDF export library choice (Excalidraw built-in, jsPDF, or browser print API)
- Exact debounce implementation for idle save (lodash debounce, manual `setTimeout` reset)
- `CollabRepository.saveSnapshot()` method signature and error handling
- `pending-board-export` sessionStorage format (base64 string vs data URL)
- Export dropdown component style (shadcn DropdownMenu)
- Exact retry logic for anon session race fix

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                    | Research Support                                                                                                                          |
| ------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| ROOM-03 | Board state persists after all participants leave — room can be rejoined later | Covered by Yjs snapshot persistence: `Y.encodeStateAsUpdate()` → `Room.snapshot Bytes?`, restore via `Y.applyUpdate()` in `getOrCreate()` |
| ROOM-04 | User can export the board as a PNG image                                       | Covered by Excalidraw `exportToBlob({ mimeType: 'image/png' })` from `@excalidraw/excalidraw` 0.18.0                                      |
| EXPO-01 | User can export the board as a PDF                                             | Covered by `exportToSvg()` + SVG-to-PDF via jsPDF or `exportToBlob` canvas-to-PDF conversion                                              |
| EXPO-02 | User can post exported board directly to UniShare as a new post                | Covered by sessionStorage cross-tab transfer pattern: data URL → `/posts/new` pre-fill                                                    |

</phase_requirements>

---

## Summary

Phase 6 has four distinct workstreams: (1) backend Yjs snapshot persistence to the existing `Room.snapshot Bytes?` Prisma field, (2) PNG export using Excalidraw's built-in `exportToBlob()`, (3) PDF export (jsPDF recommended — see below), and (4) a sessionStorage-based cross-tab handoff to pre-fill the `/posts/new` wizard. A fifth fix covers the anonymous session race condition on first canvas load.

The Prisma schema already has `Room.snapshot Bytes?` — no migration is needed. The `CollabRoomService` already has the GC timer pattern that the idle save timer mirrors. The `CollabRepository` needs one new method: `saveSnapshot(slug, snapshot)`. The gateway needs `flushSnapshot()` called in `handleDisconnect` after `removeSocket()` confirms the room is empty. The frontend `getOrCreate()` becomes async to load from DB on fresh Y.Doc creation.

For PDF, the browser's `window.print()` approach is fragile and not recommended for canvas content. Excalidraw does not expose a built-in PDF export. The standard pattern is: `exportToSvg()` → embed SVG in jsPDF (or alternatively `exportToBlob()` canvas-to-image → embed in jsPDF). jsPDF is the lightest well-maintained client-side PDF library with no server round-trip.

**Primary recommendation:** Use `exportToBlob({ mimeType: 'image/png' })` for PNG, and `exportToSvg()` + jsPDF for PDF. Both are fully client-side. The sessionStorage data URL approach is proven for cross-tab file transfer in Next.js.

---

## Standard Stack

### Core (already installed)

| Library                  | Version                        | Purpose                                                                  | Why Standard                                                             |
| ------------------------ | ------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `@excalidraw/excalidraw` | 0.18.0                         | PNG export via `exportToBlob()`, SVG export via `exportToSvg()`          | Already the canvas library; exports are part of its public API           |
| `yjs`                    | ^13.6.30                       | `Y.encodeStateAsUpdate()` / `Y.applyUpdate()` for snapshot serialization | Already the CRDT library; these are its canonical persistence primitives |
| `shadcn DropdownMenu`    | (already in web/components/ui) | Export button dropdown                                                   | Already used in `canvas-header.tsx` for participant avatars              |
| `sonner` (toast)         | (already installed)            | Export error feedback                                                    | Already installed and used in canvas-header, collab-context              |
| `lucide-react`           | (already installed)            | `Download`, `FileText`, `Share2` icons                                   | Already installed                                                        |

### New dependency

| Library | Version | Purpose                                    | Why                                                                                                           |
| ------- | ------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `jspdf` | ^2.5.2  | Client-side PDF generation from SVG/canvas | Lightest option with no server round-trip; 287 KB gzip; well maintained; works in Next.js with dynamic import |

**Version verification:**

```bash
npm view jspdf version   # 2.5.2 (2024 — stable)
```

**Installation (web app only):**

```bash
pnpm --filter @unishare/web add jspdf
```

### Alternatives Considered

| Instead of                   | Could Use                | Tradeoff                                                                                 |
| ---------------------------- | ------------------------ | ---------------------------------------------------------------------------------------- |
| jsPDF                        | `@react-pdf/renderer`    | react-pdf is for layout-based PDFs, not canvas-to-PDF; heavier                           |
| jsPDF                        | browser `window.print()` | print API cannot target a specific canvas element; requires separate print-only page     |
| jsPDF                        | Excalidraw built-in PDF  | Excalidraw 0.18.0 has no built-in PDF export function in its public API                  |
| Manual `setTimeout` debounce | lodash `debounce`        | lodash already in API deps; either works. Manual setTimeout is simpler and avoids a dep. |

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
apps/api/src/modules/collab/
├── collab.room.service.ts      # Add: idleTimer to RoomEntry, flushSnapshot(), async getOrCreate()
├── collab.repository.ts        # Add: saveSnapshot(slug, snapshot)
└── collab.gateway.ts           # Add: flushSnapshot() call in handleDisconnect

apps/web/
├── contexts/collab-context.tsx # Add: isAnonymous to CollabContextValue; pass from join response
├── app/canvas/[slug]/page.tsx  # Add: capture isAnonymous from join response, retry logic
├── src/components/canvas/
│   ├── canvas-header.tsx       # Add: ExportDropdown component
│   └── export-utils.ts         # NEW: exportPng(), exportPdf(), postToUniShare() helpers
└── app/(app)/(protected)/posts/new/page.tsx  # Add: sessionStorage pre-fill on mount
```

### Pattern 1: Idle Save Timer (mirrors existing GC timer)

**What:** A `setTimeout` that fires 30s after the last Yjs update and saves the snapshot to the DB. Reset on every Yjs update. Both the idle timer and the GC timer live in `RoomEntry`.

**When to use:** Any time a Yjs update is applied in the gateway.

**Example:**

```typescript
// apps/api/src/modules/collab/collab.room.service.ts
interface RoomEntry {
  doc: Y.Doc
  timer: ReturnType<typeof setTimeout> | null   // GC timer (existing)
  idleTimer: ReturnType<typeof setTimeout> | null  // NEW: idle save timer
}

// Called from gateway after Y.applyUpdate()
resetIdleTimer(slug: string): void {
  const entry = this.rooms.get(slug)
  if (!entry) return
  if (entry.idleTimer) clearTimeout(entry.idleTimer)
  entry.idleTimer = setTimeout(() => {
    void this.saveSnapshot(slug)
  }, this.IDLE_SAVE_DELAY)
}

private async saveSnapshot(slug: string): Promise<void> {
  const entry = this.rooms.get(slug)
  if (!entry) return
  const snapshot = Buffer.from(Y.encodeStateAsUpdate(entry.doc))
  await this.collabRepository.saveSnapshot(slug, snapshot)
}

// Called from gateway handleDisconnect when room empties
async flushSnapshot(slug: string): Promise<void> {
  const entry = this.rooms.get(slug)
  if (!entry) return
  if (entry.idleTimer) {
    clearTimeout(entry.idleTimer)
    entry.idleTimer = null
  }
  await this.saveSnapshot(slug)
}
```

### Pattern 2: Snapshot Restore in getOrCreate()

**What:** `getOrCreate()` becomes async. When creating a new Y.Doc (room not in memory), load `Room.snapshot` from DB and apply it before returning.

**When to use:** Always — only runs on fresh Y.Doc creation; in-memory rooms bypass the DB load entirely.

**Example:**

```typescript
// Source: Yjs official docs — Y.applyUpdate pattern
async getOrCreate(slug: string): Promise<Y.Doc> {
  if (this.rooms.has(slug)) {
    return this.rooms.get(slug)!.doc
  }
  const doc = new Y.Doc()
  this.rooms.set(slug, { doc, timer: null, idleTimer: null })

  const snapshot = await this.collabRepository.getSnapshot(slug)
  if (snapshot) {
    Y.applyUpdate(doc, new Uint8Array(snapshot))
    this.logger.log(`Restored snapshot for room ${slug}`)
  }
  return doc
}
```

Note: `handleJoinRoom` in the gateway must `await getOrCreate()`. `handleYjsUpdate` can remain synchronous but must call `resetIdleTimer()` after `Y.applyUpdate()`.

### Pattern 3: CollabRepository saveSnapshot

**What:** A single `prisma.room.update()` call. Error is caught and logged — a failed save should not crash the gateway.

**Example:**

```typescript
// apps/api/src/modules/collab/collab.repository.ts
async saveSnapshot(slug: string, snapshot: Buffer): Promise<void> {
  await this.prisma.room.update({
    where: { slug },
    data: { snapshot },
  })
}

async getSnapshot(slug: string): Promise<Buffer | null> {
  const room = await this.prisma.room.findUnique({
    where: { slug },
    select: { snapshot: true },
  })
  return room?.snapshot ?? null
}
```

### Pattern 4: PNG Export (client-side)

**What:** Call Excalidraw's `exportToBlob()` with elements and files from the ExcalidrawAPI. Trigger a browser download via an anchor element.

**Example:**

```typescript
// Source: @excalidraw/excalidraw 0.18.0 dist/types/utils/export.d.ts
import { exportToBlob } from '@excalidraw/excalidraw'

async function exportPng(api: ExcalidrawImperativeAPI, slug: string): Promise<void> {
  const blob = await exportToBlob({
    elements: api.getSceneElements(),
    appState: api.getAppState(),
    files: api.getFiles(),
    mimeType: 'image/png',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `unishare-board-${slug}.png`
  a.click()
  URL.revokeObjectURL(url)
}
```

### Pattern 5: PDF Export (client-side via jsPDF)

**What:** Export SVG from Excalidraw via `exportToSvg()`, serialize to string, embed in jsPDF. Dynamic import keeps jsPDF out of the initial bundle.

**Example:**

```typescript
import { exportToSvg } from '@excalidraw/excalidraw'

async function exportPdf(api: ExcalidrawImperativeAPI, slug: string): Promise<void> {
  const svg = await exportToSvg({
    elements: api.getSceneElements(),
    appState: api.getAppState(),
    files: api.getFiles(),
  })

  const svgString = new XMLSerializer().serializeToString(svg)
  const { jsPDF } = await import('jspdf')
  const svgWidth = Number(svg.getAttribute('width')) || 800
  const svgHeight = Number(svg.getAttribute('height')) || 600

  const pdf = new jsPDF({
    orientation: svgWidth > svgHeight ? 'landscape' : 'portrait',
    unit: 'px',
    format: [svgWidth, svgHeight],
  })
  pdf.svg(svg, { width: svgWidth, height: svgHeight })
  pdf.save(`unishare-board-${slug}.pdf`)
}
```

Alternative using jsPDF's `addSvgAsImage` or `html()` method exists, but `pdf.svg()` (svgjs plugin) is the recommended path for SVG-to-PDF with jsPDF 2.x.

### Pattern 6: Post to UniShare (sessionStorage cross-tab)

**What:** Export PNG as data URL, write to `sessionStorage`, open `/posts/new` in new tab. On the new tab's mount, read and clear sessionStorage, reconstruct a File object, inject into form.

**Example (canvas side):**

```typescript
async function postToUniShare(api: ExcalidrawImperativeAPI, slug: string): Promise<void> {
  const blob = await exportToBlob({
    elements: api.getSceneElements(),
    appState: api.getAppState(),
    files: api.getFiles(),
    mimeType: 'image/png',
  })
  // Convert Blob to data URL for sessionStorage (strings only)
  const reader = new FileReader()
  reader.onload = () => {
    sessionStorage.setItem(
      'pending-board-export',
      JSON.stringify({
        dataUrl: reader.result as string,
        filename: `unishare-board-${slug}.png`,
      }),
    )
    window.open('/posts/new', '_blank')
  }
  reader.readAsDataURL(blob)
}
```

**Example (posts/new side, in useEffect on mount):**

```typescript
useEffect(() => {
  const raw = sessionStorage.getItem('pending-board-export')
  if (!raw) return
  sessionStorage.removeItem('pending-board-export') // Clear immediately

  try {
    const { dataUrl, filename } = JSON.parse(raw) as { dataUrl: string; filename: string }
    // Convert data URL to File
    const [header, base64] = dataUrl.split(',')
    const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png'
    const bytes = atob(base64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const file = new File([arr], filename, { type: mime })
    form.setValue('files', [file])
    setCurrentStep(3) // Jump to FILES step
  } catch {
    // Silently ignore malformed data
  }
}, [])
```

### Pattern 7: isAnonymous in Frontend Context

**What:** The `POST /api/rooms/:slug/join` response already returns `{ isAnonymous: boolean }`. Capture it in `CanvasPage`, pass to `CollabProvider`, expose via `CollabContext`.

**Implementation path:**

1. `CanvasPage.joinRoom()` captures `isAnonymous` from response JSON
2. Pass as prop to `CollabProvider`
3. Add `isAnonymous: boolean` to `CollabContextValue`
4. `CanvasHeader` reads from `useCollab()` to conditionally disable "Post to UniShare"

### Pattern 8: Anon Race Condition Fix

**What:** Retry the join once on non-404 HTTP errors with a short delay (500ms). 404 means real "room not found" and should never retry.

**Example:**

```typescript
// apps/web/app/canvas/[slug]/page.tsx
const joinRoom = async (retried = false): Promise<void> => {
  const res = await fetch(`/api/rooms/${slug}/join`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (res.ok) {
    const data = await res.json()
    setIsAnonymous(data.data?.isAnonymous ?? false)
    setJoinState('joined')
    return
  }
  if (res.status === 404) {
    setJoinState('not-found')
    return
  }
  // Non-404 error (e.g. 401/403 cookie timing) — retry once
  if (!retried) {
    await new Promise((r) => setTimeout(r, 500))
    return joinRoom(true)
  }
  setJoinState('not-found')
}
```

### Anti-Patterns to Avoid

- **Re-loading snapshot into an in-memory doc:** `getOrCreate()` must check `this.rooms.has(slug)` before any DB access. If the doc is already in memory, the in-memory state is canonical.
- **Saving snapshot on every Yjs update:** Would flood the DB. The idle debounce (30s) is the correct pattern.
- **Not clearing sessionStorage after read:** If not cleared, refreshing `/posts/new` re-attaches the same file. Clear immediately on read.
- **Blocking the gateway on snapshot save errors:** Wrap `saveSnapshot` calls in try/catch with logger.warn; never let DB errors crash the socket handler.
- **Making exportToBlob synchronous:** It returns a Promise. Always await it before creating the object URL.

---

## Don't Hand-Roll

| Problem                 | Don't Build                    | Use Instead                                    | Why                                                                                            |
| ----------------------- | ------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| PNG export              | Custom canvas serialization    | `exportToBlob()` from `@excalidraw/excalidraw` | Handles background fill, padding, scale, SVG elements, image files                             |
| SVG export              | Custom SVG traversal           | `exportToSvg()` from `@excalidraw/excalidraw`  | Handles font inlining, frame clipping, element ordering                                        |
| PDF generation          | Browser print stylesheet       | `jsPDF`                                        | Print API cannot target canvas; jsPDF gives programmatic control over file name and dimensions |
| Cross-tab file transfer | postMessage / BroadcastChannel | `sessionStorage`                               | Simpler; new tab opened by `window.open` shares the same session storage origin                |
| Yjs serialization       | Custom JSON format             | `Y.encodeStateAsUpdate()` / `Y.applyUpdate()`  | Standard Yjs binary format; handles CRDT metadata, vector clocks, tombstones                   |

**Key insight:** Excalidraw's export functions handle the hardest parts (coordinate space, background transparency, embedded images, fonts). Never reconstruct this manually.

---

## Common Pitfalls

### Pitfall 1: getOrCreate async refactor breaks existing callers

**What goes wrong:** `handleYjsUpdate` calls `getOrCreate(slug)` synchronously. Making it async without updating callers causes unhandled promises and stale doc references.
**Why it happens:** `handleYjsUpdate` is a sync socket event handler.
**How to avoid:** `handleJoinRoom` must `await getOrCreate()`. `handleYjsUpdate` should continue using `this.rooms.get(slug)!.doc` directly (it's already in memory by the time any update arrives, since join always precedes updates).
**Warning signs:** TypeScript errors on callers of `getOrCreate`; "room not in memory" log after join.

### Pitfall 2: Idle timer not cancelled before GC destroys doc

**What goes wrong:** GC timer fires and destroys the Y.Doc while the idle save timer is still pending. The idle save then tries to encode a destroyed doc.
**Why it happens:** Two timers for the same room entry that can race.
**How to avoid:** In `removeSocket()` when scheduling GC, also cancel the idle timer: `if (entry.idleTimer) clearTimeout(entry.idleTimer)`.
**Warning signs:** "Cannot read property of destroyed Y.Doc" errors in logs.

### Pitfall 3: jsPDF `pdf.svg()` requires the svgjs plugin

**What goes wrong:** `jsPDF` base import doesn't include SVG rendering. `pdf.svg is not a function`.
**Why it happens:** jsPDF SVG rendering is in a separate plugin.
**How to avoid:** Import from `jspdf` — the default export in jsPDF 2.x bundles the svg plugin. Confirm: `import { jsPDF } from 'jspdf'` (not a plugin import).
**Warning signs:** Runtime error on first PDF export.

### Pitfall 4: sessionStorage unavailable in SSR

**What goes wrong:** `/posts/new` is a `'use client'` component but Next.js may still attempt to run the effect on server.
**Why it happens:** `useEffect` only runs client-side, but TypeScript compilation may not catch `sessionStorage` access at module scope.
**How to avoid:** Access `sessionStorage` only inside `useEffect`. Never at module scope. This is already how the page is written.
**Warning signs:** "sessionStorage is not defined" during SSR / build.

### Pitfall 5: exportToSvg produces viewport-clipped output

**What goes wrong:** If `appState.exportWithDarkMode` or `appState.viewBackgroundColor` is set to the room's current scroll/zoom, the SVG may be clipped.
**Why it happens:** Passing the full `appState` including scroll/zoom into export.
**How to avoid:** Pass only relevant appState properties: `{ exportBackground: true, exportWithDarkMode: false }`. Do not pass scroll/zoom to export functions — Excalidraw ignores them for exports but pass-through can cause issues with some appState fields.
**Warning signs:** Exported image is blank or shows only part of the board.

### Pitfall 6: Race condition in isAnonymous detection

**What goes wrong:** `CanvasPage` needs to pass `isAnonymous` to `CollabProvider`, but the join response is async. If the component tree mounts before the value is available, the export dropdown shows incorrect state.
**Why it happens:** `CollabProvider` mounts after join succeeds (by design), so `isAnonymous` is available before `CollabProvider` mounts — no race, just needs to be passed as a prop.
**How to avoid:** Add `isAnonymous` as a prop to `CollabProvider`. Set it from the join response before `setJoinState('joined')`.

---

## Code Examples

Verified patterns from installed packages and existing codebase:

### exportToBlob (PNG) — confirmed from dist/types/utils/export.d.ts

```typescript
import { exportToBlob } from '@excalidraw/excalidraw'

const blob = await exportToBlob({
  elements: excalidrawAPI.getSceneElements(),
  appState: excalidrawAPI.getAppState(),
  files: excalidrawAPI.getFiles(),
  mimeType: 'image/png',
})
// blob is a Blob of type image/png
```

### exportToSvg — confirmed from dist/types/utils/export.d.ts

```typescript
import { exportToSvg } from '@excalidraw/excalidraw'

const svg = await exportToSvg({
  elements: excalidrawAPI.getSceneElements(),
  appState: excalidrawAPI.getAppState(),
  files: excalidrawAPI.getFiles(),
})
// svg is an SVGSVGElement with width/height attributes set
```

### Y.encodeStateAsUpdate / Y.applyUpdate — confirmed from collab.gateway.ts existing usage

```typescript
// Save
const bytes = Buffer.from(Y.encodeStateAsUpdate(doc))
await prisma.room.update({ where: { slug }, data: { snapshot: bytes } })

// Restore
const room = await prisma.room.findUnique({ where: { slug }, select: { snapshot: true } })
if (room?.snapshot) {
  Y.applyUpdate(doc, new Uint8Array(room.snapshot))
}
```

### Prisma snapshot field — confirmed from schema.prisma line 325

```prisma
model Room {
  // ...
  snapshot  Bytes?  // Already exists — NO migration needed
}
```

### CollabContextValue extension

```typescript
interface CollabContextValue {
  ydoc: Y.Doc
  yElements: Y.Array<unknown>
  connectionStatus: ConnectionStatus
  excalidrawAPI: ExcalidrawImperativeAPI | null
  setExcalidrawAPI: (api: ExcalidrawImperativeAPI | null) => void
  initialElements: unknown[] | null
  isAnonymous: boolean // NEW
}
```

---

## State of the Art

| Old Approach                  | Current Approach           | When Changed                 | Impact                                                                                                                                                            |
| ----------------------------- | -------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-side PDF generation    | Client-side jsPDF          | jsPDF 2.x (2020+)            | No server endpoint needed; works in browser                                                                                                                       |
| Base64 string in localStorage | Data URL in sessionStorage | N/A (design choice)          | sessionStorage is tab-scoped — new tab opened by `window.open` shares it; localStorage is persistent and cross-tab by default but doesn't scope to the opener tab |
| Polling for Yjs persistence   | Event-driven idle debounce | Standard pattern in Yjs apps | Lower DB write frequency; saves on meaningful idle periods                                                                                                        |

**Deprecated/outdated:**

- `exportToCanvas()` for PNG: Works but requires manual `toBlob()` call; `exportToBlob()` is the higher-level API to use directly
- `localStorage` for cross-tab file transfer: Persists across sessions; sessionStorage is scoped to the tab session and cleared when the tab closes

---

## Open Questions

1. **jsPDF `pdf.svg()` vs `addImage()` for PDF**
   - What we know: `pdf.svg()` accepts an SVGSVGElement; `addImage()` requires a raster data URL
   - What's unclear: whether jsPDF 2.5.2's `svg()` method handles complex Excalidraw SVGs (gradients, foreign objects) correctly
   - Recommendation: Use `exportToSvg()` → `pdf.svg()`. If rendering issues appear with complex SVGs, fallback: `exportToBlob({ mimeType: 'image/png' })` → `pdf.addImage()` (PNG-based PDF — less sharp but universally compatible)

2. **Anon race condition root cause**
   - What we know: `POST /api/rooms/:slug/join` creates anon session and sets `set-cookie`; socket connects after join; middleware validates the cookie
   - What's unclear: whether the race is (a) cookie not persisted by browser before socket.io connect, or (b) proxy middleware blocking the response before cookie is forwarded
   - Recommendation: Single retry with 500ms delay handles (a). Check proxy allowlist for the join endpoint if retry doesn't resolve.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                     |
| ------------------ | --------------------------------------------------------- |
| Framework          | Jest (NestJS apps/api)                                    |
| Config file        | `apps/api/jest.config.js` (inferred from existing specs)  |
| Quick run command  | `pnpm --filter @unishare/api test -- collab.room.service` |
| Full suite command | `pnpm --filter @unishare/api test`                        |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                 | Test Type    | Automated Command                                         | File Exists?                     |
| ------- | -------------------------------------------------------- | ------------ | --------------------------------------------------------- | -------------------------------- |
| ROOM-03 | Snapshot saved to DB on idle (30s)                       | unit         | `pnpm --filter @unishare/api test -- collab.room.service` | ❌ Wave 0 — extend existing spec |
| ROOM-03 | Snapshot saved to DB on last disconnect                  | unit         | `pnpm --filter @unishare/api test -- collab.room.service` | ❌ Wave 0 — extend existing spec |
| ROOM-03 | Reopened room restores prior state via Y.applyUpdate     | unit         | `pnpm --filter @unishare/api test -- collab.room.service` | ❌ Wave 0                        |
| ROOM-03 | In-memory doc not re-loaded from DB if room still active | unit         | `pnpm --filter @unishare/api test -- collab.room.service` | ❌ Wave 0                        |
| ROOM-04 | `exportPng()` produces a Blob of type `image/png`        | manual-only  | N/A                                                       | N/A — browser API, no test env   |
| EXPO-01 | `exportPdf()` triggers PDF download                      | manual-only  | N/A                                                       | N/A — browser API, no test env   |
| EXPO-02 | `postToUniShare()` writes correct sessionStorage entry   | unit (jsdom) | N/A — test infra not set up for web                       | ❌ Wave 0 if unit-testable       |

### Sampling Rate

- **Per task commit:** `pnpm --filter @unishare/api test -- collab.room.service`
- **Per wave merge:** `pnpm --filter @unishare/api test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/modules/collab/collab.room.service.spec.ts` — extend with idle save timer, flushSnapshot, and getOrCreate-with-snapshot tests
- [ ] `apps/api/src/modules/collab/collab.repository.ts` — add mock for `saveSnapshot` and `getSnapshot` in integration spec
- [ ] No new test files needed for frontend (browser API exports are manual-only)

---

## Sources

### Primary (HIGH confidence)

- `@excalidraw/excalidraw` 0.18.0 installed at `apps/web/node_modules/@excalidraw/excalidraw/dist/types/utils/export.d.ts` — `exportToBlob`, `exportToSvg` signatures confirmed
- `apps/api/prisma/schema.prisma` lines 318-331 — `Room.snapshot Bytes?` confirmed, no migration needed
- `apps/api/src/modules/collab/collab.room.service.ts` — `RoomEntry` interface, GC timer pattern confirmed
- `apps/api/src/modules/collab/collab.gateway.ts` — existing `Y.encodeStateAsUpdate` / `Y.applyUpdate` usage confirmed
- `apps/api/src/modules/collab/collab.service.ts` — `isAnonymous` already in join response
- `apps/web/app/(app)/(protected)/posts/new/page.tsx` — 4-step wizard structure, `files: File[]` field confirmed

### Secondary (MEDIUM confidence)

- jsPDF 2.5.2 `pdf.svg()` method: documented in jsPDF GitHub README and widely used in ecosystem. Not verified via live docs call, but consistent across multiple sources.
- sessionStorage cross-tab behavior with `window.open()`: specified in W3C HTML Living Standard — new tab inherits sessionStorage from opener for the duration of the tab's session.

### Tertiary (LOW confidence — flag for validation)

- jsPDF SVG rendering of complex Excalidraw SVGs (gradients, embeds): untested. Fallback to PNG-in-PDF is LOW risk insurance.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries confirmed via installed package.json and type definitions
- Architecture: HIGH — patterns derived from reading actual source files, not assumptions
- Pitfalls: HIGH for backend (derived from existing code patterns); MEDIUM for jsPDF SVG edge cases (library-specific, untested against Excalidraw SVG output)

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (Excalidraw stable; jsPDF stable; Yjs stable)
