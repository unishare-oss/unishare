# Phase 7: Room Access Control - Research

**Researched:** 2026-03-21
**Domain:** NestJS access control, Prisma enum migration, Excalidraw viewModeEnabled, shadcn/ui Popover
**Confidence:** HIGH

## Summary

Phase 7 is a tight, well-scoped feature with very little novel technology to discover. All the building blocks exist in the codebase: `isViewOnly` already flows from `joinRoom` response through `CollabProvider` to the canvas, `socket.data` is already used for per-connection metadata in the gateway, and the `Popover` and `RadioGroup` UI components are already installed. The primary work is surgical replacement of `isGuestEditingAllowed Boolean` with a `visibility` enum at the Prisma/DB layer, propagating that enum through the service and gateway, and adding the owner-only settings UI to the canvas header.

The access enforcement model is backend-authoritative: the gateway ignores `yjs-update` events from sockets where `socket.data.isViewOnly === true`. The frontend enforces separately via `<Excalidraw viewModeEnabled={isViewOnly} />`. Both layers are independently sufficient; together they prevent both accidental and deliberate editing by view-only users.

The PRIVATE mode gate (anonymous user blocked from the room entirely) requires a new `403` response path in `joinRoom` that the page must handle by rendering an inline sign-in gate — currently the page only handles `404` and success. The `PATCH /rooms/:slug` endpoint for visibility changes is the one genuinely new REST surface.

**Primary recommendation:** Execute in three vertical slices — (1) DB + API layer (migration, service, PATCH endpoint), (2) gateway enforcement + isViewOnly propagation, (3) frontend settings UI + private gate. Each slice is independently testable.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Default: OPEN — everyone edits (current behaviour preserved)
- VIEW_ONLY: anonymous users (isAnonymous=true) are read-only; authenticated users stay as editors
- PRIVATE: anonymous users are blocked entirely — joinRoom returns 403 for isAnonymous=true; client shows an inline "Sign in to access" gate
- Replace `Room.isGuestEditingAllowed Boolean` with `Room.visibility` enum: `OPEN | VIEW_ONLY | PRIVATE`
- Every visitor already has a Better Auth session (anonymous or real); "guest" = `session.user.isAnonymous === true`
- Authenticated users always have edit access regardless of visibility setting (only guest behaviour changes)
- Both layers: gateway blocks + UI disables
  - Gateway: ignore `yjs-update` events from sockets where the stored `isViewOnly` flag is true (server-enforced, tamper-proof)
  - Frontend: pass `viewModeEnabled={isViewOnly}` to Excalidraw (disables toolbar and drawing)
- Viewers get full presence: see live cursors and participant list; their own cursor is emitted and visible to editors
- Owner-only settings gear icon in the canvas header (hidden entirely for non-owners)
- Opens a small popover/sheet with: (1) Segmented control or radio group: Open / View-only / Private, (2) Copy Link button
- No separate tokenised view-only link — single room URL, behaviour governed by visibility
- Visibility change is saved immediately via PATCH /rooms/:slug
- When PRIVATE blocks an anonymous user: canvas page renders an inline centred gate — "This board is private. Sign in to access." with a Sign In button. No redirect, no 404.
- One link: /canvas/[slug] — same URL for all users; access rules applied server-side on join
- No separate view-only token URL in this phase

### Claude's Discretion

- Exact popover/sheet component to use (Popover vs Sheet — match existing canvas header patterns)
- Migration strategy for existing rooms (default all to OPEN)
- Error message copy for 403 on PRIVATE rooms

### Deferred Ideas (OUT OF SCOPE)

- Per-user role management (Phase 8): Owner can invite specific authenticated users as editors or viewers. Requires a RoomMember table, invite UI, and per-socket permission checks in the gateway.
- Transferring room ownership: Related to per-user roles — deferred with it.
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID       | Description                                                                                                                 | Research Support                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| SHARE-01 | Room owner can set room visibility to public (view-only for anyone with the link) or private (edit-only, current behaviour) | Prisma enum migration + PATCH /rooms/:slug + owner check via userId === ownerId                                      |
| SHARE-02 | A view-only link allows anyone to see the live board state without drawing or modifying it                                  | isViewOnly flag in joinRoom response → gateway socket.data guard + Excalidraw viewModeEnabled prop                   |
| SHARE-03 | Room owner can revoke or regenerate the view-only link at any time                                                          | PATCH /rooms/:slug allows toggling visibility back to OPEN; no tokenised link means "revoking" = changing visibility |

