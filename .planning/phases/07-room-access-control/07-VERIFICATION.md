---
phase: 07-room-access-control
verified: 2026-03-21T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
human_verification:
  - test: 'Anonymous user blocked from PRIVATE room'
    expected: "Navigating to a PRIVATE room as a logged-out user renders 'This board is private' gate with Sign In link instead of canvas"
    why_human: 'Requires live HTTP round-trip through joinRoom returning 403, rendering the gate branch in page.tsx'
  - test: 'View-only canvas for anonymous user on VIEW_ONLY room'
    expected: 'Anonymous user sees the live canvas but the drawing toolbar is hidden and drawing is blocked; server silently drops any yjs-update from that socket'
    why_human: 'Requires browser confirmation that Excalidraw viewModeEnabled=true hides the toolbar and that typing into the canvas produces no strokes; server-side guard tested in unit tests but real socket flow needs human'
  - test: 'Owner settings gear icon visible; non-owner sees no gear'
    expected: 'Authenticated room owner sees Settings gear in canvas header; a second authenticated non-owner user or guest does not see it'
    why_human: 'Owner-gate relies on userId === ownerId comparison at runtime; requires two browser sessions with different identities'
  - test: 'Visibility PATCH roundtrip with optimistic update and rollback'
    expected: 'Owner changes visibility in popover, toast fires immediately (optimistic), server confirms change; on forced error the radio group reverts to previous value'
    why_human: 'Requires live PATCH to /api/rooms/:slug and visual inspection of toast and radio state'
---

# Phase 07: Room Access Control Verification Report

**Phase Goal:** Implement room access control with RoomVisibility enum (OPEN/VIEW_ONLY/PRIVATE), server-side enforcement in WebSocket gateway, and frontend integration with private gate, view-only mode, and owner-only settings.
**Verified:** 2026-03-21
**Status:** human_needed — all automated checks pass; 4 items require browser verification
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                   | Status   | Evidence                                                                                                                                                    |
| --- | --------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Room owner can PATCH /rooms/:slug to change visibility between OPEN, VIEW_ONLY, PRIVATE | VERIFIED | `@Patch(':slug')` in collab.controller.ts calls `collabService.updateRoom(slug, dto, session.user.id)`; `UpdateRoomDto` validates `@IsEnum(RoomVisibility)` |
| 2   | Non-owner PATCH /rooms/:slug returns 403 ForbiddenException                             | VERIFIED | `collab.service.ts:29` — `if (room.ownerId !== userId) throw new ForbiddenException(...)`                                                                   |
| 3   | PRIVATE room + anonymous user on joinRoom returns 403 ForbiddenException                | VERIFIED | `collab.service.ts:71-73` — `if (room.visibility === RoomVisibility.PRIVATE && isAnonymous) throw new ForbiddenException('Room is private')`                |
| 4   | VIEW_ONLY room + anonymous user on joinRoom returns isViewOnly: true                    | VERIFIED | `collab.service.ts:74` — `const isViewOnly = room.visibility === RoomVisibility.VIEW_ONLY && isAnonymous`; unit test at spec line 216                       |
| 5   | VIEW_ONLY room + authenticated user on joinRoom returns isViewOnly: false               | VERIFIED | Same expression — authenticated user has `isAnonymous = false`; unit test at spec line 229                                                                  |
| 6   | OPEN room + anonymous user on joinRoom returns isViewOnly: false                        | VERIFIED | Covered by default case; unit test "should call signInAnonymous and return isAnonymous: true" verifies OPEN base case                                       |
| 7   | joinRoom response includes ownerId so frontend can gate owner-only UI                   | VERIFIED | `collab.service.ts:90` — `ownerId: room.ownerId` in return object; `JoinRoomResponseDto` declares `ownerId: string`                                         |
| 8   | View-only sockets cannot relay yjs-update events through the gateway                    | VERIFIED | `collab.gateway.ts:152` — `if (client.data.isViewOnly) return` is first line of `handleYjsUpdate`; gateway spec test at line 324                            |
| 9   | socket.data.isViewOnly is set on join based on room.visibility + user.isAnonymous       | VERIFIED | `collab.gateway.ts:111` — `client.data.isViewOnly = room.visibility === 'VIEW_ONLY' && isAnonymous`; gateway spec tests lines 188, 206                      |
| 10  | PRIVATE room blocks anonymous sockets at join time in gateway                           | VERIFIED | `collab.gateway.ts:107-110` — emits error and returns before `client.join(slug)`; gateway spec test at line 224                                             |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact                                                | Provides                                                                         | Status   | Details                                                                                                                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `apps/api/prisma/schema.prisma`                         | RoomVisibility enum and Room.visibility field                                    | VERIFIED | Lines 318-337: `visibility RoomVisibility @default(OPEN)` in model Room; `enum RoomVisibility { OPEN VIEW_ONLY PRIVATE }` at line 333; `isGuestEditingAllowed` absent |
| `apps/api/src/modules/collab/dto/update-room.dto.ts`    | DTO for PATCH /rooms/:slug                                                       | VERIFIED | `class UpdateRoomDto` with `@IsEnum(RoomVisibility)` and `@ApiProperty`                                                                                               |
| `apps/api/src/modules/collab/collab.service.spec.ts`    | Unit tests for updateRoom and visibility-driven joinRoom                         | VERIFIED | `describe('updateRoom'` at line 300; 19+ tests covering all visibility scenarios; no `isGuestEditingAllowed` or `findBySlugWithGuestFlag` references                  |
| `apps/api/src/modules/collab/collab.gateway.ts`         | isViewOnly guard on yjs-update handler, isViewOnly computation in handleJoinRoom | VERIFIED | `client.data.isViewOnly` at lines 111 and 152                                                                                                                         |
| `apps/api/src/modules/collab/collab.gateway.spec.ts`    | Tests for isViewOnly guard and socket.data.isViewOnly assignment                 | VERIFIED | `isViewOnly` test cases at lines 188, 206, 224, 238, 324; `makeSocket` includes `isViewOnly: undefined` on data                                                       |
| `apps/web/app/canvas/[slug]/page.tsx`                   | Private gate UI for 403 response                                                 | VERIFIED | `type JoinState = 'joining'                                                                                                                                           | 'joined' | 'not-found' | 'private'`at line 17;`if (res.status === 403) { setJoinState('private') }` at line 44; gate renders at line 66 |
| `apps/web/contexts/collab-context.tsx`                  | isViewOnly, ownerId, userId in context                                           | VERIFIED | `CollabContextValue` interface includes all three; `CollabProviderProps` accepts all three; `coreValue` useMemo includes all three                                    |
| `apps/web/src/components/canvas/excalidraw-wrapper.tsx` | viewModeEnabled prop on Excalidraw                                               | VERIFIED | `isViewOnly` destructured from `useCollab()` at line 27; `viewModeEnabled={isViewOnly}` passed to `<Excalidraw>` at line 115                                          |
| `apps/web/src/components/canvas/canvas-header.tsx`      | SettingsPopover component for owner                                              | VERIFIED | `function SettingsPopover()` at line 177; owner gate at line 184; `method: 'PATCH'` fetch at line 202; `<SettingsPopover />` in `CanvasHeader` JSX at line 311        |

