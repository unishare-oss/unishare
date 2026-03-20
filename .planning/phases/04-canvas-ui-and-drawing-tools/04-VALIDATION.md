---
phase: 4
slug: canvas-ui-and-drawing-tools
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                              |
| ---------------------- | -------------------------------------------------- |
| **Framework**          | vitest                                             |
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

| Task ID | Plan | Wave | Requirement | Test Type     | Automated Command                                        | File                                         | Status     |
| ------- | ---- | ---- | ----------- | ------------- | -------------------------------------------------------- | -------------------------------------------- | ---------- |
| 4-01-01 | 01   | 1    | CANV-01     | manual-only   | n/a — Excalidraw UI interaction not simulatable in jsdom | human verify in Plan 03 checkpoint           | ⬜ pending |
| 4-01-02 | 01   | 1    | CANV-02     | manual-only   | n/a — pointer/touch events on canvas element             | human verify in Plan 03 checkpoint           | ⬜ pending |
| 4-02-01 | 02   | 2    | CANV-03     | manual-only   | n/a — Excalidraw tool selection requires browser         | human verify in Plan 03 checkpoint           | ⬜ pending |
| 4-02-02 | 02   | 2    | CANV-04     | manual-only   | n/a — text tool requires browser                         | human verify in Plan 03 checkpoint           | ⬜ pending |
| 4-02-03 | 02   | 2    | CANV-05     | unit + manual | `cd apps/web && npx vitest run --reporter=verbose`       | apps/web/src/contexts/collab-context.test.ts | ⬜ pending |
| 4-03-01 | 03   | 3    | CANV-06     | manual-only   | n/a — element select/move/resize requires browser        | human verify in Plan 03 checkpoint           | ⬜ pending |
| 4-03-02 | 03   | 3    | CANV-07     | manual-only   | n/a — undo/redo requires sequential user actions         | human verify in Plan 03 checkpoint           | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [x] `apps/web/src/contexts/collab-context.test.ts` — unit tests for Yjs sync logic (created by Plan 02 Task 2)

CANV-01 through CANV-07 are manual-only verifications (Excalidraw canvas interactions require a real browser). No unit test stubs are created for these requirements — they are covered by the Plan 03 checkpoint:human-verify task.

---

## Manual-Only Verifications

| Behavior                    | Requirement | Why Manual                                          | Test Instructions                                         |
| --------------------------- | ----------- | --------------------------------------------------- | --------------------------------------------------------- |
| Pan/zoom interaction        | CANV-01     | Mouse/touch gesture events not simulatable in jsdom | Load /canvas/:slug, use scroll and drag to pan/zoom       |
| Freehand drawing stroke     | CANV-02     | Pointer events on canvas element                    | Select pencil tool, draw a stroke, verify it appears      |
| Shape drawing tools         | CANV-03     | Excalidraw tool selection requires browser          | Draw rectangle, circle, arrow, line                       |
| Text tool                   | CANV-04     | Text input on canvas requires browser               | Add text box, type content                                |
| Real-time sync between tabs | CANV-05     | Requires two browser windows with live WS           | Open same board in two tabs, draw in one, verify in other |
| Select/move/resize/delete   | CANV-06     | Element interaction requires browser                | Select element, move it, resize it, delete it             |
| Undo/redo history           | CANV-07     | Requires sequential user actions                    | Draw element, undo, verify removed; redo, verify restored |

All 7 are verified together in the Plan 03 checkpoint:human-verify task.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are documented as manual-only
- [x] Wave 0 requirement: collab-context.test.ts created by Plan 02 Task 2
- [x] CANV-01 through CANV-07 manual-only — covered by Plan 03 checkpoint
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
