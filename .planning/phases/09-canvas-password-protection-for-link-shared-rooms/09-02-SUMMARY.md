---
phase: 09-canvas-password-protection-for-link-shared-rooms
plan: 02
subsystem: ui
tags: [password, canvas, excalidraw, sessionStorage, shake-animation, settings-popover, shadcn]

# Dependency graph
requires:
  - phase: 09-01
    provides: hasPassword field in JoinRoomResponse + PATCH /rooms/:slug password set/clear + 401 on wrong password
  - phase: 08-02
    provides: boards page, RoomCard component, SettingsPopover structure
provides:
  - Full-screen password gate UI on /canvas/[slug] with shake animation + error message
  - sessionStorage tab-scoped password memory (pw-verified-{slug})
  - SettingsPopover password section (set / change / remove password)
  - Protected badge with KeyRound icon on boards hub room cards
  - Shadcn Separator component
  - Visibility + password fields in create-board dialog
affects:
  - Any future phase touching canvas join flow or room settings

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Password gate state machine: idle → loading → password-required → joined (add 'password-required' JoinState, handle 401 separately from retry)"
    - 'sessionStorage sentinel: pw-verified-{slug} boolean key; send pwVerified:true in join body when key present'
    - 'Shake animation: @keyframes shake in globals.css, toggled via animate-shake class + setTimeout reset'
    - 'SettingsPopover fetch-on-mount pattern extended to hasPassword alongside visibility'
    - 'PATCH { password: null } to clear password (matches backend UpdateRoomDto)'

key-files:
  created:
    - apps/web/components/ui/separator.tsx
  modified:
    - apps/web/app/globals.css
    - apps/web/app/canvas/[slug]/page.tsx
    - apps/web/src/components/canvas/canvas-header.tsx
    - apps/web/components/boards/room-card.tsx
    - apps/web/app/(app)/(protected)/boards/page.tsx

key-decisions:
  - "Password gate added as a new JoinState ('password-required'); joinRoom now handles 401 separately from the existing retry logic to avoid false retries on auth failures"
  - 'sessionStorage key pw-verified-{slug} used for tab-scoped memory — prevents re-prompt on refresh without persisting across browser restarts'
  - 'pwVerified:true sentinel sent in join body (instead of replaying the password) for security; backend D-22 pattern skips bcrypt when sentinel is set'
  - 'Shake animation implemented as CSS @keyframes in globals.css + animate-shake Tailwind class toggled via setTimeout(300ms) reset — avoids JS animation library dependency'
  - 'Password section in SettingsPopover fetches hasPassword on mount alongside visibility — single GET /rooms/:slug call for both'
  - 'hasPassword prop threaded through boards/page.tsx → RoomCard rather than fetching separately — avoids N+1 requests on the hub page'

patterns-established:
  - 'Gate state machine: add new JoinState values for new gate types (password-required follows same pattern as future 2FA gates)'
  - 'sessionStorage sentinel: pw-verified-{slug} pattern reusable for other per-session access tokens'

requirements-completed:
  - PWD-03
  - PWD-04
  - PWD-05

# Metrics
duration: 30min
completed: 2026-03-21
---

# Phase 9 Plan 02: Frontend Password Gate, Settings Section & Hub Badge Summary

**Full-screen password gate with shake animation, sessionStorage tab memory, SettingsPopover password management, and Protected badge on room cards — completing the end-to-end password protection UX**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-21T20:37:26+07:00
- **Completed:** 2026-03-21T21:00:34+07:00
- **Tasks:** 2 (+ 1 human verification checkpoint approved)
- **Files modified:** 6

## Accomplishments

- Password gate renders full-screen on /canvas/[slug] when join returns 401, with KeyRound icon, input field, and submit button
- Shake animation + "Incorrect password" error message on wrong password; correct password proceeds directly to canvas
- sessionStorage `pw-verified-{slug}` prevents re-prompt on page refresh within the same tab
- SettingsPopover password section lets room owners set, change, or remove a password with real-time feedback
- Boards hub room cards display a "Protected" badge with KeyRound icon when `hasPassword` is true
- Create-board dialog extended with visibility radio and password input fields
- Shadcn Separator component added to the UI library

