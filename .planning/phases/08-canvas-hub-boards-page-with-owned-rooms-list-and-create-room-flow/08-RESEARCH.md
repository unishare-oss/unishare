# Phase 8: Canvas Hub — Boards Page - Research

**Researched:** 2026-03-21
**Domain:** Next.js protected page + NestJS REST endpoints + React Query + Radix UI
**Confidence:** HIGH

## Summary

Phase 8 adds a `/boards` hub page to the main UniShare app shell. It is a purely additive feature: one new protected Next.js page, two new NestJS REST endpoints (`GET /rooms` and `DELETE /rooms/:slug`), an extension to the `UpdateRoomDto`, and four navigation entry changes. The technical domain is already established — the project uses this exact stack for every other feature. No new libraries or patterns are needed.

The room data model is already complete in Prisma (`id`, `slug`, `title`, `ownerId`, `createdAt`, `updatedAt`, `visibility`). The `PATCH /rooms/:slug` endpoint and its service/repository chain already exist; only the DTO needs a `title` field added. The `GET /rooms` and `DELETE /rooms/:slug` endpoints do not yet exist. The Orval API sync workflow (`pnpm api:sync`) generates React Query hooks from the OpenAPI spec automatically — the front end should use generated hooks for the new GET endpoint and raw `fetch` (matching the SettingsPopover pattern) or a generated mutation hook for PATCH/DELETE.

The board page is structurally identical to `my-posts/page.tsx`: a `'use client'` page, `PageHeader` with an `action` slot, a list of cards, and an empty state. The empty state is a custom hero (not the existing `EmptyState` component). Card secondary actions use Radix `DropdownMenu` (already in the project). The create-room modal uses the existing Radix `Dialog`. Optimistic update + rollback pattern is already established in `SettingsPopover`.

**Primary recommendation:** Follow the `my-posts` page pattern for structure, the `SettingsPopover` pattern for optimistic mutations, and run `pnpm api:sync` after adding the new controller endpoints to generate hooks.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Route & Navigation**

- Route: `/boards` — inside `(app)/(protected)/boards/` so auth is enforced and AppShell nav renders
- Auth-required: unauthenticated users are redirected to `/login` (same as `/my-posts`)
- Sidebar nav (`authNavItems` in `app-sidebar.tsx`): add a "Boards" entry with a layout/grid Lucide icon; amber active state on `/boards` pathname
- Mobile nav (`authTabs` in `mobile-nav.tsx`): add "Boards" tab, **replace the "Saved" tab** (Saved is still accessible via post cards and profile)

**Room Card Design**

- Each card shows: title (falls back to `"Untitled"` in `text-text-muted` when `room.title` is null), visibility badge (OPEN / VIEW_ONLY / PRIVATE), created date (`"Created X ago"`), and last modified date (`"Updated X ago"`)
- Primary action: clicking the card body navigates to `/canvas/[slug]`
- Secondary actions via a 3-dot kebab menu (`⋮`) that appears on hover (always accessible on touch):
  - Open board → navigate to `/canvas/[slug]`
  - Copy link → copies `window.location.origin + "/canvas/" + slug` to clipboard + sonner toast "Link copied"
  - Rename → inline rename input or small popover with a title field + save button; calls `PATCH /rooms/:slug` with `{ title }`
  - Change visibility → visibility selector (segmented control: OPEN / VIEW_ONLY / PRIVATE) in the dropdown/popover; calls `PATCH /rooms/:slug` with `{ visibility }`; optimistic update with rollback on error
  - Delete → opens ConfirmDialog ("Delete this board? This cannot be undone.") → calls `DELETE /rooms/:slug` on confirm → removes card from list
- Delete is destructive — always requires the `ConfirmDialog` component

**Create Room Flow**

- Trigger: "New Board" button in the `PageHeader` `action` slot
- Interaction: opens a modal dialog
- Modal fields: single optional `title` input, placeholder `"Untitled board"`, no other fields
- Default visibility on creation: OPEN (matches current `createRoom` default in `collabService`)
- On success: navigate to `/canvas/[slug]` of the newly created room
- On error: show a sonner toast with the error message; keep modal open

