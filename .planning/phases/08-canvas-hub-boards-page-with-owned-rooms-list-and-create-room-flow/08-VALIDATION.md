---
phase: 8
slug: canvas-hub-boards-page-with-owned-rooms-list-and-create-room-flow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                   |
| ---------------------- | ------------------------------------------------------- |
| **Framework**          | Jest 29.x (API) + Vitest (Web)                          |
| **Config file**        | `apps/api/jest.config.ts` / `apps/web/vitest.config.ts` |
| **Quick run command**  | `pnpm --filter api test --testPathPattern=collab`       |
| **Full suite command** | `pnpm --filter api test && pnpm --filter web test`      |
| **Estimated runtime**  | ~30 seconds                                             |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter api test --testPathPattern=collab`
- **After every plan wave:** Run `pnpm --filter api test && pnpm --filter web test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement         | Test Type | Automated Command                                     | File Exists | Status     |
| ------- | ---- | ---- | ------------------- | --------- | ----------------------------------------------------- | ----------- | ---------- |
| 8-01-01 | 01   | 1    | DTO extend          | unit      | `pnpm --filter api test --testPathPattern=collab`     | ❌ W0       | ⬜ pending |
| 8-01-02 | 01   | 1    | findByOwner         | unit      | `pnpm --filter api test --testPathPattern=collab`     | ❌ W0       | ⬜ pending |
| 8-01-03 | 01   | 1    | deleteBySlug        | unit      | `pnpm --filter api test --testPathPattern=collab`     | ❌ W0       | ⬜ pending |
| 8-01-04 | 01   | 1    | GET /rooms          | e2e       | `pnpm --filter api test:e2e --testPathPattern=collab` | ❌ W0       | ⬜ pending |
| 8-01-05 | 01   | 1    | DELETE /rooms/:slug | e2e       | `pnpm --filter api test:e2e --testPathPattern=collab` | ❌ W0       | ⬜ pending |
| 8-02-01 | 02   | 2    | boards page renders | manual    | —                                                     | N/A         | ⬜ pending |
| 8-02-02 | 02   | 2    | create room modal   | manual    | —                                                     | N/A         | ⬜ pending |
| 8-02-03 | 02   | 2    | kebab menu actions  | manual    | —                                                     | N/A         | ⬜ pending |
| 8-02-04 | 02   | 2    | nav wiring          | manual    | —                                                     | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/collab/__tests__/collab.service.spec.ts` — stubs for getRoomsByOwner, deleteRoom
- [ ] `apps/api/src/modules/collab/__tests__/collab.repository.spec.ts` — stubs for findByOwner, deleteBySlug
- [ ] `apps/api/test/collab.e2e-spec.ts` (or extend existing) — stubs for GET /rooms, DELETE /rooms/:slug

_Existing test infrastructure covers the framework; only test stubs needed for new methods._

---

## Manual-Only Verifications

| Behavior                        | Requirement   | Why Manual                                   | Test Instructions                                                          |
| ------------------------------- | ------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| Boards page renders room cards  | Phase 8 scope | UI rendering; no Vitest DOM tests in project | Navigate to /boards as authenticated user; verify cards appear             |
| Create room modal flow          | Phase 8 scope | Multi-step UI interaction                    | Click "New Board"; fill title; submit; verify redirect to /canvas/[slug]   |
| Kebab menu hover/touch behavior | Phase 8 scope | CSS hover states not testable in unit tests  | Desktop: hover card → menu appears. Mobile: tap card → menu always visible |
| Empty state SVG renders         | Phase 8 scope | Visual component                             | Delete all rooms; verify hero empty state with SVG illustration shows      |
| Nav "Boards" active state       | Phase 8 scope | CSS active state                             | Navigate to /boards; verify sidebar "Boards" has amber highlight           |
| Mobile nav "Saved" replaced     | Phase 8 scope | Visual nav check                             | On mobile viewport; verify "Boards" tab shows, "Saved" tab gone            |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
