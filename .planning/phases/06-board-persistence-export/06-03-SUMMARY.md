---
phase: 06-board-persistence-export
plan: 03
subsystem: ui
tags: [excalidraw, canvas, export, sessionStorage, posts, file-upload]

requires:
  - phase: 06-02
    provides: exportPngBlob utility, isAnonymous in collab context, canvas header export dropdown stub

provides:
  - postToUniShare function in export-utils.ts — exports board PNG to sessionStorage and opens /posts/new
  - Wired Post to UniShare handler in canvas-header.tsx with toast feedback
  - sessionStorage pre-fill on mount in posts/new/page.tsx — reconstructs File from data URL, jumps to FILES step

affects: [posts, canvas, export]

tech-stack:
  added: []
  patterns:
    - 'sessionStorage data handoff pattern: export writes pending-board-export JSON, consumer reads+clears on mount'
    - 'data URL → File reconstruction: atob + Uint8Array + new File()'

key-files:
  created: []
  modified:
    - apps/web/src/components/canvas/export-utils.ts
    - apps/web/src/components/canvas/canvas-header.tsx
    - apps/web/app/(app)/(protected)/posts/new/page.tsx

key-decisions:
  - 'sessionStorage cleared immediately after read in posts/new — prevents re-attach on page refresh'
  - "window.open('/posts/new', '_blank') keeps canvas tab active with socket session intact"
  - 'setCurrentStep(3) jumps directly to FILES step so user sees pre-attached image immediately'

patterns-established:
  - 'Cross-tab data handoff via sessionStorage: write before window.open, read+clear on mount in destination'

requirements-completed: [EXPO-02]

duration: 2min
completed: 2026-03-21
---

# Phase 06 Plan 03: Post to UniShare Flow Summary

**sessionStorage-based cross-tab handoff from canvas PNG export to posts/new wizard FILE step, with immediate cleanup on read**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-21T05:55:12Z
- **Completed:** 2026-03-21T05:56:26Z
- **Tasks:** 2 of 3 complete (Task 3 is human-verify checkpoint)
- **Files modified:** 3

## Accomplishments

- Added `postToUniShare` to export-utils.ts: exports board as PNG blob, converts to data URL, writes to `sessionStorage['pending-board-export']`, and opens `/posts/new` in a new tab
- Wired canvas header `handlePostToUniShare` stub to call `postToUniShare` with toast success/error feedback
- Added `useEffect` in posts/new/page.tsx to read `pending-board-export` on mount, reconstruct File from data URL, set it into the form's `files` field, and jump to step 3 (FILES)

## Task Commits

1. **Task 1: postToUniShare utility and wire header handler** - `3e13592` (feat)
2. **Task 2: Pre-fill exported PNG in posts/new wizard** - `8eb6872` (feat)
3. **Task 3: Verify full flow** - checkpoint:human-verify (pending)

## Files Created/Modified

- `apps/web/src/components/canvas/export-utils.ts` - Added `postToUniShare` function
- `apps/web/src/components/canvas/canvas-header.tsx` - Updated import, replaced stub handler with real implementation
- `apps/web/app/(app)/(protected)/posts/new/page.tsx` - Added useEffect for sessionStorage pre-fill on mount

## Decisions Made

- sessionStorage cleared immediately after read (not after form submit) — guarantees refresh does not re-attach
- window.open() instead of router.push() — keeps canvas tab active with socket session intact
- Direct step jump to 3 (FILES) via setCurrentStep — user sees pre-attached image without navigating through steps

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All automated tasks complete. Human verification of the full Phase 6 feature set (persistence, PNG export, PDF export, Post to UniShare flow) is required before this plan is fully closed.
- Checkpoint: Task 3 (human-verify) must be approved by the user.

---

_Phase: 06-board-persistence-export_
_Completed: 2026-03-21_