## Task Commits

1. **Task 1: Password gate on canvas page + shake animation CSS** — `dbd722b` (feat)
2. **Task 2: SettingsPopover password section + RoomCard badge + boards page prop** — `b973381` (feat)
3. **Extra: Add RoomEntity return type to toRoomResponse for TS inference** — `0ca22ff` (fix, 09-01 fix)
4. **Extra: Add visibility and password fields to create board dialog** — `78e2419` (feat)

## Files Created/Modified

- `apps/web/app/globals.css` — Added `@keyframes shake` and `.animate-shake` CSS for password gate error animation
- `apps/web/app/canvas/[slug]/page.tsx` — Extended JoinState with `'password-required'`, 401 handling, sessionStorage sentinel, password gate UI
- `apps/web/src/components/canvas/canvas-header.tsx` — SettingsPopover password section (fetch hasPassword on mount, set/change/remove handlers, Separator, Input)
- `apps/web/components/boards/room-card.tsx` — `hasPassword` prop + Protected badge with KeyRound icon
- `apps/web/app/(app)/(protected)/boards/page.tsx` — Pass `hasPassword` from room data to RoomCard
- `apps/web/components/ui/separator.tsx` — New Shadcn Separator component via @radix-ui/react-separator

## Decisions Made

- **`password-required` JoinState**: Added as distinct state so 401 is handled separately from the existing retry path — avoids false retries on auth failures and keeps the state machine readable.
- **sessionStorage sentinel `pw-verified-{slug}`**: Tab-scoped persistence without exposing the raw password. Sends `pwVerified: true` in the join body; backend D-22 pattern skips bcrypt for this sentinel.
- **Shake via CSS @keyframes + setTimeout reset**: No JS animation library needed. Class is toggled on, then removed after 300ms to allow re-triggering on repeated wrong attempts.
- **Single GET /rooms/:slug for both visibility + hasPassword**: SettingsPopover fetches both on mount in one call, keeping the component's existing mount pattern intact.
- **hasPassword threaded as prop rather than fetched**: Boards page already fetches room list; adding `hasPassword` to the response prevents N+1 fetches on the hub.

## Deviations from Plan

### Extra Commits (outside plan scope)

Two commits were made by the orchestrator after plan tasks completed:

**1. fix(09-01): add RoomEntity return type to toRoomResponse for TS inference** — `0ca22ff`

- TypeScript inference issue in the backend `toRoomResponse()` helper that surfaced during frontend integration.
- Fix: Added explicit `RoomEntity` return type annotation to the function signature.

**2. feat(09): add visibility and password fields to create board dialog** — `78e2419`

- The create-board dialog in 08-02 did not include visibility or password inputs. Added these fields to complete the full password protection UX.
- Files: `apps/web/components/boards/create-room-dialog.tsx` (or similar)

---

**Total deviations:** 2 extra commits (1 bug fix, 1 missing feature — both applied outside the plan as orchestrator extras)
**Impact on plan:** All improvements necessary for correctness and UX completeness. No scope creep within plan tasks.

## Issues Encountered

None within planned tasks — all 8 manual test scenarios plus the create dialog scenario passed on first human verification.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Phase 9 is complete. Password protection is fully implemented end-to-end:

- Backend: Prisma migration, bcryptjs, DTO/entity extensions, joinRoom check, updateRoom hash/clear (09-01)
- Frontend: Password gate, shake animation, sessionStorage, SettingsPopover section, hub badge (09-02)

All PWD requirements (PWD-01 through PWD-05) have been satisfied across both plans.

---

_Phase: 09-canvas-password-protection-for-link-shared-rooms_
_Completed: 2026-03-21_
