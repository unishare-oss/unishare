# Phase 2: Guest Identity & Auth - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure Better Auth's anonymous plugin so unauthenticated users automatically receive an anonymous session when joining a room. This phase delivers the identity foundation — the session a guest holds is what Phase 3's WebSocket handshake will authenticate. Creating rooms, canvas editing, and presence UI are out of scope for this phase.

</domain>

<decisions>
## Implementation Decisions

### Guest display name

- Auto-generated adjective+animal name (e.g., "Purple Penguin") assigned at session creation — zero friction, user drops straight into room
- Name stored as a `displayName` field on the anonymous session record in the DB (single source of truth for Phase 5's presence UI)
- Guests CAN change their display name from inside the room — name-change UI is Phase 5's concern, but the session must store a mutable `displayName` field

### Session continuity

- Anonymous session persists via cookie (7-day TTL, matching the existing Better Auth session config)
- If a guest returns to the same room URL with a valid cookie, they re-enter as the same identity — no new session created
- Canvas contributions stay attributed to the original session ID (not re-attributed on re-join)

### Session creation trigger

- Anonymous session is created when the guest hits the room join endpoint: `POST /api/rooms/:slug/join`
- Behavior is idempotent: if a valid anonymous session cookie is already present, return the existing session — no new session created
- Session creation is NOT deferred to WebSocket connection time

### Guest permissions level

- Guests have full editor access by default — same as authenticated users
- A room-level `isGuestEditingAllowed` boolean flag is added to the `Room` model in this phase (default: `true`)
- The join endpoint checks this flag: if `false`, guest session is created but flagged as view-only
- Room creator can toggle this flag (endpoint to be added in this phase or Phase 3 — planner decides)

### Cleanup

- Anonymous sessions older than 7 days are cleaned up via a scheduled job (the `@nestjs/schedule` package is already installed)

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Auth configuration

- `apps/api/src/auth/auth.config.ts` — Existing Better Auth setup: plugins array, session config, social providers, user additional fields. The anonymous plugin must be added here.

### Room model

- `apps/api/prisma/schema.prisma` — Room model definition. The `isGuestEditingAllowed` boolean field must be added here.

### Existing room endpoints

- `apps/api/src/modules/collab/collab.controller.ts` — Where the `POST /rooms/:slug/join` endpoint will be added
- `apps/api/src/modules/collab/collab.service.ts` — Service layer for join logic
- `apps/api/src/modules/collab/collab.repository.ts` — Repository layer

### Better Auth anonymous plugin (research required)

- Better Auth docs for the anonymous plugin — researcher must look up the current API (`anonymous()` plugin, session schema extension, `displayName` field support)
- The `@thallesp/nestjs-better-auth` package for any NestJS-specific anonymous session patterns

### Requirements

- `.planning/REQUIREMENTS.md` — COLB-04 (the sole requirement for this phase)

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- `@nestjs/schedule` — Already installed; use for the 7-day anonymous session cleanup cron job
- `@OptionalAuth()` decorator from `@thallesp/nestjs-better-auth` — May be used on the join endpoint to handle both authenticated and unauthenticated callers
- `nanoid` — Already in use for slug generation; can reuse for generating display name components if needed

### Established Patterns

- Better Auth session config lives entirely in `apps/api/src/auth/auth.config.ts` — plugins are registered in the `plugins` array, session fields in `session` or `user.additionalFields`
- NestJS scheduled tasks follow the `@Cron()` decorator pattern (see `@nestjs/schedule` usage in the codebase)
- Controllers follow the pattern in `collab.controller.ts` — method decorators, `@Session()` for auth, DTOs for validation

### Integration Points

- `auth.config.ts` — anonymous plugin registration and session schema extension
- `schema.prisma` — new `isGuestEditingAllowed` field on Room + any schema changes Better Auth's anonymous plugin requires (e.g., new session table columns)
- `collab.controller.ts` — new `POST /rooms/:slug/join` endpoint
- `app.module.ts` — if a new scheduled service is added for cleanup, it may need registration

</code_context>

<specifics>
## Specific Ideas

- The join endpoint should be unauthenticated by default (like `GET /rooms/:slug` from Phase 1) — the anonymous session is CREATED by the join call, so no prior auth is required
- The `isGuestEditingAllowed` flag defaults to `true` so rooms are open for collaboration out of the box

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

_Phase: 02-guest-identity-auth_
_Context gathered: 2026-03-20_
