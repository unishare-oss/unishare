# Unishare Phase 3 — Requirements

## Phase Goal

**Make academic content findable at scale.**

Students can search for resources, discover trending posts, organize by tags, and report problematic content. The platform has moderation tools to maintain community standards.

---

## Functional Requirements

### 1. Full-Text Search

Users can search across all posts by title, description, and file content.

**Acceptance Criteria:**

- [ ] Search box appears on feed (prominent location)
- [ ] Search queries scan post titles and descriptions
- [ ] Results return matching posts ranked by relevance
- [ ] Pagination supports large result sets
- [ ] Search is performant (<100ms for typical queries)
- [ ] Empty search shows all posts (no results filter applied)
- [ ] Special characters and quotes handled gracefully
- [ ] Case-insensitive matching

**Out of scope:** Advanced query syntax (AND, OR, NOT operators), faceted search by department/course

### 2. Trending / Popular Sort

Feed supports sorting by "Trending" to surface quality content.

**Acceptance Criteria:**

- [ ] Feed has sorting options: "Recent", "Trending" (MVP: "Recent", "Most Viewed", "Most Reacted")
- [ ] Trending considers both reactions and views with time decay
- [ ] Trending updates periodically (daily or per-request calculation)
- [ ] Performance: trending queries <100ms
- [ ] Admin dashboard shows trending metrics

**Out of scope:** Machine learning recommendations, collaborative filtering

### 3. Tagging System

Posts can be tagged; feed can be filtered by tags for discovery.

**Acceptance Criteria:**

- [ ] Create/edit post allows tag input (autocomplete from existing tags)
- [ ] Tags are lowercase, max 30 characters, no special characters
- [ ] Feed has tag filter UI (chips or dropdown)
- [ ] Multiple tags can be selected (OR logic: show posts with any tag)
- [ ] Tag suggestions on search (popular tags)
- [ ] Admin can manage tag list (merge, delete, blacklist)
- [ ] Tags don't replace course/department filters (additive)

**Out of scope:** Hierarchical tags, tag permissions, tag-based recommendations

### 4. Content Reporting

Users can report posts for policy violations; admins can review and act.

**Acceptance Criteria:**

- [ ] Report button on each post (menu or icon)
- [ ] Report form with reason categories (spam, offensive, copyright, other)
- [ ] Optional comment field for context
- [ ] Users cannot report same post twice
- [ ] Reported post hidden from feed immediately (soft delete pending review)
- [ ] Admin dashboard shows pending reports with context
- [ ] Admin can approve, reject, or delete reported content
- [ ] Audit trail: who reported, when, reason, admin action

**Out of scope:** Automated abuse detection, user bans, appeal workflow

### 5. Admin Reporting Dashboard

Admins have tools to view and act on reports.

**Acceptance Criteria:**

- [ ] Dashboard accessible to admin role only
- [ ] Lists pending reports with post preview
- [ ] Filter by status (pending, approved, rejected)
- [ ] Filter by report reason
- [ ] Show reporter name (if not anonymous), timestamp
- [ ] Bulk actions: approve/reject/delete multiple reports
- [ ] View reason and reporter comment
- [ ] Action history with timestamps
- [ ] Metrics: reports per day, common reasons, approval rate

**Out of scope:** Automated moderation recommendations, sentiment analysis

---

## Non-Functional Requirements

### Performance

- Search queries: <100ms for typical datasets
- Trending calculations: <100ms
- Feed load: no degradation from Phase 2

### Testing

- E2E tests for search, trending, tagging, reporting user flows
- Unit tests for search ranking and trending algorithms
- Integration tests for tag operations

### Documentation

- Updated deployment guide for any external services (e.g., Elasticsearch, if chosen)
- API documentation (Swagger) updated for new endpoints
- User guide for tagging and search

### Compatibility

- No breaking changes to Phase 1-2 features
- Existing user data migrates cleanly

---

## Scope Boundaries

### In Scope

✅ Full-text search (titles and descriptions)
✅ Trending sort with time decay
✅ Flat tagging system with autocomplete
✅ Content reporting with admin dashboard
✅ Basic audit trail

### Out of Scope (Phase 4+)

❌ Advanced search syntax (AND, OR, NOT)
❌ File content search (inside PDFs)
❌ Machine learning recommendations
❌ Anonymous reporting
❌ Automated abuse detection
❌ User banning / suspension
❌ Tag-based access control
❌ Email notifications for reports

---

## Success Criteria

**Phase 3 is complete when:**

1. A student can search for "linear algebra" and find all posts with that term
2. Feed shows "Trending" sort that surfaces popular posts
3. Students can tag posts with computer science topics and filter feed by tags
4. A post marked as spam is hidden pending admin review
5. Admins can see reports, reason, and approve/reject with audit trail
6. Search and trending queries perform under 100ms
7. E2E tests validate major user flows
8. Phase 1-2 features continue working without degradation

---

## Dependencies

### On Phase 3

- None — Phase 3 is self-contained

### External

- Search backend: PostgreSQL native FTS OR Elasticsearch OR Meilisearch (TBD by research)
- Tag infrastructure: Relational tags table (low complexity, likely stays in PostgreSQL)
- Trending data: Materialized view or periodic cache (TBD by architecture)

---

## Acceptance by Stakeholder

- **Product:** Phase 3 scope approved ✅
- **Engineering:** Performance and testing commitments noted

---

## Appendix: Phase 3 Feature Backlog

Moved to Phase 4+ (documented in platform-phases.md):

- Email notifications on saved posts
- Download counters per post
- Anonymous posting option
- Bulk moderation workflows
- Public API for third-party integrations
