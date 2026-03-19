# Unishare — GSD Project

## Mission

Build Phase 3 of Unishare: **Search & Growth** — make academic content findable at scale and enable users to discover resources by trending, tags, and search.

## Problem Statement

Phases 1 & 2 established the core loop (upload/browse/engage). Phase 3 addresses discoverability as the platform scales. Students need to:

- **Find content at scale** — full-text search across titles, descriptions, content
- **Discover trending resources** — sort by popularity (views, reactions) to surface quality content
- **Organize by topic** — tags enable flexible discoverability beyond course/department hierarchy
- **Report problematic content** — moderation tools for community self-governance

## Current State

**What's built (Phases 1-2):**

- Core loop: upload → browse → download ✅
- Engagement: reactions, comments, bookmarks, notifications ✅
- Admin moderation & analytics dashboard ✅
- Department/course management ✅

**Architecture:**

- Frontend: Next.js 16 (App Router), React 19, Tailwind CSS 4
- Backend: NestJS 11, Prisma, PostgreSQL
- Auth: Better Auth (email + OAuth: Google, Microsoft Entra)
- API: Orval (OpenAPI code generation)
- Monorepo: Turborepo + pnpm workspaces
- Already 2,409 lines of codebase documentation (STACK, INTEGRATIONS, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, CONCERNS)

**Known concerns:**

- Test coverage minimal (only app controller tested, no CI/CD test gate)
- Type safety issues (`any` types in repositories)
- Database optimization gaps (missing indexes, N+1 risks)
- Notification system in-memory only (single-instance assumption)
- No rate limiting or MIME type validation
- Deployment gaps (no health checks, manual migrations)

## Approach

### Research Phase

Research ecosystem for Phase 3 technologies:

- Full-text search implementations (PostgreSQL native, Elasticsearch, Meilisearch, etc.)
- Tagging systems and their trade-offs
- Trending algorithms for content discovery
- Content reporting/moderation workflows

### Planning Phase

Create REQUIREMENTS.md and ROADMAP.md:

- Define Phase 3 feature scope and boundaries
- Slice into 3-5 coarse implementation phases
- Map dependencies and sequencing
- Establish success criteria per phase

### Execution Phase

Use GSD agents (gsd-executor, gsd-planner) to:

- Plan each phase with task breakdown and dependencies
- Execute in waves with atomic commits
- Run integration checks between phases
- Validate against Phase 3 goals

## Success Criteria

**Phase 3 is complete when:**

1. Full-text search works across post titles, descriptions, and content
2. Posts can be tagged, and feed filters by tags
3. Feed supports "Trending" sort (by views and reactions)
4. Users can report posts; admins have reporting dashboard
5. E2E tests cover major user flows
6. Performance validated (search, trending queries <100ms)
7. Deployment documentation updated for new search backend

## Timeline & Scope

- **Granularity:** Coarse (3-5 implementation phases)
- **Research:** Yes (ecosystem research before planning)
- **Agents:** Enabled for autonomous planning and execution
- **Git:** Each phase commits atomically with e2e verification

---

**Next step:** Run research phase to inform requirements gathering.
