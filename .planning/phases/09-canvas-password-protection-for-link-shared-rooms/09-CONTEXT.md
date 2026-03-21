# Phase 9: Canvas Password Protection for Link-Shared Rooms - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Add optional password protection to rooms. Owners can set a password on any room — visitors must enter the correct password before joining. The existing OPEN/VIEW_ONLY/PRIVATE visibility system is unchanged; password is an orthogonal layer on top of it. Password management lives in the canvas header settings popover (owner-only). A lock badge appears on boards hub room cards when a password is set.

</domain>

<decisions>
## Implementation Decisions

### Password Model

- **D-01:** `passwordHash String?` added to the `Room` Prisma model — null means no password, non-null means protected
- **D-02:** The existing `RoomVisibility` enum (OPEN / VIEW_ONLY / PRIVATE) is **not changed** — password protection is a separate, orthogonal field
- **D-03:** Any room can have a password regardless of visibility setting — OPEN+password, VIEW_ONLY+password, PRIVATE+password all valid
- **D-04:** PRIVATE rooms still block anonymous users even if they enter the correct password — PRIVATE access rule takes precedence
- **D-05:** Password + VIEW_ONLY can coexist: entering the correct password grants entry, but the user is still view-only if the room is VIEW_ONLY

### Who Gets Prompted

- **D-06:** Everyone except the room owner is password-gated
- **D-07:** Owner bypass is determined at the `joinRoom` endpoint: if `session.user.id === room.ownerId`, skip the password check
- **D-08:** All other users — anonymous and authenticated alike — must supply the password in the POST /rooms/:slug/join request body

### Backend Verification

- **D-09:** Password verification happens inside the existing `joinRoom` endpoint — no new endpoint
- **D-10:** Client sends `{ password?: string }` in the request body; backend bcrypt-compares against `room.passwordHash`
- **D-11:** No password supplied + room has passwordHash → return HTTP 401 (triggers frontend gate)
- **D-12:** Wrong password supplied → return HTTP 401 with error message `'Incorrect password'`
- **D-13:** Password stored as bcrypt hash (Better Auth already uses bcrypt — no new dependency)
- **D-14:** Removing password = PATCH /rooms/:slug with `{ password: null }` → sets `passwordHash` to null
- **D-15:** No attempt rate limiting — show inline error on wrong password, allow retries

### Frontend Gate

- **D-16:** New `'password-required'` join state added to `JoinState` type in `page.tsx`
- **D-17:** `joinRoom()` on 401 response → sets state to `'password-required'`; subsequent call includes `{ password: enteredValue }` in body
- **D-18:** Gate renders inline (full-screen centred card), same visual pattern as the existing `'private'` gate
- **D-19:** Gate UI: Lock icon (lucide `KeyRound`), heading "This board is password protected", subtext "Enter the password to join", `<input type="password">` + "Join Board" button
- **D-20:** Wrong password (401 on retry) → shake animation on input + inline "Incorrect password" text below input
- **D-21:** On success: `sessionStorage.setItem('pw-verified-{slug}', '1')` — clears on tab close, no re-prompt on refresh within the same tab
- **D-22:** On page load: check sessionStorage before the first join attempt — if verified, include a sentinel in the join body to skip the prompt

### Password Management (Settings Popover)

- **D-23:** Password section added below the visibility radio group in the existing `SettingsPopover` component in `canvas-header.tsx`
- **D-24:** Fetch on popover open: GET /rooms/:slug returns `hasPassword: boolean` (not the hash) — use this to show "Set" vs "Not set" status
- **D-25:** When no password is set: show a password input + "Set password" button
- **D-26:** When password is set: show "Password: Set ✓" with a "Change" input field and a "Remove password" button
- **D-27:** Set/change: PATCH /rooms/:slug `{ password: string }` — backend bcrypt-hashes before storing
- **D-28:** Remove: PATCH /rooms/:slug `{ password: null }` — backend sets passwordHash to null

### API Changes

