# Unishare Phase 3 — Roadmap

## Overview

Phase 3 (Search & Growth) is sliced into **3 coarse implementation phases** to deliver search, tagging, trending, and reporting incrementally.

---

## Phase 3.1: Full-Text Search & Tagging Foundation

**Goal:** Students can search for posts and tag content for discoverability.

**Scope:**

- Full-text search backend selection and integration
- Search API endpoint (GET /posts/search)
- Search UI on feed (search box, input handling, results display)
- Tagging data model and API endpoints
- Tag CRUD (create, read, update on posts)
- Tag autocomplete on post creation/edit

**Milestones:**

- [ ] Search backend integrated with NestJS API
- [ ] Search endpoint tested (unit + e2e)
- [ ] Frontend search component renders and submits queries
- [ ] Tags table/model created in PostgreSQL
- [ ] Post-tag relationships created and queryable
- [ ] Autocomplete works with 10+ existing tags
- [ ] No Phase 1-2 regression

**Metrics:**

- Search query latency <100ms
- 100% of E2E test for "search for post by title" passing

**Output:**

- Code commit with search and tagging implementation
- Updated Swagger API docs

---

## Phase 3.2: Trending Feed & Admin Reporting

**Goal:** Students see trending content; admins can moderate via reports.

**Scope:**

- Trending sort with time-decay algorithm (reactions + views)
- Trending API endpoint (GET /posts/trending)
- Feed UI updated: sort dropdown with "Recent" and "Trending"
- Reporting data model (reports table with reason, status, audit)
- Report submission API
- Report admin dashboard (list, filter, approve/reject)
- Reported post soft-delete logic

**Dependencies:**

- Phase 3.1 complete (tagging foundation)

**Milestones:**

- [ ] Trending algorithm defined and tested
- [ ] Trending endpoint returns posts ranked correctly
- [ ] Feed UI has working sort toggle
- [ ] Reports table created with audit columns
- [ ] Report submission API working
- [ ] Admin dashboard lists reports with filters
- [ ] Admin can approve/reject reports
- [ ] E2E test: user reports post, admin reviews and rejects

**Metrics:**

- Trending queries <100ms
- 100% of E2E tests passing
- No Phase 1-2 feature regression

**Output:**

- Code commit with trending and reporting
- Admin dashboard documentation
- Updated Swagger API docs

---

## Phase 3.3: Polish, Testing & Optimization

**Goal:** Phase 3 is production-ready with comprehensive test coverage and performance optimization.

**Scope:**

- E2E tests: search, trending, tagging, reporting major user flows
- Performance testing: query optimization, index tuning
- Bug fixes from Phase 3.1-3.2
- Deployment documentation updates
- Migration scripts for tagging and reporting tables
- Admin documentation for reporting workflows

**Dependencies:**

- Phase 3.2 complete

**Milestones:**

- [ ] E2E tests added for all Phase 3 user flows
- [ ] All Phase 1-2 tests still passing
- [ ] Query performance optimized (search, trending <100ms sustained load)
- [ ] Database indexes created for search, trending, reporting queries
- [ ] Migration scripts tested locally
- [ ] Deployment guide updated
- [ ] API Swagger docs complete
- [ ] All required tests in CI/CD pipeline

**Metrics:**

- 80%+ test coverage of Phase 3 code
- 100% of E2E tests passing
- Search/trending sustained <100ms at 10K posts
- Zero Phase 1-2 regressions

**Output:**

- Final code commit with tests and optimization
- Updated DEPLOYMENT.md
- Test coverage report

---

## Feature Mapping to Phases

| Feature                   | Phase 3.1 | Phase 3.2 | Phase 3.3 |
| ------------------------- | --------- | --------- | --------- |
| Full-text search          | ✅        |           |           |
| Tagging                   | ✅        |           |           |
| Trending sort             |           | ✅        |           |
| Reporting                 |           | ✅        |           |
| Admin reporting dashboard |           | ✅        |           |
| E2E tests                 |           |           | ✅        |
| Performance optimization  |           |           | ✅        |
| Deployment docs           |           |           | ✅        |

---

## Architecture & Tech Decisions

### Search Solution

**Decision:** TBD by research findings (Phase 3 research output)
**Options:** PostgreSQL native FTS, Elasticsearch, Meilisearch
**Criteria:** Ease of integration with NestJS, performance, maintenance burden

### Tagging Model

**Decision:** Relational (tag table + post_tag junction)
**Rationale:** Simple, scalable, efficient filtering

### Trending Algorithm

**Decision:** Hybrid scoring: (view_count _ 0.3) + (reaction_count _ 0.7) \* time_decay_factor
**Rationale:** Balanced view/engagement; time decay prevents old posts from dominating

### Reporting Storage

**Decision:** Soft delete + reports audit table
**Rationale:** Keep audit trail; allows appeals in Phase 4

---

## Known Constraints

- **Test Coverage:** Currently minimal (only app controller tested). Phase 3.3 must improve this significantly.
- **Scalability:** In-memory notifications only. Phase 3 tagging and trending should not exacerbate this.
- **Database:** PostgreSQL + Prisma. Search solution must integrate cleanly.
- **Deployment:** Manual migrations currently. Phase 3 must document migration process clearly.

---

## Success Criteria (Phase 3 Complete)

✅ Students can search for posts by title/description
✅ Trending sort surfaces popular content
✅ Posts can be tagged and feed can be filtered by tags
✅ Users can report posts; admins can review and act
✅ Search and trending queries <100ms
✅ E2E tests cover major flows
✅ Phase 1-2 features unaffected
✅ Deployment-ready with updated docs

---

## Next Steps

1. **Approve this roadmap** — confirm 3-phase approach
2. **Execute Phase 3.1** — start planning and building search/tagging
3. **Parallel research** — finalize search backend choice
4. **Iterate phases** — Phase 3.2 starts after Phase 3.1 complete and tested

---

**Roadmap Created:** 2026-03-19
**Next Approval:** Before Phase 3.1 execution
