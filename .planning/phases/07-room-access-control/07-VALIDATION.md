---
phase: 7
slug: room-access-control
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| **Framework**          | Jest (NestJS default)                                                        |
| **Config file**        | `apps/api/package.json` (jest key)                                           |
| **Quick run command**  | `cd apps/api && npx jest --testPathPattern=collab.service --passWithNoTests` |
| **Full suite command** | `cd apps/api && npx jest`                                                    |
| **Estimated runtime**  | ~15 seconds                                                                  |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && npx jest --testPathPattern=collab.service --passWithNoTests`
- **After every plan wave:** Run `cd apps/api && npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement                  | Test Type | Automated Command                                                               | File Exists | Status     |
| ------- | ---- | ---- | ---------------------------- | --------- | ------------------------------------------------------------------------------- | ----------- | ---------- |
| 7-01-01 | 01   | 0    | SHARE-01, SHARE-02, SHARE-03 | unit      | `cd apps/api && npx jest --testPathPattern=collab.service --passWithNoTests`    | ❌ W0       | ⬜ pending |
| 7-02-01 | 02   | 1    | SHARE-01                     | unit      | `cd apps/api && npx jest --testPathPattern=collab.service -t "updateRoom"`      | ❌ W0       | ⬜ pending |
| 7-02-02 | 02   | 1    | SHARE-02                     | unit      | `cd apps/api && npx jest --testPathPattern=collab.service -t "joinRoom"`        | ✅ updated  | ⬜ pending |
| 7-02-03 | 02   | 1    | SHARE-03                     | unit      | `cd apps/api && npx jest --testPathPattern=collab.service -t "joinRoom"`        | ❌ W0       | ⬜ pending |
| 7-03-01 | 03   | 1    | SHARE-02                     | unit      | `cd apps/api && npx jest --testPathPattern=collab.gateway.spec -t "yjs-update"` | ✅ updated  | ⬜ pending |
| 7-04-01 | 04   | 2    | SHARE-01, SHARE-02           | manual    | Browser: toggle visibility, verify view-only link blocks drawing                | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/collab/collab.service.spec.ts` — new test cases for `updateRoom` (owner check, visibility update) for SHARE-01
- [ ] `apps/api/src/modules/collab/collab.service.spec.ts` — new test case for PRIVATE + anonymous → ForbiddenException for SHARE-03
- [ ] `apps/api/src/modules/collab/collab.service.spec.ts` — update existing mockRoom to use `visibility` field instead of `isGuestEditingAllowed`
- [ ] `apps/api/src/modules/collab/collab.gateway.spec.ts` — add `socket.data.isViewOnly` guard test for `yjs-update` event

---

## Manual-Only Verifications

| Behavior                                 | Requirement | Why Manual                                                                         | Test Instructions                                                                                    |
| ---------------------------------------- | ----------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| View-only link blocks drawing in browser | SHARE-02    | Requires browser + Excalidraw rendering to confirm `viewModeEnabled` hides toolbar | Open view-only link in incognito; confirm no drawing tools visible and canvas rejects pointer events |
| Room owner can revoke/change visibility  | SHARE-03    | UI interaction test — settings popover and confirmation                            | As owner, open settings, change visibility, verify non-owner loses access on next join               |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
