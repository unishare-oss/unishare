---
phase: 04-canvas-ui-and-drawing-tools
plan: 01
subsystem: ui
tags: [next.js, excalidraw, yjs, socket.io-client, canvas, shadcn, lucide-react]

# Dependency graph
requires:
  - phase: 02-guest-identity-auth
    provides: POST /api/rooms/:slug/join endpoint for join-first flow
  - phase: 03-websocket-gateway-yjs-relay
    provides: socket.io /collab namespace for future CollabProvider wiring
provides:
  - /canvas/[slug] route outside (app) layout group (no AppShell)
  - CanvasHeader component with logo link and copy-link button
  - Join-first flow calling POST /api/rooms/:slug/join
  - Loading overlay (Surface 2) shown during join/connect
  - Error page (Surface 3) shown on 404 room not found
  - Proxy middleware confirmed to allow /canvas/* without redirect
affects: [04-02-PLAN, 04-03-PLAN]

# Tech tracking
tech-stack:
  added: [excalidraw@0.17.x, yjs, socket.io-client]
  patterns:
    - Canvas route lives outside (app) route group to avoid AppShell
    - Join-first flow: call join endpoint before attempting socket connection
    - PageState union type (loading | connected | not-found) drives render branching

key-files:
  created:
    - apps/web/app/canvas/[slug]/layout.tsx
    - apps/web/app/canvas/[slug]/page.tsx
    - apps/web/src/components/canvas/canvas-header.tsx
  modified:
    - apps/web/.env.example

key-decisions:
  - 'Proxy middleware already allows /canvas/* (allowlist-based, not deny-by-default) — no change needed'
  - 'NEXT_PUBLIC_API_URL added to .env.example for browser-side socket.io-client (cannot use server-only API_URL)'
  - 'Loader2 CSS animate-spin used for loading spinner per UI-SPEC allowance (no third-party spinner)'
  - 'Logo in header reuses /icon.svg + font-mono wordmark pattern from AppSidebar'

patterns-established:
  - 'Canvas route group: app/canvas/[slug]/ outside (app)/ for no-AppShell layouts'
  - 'PageState union type pattern for multi-state route pages (loading | connected | not-found)'

requirements-completed: [CANV-01, CANV-02, CANV-03, CANV-04, CANV-05, CANV-06]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 4 Plan 01: Canvas Route Shell Summary

**Next.js /canvas/[slug] route with join-first flow, header bar, loading overlay, and error page — Excalidraw/yjs/socket.io-client dependencies installed**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T15:02:31Z
- **Completed:** 2026-03-20T15:04:44Z
- **Tasks:** 1
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- Canvas route at `/canvas/[slug]` renders outside the `(app)` layout group — no AppShell navigation
- Join-first flow calls `POST /api/rooms/:slug/join` on mount; 404 shows "Room not found" error page, success shows canvas shell
- CanvasHeader component implements UI-SPEC Surface 1: UniShare logo link to /feed + Copy link button with sonner toast feedback
- All three dependencies installed: `@excalidraw/excalidraw`, `yjs`, `socket.io-client`
- Build compiles cleanly with `/canvas/[slug]` listed as dynamic route

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create canvas route shell with proxy update** - `4ec1ec7` (feat)

## Files Created/Modified

- `apps/web/app/canvas/[slug]/layout.tsx` - Minimal layout wrapper (no AppShell), provides Metadata title
- `apps/web/app/canvas/[slug]/page.tsx` - Canvas page with join-first flow, loading overlay, error page, and canvas shell
- `apps/web/src/components/canvas/canvas-header.tsx` - Header bar with logo link and copy-link button
- `apps/web/.env.example` - Added NEXT_PUBLIC_API_URL for browser-accessible socket.io-client

## Decisions Made

- Proxy middleware (`apps/web/src/proxy.ts`) uses an allowlist (`PROTECTED_PATHS`) — `/canvas` is not in the list, so it is already publicly accessible. No code change was needed; intent is documented via code review.
- `NEXT_PUBLIC_API_URL` added to `.env.example` because socket.io-client runs in the browser and cannot use the server-only `API_URL` env var or the Next.js rewrite proxy (WebSocket upgrades do not pass through rewrites).
- Used `Loader2` with CSS `animate-spin` for the loading spinner per UI-SPEC allowance — avoids an additional dependency.
- Header logo reuses the `/icon.svg` + `font-mono` Unishare wordmark pattern established in AppSidebar for visual consistency.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Add `NEXT_PUBLIC_API_URL` to your `.env.local` (copy from `.env.example`). This is required for Plan 02 (CollabProvider) to connect socket.io-client to the API. Not needed for Plan 01 functionality (join endpoint uses Next.js rewrites).

## Next Phase Readiness

- Route infrastructure is in place — Plan 02 (CollabProvider) can mount into the `/canvas/[slug]` route
- `pageState === 'connected'` currently shows a placeholder; Plan 02 replaces this with `connectionStatus` from CollabProvider
- Plan 03 (Excalidraw) mounts into the `<main>` placeholder in the connected state
- All three required dependencies (`@excalidraw/excalidraw`, `yjs`, `socket.io-client`) are installed and ready

---

_Phase: 04-canvas-ui-and-drawing-tools_
_Completed: 2026-03-20_
