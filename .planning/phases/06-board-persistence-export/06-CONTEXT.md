# Phase 6: Board Persistence & Export - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Save board state to PostgreSQL so rooms can be reopened with their previous content, export boards as PNG and PDF, and let users post an exported board directly to UniShare as a new post. Includes a bug fix for the anonymous session race condition (first-time canvas visit shows "Room not found", refresh fixes it).

</domain>

<decisions>
## Implementation Decisions

### Persistence triggers

- Save on **both**: idle debounce (30s after last Yjs update) AND when last participant disconnects
- Serialization format: `Y.encodeStateAsUpdate(doc)` → stored as `Room.snapshot Bytes?` in PostgreSQL (field already exists in schema)
- **CollabRoomService handles both save triggers**: add a debounced save timer to `RoomEntry` alongside the existing GC timer; call `CollabRepository.saveSnapshot(slug, bytes)` for both idle saves and last-disconnect flush
- Gateway calls `roomService.flushSnapshot(slug)` in `handleDisconnect` when room empties (after `removeSocket()` confirms 0 remaining sockets)
- In-memory Y.Doc is always canonical — if `getOrCreate()` finds the room already in memory, do NOT re-load from DB (in-memory state is up-to-date)

### Snapshot restore on rejoin

- `CollabRoomService.getOrCreate()` loads `Room.snapshot` from DB and applies it with `Y.applyUpdate()` only when creating a **fresh** Y.Doc (room not in memory)
- Snapshot loads synchronously inside `getOrCreate()` before `room-joined` is emitted → existing `Y.applyUpdate()` flow in frontend handles it with no changes
- No user-visible indicator — saved state appears naturally. No "restored from last session" toast or timestamp in header
- Existing "Connecting to room..." loading overlay is unchanged

### Export UX