**Empty State**

- When user has no rooms: show a featured hero empty state (not the existing plain `EmptyState` component)
- Visual: custom inline SVG illustration depicting a blank canvas/drawing board, styled with theme CSS variables
- Content: illustration + headline ("No boards yet") + sub-copy ("Create a board and start collaborating with your classmates") + a "New Board" CTA button that opens the same create modal
- Layout: centred in the page body

**Backend — New Endpoints Required**

- `GET /rooms` with optional `?ownerId=:id` query param — returns the authenticated user's rooms ordered by `updatedAt DESC`. Requires a new `findByOwner(ownerId)` method in `CollabRepository` and a new controller route. Auth required.
- `DELETE /rooms/:slug` — owner-only delete. Repository method `deleteBySlug(slug)`. Returns 204 on success, 403 if caller is not the owner, 404 if not found.
- `PATCH /rooms/:slug` already exists and handles both `title` and `visibility` updates via `UpdateRoomDto` — verify `title` is included in the DTO (add if missing).

### Claude's Discretion

- Exact card layout dimensions, border, shadow, and hover states (match existing card patterns in the app)
- Lucide icon choice for the Boards nav entry (LayoutGrid, Layers, or PenTool all work)
- Exact popover/dropdown component used for the kebab menu (Radix DropdownMenu is already used elsewhere)
- Loading skeleton for the boards list while fetching (match `post-card-skeleton.tsx` style)
- Pagination or infinite scroll for large room lists (simple list with no pagination is fine for v1)

### Deferred Ideas (OUT OF SCOPE)

- Per-user role management / invites (noted in Phase 7): owner can invite specific users as editors or viewers
- Transferring room ownership
- Rooms browsable by course/department (ROOM-V2-02)
- Room thumbnail preview
  </user_constraints>

---

## Standard Stack

### Core

| Library               | Version        | Purpose                                            | Why Standard                                 |
| --------------------- | -------------- | -------------------------------------------------- | -------------------------------------------- |
| Next.js App Router    | 15.x (in use)  | Page routing, server/client components             | Project standard                             |
| React                 | 19.x (in use)  | UI components                                      | Project standard                             |
| @tanstack/react-query | 5.x (in use)   | Server state, generated by Orval                   | Project standard                             |
| Orval                 | 8.4.2 (in use) | Generate typed React Query hooks from OpenAPI spec | Project standard — run `pnpm api:sync`       |
| Radix DropdownMenu    | in use         | Kebab menu on room cards                           | Already in `canvas-header.tsx` and elsewhere |
| Radix Dialog          | in use         | Create-room modal                                  | Already used across the app                  |
| sonner (`toast`)      | in use         | Toast notifications                                | Already installed                            |
| NestJS                | in use         | REST endpoints in API                              | Project standard                             |
| Prisma                | in use         | ORM for `Room` model queries                       | Project standard                             |
| class-validator       | in use         | DTO validation in NestJS                           | Project standard                             |

### Supporting

| Library                   | Version     | Purpose                            | When to Use                                                                                            |
| ------------------------- | ----------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| date-fns or native `Intl` | —           | Relative time ("X ago")            | For `createdAt`/`updatedAt` display; project already uses native Date — check if date-fns is installed |
| `navigator.clipboard`     | browser API | Copy link action                   | Already used in `SettingsPopover`                                                                      |
| Lucide React              | in use      | Nav icons (LayoutGrid recommended) | Already imported in `app-sidebar.tsx`                                                                  |

**Installation:** No new packages required. Everything is already installed.

**Check date-fns availability:**

```bash
grep "date-fns" /Users/psst/Desktop/projects/unishare/apps/web/package.json
```