---

### Key Link Verification

| From                                | To                       | Via                                                            | Status | Details                                                                                                                                         |
| ----------------------------------- | ------------------------ | -------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `collab.controller.ts`              | `collab.service.ts`      | `updateRoom` method call                                       | WIRED  | Line 41: `return this.collabService.updateRoom(slug, dto, session.user.id)`                                                                     |
| `collab.service.ts`                 | `collab.repository.ts`   | `updateVisibility + findBySlugWithVisibility`                  | WIRED  | Lines 27 and 35: `this.collabRepository.findBySlug`, `this.collabRepository.updateVisibility`, `this.collabRepository.findBySlugWithVisibility` |
| `collab.gateway.ts handleJoinRoom`  | `socket.data.isViewOnly` | computed from `room.visibility + client.data.user.isAnonymous` | WIRED  | Line 111: `client.data.isViewOnly = room.visibility === 'VIEW_ONLY' && isAnonymous`                                                             |
| `collab.gateway.ts handleYjsUpdate` | `socket.data.isViewOnly` | early return guard                                             | WIRED  | Line 152: `if (client.data.isViewOnly) return` — first line of method body                                                                      |
| `page.tsx`                          | `CollabProvider`         | `isViewOnly, ownerId, userId` props                            | WIRED  | Lines 115-117: `isViewOnly={isViewOnly} ownerId={ownerId} userId={userId}`                                                                      |
| `collab-context.tsx`                | `excalidraw-wrapper.tsx` | `useCollab().isViewOnly`                                       | WIRED  | `excalidraw-wrapper.tsx:27` destructures `isViewOnly` from `useCollab()`; passed as `viewModeEnabled` at line 115                               |
| `canvas-header.tsx`                 | `PATCH /rooms/:slug`     | fetch in SettingsPopover                                       | WIRED  | Lines 202-207: `fetch('/api/rooms/${slug}', { method: 'PATCH', ... body: JSON.stringify({ visibility: newVisibility }) })`                      |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description                                                                                | Status              | Evidence                                                                                                                                                                                                                                                                                                                                       |
| ----------- | -------------- | ------------------------------------------------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SHARE-01    | 07-01, 07-03   | Room owner can set room visibility to public (view-only) or private                        | SATISFIED           | `PATCH /rooms/:slug` with owner check in service; SettingsPopover in canvas-header.tsx with OPEN/VIEW_ONLY/PRIVATE options                                                                                                                                                                                                                     |
| SHARE-02    | 07-02, 07-03   | A view-only link allows anyone to see the live board state without drawing or modifying it | SATISFIED           | Gateway drops yjs-update from view-only sockets; `viewModeEnabled={isViewOnly}` hides Excalidraw toolbar                                                                                                                                                                                                                                       |
| SHARE-03    | 07-01, 07-03   | Room owner can revoke or regenerate the view-only link at any time                         | PARTIALLY SATISFIED | "Revoke" is satisfied: owner can set visibility to PRIVATE via PATCH, removing all anonymous access. "Regenerate the link" (slug rotation) is explicitly out of scope per `07-RESEARCH.md` deferred items: "no tokenised link means 'revoking' = changing visibility". The requirement text uses "or" so the revoke path satisfies the intent. |

