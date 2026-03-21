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
  - 'setCurrentStep(0) keeps wizard at TYPE step with pre-filled file — jumping to step 3 skipped required steps causing regression'

patterns-established:
  - 'Cross-tab data handoff via sessionStorage: write before window.open, read+clear on mount in destination'

requirements-completed: [EXPO-02]

duration: ~30min
completed: 2026-03-21
---

# Phase 06 Plan 03: Post to UniShare Flow Summary

**sessionStorage-based cross-tab handoff from canvas PNG export to posts/new wizard FILE step, with immediate cleanup on read**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-21T05:55:12Z
- **Completed:** 2026-03-21
- **Tasks:** 3 of 3 complete (human-verified)
- **Files modified:** 3

## Accomplishments

- Added `postToUniShare` to export-utils.ts: exports board as PNG blob, converts to data URL, writes to `sessionStorage['pending-board-export']`, and opens `/posts/new` in a new tab
- Wired canvas header `handlePostToUniShare` stub to call `postToUniShare` with toast success/error feedback
- Added `useEffect` in posts/new/page.tsx to read `pending-board-export` on mount, reconstruct File from data URL, set it into the form's `files` field, and start at step 0 with pre-filled file
- Fixed step-jump regression: wizard correctly starts at TYPE step (0) rather than jumping to FILES step (3)
- All 7 verification steps passed: persistence, PNG export, PDF export, authenticated Post to UniShare, guest disabled state, race condition, and sessionStorage cleanup

## Task Commits

1. **Task 1: postToUniShare utility and wire header handler** - `3e13592` (feat)
2. **Task 2: Pre-fill exported PNG in posts/new wizard** - `8eb6872` (feat)
3. **Bug fix: start at step 0 instead of jumping to FILES step** - `0975169` (fix)
4. **Task 3: Verify full flow** - Human verified, all 7 steps approved

## Files Created/Modified

- `apps/web/src/components/canvas/export-utils.ts` - Added `postToUniShare` function
- `apps/web/src/components/canvas/canvas-header.tsx` - Updated import, replaced stub handler with real implementation
- `apps/web/app/(app)/(protected)/posts/new/page.tsx` - Added useEffect for sessionStorage pre-fill on mount

## Decisions Made

- sessionStorage cleared immediately after read (not after form submit) — guarantees refresh does not re-attach
- window.open() instead of router.push() — keeps canvas tab active with socket session intact
- setCurrentStep(0) used instead of setCurrentStep(3) — jumping to FILES step skipped required TYPE/COURSE steps causing a broken wizard state; pre-filled file is still in form.files when user naturally reaches FILES

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed wizard step-jump regression in posts/new**

- **Found during:** Task 3 (human-verify)
- **Issue:** Plan specified `setCurrentStep(3)` to jump to FILES step. This caused the wizard to start mid-flow, bypassing required TYPE and COURSE steps
- **Fix:** Changed to `setCurrentStep(0)` — wizard starts at TYPE step; pre-attached file persists in form.files and appears when user reaches FILES step
- **Files modified:** apps/web/app/(app)/(protected)/posts/new/page.tsx
- **Verification:** User confirmed wizard starts correctly at step 0 with file pre-attached
- **Committed in:** 0975169

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix was necessary for correct UX — skipping form steps caused broken wizard state. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 06 Board Persistence & Export is complete. All 3 plans executed and verified:

- Plan 01: Y.Doc snapshot persistence via Prisma Bytes, save/restore on join
- Plan 02: PNG/PDF export utilities and anonymous cookie timing race condition fix
- Plan 03: Post to UniShare cross-tab PNG handoff flow

No blockers. EXPO-02 requirement fulfilled.

---

_Phase: 06-board-persistence-export_
_Completed: 2026-03-21_
