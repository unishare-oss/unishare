# Phase 8: Canvas Hub — Boards Page - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

A `/boards` hub page inside the main UniShare app shell where authenticated users see all their owned rooms as cards and can create new rooms. Covers: the boards list page (route, nav wiring, backend list endpoint), room cards (metadata display, actions), the create-room modal flow, delete-room action, rename and visibility-change from the card, and the featured empty state for new users. Per-user invite/role management is out of scope (deferred from Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Route & Navigation

- Route: `/boards` — inside `(app)/(protected)/boards/` so auth is enforced and AppShell nav renders
- Auth-required: unauthenticated users are redirected to `/login` (same as `/my-posts`)
- Sidebar nav (`authNavItems` in `app-sidebar.tsx`): add a "Boards" entry with a layout/grid Lucide icon; amber active state on `/boards` pathname
- Mobile nav (`authTabs` in `mobile-nav.tsx`): add "Boards" tab, **replace the "Saved" tab** (Saved is still accessible via post cards and profile)

### Room Card Design

- Each card shows: title (falls back to `"Untitled"` in `text-text-muted` when `room.title` is null), visibility badge (OPEN / VIEW_ONLY / PRIVATE), created date (`"Created X ago"`), and last modified date (`"Updated X ago"`)
- Primary action: clicking the card body navigates to `/canvas/[slug]`
- Secondary actions surfaced via a **3-dot kebab menu (`⋮`) that appears on hover** (and is always accessible on touch):
  - Open board → navigate to `/canvas/[slug]`
  - Copy link → copies `window.location.origin + "/canvas/" + slug` to clipboard + sonner toast "Link copied"
  - Rename → opens an inline rename input or small popover with a title field + save button; calls `PATCH /rooms/:slug` with `{ title }`
  - Change visibility → a visibility selector (segmented control: OPEN / VIEW_ONLY / PRIVATE) in the dropdown/popover; calls `PATCH /rooms/:slug` with `{ visibility }`; optimistic update with rollback on error
  - Delete → opens a confirm dialog ("Delete this board? This cannot be undone.") → calls `DELETE /rooms/:slug` on confirm → removes card from list
- Delete is destructive — always requires the `ConfirmDialog` component

### Create Room Flow

- Trigger: "New Board" button in the `PageHeader` `action` slot (top-right of the sticky header)
- Interaction: opens a modal dialog
- Modal fields: single optional `title` input, placeholder `"Untitled board"`, no other fields
- Default visibility on creation: OPEN (matches current `createRoom` default in `collabService`)
- On success: navigate to `/canvas/[slug]` of the newly created room
- On error: show a sonner toast with the error message; keep modal open

### Empty State

- When the user has no rooms: show a **featured hero empty state** (not the existing plain `EmptyState` component)
- Visual: a custom inline SVG illustration depicting a blank canvas/drawing board, styled with theme CSS variables (no external asset files needed)
- Content: illustration + headline ("No boards yet") + sub-copy ("Create a board and start collaborating with your classmates") + a "New Board" CTA button that opens the same create modal
- Layout: centred in the page body, similar to how the canvas full-screen states are centred

### Backend — New Endpoints Required

- `GET /rooms` with optional `?ownerId=:id` query param — returns the authenticated user's rooms ordered by `updatedAt DESC`. Requires a new `findByOwner(ownerId)` method in `CollabRepository` and a new controller route. Auth required.
- `DELETE /rooms/:slug` — owner-only delete. Repository method `deleteBySlug(slug)`. Returns 204 on success, 403 if caller is not the owner, 404 if not found.
- `PATCH /rooms/:slug` already exists and handles both `title` and `visibility` updates via `UpdateRoomDto` — verify `title` is included in the DTO (add if missing).

### Claude's Discretion

- Exact card layout dimensions, border, shadow, and hover states (match existing card patterns in the app)
- Lucide icon choice for the Boards nav entry (LayoutGrid, Layers, or PenTool all work)
- Exact popover/dropdown component used for the kebab menu (Radix DropdownMenu is already used elsewhere)
- Loading skeleton for the boards list while fetching (match `post-card-skeleton.tsx` style)
- Pagination or infinite scroll for large room lists (simple list with no pagination is fine for v1)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Navigation wiring

- `apps/web/components/app-sidebar.tsx` — `authNavItems` array to add Boards entry; sidebar link active state pattern
- `apps/web/components/mobile-nav.tsx` — `authTabs` array; replace Saved with Boards

### Page & component patterns

- `apps/web/app/(app)/(protected)/my-posts/page.tsx` — Closest structural analog: protected route, PageHeader + list
- `apps/web/components/shared/page-header.tsx` — `PageHeader` with `action` prop (New Board button goes here)
- `apps/web/components/shared/empty-state.tsx` — Existing simple EmptyState (Phase 8 uses a custom hero instead, but understand the pattern)
- `apps/web/components/shared/confirm-dialog.tsx` — Confirm dialog used for delete

### Backend — collab module

- `apps/api/src/modules/collab/collab.controller.ts` — Existing endpoints; add GET /rooms and DELETE /rooms/:slug here
- `apps/api/src/modules/collab/collab.repository.ts` — Add `findByOwner` and `deleteBySlug` methods here
- `apps/api/src/modules/collab/collab.service.ts` — Add `getRoomsByOwner` and `deleteRoom` service methods
- `apps/api/src/modules/collab/dto/update-room.dto.ts` — Verify `title` field is present; add if missing
- `apps/api/prisma/schema.prisma` (model Room) — Room fields: id, slug, title, ownerId, createdAt, updatedAt, visibility

### Phase 7 settings pattern

- `.planning/phases/07-room-access-control/07-CONTEXT.md` — Visibility change via PATCH /rooms/:slug; optimistic update + rollback pattern established in Phase 7 SettingsPopover

### Requirements

- `.planning/REQUIREMENTS.md` — Full requirements list (Phase 8 is TBD; this context defines the scope)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `PageHeader` (`apps/web/components/shared/page-header.tsx`): sticky header with `action` slot — use for "New Board" button
- `ConfirmDialog` (`apps/web/components/shared/confirm-dialog.tsx`): use for delete confirmation
- `sonner` (`toast`): already installed; use for "Link copied", create errors, delete errors
- `PATCH /rooms/:slug` endpoint: already handles visibility updates; extend DTO for title rename
- `authClient` + `useAuth()`: provides `user.id` for the `?ownerId=` query param

### Established Patterns

- Protected routes live in `apps/web/app/(app)/(protected)/` — wrap with `AuthGuard` or rely on the existing protected layout
- `'use client'` at top of interactive pages; named exports for components, `export default` for pages
- React Query via Orval-generated hooks — after adding the new endpoint, run `pnpm api:sync` to generate the hook
- Optimistic updates with rollback: see Phase 7 `SettingsPopover` pattern in canvas-header

### Integration Points

- `apps/web/app/(app)/(protected)/boards/page.tsx` — new page file
- `apps/web/components/app-sidebar.tsx` — add "Boards" to `authNavItems`
- `apps/web/components/mobile-nav.tsx` — replace "Saved" with "Boards" in `authTabs`
- `apps/api/src/modules/collab/collab.controller.ts` — add GET /rooms, DELETE /rooms/:slug
- `apps/api/src/modules/collab/collab.repository.ts` — add `findByOwner`, `deleteBySlug`

</code_context>

<specifics>
## Specific Ideas

- Room cards should have a title that falls back to `"Untitled"` rendered in `text-text-muted` (not a bold placeholder)
- The kebab menu is revealed on hover (desktop) but should always be tappable on touch devices — do not hide it behind hover-only CSS on mobile
- After "Copy link" the clipboard action should use `navigator.clipboard.writeText()` with a sonner toast "Link copied"
- The hero SVG for the empty state should use `currentColor` / theme CSS vars so it adapts to light/dark themes automatically

</specifics>

<deferred>
## Deferred Ideas

- **Per-user role management / invites** (noted in Phase 7): owner can invite specific users as editors or viewers. Requires RoomMember table, invite UI, per-socket permission checks. Not in this phase.
- **Transferring room ownership**: related to per-user roles, deferred with it.
- **Rooms browsable by course/department** (ROOM-V2-02 from REQUIREMENTS.md): out of scope for v1.
- **Room thumbnail preview**: showing a snapshot thumbnail on the card. Not in scope — snapshot is stored as binary Yjs bytes, not a renderable image.

</deferred>

---

_Phase: 08-canvas-hub-boards-page-with-owned-rooms-list-and-create-room-flow_
_Context gathered: 2026-03-21_
