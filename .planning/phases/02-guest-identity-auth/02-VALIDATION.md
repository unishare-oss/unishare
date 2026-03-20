---
phase: 2
slug: guest-identity-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| **Framework**          | jest 29.x (existing in apps/api)                                     |
| **Config file**        | apps/api/jest.config.ts                                              |
| **Quick run command**  | `cd apps/api && npx jest --testPathPattern=collab --passWithNoTests` |
| **Full suite command** | `cd apps/api && npx jest --passWithNoTests`                          |
| **Estimated runtime**  | ~10 seconds                                                          |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && npx jest --testPathPattern=collab --passWithNoTests`
- **After every plan wave:** Run `cd apps/api && npx jest --passWithNoTests`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type   | Automated Command                                             | File Exists | Status     |
| ------- | ---- | ---- | ----------- | ----------- | ------------------------------------------------------------- | ----------- | ---------- |
| 2-01-01 | 01   | 1    | COLB-04     | unit        | `cd apps/api && npx jest --testPathPattern=collab.service`    | ❌ W0       | ⬜ pending |
| 2-01-02 | 01   | 1    | COLB-04     | unit        | `cd apps/api && npx jest --testPathPattern=collab.service`    | ❌ W0       | ⬜ pending |
| 2-01-03 | 01   | 2    | COLB-04     | integration | `cd apps/api && npx jest --testPathPattern=collab.controller` | ❌ W0       | ⬜ pending |
| 2-01-04 | 01   | 2    | COLB-04     | unit        | `cd apps/api && npx jest --testPathPattern=tasks`             | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/collab/collab.service.spec.ts` — stubs for anonymous session creation (COLB-04)
- [ ] `apps/api/src/modules/collab/collab.controller.spec.ts` — stubs for join endpoint anonymous flow
- [ ] `apps/api/src/modules/tasks/tasks.service.spec.ts` — stubs for cleanup cron

_Existing jest infrastructure covers the framework — only test stubs need to be created._

---

## Manual-Only Verifications

| Behavior                                | Requirement | Why Manual                             | Test Instructions                                                    |
| --------------------------------------- | ----------- | -------------------------------------- | -------------------------------------------------------------------- |
| Anonymous session cookie set in browser | COLB-04     | Requires real HTTP + cookie inspection | POST /collab/rooms/:id/join unauthenticated, check Set-Cookie header |
| WebSocket accepts anonymous session     | COLB-04     | Requires real WS connection            | Connect to WS with anonymous session token, verify no 401            |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
