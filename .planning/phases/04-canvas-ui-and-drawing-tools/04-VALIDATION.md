---
phase: 4
slug: canvas-ui-and-drawing-tools
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                              |
| ---------------------- | -------------------------------------------------- |
| **Framework**          | vitest + @testing-library/react                    |
| **Config file**        | apps/web/vitest.config.ts                          |
| **Quick run command**  | `cd apps/web && npx vitest run --reporter=verbose` |
| **Full suite command** | `cd apps/web && npx vitest run`                    |
| **Estimated runtime**  | ~15 seconds                                        |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/web && npx vitest run --reporter=verbose`
- **After every plan wave:** Run `cd apps/web && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command                                  | File Exists | Status     |
| ------- | ---- | ---- | ----------- | --------- | -------------------------------------------------- | ----------- | ---------- |
| 4-01-01 | 01   | 1    | CANV-01     | unit      | `cd apps/web && npx vitest run --reporter=verbose` | ❌ W0       | ⬜ pending |
| 4-01-02 | 01   | 1    | CANV-02     | unit      | `cd apps/web && npx vitest run --reporter=verbose` | ❌ W0       | ⬜ pending |
| 4-02-01 | 02   | 2    | CANV-03     | unit      | `cd apps/web && npx vitest run --reporter=verbose` | ❌ W0       | ⬜ pending |
| 4-02-02 | 02   | 2    | CANV-04     | unit      | `cd apps/web && npx vitest run --reporter=verbose` | ❌ W0       | ⬜ pending |
| 4-03-01 | 03   | 3    | CANV-05     | unit      | `cd apps/web && npx vitest run --reporter=verbose` | ❌ W0       | ⬜ pending |
| 4-03-02 | 03   | 3    | CANV-06     | unit      | `cd apps/web && npx vitest run --reporter=verbose` | ❌ W0       | ⬜ pending |
| 4-03-03 | 03   | 3    | CANV-07     | unit      | `cd apps/web && npx vitest run --reporter=verbose` | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/web/src/__tests__/canvas/` — test stubs for CANV-01 through CANV-07
- [ ] `apps/web/src/__tests__/canvas/canvas-route.test.tsx` — route render test stub
- [ ] `apps/web/src/__tests__/canvas/yjs-binding.test.tsx` — Yjs sync test stubs
- [ ] `apps/web/src/__tests__/canvas/drawing-tools.test.tsx` — tool availability stubs

---

## Manual-Only Verifications

| Behavior                    | Requirement | Why Manual                                          | Test Instructions                                         |
| --------------------------- | ----------- | --------------------------------------------------- | --------------------------------------------------------- |
| Pan/zoom interaction        | CANV-02     | Mouse/touch gesture events not simulatable in jsdom | Load /canvas/:slug, use scroll and drag to pan/zoom       |
| Freehand drawing stroke     | CANV-03     | Pointer events on canvas element                    | Select pencil tool, draw a stroke, verify it appears      |
| Real-time sync between tabs | CANV-05     | Requires two browser windows with live WS           | Open same board in two tabs, draw in one, verify in other |
| Undo/redo history           | CANV-07     | Requires sequential user actions                    | Draw element, undo, verify removed; redo, verify restored |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
