# Phase 3.3: Polish, Testing & Optimization - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning
**Source:** Phase 3.1-3.2 completion, project requirements

---

## Phase Boundary

**Phase Goal:** Phase 3 is production-ready with comprehensive test coverage and performance optimization.

**What Phase 3.3 Delivers:**

1. Comprehensive E2E test coverage for all Phase 3.1-3.2 features
2. Admin role verification and authorization in controllers
3. Soft-deleted posts filtered from all user-facing queries
4. Performance optimization for search and trending queries
5. Regression testing for Phase 1-2 features (comprehensive)
6. Database migration automation
7. Deployment documentation
8. Production readiness verification

**What's NOT in Phase 3.3:**

- New features beyond Phase 3.1-3.2 scope
- Advanced optimizations (Phase 4+)
- Role-based access control beyond admin (Phase 4+)

**Dependencies:**

- Phase 3.1 complete (search & tagging)
- Phase 3.2 complete (trending & reporting)

---

## Implementation Decisions

### Test Coverage Expansion

- **E2E Tests:** Add scenarios for:
  - Search with soft-deleted posts (should not appear)
  - Trending excluding soft-deleted posts
  - Report soft-delete flow
  - Admin report approval/rejection
  - Role-based endpoint protection
- **Integration Tests:**
  - Search ranking with various data states
  - Trending score calculation accuracy
  - Report status transitions
  - Audit trail completeness

- **Regression Tests:**
  - All Phase 1 features still work (upload, browse, download)
  - All Phase 2 features still work (reactions, comments, bookmarks, notifications)
  - No data corruption from Phase 3 operations

### Admin Authorization

- Add `@UseGuards(JwtAuthGuard)` to admin endpoints
- Add role check: `req.user.role === 'admin'`
- Return 403 Forbidden for unauthorized users
- Document in OpenAPI with `@ApiUnauthorizedResponse()`

### Soft Delete Filtering

- Update PostRepository.findAll() to exclude `status !== 'PUBLISHED'`
- Update search queries to filter by publication status
- Update trending queries to filter by publication status
- Add helper method `wherePublished()` for consistency

### Performance Optimization

- Verify GIN indexes on tsvector and trending_score
- Add composite indexes for common query patterns:
  - (publication_status, created_at)
  - (publication_status, trending_score)
- Optimize Prisma select statements (exclude unnecessary columns)
- Add query result caching for trending (invalidate every 5 min)

### Deployment Documentation

- Create MIGRATION.md documenting all database changes
- Create DEPLOYMENT.md with:
  - Environment variables required (if any)
  - Migration procedure
  - Scheduled job setup (trending refresh)
  - Health check endpoints
  - Monitoring points (search latency, trending score staleness)

---

## Implementation Specifics

### Admin Authorization Pattern

```typescript
@Controller('admin/reports')
@UseGuards(JwtAuthGuard)
export class AdminReportsController {
  @Get()
  @ApiUnauthorizedResponse({ description: 'Admin role required' })
  async list(@Req() req: RequestWithUser) {
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Admin role required')
    }
    // ...
  }
}
```

### Soft Delete Filtering

```typescript
// Helper method in PostRepository
wherePublished() {
  return { publication_status: 'PUBLISHED' };
}

// Usage in search
return this.postsRepository.findMany({
  where: {
    ...this.wherePublished(),
    // other conditions
  }
});
```

### Performance Testing

- Search latency: measure with various dataset sizes
- Trending query latency: measure consistency
- Report listing latency with filters
- Validate all <100ms targets

---

## Canonical References

**Downstream agents MUST read these before planning.**

- `.planning/phases/03-search-tagging/03-SUMMARY.md` — Phase 3.1 results
- `.planning/phases/04-trending-reporting/04-SUMMARY.md` — Phase 3.2 results
- `.planning/codebase/TESTING.md` — Test framework setup
- `.planning/codebase/CONVENTIONS.md` — Code style enforcement

---

## Success Criteria

- ✅ E2E tests cover all Phase 3.1-3.2 user flows
- ✅ E2E tests cover soft-delete scenarios
- ✅ Admin endpoints require admin role
- ✅ Soft-deleted posts never appear in user searches/feed
- ✅ Search queries <100ms (P95)
- ✅ Trending queries <100ms (P95)
- ✅ Phase 1-2 tests all still pass (zero regressions)
- ✅ Deployment documentation complete
- ✅ Production ready (can deploy immediately after Phase 3.3)

---

**Phase:** 3.3 — Polish, Testing & Optimization
**Context prepared:** 2026-03-19
**Ready for:** Planning phase