</phase_requirements>

---

## Standard Stack

### Core

| Library              | Version            | Purpose                               | Why Standard                                                                                              |
| -------------------- | ------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Prisma               | Already in project | DB schema migration, enum types, CRUD | Used throughout the project                                                                               |
| NestJS               | Already in project | PATCH endpoint, guards, service layer | Project framework                                                                                         |
| Excalidraw           | Already in project | viewModeEnabled prop disables drawing | Official API prop, no custom work needed                                                                  |
| shadcn/ui Popover    | Already installed  | Settings popover in canvas header     | Matches existing DropdownMenu pattern in header; Popover component present at `components/ui/popover.tsx` |
| shadcn/ui RadioGroup | Already installed  | Open/View-only/Private selector       | Present at `components/ui/radio-group.tsx`                                                                |

### No new dependencies needed

This phase requires zero new npm packages. All components are already available.

## Architecture Patterns

### Data Flow: Visibility Enum

```
Room.visibility (DB)
  → findBySlugWithVisibility (repository)
  → joinRoom() computes isViewOnly (service)
  → HTTP join response {isViewOnly, ownerId, userId}
  → page.tsx stores isViewOnly, ownerId, userId in state
  → CollabProvider receives isViewOnly as prop
  → context exposes isViewOnly
  → ExcalidrawWrapper: viewModeEnabled={isViewOnly}
  → gateway handleJoinRoom: socket.data.isViewOnly = isViewOnly
  → gateway handleYjsUpdate: if socket.data.isViewOnly → return early
```

### Pattern 1: Prisma Enum Migration

**What:** Replace `isGuestEditingAllowed Boolean @default(true)` with `visibility RoomVisibility @default(OPEN)` and add `enum RoomVisibility { OPEN VIEW_ONLY PRIVATE }` to schema.
**When to use:** Standard Prisma approach for replacing a boolean flag with a multi-value state.
**Example:**

```prisma
// In schema.prisma
enum RoomVisibility {
  OPEN
  VIEW_ONLY
  PRIVATE
}

model Room {
  // ... existing fields ...
  visibility RoomVisibility @default(OPEN)  // replaces isGuestEditingAllowed
  // remove: isGuestEditingAllowed Boolean @default(true)
}
```

Migration: `npx prisma migrate dev --name add-room-visibility`
The migration SQL will: add `visibility` column with default `OPEN`, drop `isGuestEditingAllowed`. Existing rooms automatically get `OPEN` (matching the "default all existing to OPEN" discretion).

### Pattern 2: isViewOnly Logic in Service

**What:** Replace the single boolean condition with enum-driven logic.

```typescript
// New logic in collabService.joinRoom:
// OPEN: isViewOnly = false for all
// VIEW_ONLY: isViewOnly = isAnonymous
// PRIVATE: throw ForbiddenException if isAnonymous; isViewOnly = false for authenticated

if (room.visibility === 'PRIVATE' && isAnonymous) {
  throw new ForbiddenException('Room is private')
}
const isViewOnly = room.visibility === 'VIEW_ONLY' && isAnonymous
```

### Pattern 3: Gateway Socket-Level Guard

**What:** Store isViewOnly on `socket.data` at join time, check it in `handleYjsUpdate`.

```typescript
// In handleJoinRoom — store alongside existing metadata:
client.data.isViewOnly = isViewOnly // add after colorIndex/name assignment

// In handleYjsUpdate — early return guard:
if (client.data.isViewOnly) return
```

This follows the established Phase 5 pattern of setting socket.data before `client.join(slug)`.

### Pattern 4: PATCH /rooms/:slug Endpoint

**What:** Owner-only endpoint to update visibility.

