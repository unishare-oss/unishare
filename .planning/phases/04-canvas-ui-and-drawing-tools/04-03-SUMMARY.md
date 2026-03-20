---
phase: 04-canvas-ui-and-drawing-tools
plan: 03
subsystem: ui
tags: [excalidraw, yjs, react, nextjs, canvas, real-time, sync]

# Dependency graph
requires:
  - phase: 04-02
    provides: CollabProvider context with ydoc, yElements, connectionStatus, initialElements
  - phase: 04-01
    provides: canvas route shell, canvas-header component, join-first flow
provides:
  - ExcalidrawWrapper component with two-way Yjs sync (local onChange -> Y.Array, Y.Array observer -> updateScene)
  - Canvas page wiring CollabProvider + ExcalidrawWrapper with join-first flow
  - Working collaborative canvas at /canvas/:slug
affects: [05-presence-and-awareness]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - isApplyingRemoteRef guard prevents infinite loop between onChange and yElements.observe
    - CaptureUpdateAction.NEVER keeps remote updates out of local undo/redo stack
    - next/dynamic with ssr:false for Excalidraw (no SSR support)
    - Outer/inner component split: outer handles join flow, inner consumes useCollab() inside CollabProvider

key-files:
  created:
    - apps/web/src/components/canvas/excalidraw-wrapper.tsx
  modified:
    - apps/web/app/canvas/[slug]/page.tsx

key-decisions:
  - 'ExcalidrawElement imported from @excalidraw/excalidraw/element/types (not re-exported from main index)'
  - 'isApplyingRemoteRef boolean ref chosen over ydoc origin check to prevent onChange<->observe infinite loop'
  - 'CollabProvider mounted only after HTTP join succeeds — avoids opening socket on 404 rooms'

patterns-established:
  - 'Pattern 1: Sync guard ref — isApplyingRemoteRef prevents onChange from echoing remote Y.Array updates back as local changes'
  - "Pattern 2: Two-stage loading — HTTP join first, then socket connect inside CollabProvider, then Excalidraw mounts on 'connected'"

requirements-completed: [CANV-01, CANV-02, CANV-03, CANV-04, CANV-05, CANV-06, CANV-07]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 04 Plan 03: Excalidraw Two-Way Yjs Sync Summary

**Excalidraw canvas with real-time Yjs sync: onChange writes to Y.Array, yElements.observe triggers updateScene with CaptureUpdateAction.NEVER, preventing remote changes from entering undo/redo stack**

## Performance

- **Duration:** ~30 min (including human verification)
- **Started:** 2026-03-20T15:13:34Z
- **Completed:** 2026-03-20T15:45:00Z
- **Tasks:** 2 (Task 1 auto, Task 2 human-verify — approved)
- **Files modified:** 2

## Accomplishments

- Created ExcalidrawWrapper with full two-way Yjs sync and infinite-loop prevention
- Wired canvas page to mount CollabProvider only after HTTP join succeeds (prevents socket on 404)
- Excalidraw theme maps from active UniShare theme class to light/dark
- Initial board state from room-joined event passed via initialData.elements
- Build passes cleanly
- Human verification confirmed: canvas loads, all 7 drawing tool groups work, two-way real-time sync between tabs works, remote undo isolation works, error page renders for invalid slugs

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ExcalidrawWrapper with two-way Yjs sync and wire into canvas page** - `30bd235` (feat)
2. **Task 2: Verify canvas route and drawing tools in browser** - human-verify checkpoint, approved by user

**Plan metadata:** `8011aa8` (docs: complete excalidraw wiring plan summary and state)

## Files Created/Modified

- `apps/web/src/components/canvas/excalidraw-wrapper.tsx` - Excalidraw 'use client' component with onChange->Y.Array sync and yElements.observe->updateScene sync
- `apps/web/app/canvas/[slug]/page.tsx` - Updated with CollabProvider wrapping, CanvasInner consuming useCollab(), dynamic ExcalidrawWrapper import (ssr: false)

## Decisions Made

- `ExcalidrawElement` imported from `@excalidraw/excalidraw/element/types` since it is not re-exported from the main package entry
- Used `isApplyingRemoteRef` boolean ref rather than ydoc update origin check — simpler and matches the observer pattern already established in collab-context
- `CollabProvider` mounted only after HTTP join returns 200; socket never opens on 404 rooms

## Deviations from Plan

None - plan executed exactly as written.

The only discovery was the correct TypeScript import path for `ExcalidrawElement` (`@excalidraw/excalidraw/element/types`), which the plan anticipated with its fallback note — not a deviation.

## Issues Encountered

None.

## Known Gaps (Not Blocking — Deferred)

Two gaps were discovered during human verification that are out of scope for this plan. Both share the same root cause: only `yElements` (Excalidraw elements array) is synced via Yjs; `BinaryFiles` (the map of file ID to blob data) is not included in the sync payload.

**Gap 1: Imported images do not appear in remote sessions**

- When a user pastes or drags an image onto the canvas, Excalidraw stores blob data in `BinaryFiles` (keyed by file hash). The image element references the file by ID. Remote clients receive the element (the image placeholder) but never receive the binary file data, so the image renders as a blank placeholder.
- Deferred to Phase 6 (Board Persistence & Export) where file storage is planned.

**Gap 2: Excalidraw library items cannot be imported across sessions**

- Same root cause — library items that reference file assets rely on `BinaryFiles` being present on the receiving client.
- Deferred to Phase 6.

Both gaps are non-blocking for the core collaborative drawing use case (shapes, text, freehand, sticky notes all sync correctly).

## Next Phase Readiness

- Full collaborative canvas at /canvas/:slug verified working by human smoke-test
- All 7 CANV requirements (CANV-01 through CANV-07) confirmed met
- Phase 5 (Presence & Awareness) can build on CollabProvider's excalidrawAPI ref and existing socket infrastructure
- Phase 6 (Board Persistence & Export) should address BinaryFiles sync for image and library support

## Self-Check: PASSED

- `apps/web/src/components/canvas/excalidraw-wrapper.tsx` — FOUND
- commit `30bd235` — FOUND

---

_Phase: 04-canvas-ui-and-drawing-tools_
_Completed: 2026-03-20_
