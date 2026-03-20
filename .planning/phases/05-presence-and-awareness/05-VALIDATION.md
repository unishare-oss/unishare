---
phase: 5
slug: presence-and-awareness
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property              | Value                                                          |
| --------------------- | -------------------------------------------------------------- |
| **Framework (API)**   | Jest (configured in `apps/api/package.json`)                   |
| **Framework (Web)**   | Vitest (configured in `apps/web/package.json`)                 |
| **Config file (API)** | inline in `package.json` (`jest`)                              |
| **Config file (Web)** | none explicit — uses Vitest defaults                           |
| **Quick run (API)**   | `cd apps/api && pnpm test -- --testPathPattern=collab.gateway` |
| **Quick run (Web)**   | `cd apps/web && pnpm test -- --run collab-context`             |
| **Full suite (API)**  | `cd apps/api && pnpm test`                                     |
| **Full suite (Web)**  | `cd apps/web && pnpm test`                                     |
| **Estimated runtime** | ~15 seconds (API), ~5 seconds (Web quick)                      |

---

## Sampling Rate

- **After every task commit:** `cd apps/api && pnpm test -- --testPathPattern=collab` (covers gateway + room service)
- **After every plan wave:** `cd apps/api && pnpm test && cd ../web && pnpm test`
- **Before `/gsd-verify-work`:** Both full suites must be green
- **Max feedback latency:** ~20 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type      | Automated Command                                                   | File Exists | Status     |
| -------- | ---- | ---- | ----------- | -------------- | ------------------------------------------------------------------- | ----------- | ---------- |
| 05-??-01 | TBD  | 0    | COLB-02     | unit (web)     | `cd apps/web && pnpm test -- --run cursor-coords`                   | ❌ Wave 0   | ⬜ pending |
| 05-??-02 | TBD  | 0    | COLB-02     | unit (web)     | `cd apps/web && pnpm test -- --run presence`                        | ❌ Wave 0   | ⬜ pending |
| 05-??-03 | TBD  | 0    | COLB-02     | unit (gateway) | `cd apps/api && pnpm test -- --testPathPattern=collab.gateway.spec` | ✅ extend   | ⬜ pending |
| 05-??-04 | TBD  | 1    | COLB-02     | unit (gateway) | same                                                                | ✅ extend   | ⬜ pending |
| 05-??-05 | TBD  | 1    | COLB-02     | unit (gateway) | same                                                                | ✅ extend   | ⬜ pending |
| 05-??-06 | TBD  | 1    | COLB-03     | unit (gateway) | same                                                                | ✅ extend   | ⬜ pending |
| 05-??-07 | TBD  | 1    | COLB-03     | unit (gateway) | same                                                                | ✅ extend   | ⬜ pending |
| 05-??-08 | TBD  | 1    | COLB-03     | unit (gateway) | same                                                                | ✅ extend   | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/web/src/lib/cursor-coords.test.ts` — unit test for `sceneToOverlay` / `overlayToScene` roundtrip with edge cases (zoom 0.5, zoom 2, non-zero offset)
- [ ] `apps/web/src/lib/presence.test.ts` — unit test for `hashToColorIndex` determinism and distribution across 8 colors
- [ ] Extend `apps/api/src/modules/collab/collab.gateway.spec.ts` — add cursor-move relay tests, participant-joined/left event tests

---

## Manual-Only Verifications

| Behavior                                                     | Requirement | Why Manual                                       | Test Instructions                                                                   |
| ------------------------------------------------------------ | ----------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Cursor renders at correct screen position after pan/zoom     | COLB-02     | Requires browser viewport + Excalidraw rendering | Open room in two browsers, pan/zoom in one, verify cursor tracks correctly in other |
| Avatar dropdown opens and lists all participants             | COLB-03     | Requires browser interaction                     | Open room in 3 browsers, verify overflow badge shows +N and dropdown lists all      |
| Cursor stays at last position when participant stops moving  | COLB-02     | Requires browser observation                     | Stop moving mouse in one browser, verify cursor remains at last position in other   |
| Out-of-viewport cursors hidden but participant still in list | COLB-02     | Requires browser viewport control                | Pan canvas so remote cursor is off screen, verify cursor hidden but avatar visible  |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