- **D-29:** `UpdateRoomDto` extended with `password?: string | null` — string sets/changes, `null` removes
- **D-30:** `RoomEntity` extended with `hasPassword: boolean` — derived from `passwordHash !== null`, never exposes the hash
- **D-31:** `GET /rooms` (findByOwner) returns `hasPassword` on each room so boards hub can show the lock badge

### Boards Hub Card

- **D-32:** A `KeyRound` (lucide) icon badge renders on room cards when `hasPassword === true`
- **D-33:** Badge placed near the visibility indicator on the card (bottom-left or alongside existing badges)

### Claude's Discretion

- Exact CSS for the shake animation on wrong password
- Precise placement of `hasPassword` badge on the room card relative to existing elements
- Whether to add a `MinLength` validator on the password field in `UpdateRoomDto`

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend — Room model and join flow

- `apps/api/prisma/schema.prisma` — Room model (add `passwordHash String?`); RoomVisibility enum (unchanged)
- `apps/api/src/modules/collab/collab.service.ts` — `joinRoom` method where password check is added; `updateRoom` where password is set/cleared
- `apps/api/src/modules/collab/collab.repository.ts` — `findBySlugWithVisibility` (extend to return passwordHash); `updateRoom` (accept passwordHash)
- `apps/api/src/modules/collab/dto/update-room.dto.ts` — extend with `password?: string | null`
- `apps/api/src/modules/collab/entities/room.entity.ts` — extend with `hasPassword: boolean`
- `apps/api/src/modules/collab/dto/join-room-response.dto.ts` — join response shape (unchanged for password, but context)

### Frontend — Canvas page and settings popover

- `apps/web/app/canvas/[slug]/page.tsx` — `JoinState` type, `joinRoom()` fetch logic, inline gate renders (add `'password-required'` state)
- `apps/web/src/components/canvas/canvas-header.tsx` — `SettingsPopover` component where password section is added; `SettingsPopover` already fetches GET /rooms/:slug and PATCHes on change
- `apps/web/contexts/collab-context.tsx` — CollabProvider props and collab context (no change expected, for reference)

### Boards hub

- `apps/web/app/boards/**` — Room card component where `hasPassword` badge is added (locate via glob)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `SettingsPopover` in `canvas-header.tsx`: already fetches GET /rooms/:slug on mount, PATCHes on change, with optimistic update + rollback pattern — password section follows same pattern exactly
- `'private'` gate in `page.tsx` (lines 66–77): Lock icon + centred card layout — password gate reuses this layout, adds an input and form submit
- `sessionStorage` pattern from Phase 6 (`sessionStorage.setItem` / `getItem`): established precedent for tab-scoped storage

### Established Patterns

- `JoinState` union type in `page.tsx`: `'joining' | 'joined' | 'not-found' | 'private'` — add `'password-required'` following same pattern
- HTTP status convention: 403 = PRIVATE block, 404 = not found — 401 = password required/wrong (new)
- `OptionalAuth()` on joinRoom: already in place, no change needed
- bcrypt: Better Auth uses it for user passwords — import `bcrypt` from `bcryptjs` (likely already installed)

### Integration Points

- Prisma migration: add `passwordHash String?` to `room` table
- `collabRepository.findBySlugWithVisibility`: extend to return `passwordHash` field
- `collabService.joinRoom`: add password check between visibility check and session return
- `collabService.updateRoom`: bcrypt.hash the password before storing; set null to clear
- GET /rooms (findByOwner): map each room to include `hasPassword: passwordHash !== null`
- Boards hub room card: receive `hasPassword` from GET /rooms response, render badge

</code_context>

<specifics>
## Specific Ideas

- Password gate UX from discussion: `KeyRound` icon, heading "This board is password protected", "Enter the password to join", password input, "Join Board" button, shake + "Incorrect password" on 401 retry
- sessionStorage key pattern: `pw-verified-{slug}` — matches existing `sessionStorage` usage style from Phase 6
- Settings popover password section sits below the existing visibility RadioGroup, separated by a divider

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

_Phase: 09-canvas-password-protection-for-link-shared-rooms_
_Context gathered: 2026-03-21_
