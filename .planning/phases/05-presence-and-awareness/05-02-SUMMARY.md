---
phase: 05-presence-and-awareness
plan: 02
subsystem: web/lib
tags: [tdd, pure-functions, presence, coordinates, excalidraw]
dependency_graph:
  requires: []
  provides: [PRESENCE_COLORS, hashToColorIndex, sceneToOverlay]
  affects: [05-03-PLAN.md, 05-04-PLAN.md]
tech_stack:
  added: []
  patterns: [djb2-hash, excalidraw-coordinate-conversion, tdd-red-green]
key_files:
  created:
    - apps/web/src/lib/presence.ts
    - apps/web/src/lib/presence.test.ts
    - apps/web/src/lib/cursor-coords.ts
    - apps/web/src/lib/cursor-coords.test.ts
  modified: []
decisions:
  - hashToColorIndex uses djb2 hash with Math.abs() to ensure non-negative index for all inputs including empty string
  - sceneToOverlay falls back to {left:0, top:0} when containerRef.current is null for graceful degradation
key_decisions:
  - 'djb2 hash + Math.abs() % paletteSize for deterministic color assignment'
  - 'sceneToOverlay formula: (sceneCoord + scroll) * zoom.value + offset - containerRect'
metrics:
  duration: 102s
  completed: '2026-03-20'
  tasks_completed: 2
  files_created: 4
  tests_added: 13
requirements: [COLB-02]
---

# Phase 05 Plan 02: Presence Utility Functions Summary

Pure utility functions for presence color assignment (djb2 hash) and Excalidraw coordinate conversion (verified scene→overlay formula), with 13 TDD tests across 2 test files.

## What Was Built

Two pure utility modules for the presence system:

1. **`apps/web/src/lib/presence.ts`** — Color palette and hash function
   - `PRESENCE_COLORS`: 10 distinct accessible hex colors (WCAG AA with white text)
   - `hashToColorIndex(id, paletteSize)`: djb2 hash → `Math.abs(hash) % paletteSize` for deterministic, zero-indexed color assignment

2. **`apps/web/src/lib/cursor-coords.ts`** — Excalidraw coordinate conversion
   - `sceneToOverlay(sceneX, sceneY, appState, containerRef)`: converts Excalidraw scene coordinates to overlay-local CSS pixels
   - Formula from `@excalidraw/excalidraw@0.18.0` source: `(sceneCoord + scroll) * zoom.value + offset - containerRect.position`
   - Graceful null-ref fallback

## Tasks Completed

| Task | Name                                                   | Commit  | Files                                   |
| ---- | ------------------------------------------------------ | ------- | --------------------------------------- |
| 1    | TDD — presence.ts (PRESENCE_COLORS + hashToColorIndex) | 592c156 | presence.ts, presence.test.ts           |
| 2    | TDD — cursor-coords.ts (sceneToOverlay)                | 8c48db8 | cursor-coords.ts, cursor-coords.test.ts |

## Test Coverage

**presence.test.ts** (6 tests):

- PRESENCE_COLORS has exactly 10 entries
- All entries are valid hex color strings (`/^#[0-9A-Fa-f]{6}$/`)
- hashToColorIndex is deterministic (same ID → same index always)
- hashToColorIndex returns `0 ≤ index < paletteSize` for varied inputs
- hashToColorIndex produces ≥5 distinct values across 20 different inputs
- hashToColorIndex handles empty string without throwing

**cursor-coords.test.ts** (7 tests):

- Identity at zoom=1, scroll=(0,0) with matching container offset
- Doubles coordinates at zoom=2
- Halves coordinates at zoom=0.5
- Shifts result with non-zero scrollX/scrollY
- Shifts with non-zero offsetLeft
- Returns negative values for out-of-viewport scene coords
- Handles null containerRef.current gracefully (falls back to `{left:0, top:0}`)

## Decisions Made

1. **djb2 hash + Math.abs()**: The `hash |= 0` 32-bit truncation can produce negative values in JavaScript. `Math.abs(hash) % paletteSize` ensures the index is always non-negative. Empty string input returns 0 (hash stays 0 through zero iterations).

2. **sceneToOverlay null-ref fallback**: When `containerRef.current` is null (component not yet mounted), falls back to `{left: 0, top: 0}` so the formula still produces numerically valid (though offset) coordinates rather than throwing.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- ✅ presence.ts exists with PRESENCE_COLORS (10 entries) and hashToColorIndex
- ✅ presence.test.ts exists with 6 passing tests
- ✅ cursor-coords.ts exists with sceneToOverlay and AppStateSlice interface
- ✅ cursor-coords.test.ts exists with 7 passing tests
- ✅ Commit 592c156 verified
- ✅ Commit 8c48db8 verified
- ✅ All 17 web tests pass via `pnpm test -- --run`