If not present, use `Intl.RelativeTimeFormat` or a simple helper — do not install a new library just for relative timestamps.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/
├── api/src/modules/collab/
│   ├── collab.controller.ts       # Add GET /rooms, DELETE /rooms/:slug
│   ├── collab.service.ts          # Add getRoomsByOwner(), deleteRoom()
│   ├── collab.repository.ts       # Add findByOwner(), deleteBySlug()
│   └── dto/
│       └── update-room.dto.ts     # Add optional title field
│
└── web/
    ├── app/(app)/(protected)/boards/
    │   └── page.tsx               # New boards page
    ├── components/app-sidebar.tsx # Add "Boards" to authNavItems
    ├── components/mobile-nav.tsx  # Replace "Saved" with "Boards" in authTabs
    └── components/boards/         # New component directory
        ├── room-card.tsx          # Card with kebab menu
        ├── room-card-skeleton.tsx # Loading skeleton (match PostCardSkeleton)
        ├── create-room-dialog.tsx # Create modal
        └── boards-empty-state.tsx # Hero empty state with inline SVG
```

### Pattern 1: Protected Page Structure (match `my-posts`)

**What:** `'use client'` page that reads `user.id` from `useAuth()`, fires a React Query fetch enabled only when `user.id` is present, renders `PageHeader` with action slot, then either skeleton → list → empty state.

**When to use:** Every protected page in this app follows this pattern.

**Example:**

```typescript
// Source: apps/web/app/(app)/(protected)/my-posts/page.tsx
'use client'

