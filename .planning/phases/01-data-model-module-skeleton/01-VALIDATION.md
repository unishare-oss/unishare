---
phase: 1
slug: data-model-module-skeleton
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                         |
| ---------------------- | ----------------------------- |
| **Framework**          | jest 29.x (NestJS default)    |
| **Config file**        | `package.json` (jest config)  |
| **Quick run command**  | `pnpm test --passWithNoTests` |
| **Full suite command** | `pnpm test`                   |
| **Estimated runtime**  | ~10 seconds                   |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --passWithNoTests`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command                       | File Exists | Status     |
| ------- | ---- | ---- | ----------- | --------- | --------------------------------------- | ----------- | ---------- |
| 1-01-01 | 01   | 1    | ROOM-01     | unit      | `pnpm test --testPathPattern=room`      | ❌ W0       | ⬜ pending |
| 1-01-02 | 01   | 1    | ROOM-01     | unit      | `pnpm test --testPathPattern=room`      | ❌ W0       | ⬜ pending |
| 1-01-03 | 01   | 1    | ROOM-02     | unit      | `pnpm test --testPathPattern=room`      | ❌ W0       | ⬜ pending |
| 1-01-04 | 01   | 2    | ROOM-02     | e2e       | `pnpm test:e2e --testPathPattern=rooms` | ❌ W0       | ⬜ pending |
| 1-01-05 | 01   | 2    | ROOM-03     | e2e       | `pnpm test:e2e --testPathPattern=rooms` | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `src/collab/collab.service.spec.ts` — unit stubs for RoomService (ROOM-01, ROOM-02)
- [ ] `src/collab/collab.controller.spec.ts` — unit stubs for CollabController (ROOM-02)
- [ ] `test/rooms.e2e-spec.ts` — e2e stubs for POST /api/rooms, GET /api/rooms/:slug (ROOM-02, ROOM-03)

---

## Manual-Only Verifications

| Behavior                           | Requirement | Why Manual                                 | Test Instructions                                                     |
| ---------------------------------- | ----------- | ------------------------------------------ | --------------------------------------------------------------------- |
| Room persists after server restart | ROOM-03     | Requires running Postgres + server restart | Start server, create room, restart, GET /api/rooms/:slug — expect 200 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
