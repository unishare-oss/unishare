---
phase: 06-board-persistence-export
plan: 02
subsystem: ui
tags: [excalidraw, jspdf, export, canvas, collab, anonymous]

# Dependency graph
requires:
  - phase: 06-01
    provides: ColabProvider, canvas context, join endpoint with isAnonymous response

provides:
  - exportPng helper: downloads board as PNG
  - exportPdf helper: downloads board as PDF via jsPDF PNG-in-PDF
  - exportPngBlob helper: shared blob helper for Plan 03 Post to UniShare flow
  - isAnonymous flows from join response through CollabProvider to CanvasHeader
  - Race condition fix: retry on non-404 errors prevents Room not found for anonymous first-time visitors
  - Export dropdown in canvas header with PNG, PDF, and disabled Post to UniShare for guests

affects: [06-03, canvas-header, collab-context]

# Tech tracking
tech-stack:
  added: [jspdf, @radix-ui/react-tooltip (via shadcn tooltip)]
  patterns:
    - PNG-in-PDF via jsPDF addImage for reliable export of complex Excalidraw SVGs
    - Dynamic imports for heavy export libraries (excalidraw, jspdf) to keep initial bundle lean
    - isAnonymous prop drilled from page join response through CollabProvider to context consumers

key-files:
  created:
    - apps/web/src/components/canvas/export-utils.ts
    - apps/web/components/ui/tooltip.tsx
  modified:
    - apps/web/app/canvas/[slug]/page.tsx
    - apps/web/contexts/collab-context.tsx
    - apps/web/src/components/canvas/canvas-header.tsx

key-decisions:
  - "PNG-in-PDF approach via jsPDF addImage() instead of pdf.svg() — avoids rendering issues with complex Excalidraw SVG output"
  - "Dynamic imports for @excalidraw/excalidraw and jspdf in export-utils.ts — keeps initial canvas bundle lean"
  - "isAnonymous passed as prop to CollabProvider (not derived inside) — join response owns the truth, context consumers just read it"
  - "Retry once after 500ms on non-404 join errors — fixes anonymous cookie timing race condition without infinite loops"

patterns-established:
  - "ExportDropdown: self-contained sub-component inside canvas-header.tsx consuming useCollab() for excalidrawAPI and isAnonymous"
  - "exportPng/exportPdf/exportPngBlob: pure async helpers in export-utils.ts, no React, testable standalone"

requirements-completed: [ROOM-04, EXPO-01]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 06 Plan 02: Board Export & Anonymous Race Condition Fix Summary

**PNG and PDF export via jsPDF PNG-in-PDF, isAnonymous plumbed from join response to CanvasHeader Export dropdown, anonymous session race condition fixed with single retry**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-21T05:50:49Z
- **Completed:** 2026-03-21T05:53:27Z
- **Tasks:** 2
- **Files modified:** 5 (+ 2 created)

## Accomplishments

- Race condition fixed: non-404 errors on join now retry once after 500ms, preventing "Room not found" for anonymous first-time visitors
- isAnonymous flows from join response through CollabProvider context to CanvasHeader ExportDropdown
- Export dropdown renders between ParticipantAvatars and Copy link button with PNG download, PDF download, and disabled Post to UniShare for guests
- export-utils.ts created with exportPng, exportPdf, and exportPngBlob helpers using dynamic imports

## Task Commits

1. **Task 1: Race condition fix, isAnonymous plumbing, and export-utils.ts** - `18b155e` (feat)
2. **Task 2: Export dropdown in canvas header** - `074baed` (feat)

## Files Created/Modified

- `apps/web/app/canvas/[slug]/page.tsx` - Added isAnonymous state, retry logic on non-404, passes isAnonymous to CollabProvider
- `apps/web/contexts/collab-context.tsx` - Added isAnonymous to CollabContextValue, CollabProviderProps, and coreValue useMemo
- `apps/web/src/components/canvas/export-utils.ts` - NEW: exportPng, exportPdf, exportPngBlob helpers
- `apps/web/src/components/canvas/canvas-header.tsx` - Added ExportDropdown component, tooltip for guest Post to UniShare
- `apps/web/components/ui/tooltip.tsx` - NEW: shadcn tooltip component

## Decisions Made

- PNG-in-PDF via `jsPDF.addImage()` instead of `pdf.svg()` — avoids rendering issues with complex Excalidraw SVG output
- Dynamic imports for `@excalidraw/excalidraw` and `jspdf` — keeps initial canvas bundle lean
- isAnonymous passed as prop to CollabProvider (not derived inside) — join response owns the truth
- Retry once after 500ms on non-404 join errors — fixes anonymous cookie timing race condition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- pnpm filter `@unishare/web` did not match (package is named `web`). Used `--filter web` instead. Auto-resolved.

## Next Phase Readiness

- exportPngBlob helper ready for Plan 03 Post to UniShare flow
- isAnonymous in context ready for Plan 03 conditional UI
- Export dropdown stub `handlePostToUniShare` is a no-op pending Plan 03 implementation

---

_Phase: 06-board-persistence-export_
_Completed: 2026-03-21_
