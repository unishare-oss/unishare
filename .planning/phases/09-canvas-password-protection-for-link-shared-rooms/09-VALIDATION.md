---
phase: 9
slug: canvas-password-protection-for-link-shared-rooms
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| **Framework**          | vitest (frontend) / jest (api)                                       |
| **Config file**        | `apps/web/vitest.config.ts` / `apps/api/jest.config.ts`              |
| **Quick run command**  | `pnpm --filter web test --run`                                       |
| **Full suite command** | `pnpm --filter web test --run && pnpm --filter api test --runInBand` |
| **Estimated runtime**  | ~30 seconds                                                          |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web test --run`
- **After every plan wave:** Run `pnpm --filter web test --run && pnpm --filter api test --runInBand`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement         | Test Type   | Automated Command                    | File Exists | Status     |
| ------- | ---- | ---- | ------------------- | ----------- | ------------------------------------ | ----------- | ---------- |
| 9-01-01 | 01   | 1    | password schema     | unit        | `pnpm --filter api test --runInBand` | ✅          | ⬜ pending |
| 9-01-02 | 01   | 1    | hash on save        | unit        | `pnpm --filter api test --runInBand` | ✅          | ⬜ pending |
| 9-02-01 | 02   | 2    | join password check | unit        | `pnpm --filter api test --runInBand` | ✅          | ⬜ pending |
| 9-02-02 | 02   | 2    | 401 response        | integration | `pnpm --filter api test --runInBand` | ✅          | ⬜ pending |
| 9-03-01 | 03   | 3    | password gate UI    | unit        | `pnpm --filter web test --run`       | ❌ W0       | ⬜ pending |
| 9-03-02 | 03   | 3    | hub badge           | unit        | `pnpm --filter web test --run`       | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/web/src/components/__tests__/password-gate.test.tsx` — stubs for password gate modal
- [ ] `apps/web/src/components/__tests__/room-card-badge.test.tsx` — stubs for lock badge
- [ ] `apps/api/src/collab/__tests__/password-join.spec.ts` — stubs for join with password

_If none: "Existing infrastructure covers all phase requirements."_

---

## Manual-Only Verifications

| Behavior                             | Requirement    | Why Manual               | Test Instructions                                                      |
| ------------------------------------ | -------------- | ------------------------ | ---------------------------------------------------------------------- |
| Password prompt blocks room entry    | password gate  | Browser flow required    | Open link-shared room with password; verify gate appears before canvas |
| Wrong password shows error           | error feedback | Browser flow required    | Enter wrong password; verify error message displayed                   |
| Correct password grants access       | join flow      | Browser flow required    | Enter correct password; verify canvas loads                            |
| Room owner sets password in settings | settings form  | Browser form interaction | Open room settings, set password, save, verify badge appears           |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