export default function BoardsPage() {
  const { user, isLoading: authLoading } = useAuth()

  const { data, isLoading } = useCollabControllerFindByOwner(
    { ownerId: user?.id ?? '' },
    { query: { enabled: !!user?.id, select: (r) => r.data } },
  )

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Boards" action={<NewBoardButton />} />
      <div className="flex-1 bg-card">
        {/* skeleton / list / empty state */}
      </div>
    </div>
  )
}
```

### Pattern 2: Optimistic Update with Rollback (match SettingsPopover)

**What:** Store previous value, apply update locally, call API, rollback on failure with `toast.error`.

**When to use:** Rename and visibility-change actions on room cards.

**Example:**

```typescript
// Source: apps/web/src/components/canvas/canvas-header.tsx (SettingsPopover)
const handleVisibilityChange = async (newVisibility: RoomVisibility) => {
  const previousVisibility = visibility
  setVisibility(newVisibility) // optimistic

  try {
    const res = await fetch(`/api/rooms/${slug}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility: newVisibility }),
    })
    if (!res.ok) {
      setVisibility(previousVisibility) // rollback
      toast.error('Failed to update room settings')
    }
  } catch {
    setVisibility(previousVisibility) // rollback
    toast.error('Failed to update room settings')
  }
}
```

The boards page can use this same pattern (or a React Query mutation with `onMutate`/`onError` for more structured optimistic updates — both approaches work; match the simpler `fetch` pattern for consistency).

### Pattern 3: NestJS Endpoint with Owner Guard

**What:** Controller action calls service, service fetches room, checks `room.ownerId === userId`, throws `ForbiddenException` if not, then delegates to repository.

**When to use:** Any owner-only write operation (`DELETE /rooms/:slug`).

**Example:**

```typescript
// Source: apps/api/src/modules/collab/collab.service.ts (updateRoom pattern)
async deleteRoom(slug: string, userId: string) {
  const room = await this.collabRepository.findBySlug(slug)
  if (!room) throw new NotFoundException('Room not found')
  if (room.ownerId !== userId) throw new ForbiddenException('Only the room owner can delete this room')
  await this.collabRepository.deleteBySlug(slug)
}
```

### Pattern 4: Kebab Menu on Hover (Radix DropdownMenu)

**What:** Card has `group` CSS class; kebab trigger is `opacity-0 group-hover:opacity-100 focus:opacity-100` on desktop (always visible on touch via `@media(hover:none)` or `sm:opacity-100` equivalent).

**When to use:** Room card secondary actions.

**Critical:** Do not use `hover:` CSS alone — the trigger must remain focusable (keyboard) and tappable on touch. Use `opacity-0 group-hover:opacity-100 focus-within:opacity-100` on the card, or use a touch-device-always-visible approach.

### Anti-Patterns to Avoid

- **Hiding the kebab trigger behind CSS-only hover on mobile:** Touch devices don't fire hover. Use `focus-within` or always show on touch. The CONTEXT.md explicitly flags this.
- **Using `EmptyState` for the boards empty state:** The decision is a custom hero component with inline SVG. Do not reuse the plain text empty state.
- **Creating a new UI library import:** All needed components (Dialog, DropdownMenu, Skeleton, Button, Input) are already in `components/ui/`.
- **Skipping `pnpm api:sync` after adding endpoints:** The front-end hooks are generated from the OpenAPI spec. Add the endpoint to NestJS first, run `api:sync`, then use the generated hook.
- **Calling `updateRoom` service from the controller without extending the DTO:** The existing `updateRoom` service calls `collabRepository.updateVisibility()` which only sets the `visibility` field. After adding `title` to the DTO, the service must also call a repository method that updates `title`.

---

## Don't Hand-Roll

| Problem                   | Don't Build        | Use Instead                                             | Why                                                                                                                                                |
| ------------------------- | ------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirm dialog for delete | Custom modal       | `ConfirmDialog` component                               | Already exists at `components/shared/confirm-dialog.tsx`; handles isPending, escape, outside click                                                 |
| Toast notifications       | Alert UI           | `toast` from `sonner`                                   | Already installed; used throughout the app                                                                                                         |
| Dropdown menu             | Custom popover     | Radix `DropdownMenu` from `components/ui/dropdown-menu` | Already used in `canvas-header.tsx` with `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuTrigger` |
| Modal                     | Custom overlay     | Radix `Dialog` from `components/ui/dialog`              | Already used in `confirm-dialog.tsx`                                                                                                               |
| Loading skeleton          | Custom CSS shimmer | `Skeleton` from `components/ui/skeleton`                | Already used in `post-card-skeleton.tsx`; `bg-accent animate-pulse`                                                                                |
| API hooks                 | Manual fetch       | Orval-generated hooks (after `pnpm api:sync`)           | Type-safe, consistent with all other data fetching in the app                                                                                      |
| Auth redirect             | Manual guard       | Existing `(protected)` layout with `AuthGuard`          | Placing the page under `app/(app)/(protected)/` is sufficient                                                                                      |

**Key insight:** This phase is almost entirely composition of existing building blocks. The only genuinely new code is the hero empty state SVG, the two new NestJS endpoints, and the card/skeleton components.

---

## Common Pitfalls

### Pitfall 1: UpdateRoomDto Only Has `visibility`

**What goes wrong:** `PATCH /rooms/:slug` currently only accepts `visibility`. Adding a rename action that sends `{ title }` will fail validation because `title` is not in the DTO.

**Why it happens:** The DTO was created in Phase 7 only for visibility changes.

**How to avoid:** Before implementing rename on the front end, add `@IsOptional() @IsString() title?: string` to `UpdateRoomDto`. Also update `collabService.updateRoom()` to call a repository method that can update both fields (or separate calls), not just `updateVisibility()`.

**Warning signs:** 400 Bad Request from `PATCH /rooms/:slug` when sending `{ title }`.

### Pitfall 2: `collabService.updateRoom` Calls `updateVisibility` Only

**What goes wrong:** Even after extending the DTO, the service calls `this.collabRepository.updateVisibility(slug, dto.visibility)` — a method that only sets `visibility`. If `dto.title` is sent, it is silently ignored.

**How to avoid:** Add a `updateRoom(slug, data: { title?: string; visibility?: RoomVisibility })` method to the repository that does a Prisma `update` with only the fields present in `data`. Update the service to call this instead of `updateVisibility`.

### Pitfall 3: Orval Hook Not Yet Generated for New Endpoints

**What goes wrong:** Attempting to import `useCollabControllerFindByOwner` or similar before running `pnpm api:sync` causes a module-not-found build error.

**Why it happens:** Orval generates from the live OpenAPI spec (`/docs-json`). The API must be running and the new endpoints must be present before sync.

**How to avoid:** Run the API first, add the new endpoints, then run `pnpm api:sync` from the monorepo root. The generated file goes to `apps/web/src/lib/api/generated/collab/collab.ts` (new file under `collab` tag).

**Warning signs:** Import error on the generated hook. Check that the controller has `@ApiTags('collab')` so orval groups it correctly.

### Pitfall 4: Mobile Kebab Menu Hidden Behind Hover-Only CSS

**What goes wrong:** On touch devices, the 3-dot button never becomes visible because touch events don't trigger CSS `:hover` on the card's `group`.

**How to avoid:** Use `group-hover:opacity-100 focus-within:opacity-100` on the trigger, or use `@media(hover: none) { opacity: 1 }` via Tailwind's `[@media(hover:none)]:opacity-100` variant.

### Pitfall 5: `DELETE /rooms/:slug` Returns 204 — No JSON Body

**What goes wrong:** Front-end code tries to parse `.json()` on a 204 No Content response, throwing a parse error.

**How to avoid:** In the NestJS controller, use `@HttpCode(204)` and `@Delete(':slug')` with no return value. On the front-end, after the delete fetch call, check `res.ok` before attempting any body parse — or use the generated mutation hook which handles this.

### Pitfall 6: `GET /rooms` Requires Auth But Controller Has No Guard

**What goes wrong:** Forgetting to add `@Session()` decorator or an auth guard to `GET /rooms` makes it return an empty result or crash when `session.user.id` is undefined.

**How to avoid:** The existing `POST /rooms` uses `@Session() session: UserSession`. Mirror that pattern. Do not use `@OptionalAuth()` for this endpoint — it must require auth.

---

## Code Examples

### GET /rooms Controller + Repository Pattern

```typescript
// Controller (apps/api/src/modules/collab/collab.controller.ts)
@Get()
@ApiOkResponse({ type: [RoomEntity] })
@ResponseMessage('Rooms fetched successfully')
findByOwner(@Session() session: UserSession) {
  return this.collabService.getRoomsByOwner(session.user.id)
}

// Repository (apps/api/src/modules/collab/collab.repository.ts)
async findByOwner(ownerId: string) {
  return this.prisma.room.findMany({
    where: { ownerId },
    orderBy: { updatedAt: 'desc' },
  })
}
```

### DELETE /rooms/:slug Controller Pattern

```typescript
// Controller
@Delete(':slug')
@HttpCode(204)
@ResponseMessage('Room deleted')
deleteRoom(@Param('slug') slug: string, @Session() session: UserSession) {
  return this.collabService.deleteRoom(slug, session.user.id)
}

// Repository
async deleteBySlug(slug: string) {
  await this.prisma.room.delete({ where: { slug } })
}
```

### UpdateRoomDto Extended

```typescript
// apps/api/src/modules/collab/dto/update-room.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { RoomVisibility } from '@/generated/prisma/client'

export class UpdateRoomDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'VIEW_ONLY', 'PRIVATE'] })
  @IsOptional()
  @IsEnum(RoomVisibility)
  visibility?: RoomVisibility

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string
}
```

Note: making both fields optional changes the existing Phase 7 behavior. The service must guard against empty updates.

### Sidebar Nav Entry

```typescript
// apps/web/components/app-sidebar.tsx — authNavItems array
import { LayoutGrid } from 'lucide-react'

const authNavItems = [
  { href: '/feed', label: 'Feed', icon: LayoutList },
  { href: '/my-posts', label: 'My Posts', icon: FileText },
  { href: '/boards', label: 'Boards', icon: LayoutGrid }, // NEW
  { href: '/saved', label: 'Saved', icon: Bookmark },
  // ...
]
```

### Mobile Nav Replacement

```typescript
// apps/web/components/mobile-nav.tsx — replace Saved with Boards
import { LayoutGrid } from 'lucide-react'

const authTabs = [
  { href: '/feed', label: 'Feed', icon: LayoutList },
  { href: '/my-posts', label: 'Posts', icon: FileText },
  { href: '/boards', label: 'Boards', icon: LayoutGrid }, // replaces Saved
  { href: '/notifications', label: 'Notifs', icon: Bell },
  { href: '/profile', label: 'Profile', icon: User },
]
```

### Clipboard Copy Link Pattern

```typescript
// Match pattern from SettingsPopover in canvas-header.tsx
const handleCopyLink = async (slug: string) => {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}/canvas/${slug}`)
    toast.success('Link copied')
  } catch {
    toast.error('Could not copy link')
  }
}
```

### Room Card Skeleton Pattern (match PostCardSkeleton)

```typescript
// apps/web/components/boards/room-card-skeleton.tsx
'use client'
import { Skeleton } from '@/components/ui/skeleton'

