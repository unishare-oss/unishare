---
phase: 07-room-access-control
plan: 03
subsystem: frontend-access-control
tags: [access-control, view-only, private-gate, settings-popover, excalidraw]
dependency_graph:
  requires: [07-01]
  provides: [private-gate-ui, view-only-canvas, owner-settings-popover]
  affects: [canvas-page, collab-context, excalidraw-wrapper, canvas-header]
tech_stack:
  added: []
  patterns: [optimistic-update-with-rollback, owner-only-ui-gate, context-prop-drilling]
key_files:
  created: []
  modified:
    - apps/web/app/canvas/[slug]/page.tsx
    - apps/web/contexts/collab-context.tsx
    - apps/web/src/components/canvas/excalidraw-wrapper.tsx
    - apps/web/src/components/canvas/canvas-header.tsx
decisions:
  - 'isViewOnly/ownerId/userId passed as props from page.tsx into CollabProvider (same pattern as isAnonymous from Phase 06)'
  - 'SettingsPopover fetches current visibility on first render via GET /api/rooms/:slug then PATCHes on change with optimistic update + rollback'
  - 'Standalone Copy Link button retained in CanvasHeader for non-owners; SettingsPopover has its own copy link for owners'
metrics:
  duration: 117
  completed_date: '2026-03-21'
  tasks_completed: 2
  files_modified: 4
---

# Phase 07 Plan 03: Frontend Access Control (Private Gate + View-Only + SettingsPopover) Summary

**One-liner:** Private gate for 403, isViewOnly/ownerId/userId through CollabContext to Excalidraw viewModeEnabled, owner-only SettingsPopover with PATCH visibility and optimistic rollback.

## What Was Built

### Task 1: 403 handling + context expansion + Excalidraw viewMode (commit ef94ce3)

- `page.tsx`: Added `'private'` to `JoinState` union type; added `isViewOnly`, `ownerId`, `userId` state; 403 response sets `joinState='private'` (checked before the existing 404 retry path); private gate renders Lock icon + "This board is private" heading + Sign In button linking to `/sign-in`; new props passed to `CollabProvider`.
- `collab-context.tsx`: Expanded `CollabProviderProps` with `isViewOnly: boolean`, `ownerId: string | null`, `userId: string | null`; expanded `CollabContextValue` with same fields; updated provider function signature and `coreValue` useMemo.
- `excalidraw-wrapper.tsx`: Destructures `isViewOnly` from `useCollab()`; passes `viewModeEnabled={isViewOnly}` to `<Excalidraw>`, hiding toolbar and blocking drawing for view-only users.

### Task 2: Owner-only SettingsPopover in canvas header (commit 182177e)

- Added `useState`, `Popover/PopoverContent/PopoverTrigger`, `RadioGroup/RadioGroupItem`, `Label`, `Settings` imports to `canvas-header.tsx`.
- `SettingsPopover` component: renders only when `userId === ownerId && ownerId != null`; fetches current visibility from `GET /api/rooms/:slug` on first render; `RadioGroup` with OPEN/VIEW_ONLY/PRIVATE options; `handleVisibilityChange` uses optimistic update with previous-value rollback on non-ok response or fetch error; `handleCopyLink` copies URL to clipboard.
- `CanvasHeader`: `<SettingsPopover />` placed before `<ExportDropdown />` in the right-side flex div. Standalone Copy Link button retained for non-owners.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compiled without errors after both tasks.
- Human verification pending (Task 3 checkpoint).

## Self-Check

- [x] apps/web/app/canvas/[slug]/page.tsx — modified (commit ef94ce3)
- [x] apps/web/contexts/collab-context.tsx — modified (commit ef94ce3)
- [x] apps/web/src/components/canvas/excalidraw-wrapper.tsx — modified (commit ef94ce3)
- [x] apps/web/src/components/canvas/canvas-header.tsx — modified (commit 182177e)
- [x] Commit ef94ce3 exists
- [x] Commit 182177e exists

## Self-Check: PASSED
