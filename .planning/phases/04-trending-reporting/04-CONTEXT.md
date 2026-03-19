# Phase 3.2: Trending Feed & Admin Reporting - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning
**Source:** Project requirements and research findings

---

## Phase Boundary

**Phase Goal:** Students see trending content; admins can moderate via reports.

**What Phase 3.2 Delivers:**

1. Trending sort with time-decay algorithm (reactions + views)
2. Trending API endpoint (GET /posts/trending)
3. Feed UI updated with sort dropdown ("Recent" and "Trending")
4. Reporting data model and API endpoints
5. Report submission functionality (users can report posts)
6. Admin reporting dashboard (list, filter, approve/reject)
7. Reported post soft-delete logic (pending review)
8. Audit trail for moderation actions

**What's NOT in Phase 3.2:**

- Automated abuse detection (Phase 4+)
- User banning/suspension (Phase 4+)
- Appeal workflows (Phase 4+)
- Bulk moderation tools (Phase 4+)
- Email notifications on reports (Phase 4+)

**Dependencies:**

- Phase 3.1 complete (tagging infrastructure required for trending calculations)

---

## Implementation Decisions

### Trending Algorithm

- **Model:** Hybrid scoring with time decay
- **Formula:** `score = (views * 0.3 + reactions * 0.7) * time_decay_factor`
  - `time_decay_factor = 1.0 - (hours_since_creation / 168)` (1 week half-life)
- **Materialization:** Calculate every 5 minutes via scheduled job
- **Storage:** Materialized scores in posts table
- **Performance:** <100ms queries via index on trending_score DESC

### Reporting & Moderation

- **Report Model:** capture reporter, reason, comment, timestamp
- **Post Status:** Add `status` field to posts (published, pending_review, rejected)
- **Soft Delete:** Reported posts hidden from feed immediately pending review
- **Workflows:**
  - User reports → post soft-deleted → admin notification
  - Admin reviews → approves (unhide) or rejects (delete)
  - Audit trail: who reported, when, reason, admin action, timestamp

### Moderation Dashboard

- **Admin Panel:** New route `/admin/reports`
- **Features:**
  - List pending reports with post preview
  - Filter by status (pending, approved, rejected)
  - Filter by report reason category
  - View reporter identity, timestamp
  - Bulk actions: approve/reject/delete multiple
  - View admin action history with timestamps

### Database Schema Changes

- Add `trending_score` (float) to posts table
- Add `status` enum to posts (published, pending_review, rejected)
- Create `reports` table (id, post_id, reporter_id, reason, comment, status, created_at, updated_at)
- Add `admin_actions` table for audit trail (id, report_id, admin_id, action, reason, created_at)
- Create indexes for query performance

### API Endpoints

- GET /posts/trending — Trending posts (paginated)
- POST /posts/:id/report — Submit report
- GET /admin/reports — List reports (admin only)
- PATCH /admin/reports/:id/approve — Approve report
- PATCH /admin/reports/:id/reject — Reject report
- DELETE /admin/reports/:id — Delete report (admin only)

### Frontend Components

- Feed sort dropdown (Recent / Trending)
- Report modal/dialog (reason selection, comment field)
- Admin reports list (table with filters, bulk actions)
- Admin report detail view (post preview, reporter info, action history)

### Performance Targets

- Trending queries: <100ms (P95)
- Report submission: <500ms
- Admin dashboard load: <2s (with 10K+ reports)

### Testing Requirements

- Unit tests for trending score calculation
- Unit tests for report validation
- Integration tests for database operations
- E2E test: "User can see trending posts"
- E2E test: "User can report post"
- E2E test: "Admin can approve/reject reports"
- No regression in Phase 3.1 features

---

## Implementation Specifics

### Trending Score Calculation

```sql
-- Materialized calculation (runs every 5 minutes)
UPDATE posts
SET trending_score = (
  (view_count * 0.3 + reaction_count * 0.7) *
  (1.0 - EXTRACT(EPOCH FROM (NOW() - created_at)) / 604800)
)
WHERE status = 'published'
```

### Report API Design

```
POST /posts/:id/report
Body: { reason: 'spam'|'offensive'|'copyright'|'other', comment?: string }
Response: { reportId, status: 'submitted' }

GET /admin/reports?status=pending&reason=spam&page=1
Response: { reports: Report[], total, page, limit }

PATCH /admin/reports/:id/approve
Response: { reportId, status: 'approved', post: { status: 'published' } }

PATCH /admin/reports/:id/reject
Response: { reportId, status: 'rejected', post: { status: 'rejected' } }
```

### Reporting Reasons

- `spam` — Duplicate, off-topic, or self-promotion
- `offensive` — Inappropriate language or behavior
- `copyright` — Violates IP rights
- `other` — Other policy violation

---

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Phase Planning

- `.planning/PROJECT.md` — Overall Phase 3 mission
- `.planning/ROADMAP.md` — Phase 3.1-3.3 breakdown
- `.planning/REQUIREMENTS.md` — Phase 3 requirements
- `.planning/phases/03-search-tagging/03-SUMMARY.md` — Phase 3.1 results

### Ecosystem Research

- `.planning/research/TRENDING_ALGORITHMS.md` — Detailed trending analysis
- `.planning/research/REPORTING_WORKFLOWS.md` — Moderation patterns
- `.planning/research/IMPLEMENTATION_GUIDE.md` — Code examples

### Codebase Architecture

- `.planning/codebase/ARCHITECTURE.md` — System patterns
- `.planning/codebase/STRUCTURE.md` — Directory layout
- `.planning/codebase/CONVENTIONS.md` — Code style
- `.planning/codebase/TESTING.md` — Test framework

---

## Deferred Ideas (Phase 3.3+)

- Automated abuse detection via pattern matching (Phase 4)
- Machine learning-based content scoring (Phase 5+)
- Community moderation (trusted users moderate) (Phase 4)
- User appeal workflow (Phase 4)
- Email notifications on report actions (Phase 4)
- Moderator bots and webhooks (Phase 5+)
- Ban/suspension system (Phase 4)

---

**Phase:** 3.2 — Trending Feed & Admin Reporting
**Context prepared:** 2026-03-19
**Ready for:** Planning phase