export function RoomCardSkeleton() {
  return (
    <article aria-hidden className="rounded-[6px] border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-2/5 bg-muted" />
        <Skeleton className="size-5 rounded-md bg-muted" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full bg-muted" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-3 w-24 bg-muted" />
        <Skeleton className="h-3 w-24 bg-muted" />
      </div>
    </article>
  )
}
```

---

## State of the Art

| Old Approach                          | Current Approach                                     | Impact                           |
| ------------------------------------- | ---------------------------------------------------- | -------------------------------- |
| `updateVisibility` only in repository | Needs `updateRoom({ title?, visibility? })`          | DTO and service must be updated  |
| No `GET /rooms` endpoint              | Must add in Phase 8                                  | Required before api:sync         |
| No `DELETE /rooms/:slug` endpoint     | Must add in Phase 8                                  | Required before api:sync         |
| Orval-generated `collab` tag missing  | Will appear after `pnpm api:sync` with new endpoints | Front-end hooks become available |

**Existing but needs update:**

- `UpdateRoomDto`: Currently only has `visibility` (required). Must become `visibility?: RoomVisibility` and add `title?: string`.
- `collabService.updateRoom()`: Currently calls `updateVisibility()` only. Must handle partial updates.
- `collabRepository`: Needs `findByOwner`, `deleteBySlug`, and a general `updateRoom` method.

---

## Open Questions

1. **date-fns availability**
   - What we know: `createdAt`/`updatedAt` must display as "Created X ago" / "Updated X ago"
   - What's unclear: Whether `date-fns` is installed in the web app
   - Recommendation: Run `grep "date-fns" apps/web/package.json` in Wave 0. If present, use `formatDistanceToNow`. If not, implement a small `timeAgo()` helper with `Intl.RelativeTimeFormat` to avoid adding a dependency.

2. **`pnpm api:sync` sequencing**
   - What we know: Orval reads from the live API at `http://localhost:3001/docs-json`
   - What's unclear: Whether the implementor will run the API during sync
   - Recommendation: Plan must instruct: add backend endpoints first, start the API, then run `pnpm api:sync` from the monorepo root, then implement front-end using generated hooks.

