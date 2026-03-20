# Phase 4: Canvas UI & Drawing Tools - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Embed Excalidraw in a Next.js route `/canvas/:slug`, wire it to the Yjs socket.io relay built in Phase 3, and make all 7 drawing tool groups functional. No presence cursors or participant list (Phase 5). No database persistence (Phase 6). This phase proves the canvas is usable and syncs in real-time.

</domain>

<decisions>
## Implementation Decisions

### Route & layout

- Canvas lives in its own route group **outside** `(app)` — no AppShell nav. Route: `apps/web/app/canvas/[slug]/page.tsx`
- Route is publicly accessible — anyone with the link can join (no auth gate). The `proxy.ts` middleware must NOT block `/canvas/*` paths.
- **Join-first flow:** On page load, call `POST /api/rooms/:slug/join` to ensure an anonymous session cookie exists, then open the socket.io connection. If the join endpoint returns 404, show the "Room not found" error page immediately — no socket attempt.
- Canvas has a **minimal UniShare header** above Excalidraw (thin bar) with: UniShare logo/back-to-feed link, and a "Copy room link" button. No other chrome — Excalidraw fills the rest of the viewport.

### Yjs provider wiring

- A **`CollabProvider` React context** wraps the canvas route. It holds: the socket.io client instance, the `Y.Doc`, a `Y.Array` for canvas elements, and connection state (`connecting | connected | disconnected`). Excalidraw reads from this context.
- **Element sync:** Excalidraw elements stored as a `Y.Array` in the `Y.Doc`. Excalidraw's `onChange` handler diffs the new element array against the current `Y.Array` and applies updates — which Yjs serializes into a binary update and the socket relays via the `yjs-update` event (per Phase 3's design).
- **Scope:** Only elements sync. `appState` (viewport pan/zoom, selected tool, scroll position) is NOT synced — each user has an independent viewport and tool selection.
- **Applying remote updates:** When a `yjs-update` event arrives from the socket, apply it to the local `Y.Doc` via `Y.applyUpdate()`. Read the updated `Y.Array`, reconcile with local elements (remote wins on conflict per Yjs CRDT semantics), and call Excalidraw's `updateScene({ elements })`. Do NOT call `updateScene` when the update originated locally (skip self-echo).

### Connection state UX

- **Loading state:** A full-screen loading overlay ("Connecting to room...") covers the canvas until the socket connects AND `room-joined` is received from the gateway. Excalidraw does not mount until ready — no flicker of empty canvas.
- **Disconnection:** When socket disconnects, show a sonner toast ("Connection lost — reconnecting..."). Canvas stays interactive for local-only edits. On reconnect, Yjs state syncs automatically; toast updates to "Reconnected" (auto-dismisses after 2s).
- **Invalid room slug:** If `POST /api/rooms/:slug/join` returns 404, render an error page: "Room not found" message + "Back to UniShare" link. No socket connection is attempted.

### Excalidraw configuration

- **Theme:** Map to the active UniShare theme. Override Excalidraw's `--color-primary` CSS variable with `var(--primary)` from the active theme. Derive `theme='light'|'dark'` prop by checking if the active theme has a dark background (Catppuccin Mocha → `'dark'`, UniShare default → `'light'`, etc.). Use `next-themes`'s `useTheme()` hook.
- **Hide built-in collab UI:** Set `UIOptions` to hide Excalidraw's native collaboration button/menu — our socket.io integration handles collaboration, and the two must not coexist visibly.
- **Grid:** Do not override — leave as Excalidraw's default (persists per-user in localStorage). Users control this themselves.
- **Claude's Discretion:** Exact `UIOptions` fields to set, Excalidraw `initialData` structure, whether to render `<Excalidraw>` or `<ExcalidrawWithScene>`, exact CSS overrides for theme variables beyond `--color-primary`.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 — Socket.io + Yjs relay design

- `.planning/phases/03-websocket-gateway-yjs-relay/03-CONTEXT.md` — `yjs-update` binary event, `room-joined` acknowledgement with state vector, `/collab` namespace, socket auth via cookie, relay does NOT echo to sender
- `apps/api/src/modules/collab/collab.gateway.ts` — Actual gateway implementation: event names, emit patterns, auth middleware
- `apps/api/src/modules/collab/collab-room.service.ts` — In-memory Y.Doc per room, how state vector is encoded for `room-joined`

