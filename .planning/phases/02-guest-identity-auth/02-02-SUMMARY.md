---
phase: 02-guest-identity-auth
plan: 02
subsystem: api
tags: [nestjs, prisma, cron, anonymous-users, cleanup]

# Dependency graph
requires:
  - phase: 02-01
    provides: isAnonymous field on User model with cascade deletes on Session and Account

provides:
  - pruneAnonymousUsers cron job at 00:20 daily that deletes anonymous users older than 7 days
  - Unit tests covering query correctness and logging behavior for pruneAnonymousUsers

affects: [03-websocket-gateway, guest-session-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - '@Cron decorator with explicit cron string (0 20 0 * * *) for non-colliding schedule'
    - 'TDD with Jest mocks for PrismaService; mock all models referenced by service methods'

key-files:
  created:
    - apps/api/src/modules/tasks/tasks.service.spec.ts
  modified:
    - apps/api/src/modules/tasks/tasks.service.ts

key-decisions:
  - 'Cron scheduled at 00:20 to avoid collision with pruneOldNotifications (00:00), pruneExpiredSessions (00:05), purgeDeletedContent (00:15)'
  - 'Cascade deletes on User->Session and User->Account handle all related data cleanup automatically'

patterns-established:
  - 'TasksService pattern: @Cron + cutoff date + prisma.model.deleteMany + conditional logger.log'

requirements-completed: [COLB-04]

# Metrics
duration: 5min
completed: 2026-03-20
---

# Phase 2 Plan 2: Anonymous User Pruning Cron Summary

**Daily cron at 00:20 deletes anonymous users older than 7 days via prisma.user.deleteMany with cascade cleanup of sessions and accounts**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-20T08:20:00Z
- **Completed:** 2026-03-20T08:25:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `pruneAnonymousUsers` cron method to `TasksService` running at 00:20 daily
- Cron uses a 7-day cutoff and calls `prisma.user.deleteMany` with `isAnonymous: true`
- 3 unit tests pass: correct query shape with 7-day cutoff, logs when count > 0, silent when count is 0

## Task Commits

1. **Tasks 1 & 2: pruneAnonymousUsers cron + unit tests** - `6760c5c` (feat)

## Files Created/Modified

- `apps/api/src/modules/tasks/tasks.service.ts` - Added `pruneAnonymousUsers` cron method
- `apps/api/src/modules/tasks/tasks.service.spec.ts` - Unit tests for pruneAnonymousUsers (3 tests)

## Decisions Made

- Cron scheduled at `0 20 0 * * *` (00:20 daily) to avoid collision with the three existing cron jobs at 00:00, 00:05, and 00:15.
- No additional cleanup code needed beyond the deleteMany — Prisma cascade deletes on `Session` and `Account` handle all related data.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Anonymous user lifecycle is complete: created in plan 01 with `isAnonymous` flag, pruned here after 7 days.
- Phase 3 (WebSocket Gateway) can rely on anonymous users existing for up to 7 days.

---

_Phase: 02-guest-identity-auth_
_Completed: 2026-03-20_