3. **DropdownMenu sub-menus for rename / visibility change**
   - What we know: CONTEXT.md says rename opens "an inline rename input or small popover with a title field"; visibility change uses "a visibility selector in the dropdown/popover"
   - What's unclear: Whether rename should be a sub-popover inside the dropdown or a separate dialog
   - Recommendation: Use a controlled Dialog for rename (simplest, avoids nested Radix popover focus management issues) and inline visibility RadioGroup inside the DropdownMenu content — same pattern as `SettingsPopover` RadioGroup but in the card menu.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                                      |
| ------------------ | -------------------------------------------------------------------------- |
| Framework          | Jest 30.x                                                                  |
| Config file        | `apps/api/jest.json` (inferred from `jest` key in `apps/api/package.json`) |
| Quick run command  | `pnpm --filter api test -- --testPathPattern=collab.service`               |
| Full suite command | `pnpm --filter api test`                                                   |

### Phase Requirements → Test Map

| Behavior                                                | Test Type | Automated Command                                            | File Exists? |
| ------------------------------------------------------- | --------- | ------------------------------------------------------------ | ------------ |
| `findByOwner` returns rooms ordered by `updatedAt DESC` | unit      | `pnpm --filter api test -- --testPathPattern=collab.service` | ❌ Wave 0    |
| `deleteRoom` throws 403 when caller is not owner        | unit      | `pnpm --filter api test -- --testPathPattern=collab.service` | ❌ Wave 0    |
| `deleteRoom` throws 404 when slug not found             | unit      | `pnpm --filter api test -- --testPathPattern=collab.service` | ❌ Wave 0    |
| `updateRoom` applies `title` field when provided        | unit      | `pnpm --filter api test -- --testPathPattern=collab.service` | ❌ Wave 0    |
| GET /rooms controller passes session userId to service  | unit      | `pnpm --filter api test -- --testPathPattern=collab.service` | ❌ Wave 0    |