```typescript
// collabController.ts
@Patch(':slug')
@ApiOkResponse({ type: RoomEntity })
@ResponseMessage('Room updated')
updateRoom(
  @Param('slug') slug: string,
  @Body() dto: UpdateRoomDto,
  @Session() session: UserSession,
) {
  return this.collabService.updateRoom(slug, dto, session.user.id)
}
```

Service method checks `room.ownerId === userId`, throws `ForbiddenException` if not owner.

### Pattern 5: Private Gate on Canvas Page

**What:** New `joinState` variant `'private'` alongside existing `'joining' | 'joined' | 'not-found'`. When HTTP join returns 403, render inline gate.

```typescript
type JoinState = 'joining' | 'joined' | 'not-found' | 'private'

// In joinRoom fetch handler:
if (res.status === 403) {
  setJoinState('private')
  return
}

// Render:
if (joinState === 'private') {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Lock className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-xl font-semibold text-foreground">This board is private</h1>
      <p className="text-sm text-muted-foreground">Sign in to access</p>
      <Button asChild variant="default">
        <Link href="/sign-in">Sign In</Link>
      </Button>
    </div>
  )
}
```

### Pattern 6: Settings Popover in Canvas Header

**What:** Owner-only gear icon using existing Popover component. The `ownerId` and `userId` must flow from join response into CollabContext (they don't currently). The existing pattern is `isAnonymous` flowing as a prop to `CollabProvider`.

**How ownerId/userId flow must be added:**

1. `page.tsx` already reads `data.isAnonymous` from join response — extend to also read `data.ownerId`, `data.userId`
2. Pass as props to `CollabProvider`: `ownerId={ownerId} userId={userId}`
3. Expose in `CollabContext` (alongside existing `isAnonymous`)
4. `CanvasHeader` reads `const { isAnonymous, ownerId, userId } = useCollab()`

```typescript
// SettingsPopover component (new, owner-only):
function SettingsPopover() {
  const { ownerId, userId } = useCollab()
  const { slug } = useParams<{ slug: string }>()
  // Only render for owner
  if (userId !== ownerId) return null
  // ... Popover with RadioGroup for OPEN/VIEW_ONLY/PRIVATE + Copy Link button
}
```

### Recommended Project Structure Changes

```
apps/api/src/modules/collab/
├── dto/
│   ├── create-room.dto.ts          (existing)
│   ├── join-room-response.dto.ts   (existing — no change needed)
│   └── update-room.dto.ts          (NEW — visibility field)
├── collab.controller.ts            (add PATCH handler)
├── collab.service.ts               (update joinRoom + add updateRoom)
├── collab.gateway.ts               (add isViewOnly guard in handleYjsUpdate + store on socket.data)
├── collab.repository.ts            (add findBySlugWithVisibility + updateVisibility methods)
└── prisma/schema.prisma            (add RoomVisibility enum, replace isGuestEditingAllowed)

apps/web/
├── contexts/collab-context.tsx     (add ownerId, userId, isViewOnly to context)
├── app/canvas/[slug]/page.tsx      (add 'private' joinState, pass ownerId/userId/isViewOnly to provider)
├── src/components/canvas/
│   ├── canvas-header.tsx           (add SettingsPopover, render conditionally for owner)
│   └── excalidraw-wrapper.tsx      (add viewModeEnabled={isViewOnly})
```

### Anti-Patterns to Avoid

- **Re-reading visibility from DB on every yjs-update:** The visibility at socket.data.isViewOnly is set at join time and is authoritative for that session. No DB lookup needed per update — same pattern as colorIndex.
- **Using joinState === 'not-found' to handle 403:** The private gate is a distinct UX from "room doesn't exist." Must be a separate state.
- **Adding isViewOnly prop to CollabProvider without also adding ownerId/userId:** The settings UI needs ownerId to gate the gear icon. Both should be added in the same context expansion.
- **Emitting visibility change events via socket:** The visibility update is a REST PATCH, not a socket event. Simplicity wins — no need to broadcast visibility changes to connected sockets in this phase.

## Don't Hand-Roll

| Problem               | Don't Build                     | Use Instead                                                          | Why                                         |
| --------------------- | ------------------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| Popover UI            | Custom modal/dropdown           | `Popover` + `PopoverContent` from `components/ui/popover.tsx`        | Already installed, matches header aesthetic |
| Visibility selector   | Custom toggle buttons           | `RadioGroup` + `RadioGroupItem` from `components/ui/radio-group.tsx` | Already installed                           |
| Owner-only gate       | Complex role system             | Simple `userId === ownerId` comparison                               | ownerId returned from joinRoom already      |
| View-mode enforcement | Custom canvas event interceptor | `<Excalidraw viewModeEnabled={true} />`                              | Official Excalidraw API prop                |

## Common Pitfalls

### Pitfall 1: Forgetting isViewOnly on socket.data in handleJoinRoom

**What goes wrong:** The gateway enforces isViewOnly by checking `socket.data.isViewOnly` in `handleYjsUpdate`, but if it's never set in `handleJoinRoom`, view-only sockets can still edit.
**Why it happens:** `handleJoinRoom` currently doesn't fetch room visibility — it only calls `findBySlug` which won't have the visibility field after migration.
**How to avoid:** Either update `handleJoinRoom` to compute isViewOnly from room.visibility + socket.data.user.isAnonymous, or change `findBySlug` to include visibility. The service `joinRoom` already does this computation — the gateway can call the service or do an equivalent check.
**Warning signs:** View-only users can still draw on the canvas despite viewModeEnabled being true on the frontend (since the update still reaches the doc via the gateway).

### Pitfall 2: PATCH endpoint missing owner check

**What goes wrong:** Any authenticated user can change any room's visibility.
**Why it happens:** NestJS PATCH endpoints don't auto-scope to the resource owner.
**How to avoid:** In `collabService.updateRoom`, fetch the room first, compare `room.ownerId === userId`, throw `ForbiddenException` if mismatch.
**Warning signs:** Ownership check missing from service unit tests.

### Pitfall 3: collabContext missing isViewOnly for ExcalidrawWrapper

**What goes wrong:** ExcalidrawWrapper currently doesn't receive isViewOnly. If it's not added to CollabContext and passed to `<Excalidraw viewModeEnabled={...} />`, the UI enforcement layer is absent.
**Why it happens:** isViewOnly currently only exists in `page.tsx` state and is passed to `CollabProvider` but not exposed in the context or used by ExcalidrawWrapper.
**How to avoid:** Add `isViewOnly: boolean` to `CollabContextValue` interface, include it in `coreValue` (the stable useMemo), and read it in `ExcalidrawWrapper`.
**Warning signs:** ExcalidrawWrapper renders Excalidraw without viewModeEnabled prop.

### Pitfall 4: Optimistic update rollback pattern

**What goes wrong:** UI updates visibility optimistically, API call fails silently, UI is now out of sync with DB.
**Why it happens:** Optimistic updates without rollback leave state inconsistent.
**How to avoid:** Capture previous state before optimistic update, restore on error, show toast. The context notes optimistic update with rollback as a specific requirement.

### Pitfall 5: Migration drops isGuestEditingAllowed before references removed

**What goes wrong:** Running `prisma migrate dev` while TypeScript code still references `room.isGuestEditingAllowed` causes type errors.
**Why it happens:** Migration and code change are decoupled.
**How to avoid:** Update the schema, run `prisma generate` first (to update types), then update all code references, then `prisma migrate dev`.

### Pitfall 6: handleJoinRoom in gateway uses findBySlug which won't return visibility

**What goes wrong:** Gateway calls `collabRepository.findBySlug` which selects all fields — this is fine after migration since the new `visibility` column will be included. BUT: the gateway currently doesn't store isViewOnly on socket.data at all.
**Why it happens:** Gateway handleJoinRoom was written before visibility existed.
**How to avoid:** In gateway handleJoinRoom, after setting colorIndex and name, also compute and store `socket.data.isViewOnly` from `room.visibility` and `socket.data.user.isAnonymous`.

## Code Examples

Verified patterns from existing codebase:

### Existing isViewOnly computation (collab.service.ts line 61)

```typescript
// Current — to be replaced:
const isViewOnly = !room.isGuestEditingAllowed && isAnonymous

// New pattern:
if (room.visibility === RoomVisibility.PRIVATE && isAnonymous) {
  throw new ForbiddenException('Room is private')
}
const isViewOnly = room.visibility === RoomVisibility.VIEW_ONLY && isAnonymous
```

### Socket.data metadata pattern (Phase 5 precedent in gateway, line 101-103)

```typescript
// Existing pattern — assigned BEFORE client.join(slug):
const colorIndex = this.hashToColorIndex(client.data.user.id)
client.data.colorIndex = colorIndex
client.data.name = client.data.user.name

// Phase 7 addition — same location, same pattern:
client.data.isViewOnly = isViewOnly // computed from room.visibility + user.isAnonymous
```

### yjs-update guard (gateway, line 139)

```typescript
@SubscribeMessage('yjs-update')
handleYjsUpdate(@ConnectedSocket() client: Socket, @MessageBody() data: Buffer | Uint8Array): void {
  if (client.data.isViewOnly) return  // ADD THIS LINE — view-only enforcement
  const slug = this.collabRoomService.getRoomForSocket(client.id)
  if (!slug) return
  // ... rest unchanged
}
```

### Existing page.tsx join fetch (page.tsx line 27-46) — adding 403 handling

```typescript
// Current state type:
type JoinState = 'joining' | 'joined' | 'not-found'

// Updated:
type JoinState = 'joining' | 'joined' | 'not-found' | 'private'

// In joinRoom fetch, after ok check:
if (res.status === 403) {
  setJoinState('private')
  return
}
```

### Popover component usage (matching existing DropdownMenu pattern in canvas-header.tsx)

```typescript
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Settings } from 'lucide-react'

function SettingsPopover() {
  const { ownerId, userId, isViewOnly } = useCollab()
  // Gate: only render for owner
  if (userId !== ownerId) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Room settings">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64">
        {/* RadioGroup for OPEN/VIEW_ONLY/PRIVATE */}
        {/* Copy Link button */}
      </PopoverContent>
    </Popover>
  )
}
```

## State of the Art

| Old Approach                    | Current Approach                   | When Changed      | Impact                                                      |
| ------------------------------- | ---------------------------------- | ----------------- | ----------------------------------------------------------- |
| `isGuestEditingAllowed Boolean` | `visibility RoomVisibility enum`   | Phase 7 migration | Enables three-way state instead of binary flag              |
| No settings UI                  | Owner-only settings gear in header | Phase 7           | Owners can self-serve visibility without admin intervention |

**Fields being removed:**

- `Room.isGuestEditingAllowed`: replaced by `Room.visibility`
- `CollabRepository.findBySlugWithGuestFlag`: rename/replace with `findBySlugWithVisibility`

## Open Questions

1. **How does handleJoinRoom in the gateway compute isViewOnly?**
   - What we know: The service's `joinRoom` already does this, but the gateway's `handleJoinRoom` uses the repository directly. The gateway can either (a) call `collabService.joinRoom` (risk: creates anonymous sessions), or (b) do a simpler direct check: `room.visibility === 'VIEW_ONLY' && socket.data.user.isAnonymous`.
   - What's unclear: Whether the gateway should reuse service logic or do its own check.
   - Recommendation: Option (b) — simple direct check in gateway. The service's `joinRoom` has side effects (creates anonymous sessions) that the gateway must not trigger. The gateway can do `const isViewOnly = room.visibility === 'VIEW_ONLY' && !!socket.data.user.isAnonymous` inline.

2. **What happens to already-connected VIEW_ONLY sockets when owner changes visibility back to OPEN?**
   - What we know: The visibility is stored on `socket.data.isViewOnly` at join time and never updated.
   - What's unclear: Should a visibility change mid-session retroactively affect connected sockets?
   - Recommendation: Out of scope for Phase 7 — socket-level re-authorization on visibility change is deferred. Affected users rejoin to get updated access. Document this as a known limitation.

## Validation Architecture

### Test Framework

| Property           | Value                                                                        |
| ------------------ | ---------------------------------------------------------------------------- |
| Framework          | Jest (NestJS default)                                                        |
| Config file        | `apps/api/package.json` (jest key)                                           |
| Quick run command  | `cd apps/api && npx jest --testPathPattern=collab.service --passWithNoTests` |
| Full suite command | `cd apps/api && npx jest`                                                    |

### Phase Requirements → Test Map

| Req ID   | Behavior                                               | Test Type | Automated Command                                                               | File Exists?                 |
| -------- | ------------------------------------------------------ | --------- | ------------------------------------------------------------------------------- | ---------------------------- |
| SHARE-01 | PATCH /rooms/:slug updates visibility, owner-only      | unit      | `cd apps/api && npx jest --testPathPattern=collab.service -t "updateRoom"`      | ❌ Wave 0                    |
| SHARE-01 | Non-owner PATCH throws ForbiddenException              | unit      | `cd apps/api && npx jest --testPathPattern=collab.service -t "updateRoom"`      | ❌ Wave 0                    |
| SHARE-02 | VIEW_ONLY + anonymous → isViewOnly: true in joinRoom   | unit      | `cd apps/api && npx jest --testPathPattern=collab.service -t "joinRoom"`        | ✅ (existing test updated)   |
| SHARE-02 | VIEW_ONLY + authenticated → isViewOnly: false          | unit      | `cd apps/api && npx jest --testPathPattern=collab.service -t "joinRoom"`        | ✅ (existing test updated)   |
| SHARE-02 | Gateway ignores yjs-update when socket.data.isViewOnly | unit      | `cd apps/api && npx jest --testPathPattern=collab.gateway.spec -t "yjs-update"` | ✅ (existing file, new case) |
| SHARE-03 | PRIVATE + anonymous → 403 ForbiddenException           | unit      | `cd apps/api && npx jest --testPathPattern=collab.service -t "joinRoom"`        | ❌ Wave 0 (new test case)    |
| SHARE-03 | OPEN + anonymous → isViewOnly: false (still can edit)  | unit      | `cd apps/api && npx jest --testPathPattern=collab.service -t "joinRoom"`        | ✅ (existing test updated)   |

### Sampling Rate

- **Per task commit:** `cd apps/api && npx jest --testPathPattern=collab.service --passWithNoTests`
- **Per wave merge:** `cd apps/api && npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] New test cases in `collab.service.spec.ts` for `updateRoom` (owner check, visibility update)
- [ ] New test cases in `collab.service.spec.ts` for PRIVATE + anonymous → ForbiddenException
- [ ] Update existing `collab.service.spec.ts` mockRoom to use `visibility` instead of `isGuestEditingAllowed`
- [ ] Update existing `collab.gateway.spec.ts` to add `socket.data.isViewOnly` guard test in `yjs-update`

## Sources

### Primary (HIGH confidence)

- Direct codebase read: `apps/api/src/modules/collab/collab.service.ts` — current joinRoom logic, isViewOnly computation
- Direct codebase read: `apps/api/src/modules/collab/collab.gateway.ts` — socket.data pattern, handleYjsUpdate
- Direct codebase read: `apps/api/prisma/schema.prisma` — current Room model, isGuestEditingAllowed field
- Direct codebase read: `apps/web/src/components/canvas/canvas-header.tsx` — header structure, existing patterns
- Direct codebase read: `apps/web/contexts/collab-context.tsx` — context structure, isAnonymous flow
- Direct codebase read: `apps/web/app/canvas/[slug]/page.tsx` — joinState pattern, fetch logic
- Direct codebase read: `apps/web/src/components/canvas/excalidraw-wrapper.tsx` — Excalidraw component props
- Direct codebase read: `apps/web/components/ui/popover.tsx` — Popover component API
- Direct codebase read: `apps/web/components/ui/radio-group.tsx` — RadioGroup component API
- Direct codebase read: `apps/api/src/modules/collab/collab.service.spec.ts` — test patterns, mock shapes

### Secondary (MEDIUM confidence)

- CONTEXT.md canonical refs and code_context section — confirmed against actual source files

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all components verified present in codebase, no new dependencies
- Architecture: HIGH — all patterns derived directly from existing code with minimal inference
- Pitfalls: HIGH — derived from direct code analysis of integration points
- Test map: HIGH — existing spec files read directly, gap analysis based on what's missing

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (stable — no external dependencies to drift)
