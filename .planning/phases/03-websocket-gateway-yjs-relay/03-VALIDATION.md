---
phase: 3
slug: websocket-gateway-yjs-relay
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                 |
| ---------------------- | ----------------------------------------------------- |
| **Framework**          | Jest 30 + ts-jest 29                                  |
| **Config file**        | `apps/api/package.json` (`jest` key)                  |
| **Quick run command**  | `cd apps/api && npx jest --testPathPattern=collab -x` |
| **Full suite command** | `cd apps/api && npx jest`                             |
| **Estimated runtime**  | ~15 seconds                                           |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && npx jest --testPathPattern=collab -x`
- **After every plan wave:** Run `cd apps/api && npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type   | Automated Command                                                         | File Exists | Status     |
| ------- | ---- | ---- | ----------- | ----------- | ------------------------------------------------------------------------- | ----------- | ---------- |
| 3-01-01 | 01   | 0    | COLB-01     | unit        | `cd apps/api && npx jest --testPathPattern=collab.gateway.spec -x`        | ❌ W0       | ⬜ pending |
| 3-01-02 | 01   | 0    | COLB-01     | unit        | `cd apps/api && npx jest --testPathPattern=collab.room.service.spec -x`   | ❌ W0       | ⬜ pending |
| 3-01-03 | 01   | 0    | COLB-01     | integration | `cd apps/api && npx jest --testPathPattern=collab.gateway.integration -x` | ❌ W0       | ⬜ pending |
| 3-02-01 | 02   | 1    | COLB-01     | unit        | `cd apps/api && npx jest --testPathPattern=collab.room.service.spec -x`   | ❌ W0       | ⬜ pending |
| 3-03-01 | 03   | 1    | COLB-01     | unit        | `cd apps/api && npx jest --testPathPattern=collab.gateway.spec -x`        | ❌ W0       | ⬜ pending |
| 3-04-01 | 04   | 1    | COLB-01     | integration | `cd apps/api && npx jest --testPathPattern=collab.gateway.integration -x` | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/collab/collab.gateway.spec.ts` — unit tests for gateway handlers (join-room, yjs-update, disconnect)
- [ ] `apps/api/src/modules/collab/collab.room.service.spec.ts` — unit tests for CollabRoomService (getOrCreate, registerSocket, removeSocket, GC)
- [ ] `apps/api/src/modules/collab/collab.gateway.integration.spec.ts` — socket.io-client integration tests: relay between clients, cross-room isolation, initial state sync, auth rejection
- [ ] Ensure `socket.io-client` is in `apps/api/package.json` devDependencies

---

## Manual-Only Verifications

| Behavior                                                   | Requirement | Why Manual                                                     | Test Instructions                                                                                          |
| ---------------------------------------------------------- | ----------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Canvas change in one tab appears in other tab within 200ms | COLB-01     | Requires real browser UI (Phase 4 canvas client not yet built) | Phase 4 smoke test: open two browser tabs, join same room, draw on canvas, verify update appears in <200ms |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