- **Export button**: add to canvas header as a dropdown (between participant avatars and copy-link button). Options: "Export PNG", "Export PDF", "Post to UniShare"
- **Coverage**: full board content — all elements regardless of current viewport (Excalidraw default behavior)
- **Filename**: `unishare-board-{slug}.png` / `unishare-board-{slug}.pdf`
- Use Excalidraw's `exportToBlob()` for PNG; for PDF, use Excalidraw's built-in export or a lightweight client-side library (Claude's discretion on PDF library choice)

### Post to UniShare flow

- Clicking "Post to UniShare" exports the board as PNG, stores it in `sessionStorage` under key `pending-board-export`, then opens `/posts/new` in a **new tab**
- Canvas tab remains active with socket session intact
- `/posts/new` checks `sessionStorage['pending-board-export']` on mount and pre-attaches the PNG as a File in the FILES step
- Existing 4-step wizard (TYPE → COURSE → DETAILS → FILES) unchanged — user fills out type, course, and title manually
- **Guest users**: "Post to UniShare" appears in dropdown but is **disabled with a tooltip**: "Sign in to post to UniShare" (check `isAnonymous` from collab session)
- PNG download and PDF download are always available to all users (guests and authenticated)

### Anonymous session race condition fix (Phase 2 bug)

- **Symptom**: First-time anonymous visitor to a canvas URL sees "Room not found"; refreshing shows the board correctly
- **Root cause**: Investigate — likely the `proxy.ts` middleware intercepting the join request or a cookie timing issue between the join response and socket handshake
- **Fix approach**: In `CanvasPage`, if `POST /api/rooms/:slug/join` returns a non-404 error (e.g., 401/403), retry once after a short delay before showing the error page. Alternatively, fix at the middleware/session level if root cause is identified there
- **Scope**: Fix is in Phase 6 since the canvas join flow is being touched anyway

### Claude's Discretion

- PDF export library choice (Excalidraw built-in, jsPDF, or browser print API)
- Exact debounce implementation for idle save (lodash debounce, manual `setTimeout` reset)
- `CollabRepository.saveSnapshot()` method signature and error handling
- `pending-board-export` sessionStorage format (base64 string vs data URL)
- Export dropdown component style (shadcn DropdownMenu)
- Exact retry logic for the anon session race fix

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Persistence — existing room service and repository

- `apps/api/src/modules/collab/collab.room.service.ts` — RoomEntry interface, GC timer pattern, `getOrCreate()`, `registerSocket()`, `removeSocket()`. Idle save timer added alongside existing GC timer. `flushSnapshot()` called in `removeSocket()` when room empties.
- `apps/api/src/modules/collab/collab.repository.ts` — `findBySlug()`, `findBySlugWithGuestFlag()`. Add `saveSnapshot(slug, bytes)` here.
- `apps/api/src/modules/collab/collab.gateway.ts` — `handleDisconnect()` triggers flush. `handleJoinRoom()` calls `getOrCreate()` which now loads snapshot.

### Prisma schema — snapshot field already exists

- `apps/api/prisma/schema.prisma` — `Room.snapshot Bytes?` field already defined. No migration needed.

### Canvas frontend — header and context

- `apps/web/src/components/canvas/canvas-header.tsx` — Add export dropdown here, between avatar stack and copy-link button
- `apps/web/contexts/collab-context.tsx` — `isAnonymous` check needed for "Post to UniShare" disabled state; `excalidrawAPI` used for export (`excalidrawAPI.getSceneElements()` + `exportToBlob()`)
- `apps/web/app/canvas/[slug]/page.tsx` — Race condition fix: retry join on non-404 error

### Post creation — sessionStorage integration point

- `apps/web/app/(app)/(protected)/posts/new/page.tsx` — 4-step wizard. Add `sessionStorage['pending-board-export']` check on mount to pre-attach PNG in FILES step
- `apps/web/lib/posts/form-types.ts` — `CreatePostFormValues.files: File[]` — pre-attach exported PNG as File object

### Phase 5 context (carry forward header decisions)

- `.planning/phases/05-presence-and-awareness/05-CONTEXT.md` — Participant avatar placement, header layout, `CollabPresenceContext` for `isAnonymous` detection

### Requirements

- `.planning/REQUIREMENTS.md` — ROOM-03 (persistence), ROOM-04 (PNG export), EXPO-01 (PDF export), EXPO-02 (post to UniShare)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `collabRoomService.removeSocket()` — already detects when room empties (0 remaining sockets); hook `flushSnapshot()` here for last-disconnect save
- `collabRoomService.getOrCreate()` — entry point for DB snapshot load; returns existing doc if in memory (no DB hit needed)
- `excalidrawAPI` stored in `CollabContext` via `excalidrawAPI` / `setExcalidrawAPI` — use `excalidrawAPI.getSceneElements()` for export
- `sonner` (`toast`) — already installed; use for export error feedback if export fails
- `lucide-react` — already installed; use `Download`, `FileText`, `Share2` icons in export dropdown
- shadcn `DropdownMenu` — use for export button dropdown in header (consistent with rest of the app)

### Established Patterns

- Socket relay pattern: no self-echo (`client.to(slug).emit()`)
- `CollabRepository` injectable — add `saveSnapshot()` method here, not in gateway
- `'use client'` at top of all interactive components
- `sessionStorage` is already used in `next-themes` and similar libs — safe cross-tab mechanism

### Integration Points

- `CollabRoomService`: add `idleTimer` to `RoomEntry` alongside `timer` (GC timer); add `flushSnapshot(slug)` public method
- `CollabRepository`: add `saveSnapshot(slug: string, snapshot: Buffer): Promise<void>`
- `CanvasHeader`: receives export handlers from parent; export dropdown opens; triggers `excalidrawAPI` export methods
- `/posts/new page.tsx`: on mount, check `sessionStorage['pending-board-export']`; if present, create `File` from data URL and set into form `files` field; clear sessionStorage after read

</code_context>

<specifics>
## Specific Ideas

- The `pending-board-export` key in sessionStorage should be cleared after `/posts/new` reads it, so refreshing the page doesn't re-attach the same export again
- Export PNG uses Excalidraw's `exportToBlob({ elements, appState, files, mimeType: 'image/png' })` — Excalidraw handles background, padding, and scale automatically
- For the race condition fix: check if the response is 401/403 (anon session not yet recognized) vs 404 (room truly doesn't exist). Only retry on non-404 errors — don't mask real "room not found" cases

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

_Phase: 06-board-persistence-export_
_Context gathered: 2026-03-21_
