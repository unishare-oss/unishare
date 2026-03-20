---
phase: 6
slug: board-persistence-export
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                     |
| ---------------------- | ----------------------------------------- |
| **Framework**          | vitest (frontend) / jest (NestJS backend) |
| **Config file**        | `vitest.config.ts` / `jest.config.js`     |
| **Quick run command**  | `pnpm --filter=@unishare/web test --run`  |
| **Full suite command** | `pnpm test`                               |
| **Estimated runtime**  | ~30 seconds                               |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter=@unishare/web test --run`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command                                      | File Exists | Status     |
| ------- | ---- | ---- | ----------- | --------- | ------------------------------------------------------ | ----------- | ---------- |
| 6-01-01 | 01   | 1    | ROOM-03     | unit      | `pnpm --filter=@unishare/api test -- board.repository` | ❌ W0       | ⬜ pending |
| 6-01-02 | 01   | 1    | ROOM-03     | unit      | `pnpm --filter=@unishare/api test -- collab.gateway`   | ✅          | ⬜ pending |
| 6-02-01 | 02   | 1    | ROOM-04     | unit      | `pnpm --filter=@unishare/api test -- board.repository` | ❌ W0       | ⬜ pending |
| 6-03-01 | 03   | 2    | EXPO-01     | manual    | See manual verifications                               | n/a         | ⬜ pending |
| 6-03-02 | 03   | 2    | EXPO-02     | manual    | See manual verifications                               | n/a         | ⬜ pending |
| 6-04-01 | 04   | 2    | EXPO-01     | manual    | See manual verifications                               | n/a         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/api/src/collab/board.repository.spec.ts` — stubs for ROOM-03, ROOM-04 (save snapshot, load snapshot)
- [ ] Existing `collab.gateway.spec.ts` covers idle timer and GC timer if extended

_If none: "Existing infrastructure covers all phase requirements."_

---

## Manual-Only Verifications

| Behavior                                                   | Requirement | Why Manual                                         | Test Instructions                                                                                              |
| ---------------------------------------------------------- | ----------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Board state restored after page reload                     | ROOM-04     | Requires live WebSocket + DB round-trip            | 1. Join room, draw something, wait 30s (idle save). 2. Reload page. 3. Verify drawing is visible.              |
| Export PNG downloads correct image                         | EXPO-01     | Browser file download — not automatable headlessly | 1. Draw on canvas. 2. Click Export → Export PNG. 3. Verify downloaded file opens and matches canvas.           |
| Export PDF downloads correct document                      | EXPO-02     | Browser file download                              | 1. Draw on canvas. 2. Click Export → Export PDF. 3. Verify downloaded PDF opens and matches canvas.            |
| Post to UniShare prefills image                            | EXPO-01     | Requires cross-app navigation + prefill check      | 1. Draw on canvas. 2. Click Export → Post to UniShare. 3. Verify post creation form opens with image attached. |
| Authenticated user can post; anon user sees sign-in prompt | EXPO-01     | Auth state branching                               | Test with logged-in and guest sessions separately.                                                             |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