Tests are added to the existing `collab.service.spec.ts` file — no new spec file is needed.

### Sampling Rate

- **Per task commit:** `pnpm --filter api test -- --testPathPattern=collab.service --passWithNoTests`
- **Per wave merge:** `pnpm --filter api test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] New `describe` blocks in `apps/api/src/modules/collab/collab.service.spec.ts` covering `getRoomsByOwner`, `deleteRoom`, and `updateRoom` with title support
- [ ] Mock `collabRepository.findByOwner` and `collabRepository.deleteBySlug` added to the existing mock object in `collab.service.spec.ts`

---

## Sources

### Primary (HIGH confidence)

- Direct read of `apps/api/src/modules/collab/collab.controller.ts` — existing endpoints, decorator patterns
- Direct read of `apps/api/src/modules/collab/collab.repository.ts` — existing methods, Prisma usage
- Direct read of `apps/api/src/modules/collab/collab.service.ts` — owner guard pattern, service structure
- Direct read of `apps/api/src/modules/collab/dto/update-room.dto.ts` — confirmed `title` is missing
- Direct read of `apps/api/prisma/schema.prisma` — Room model fields confirmed
- Direct read of `apps/web/components/app-sidebar.tsx` — `authNavItems` structure
- Direct read of `apps/web/components/mobile-nav.tsx` — `authTabs` structure; "Saved" confirmed in current list
- Direct read of `apps/web/app/(app)/(protected)/my-posts/page.tsx` — page pattern
- Direct read of `apps/web/components/shared/page-header.tsx` — `action` prop confirmed
- Direct read of `apps/web/components/shared/confirm-dialog.tsx` — full API confirmed
- Direct read of `apps/web/src/components/canvas/canvas-header.tsx` — SettingsPopover optimistic update pattern, clipboard copy pattern, DropdownMenu usage
- Direct read of `apps/web/components/feed/post-card-skeleton.tsx` — skeleton pattern
- Direct read of `apps/web/components/ui/skeleton.tsx` — `bg-accent animate-pulse` class
- Direct read of `apps/web/orval.config.ts` — `tags-split` mode confirmed; output dir is `src/lib/api/generated`
- Direct read of root `package.json` — `api:sync` script confirmed

### Secondary (MEDIUM confidence)

- `apps/web/src/lib/api/generated/posts/posts.ts` — confirms Orval output format: `useQuery`/`useMutation` with `select` option, `enabled` query option

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries directly verified in codebase
- Architecture patterns: HIGH — directly read from canonical reference files listed in CONTEXT.md
- Backend gaps: HIGH — confirmed by reading actual DTO and service code
- Pitfalls: HIGH — derived from direct code inspection, not speculation
- Validation architecture: HIGH — test files and jest config confirmed to exist

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (stable stack, no external dependencies)
