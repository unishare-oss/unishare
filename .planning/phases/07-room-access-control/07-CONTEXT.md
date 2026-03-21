# Phase 7: Room Access Control - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Add room-level access control: a `visibility` enum (OPEN / VIEW_ONLY / PRIVATE), enforcement in the gateway and frontend, and an owner-only settings popover in the canvas header for toggling visibility and copying the room link. Per-user invite/role management is out of scope — deferred to Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Access Rules

- Default: OPEN — everyone edits (current behaviour preserved)
- VIEW_ONLY: anonymous users (isAnonymous=true) are read-only; authenticated users stay as editors
- PRIVATE: anonymous users are blocked entirely — joinRoom returns 403 for isAnonymous=true; client shows an inline "Sign in to access" gate
- Replace `Room.isGuestEditingAllowed Boolean` with `Room.visibility` enum: `OPEN | VIEW_ONLY | PRIVATE`
- Every visitor already has a Better Auth session (anonymous or real); "guest" = `session.user.isAnonymous === true`
- Authenticated users always have edit access regardless of visibility setting (only guest behaviour changes)

### Enforcement

- Both layers: gateway blocks + UI disables
  - Gateway: ignore `yjs-update` events from sockets where the stored `isViewOnly` flag is true (server-enforced, tamper-proof)
  - Frontend: pass `viewModeEnabled={isViewOnly}` to Excalidraw (disables toolbar and drawing)
- Viewers get full presence: see live cursors and participant list; their own cursor is emitted and visible to editors

### Room Settings Surface

- Owner-only settings gear icon in the canvas header (hidden entirely for non-owners)
- Opens a small popover/sheet with:
  1. Segmented control or radio group: Open / View-only / Private
  2. Copy Link button (copies the current room slug URL — one link, behaviour governed by visibility)
- No separate tokenised view-only link — single room URL, behaviour depends on visibility setting
- Visibility change is saved immediately via PATCH /rooms/:slug

### Private Mode Gate

- When PRIVATE blocks an anonymous user: canvas page renders an inline centred gate — "This board is private. Sign in to access." with a Sign In button. No redirect, no 404.

### Link Model

- One link: /canvas/[slug] — same URL for all users; access rules applied server-side on join
- No separate view-only token URL in this phase

### Claude's Discretion

- Exact popover/sheet component to use (Popover vs Sheet — match existing canvas header patterns)
- Migration strategy for existing rooms (default all to OPEN)
- Error message copy for 403 on PRIVATE rooms

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing access control foundation

- `apps/api/src/modules/collab/collab.service.ts` — joinRoom already computes isViewOnly from isGuestEditingAllowed; Phase 7 replaces that with visibility enum
- `apps/api/src/modules/collab/collab.gateway.ts` — yjs-update handler where view-only enforcement must be added
- `apps/api/prisma/schema.prisma` (model Room) — isGuestEditingAllowed to be replaced with visibility enum

### Frontend canvas surface

- `apps/web/src/components/canvas/canvas-header.tsx` — settings gear added here, owner check via userId === room.ownerId
- `apps/web/contexts/collab-context.tsx` — isViewOnly already flows from join response; wire to Excalidraw viewModeEnabled
- `apps/web/app/canvas/[slug]/page.tsx` — inline gate rendered here for PRIVATE + anonymous

### Requirements

- `.planning/REQUIREMENTS.md` §Access Control — SHARE-01, SHARE-02, SHARE-03

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `isViewOnly` in join response: already computed and returned from `collabService.joinRoom` — just needs the visibility enum to drive it
- `isAnonymous` prop: already flows from join → CollabProvider → Collab context → CanvasHeader (wired in Phase 6)
- `canvas-header.tsx` export dropdown: established pattern for adding popover controls to the header
- `export-utils.ts`: no overlap, but the header popover pattern from Export dropdown is the right model for settings

### Established Patterns

- Owner check: `room.ownerId` returned from join response alongside `userId` — compare to gate owner-only UI
- Socket data: Phase 5 stores `colorIndex` and `name` on `socket.data` before `client.join(slug)` — same pattern for storing `isViewOnly` on socket.data for gateway enforcement
- Better Auth anonymous: `session.user.isAnonymous === true` is the canonical guest check

### Integration Points

- Prisma migration: add `RoomVisibility` enum, replace `isGuestEditingAllowed` with `visibility`
- PATCH /rooms/:slug: new endpoint (or extend existing) for owner to update visibility
- Gateway `handleYjsUpdate`: add early-return guard if `socket.data.isViewOnly === true`
- Excalidraw `<Excalidraw viewModeEnabled={isViewOnly} />`: prop already documented in Excalidraw API

</code_context>

<specifics>
## Specific Ideas

- Settings gear should only render when `userId === ownerId` (both available from join response)
- The inline private gate should reuse the existing sign-in flow (Better Auth) — no custom auth page needed
- Visibility change should be optimistic in the UI with rollback on API error

</specifics>

<deferred>
## Deferred Ideas

- **Per-user role management** (Phase 8): Owner can invite specific authenticated users as editors or viewers. Requires a RoomMember table, invite UI, and per-socket permission checks in the gateway.
- **Transferring room ownership**: Related to per-user roles — deferred with it.

</deferred>

---

_Phase: 07-room-access-control_
_Context gathered: 2026-03-21_