---

### Anti-Patterns Found

| File                                               | Line    | Pattern                                                    | Severity | Impact                                                                                                                                                                                                                             |
| -------------------------------------------------- | ------- | ---------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/components/canvas/canvas-header.tsx` | 187-194 | `if (!isLoaded)` side-effect fetch inside component render | Warning  | Fetch inside render body (not in useEffect) — will re-fire on each render until `isLoaded` is set. Works in practice because `setIsLoaded(true)` prevents repeat after first call, but is unconventional. Does not block the goal. |

---

### Human Verification Required

#### 1. Private gate renders for anonymous user on PRIVATE room

**Test:** Create a room as an authenticated user, set it to Private via the settings popover. Open the room URL in an incognito window (anonymous user).
**Expected:** The canvas does not load. Instead, the private gate is shown: Lock icon, "This board is private" heading, "Sign in to access this board." text, and a "Sign In" button linking to `/sign-in`.
**Why human:** Requires the full HTTP joinRoom call returning 403 and the React state branch for `joinState === 'private'` rendering correctly in a real browser context.

#### 2. View-only canvas for anonymous user on VIEW_ONLY room

**Test:** Set the room to View-only. Open the room URL in an incognito window.
**Expected:** The canvas loads and displays the board content. The Excalidraw drawing toolbar is hidden. Attempting to draw produces no strokes. The anonymous user can still see cursor movements from other participants.
**Why human:** `viewModeEnabled={isViewOnly}` must correctly suppress Excalidraw's toolbar at runtime. The server-side gateway guard is unit tested, but the end-to-end socket flow (socket joins, isViewOnly set, yjs-update dropped) needs real verification.

#### 3. Settings gear visible for owner only

**Test:** Open the room as the owner — confirm the Settings gear icon appears in the canvas header. Open the same room in a second browser session as a different authenticated user (non-owner) — confirm the gear icon is absent.
**Expected:** Gear icon visible for owner, absent for non-owner. Guest users also do not see the gear.
**Why human:** The `userId !== ownerId` guard runs at runtime against values from CollabContext; requires two live sessions with distinct identities.

#### 4. Visibility change is saved via PATCH with optimistic update and rollback

**Test:** As owner, open the settings popover and change visibility. Observe toast immediately. Reload the page and verify the radio group shows the new value. To test rollback: mock or block the PATCH request (e.g., via DevTools network blocking) and confirm the radio group reverts to the previous value and an error toast appears.
**Expected:** Optimistic update sets radio immediately; toast fires; server persists change. On failure, radio reverts and error toast appears.
**Why human:** Requires live PATCH calls and visual confirmation of UI state transitions.

---

### Test Run Results

```
collab.service.spec.ts: PASS (19 tests)
collab.gateway.spec.ts: PASS (16 tests)
collab.gateway.integration.spec.ts: PASS (4 tests)
Total: 39 passed, 0 failed
```

Migration `20260321070000_add_room_visibility` confirmed present in `apps/api/prisma/migrations/`.

### Gaps Summary

No blocking gaps. All automated checks pass. Phase goal is structurally complete:

- RoomVisibility enum and Room.visibility field exist in schema with no `isGuestEditingAllowed` remnants
- API enforces owner-only PATCH and returns ownerId in joinRoom response
- Gateway computes isViewOnly at join time and drops yjs-update from view-only sockets
- Frontend private gate, viewModeEnabled, and SettingsPopover are all wired end-to-end
- 39 unit tests pass with full visibility scenario coverage

The one noted scope limitation (SHARE-03 "regenerate link" = slug rotation) was explicitly deferred in the research phase and documented. The revoke path (set to PRIVATE) satisfies the requirement's "or" condition.

Four items require human browser verification to confirm the full user-facing flow works as expected.

---

_Verified: 2026-03-21_
_Verifier: Claude (gsd-verifier)_
