# Phase 5: Presence & Awareness - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Show live named cursors for all other participants on the canvas, and a participant list in the header showing who is currently in the room. Cursor positions are throttled at max 30/sec. No viewport follow ("jump to cursor"), no user-to-user pinging, no permission levels — purely real-time presence visibility.

</domain>

<decisions>
## Implementation Decisions

### Cursor visual design

- **UniShare custom style:** Filled colored arrow (body filled with participant's assigned color, thin white stroke outline) + a fully rounded pill name tag anchored below-right of the cursor tip. White text on the participant color background. Flat — no drop shadow on cursor or pill.
- **Always visible** while the cursor is on screen — name tag does not fade or collapse on idle. Cursor stays at last known position if participant stops moving.
- **Only others' cursors** are rendered — not the current user's own cursor (they already have their OS cursor).
- **Canvas coordinates:** Emit scene/canvas coordinates (Excalidraw's coordinate space), not screen pixels. Recipients convert to screen position using Excalidraw's viewport state so cursors track correctly regardless of zoom/pan level.
- **Rendered as overlay div** outside the Excalidraw component: a `position:absolute, pointer-events:none` div layered over the canvas element. Each remote cursor is a React element inside this overlay. Clipped to the canvas area — cursors do not bleed over the header.
- Final visual tweaks (exact sizing, font size, pill padding, arrow SVG) are Claude's discretion — user will review after implementation.

### Cursor transport

- New socket.io event **`cursor-move`** emitting `{ x: number, y: number }` in Excalidraw scene coordinates.
- Server relays to all other room members (same no-echo pattern as `yjs-update`).
- **Throttled at max 30 updates/sec** per client (enforced in the frontend before emitting — not server-side drop).
- No cursor persistence — cursor positions are ephemeral, not stored in the Y.Doc.

### Participant panel

- **Stacked color-coded avatars** in the canvas header, placed between the UniShare logo and the "Copy link" button.
- Each avatar shows the participant's initials, filled with their assigned presence color.
- **Overflow:** Show first 3–4 avatars + an "+N" overflow badge. Clicking any avatar or the overflow badge opens a dropdown listing all participants with their color dot and name.
- **"You" is shown** in the list with a `(you)` suffix so users can confirm what name others see them as.
- **Join/leave:** Avatar appears/disappears silently — no toast notification. Immediate removal on disconnect.

### Color assignment

- **Deterministic:** hash the participant's user ID (or anonymous session ID) to an index in a fixed presence color palette. Same person = same color every session.
- **Separate presence palette:** 8–12 distinct, accessible colors chosen specifically for cursors/avatars. Palette avoids UniShare amber and neutral grays to prevent clashes with canvas backgrounds and UI chrome.
- Self is shown with the same deterministic color — what you see is what others see.

### Out-of-viewport behavior

- If a remote cursor's canvas coordinates map outside the current viewport bounds, it is **silently hidden** — no edge indicators or compass arrows.
- The participant list in the header still shows them as present regardless of cursor position.

### Claude's Discretion

- Exact presence palette color values (must be accessible on both light/dark canvas backgrounds)
- Cursor arrow SVG shape, exact pixel dimensions, pill font size and padding
- Coordinate conversion utility (canvas coords ↔ screen px using Excalidraw's `appState.scrollX/Y/zoom`)
- Whether participant state is tracked in `CollabRoomService` (backend map) vs purely in frontend via socket events
- Throttle implementation detail (lodash throttle, manual `setTimeout`, or `requestAnimationFrame`-gated emit)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing gateway and room service (extend for Phase 5)

- `apps/api/src/modules/collab/collab.gateway.ts` — Current gateway: `join-room`, `yjs-update`, `handleDisconnect`. Phase 5 adds `cursor-move` handler and participant join/leave broadcasts. No-echo relay pattern must be preserved.
- `apps/api/src/modules/collab/collab.room.service.ts` — Tracks `socketToRoom` map and GC logic. May need extension to store participant display name + color index per socket for the `participant-list` event on join.

### Frontend collab context (extend for Phase 5)

- `apps/web/contexts/collab-context.tsx` — CollabProvider holding socket, Y.Doc, yElements, connectionStatus. Phase 5 adds: remote cursor state map (`Map<socketId, {x, y, name, color}>`), participants list, and cursor-move emit (throttled).

### Canvas UI surfaces (extend for Phase 5)

- `apps/web/src/components/canvas/canvas-header.tsx` — Current header: logo + copy-link. Phase 5 adds participant avatars between logo and copy button.
- `apps/web/app/canvas/[slug]/page.tsx` — Canvas page layout. Phase 5 adds a cursor overlay component layered over `<ExcalidrawWrapper />`.

### Phase 4 context (carry forward all header/layout decisions)

- `.planning/phases/04-canvas-ui-and-drawing-tools/04-CONTEXT.md` — Minimal header philosophy, CollabProvider placement, join-first flow, connection state UX with sonner toasts.

### Requirements

- `.planning/REQUIREMENTS.md` — COLB-02 (live named color-coded cursors) and COLB-03 (participant list showing who is in the room).

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `socket.data.user` (set in gateway auth middleware) — already contains `user.name` and `user.id`; display name and ID for color hashing are available at connection time without additional lookup
- `CollabRoomService.registerSocket()` / `removeSocket()` — already tracks which socket is in which room; participant info can be layered on top
- `sonner` (`toast`) — already installed; available for any future notifications
- `lucide-react` — already available for icons (chevron, users, etc. for the participant dropdown)
- `cn()` from `@/lib/utils` — use for conditional class merging in cursor overlay and avatar components

### Established Patterns

- Socket relay pattern: `client.to(slug).emit(event, data)` (no self-echo) — `cursor-move` follows the same relay
- `CollabContext` shape: existing context value is extended (not replaced) — add `remoteCursors`, `participants` alongside existing fields
- `'use client'` at top of all interactive components
- Overlay pattern: canvas page uses `position:absolute` surfaces already (loading overlay with `fixed inset-0`) — cursor overlay follows same stacking approach

### Integration Points

- `CollabGateway.handleJoinRoom()` — after joining, emit `participant-joined` to room with `{ socketId, name, colorIndex }` so all clients update their participant list
- `CollabGateway.handleDisconnect()` — after `removeSocket()`, emit `participant-left` to the room with `{ socketId }` so clients remove the cursor and avatar
- `CanvasHeader` — receives participants list from `useCollab()` and renders avatars
- Cursor overlay component — sits between `<CanvasHeader />` and `<ExcalidrawWrapper />` in the `CanvasInner` flex column, absolutely positioned over the canvas `<main>` element

</code_context>

<specifics>
## Specific Ideas

- Cursor arrow is filled (not outline) — this is the distinctive UniShare touch vs Figma/Miro outline cursors
- Coordinate conversion: Excalidraw exposes `appState.scrollX`, `appState.scrollY`, and `appState.zoom.value` via the imperative API — use these to convert scene coords to screen px for cursor rendering
- The `excalidrawAPI` is already stored in CollabContext (`excalidrawAPI` / `setExcalidrawAPI`) — use `excalidrawAPI.getAppState()` to read scroll/zoom for coordinate conversion

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

_Phase: 05-presence-and-awareness_
_Context gathered: 2026-03-20_