### Phase 2 — Join endpoint + anonymous session

- `.planning/phases/02-guest-identity-auth/02-CONTEXT.md` — `POST /api/rooms/:slug/join` endpoint, anonymous session cookie, `isGuestEditingAllowed` flag
- `apps/api/src/modules/collab/collab.controller.ts` — Join endpoint implementation

### Frontend patterns

- `apps/web/src/proxy.ts` — Route protection middleware; `/canvas/*` must be in the public allowlist
- `apps/web/app/(app)/layout.tsx` — AppShell layout (canvas is NOT inside this group)
- `apps/web/app/layout.tsx` — Root layout with ThemeProvider and Providers (applies to canvas route)
- `apps/web/app/themes.css` — All custom CSS theme variables (UniShare amber, Catppuccin Mocha, etc.) — map `--primary` to Excalidraw's `--color-primary`
- `apps/web/src/providers/index.tsx` — Root Providers setup (QueryProvider, etc.)

### Requirements

- `.planning/REQUIREMENTS.md` — CANV-01 through CANV-07 (all 7 canvas tool requirements for this phase)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `next-themes` (`useTheme()` hook) — Already installed in root layout; use to derive Excalidraw `theme` prop and `--color-primary` override from active UniShare theme
- `sonner` (`toast.success()`, `toast.error()`, `toast.dismiss()`) — Already installed; use for connection lost / reconnected toasts
- `apps/web/src/lib/api/fetcher.ts` (`customFetch`) — Existing fetch wrapper with credentials; use for the `POST /api/rooms/:slug/join` call
- `cn()` from `@/lib/utils` — Use for conditional class merging in canvas page components

### Established Patterns

- `'use client'` at top of all interactive components (canvas page, ColabProvider, header component)
- Named exports for components, `export default function` for Next.js pages
- Zustand stores in `lib/store.ts` with `persist` middleware — if canvas needs any persistent local state (e.g., last room visited), follow this pattern
- React Query generated hooks from Orval — the join endpoint should be called via `customFetch` directly or a generated hook if available after `pnpm api:sync`

### Integration Points

- `apps/web/app/canvas/[slug]/` — New directory; `page.tsx` (canvas page), `layout.tsx` (wraps with CollabProvider), `loading.tsx` (optional route-level loading)
- `apps/web/src/proxy.ts` — Add `/canvas` to public routes allowlist
- `apps/web/app/themes.css` — Source of CSS variable values per theme class; Excalidraw CSS override reads from these

### New dependencies required

- `excalidraw` — Excalidraw React component (must install; client-only, requires `dynamic()` import with `ssr: false`)
- `yjs` — Y.Doc, Y.Array, `Y.applyUpdate()`, `Y.encodeStateAsUpdate()` (must install)
- `socket.io-client` — Client for connecting to the `/collab` namespace (must install)

</code_context>

<specifics>
## Specific Ideas

- Excalidraw must be imported with `next/dynamic` and `{ ssr: false }` — it uses browser APIs and will break SSR
- The `room-joined` event from Phase 3 carries the current room state vector — apply it immediately with `Y.applyUpdate()` to load existing canvas content before showing the canvas
- The CollabProvider should expose a `connectionStatus: 'connecting' | 'connected' | 'disconnected'` value so the loading overlay and disconnect toast can react to it
- The thin UniShare header should be positioned above Excalidraw using CSS flex column on the canvas route container — Excalidraw takes `flex: 1` / `height: 100vh - headerHeight`

</specifics>

<deferred>
## Deferred Ideas

- Presence cursors and participant list — Phase 5
- Database persistence (board state survives server restart) — Phase 6
- Export as PNG/PDF — Phase 6
- `ui-phase` design contract — not needed; Excalidraw provides its own UI, only 3 custom surfaces (header, loading overlay, error page) which are straightforward

</deferred>

---

_Phase: 04-canvas-ui-and-drawing-tools_
_Context gathered: 2026-03-20_
