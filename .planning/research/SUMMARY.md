# Phase 3 Research Summary: Search & Growth Ecosystem

**Project:** Unishare (Academic Content Sharing Platform)
**Phase:** 3 (Search & Growth)
**Researched:** January 2025
**Overall Confidence:** HIGH

---

## Executive Summary

Phase 3 introduces four critical capabilities to Unishare: full-text search, tagging, trending feeds, and content reporting. This research evaluated the ecosystem across technology, architecture, and operational considerations.

**Key recommendation:** Implement features in this order:

1. **Weeks 1-3: Tagging System** (easiest, highest impact on discovery)
2. **Weeks 3-4: Full-Text Search** (search is expected; PostgreSQL FTS sufficient)
3. **Weeks 5-6: Trending Algorithm** (engagement driver; time-decay scoring)
4. **Weeks 7-8: Content Reporting** (trust & safety; moderation workflows)

All features use **PostgreSQL + Prisma exclusively**. No new infrastructure required. Sufficient for 500k+ posts.

---

## Technology Decisions (Why Each Choice)

### 1. Full-Text Search: PostgreSQL Native (NOT Elasticsearch, NOT Meilisearch)

**Why PostgreSQL FTS:**

- ✅ Already running; zero infrastructure cost
- ✅ Integrates with Prisma via raw SQL queries
- ✅ Handles 1M+ posts efficiently with GIN indexes
- ✅ Supports multiple languages (15+ dictionaries built-in)
- ✅ Can migrate to Meilisearch later (2-3 days, low risk)

**When to migrate:** After 1M+ posts OR if you need Elasticsearch for other reasons (logs, metrics, etc.)

**Implementation:**

```sql
ALTER TABLE post ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX post_search_vector_idx ON post USING gin (search_vector);
```

**Timeline:** 3 days (1 day schema + 1 day API + 1 day testing)

---

### 2. Tagging System: Flat Model with Junction Table

**Why flat (not hierarchical):**

- ✅ Simple schema (3 tables: Tag, PostTag, Post)
- ✅ Fast queries (no tree traversal)
- ✅ Naming conventions support future hierarchy (e.g., "CS201::Linear Algebra")
- ✅ Autocomplete is trivial
- ✅ Scales to 10k+ tags

**Schema:**

```prisma
model Tag {
  id    String  @id @default(cuid())
  name  String  @unique
  slug  String  @unique
  color String?
  posts PostTag[]
}

model PostTag {
  postId String
  tagId  String
  post   Post @relation(fields: [postId])
  tag    Tag  @relation(fields: [tagId])
  @@id([postId, tagId])
  @@index([tagId])
}
```

**Timeline:** 2 days (1 day schema + 1 day API + autocomplete)

---

### 3. Trending Algorithm: Time-Decay Scoring with Materialization

**Why this approach:**

- ✅ Simple formula (no ML needed)
- ✅ Materialized scores prevent constant recalculation
- ✅ Refreshes every 5 minutes (fresh without overhead)
- ✅ Extensible (daily, weekly, all-time scores)
- ✅ Prevents gaming (combination of signals = harder to manipulate)

**Formula:**

```
Score = (views × 0.3 + reactions × 1.0 + comments × 0.5)
         × (1 / (days_since_created + 1))
         × (1.5 if < 7 days old, else 1.0)
```

**Implementation:**

- Add `trendingScore` and `allTimeScore` columns to Post
- Create NestJS `@Cron()` task that refreshes every 5 minutes
- Query sorted by `trendingScore DESC`

**Timeline:** 4 days (1 day schema + 2 days logic + 1 day tuning)

---

### 4. Content Reporting: Tiered Review with Appeals

**Why this model:**

- ✅ Clear workflow (report → review → action → appeal)
- ✅ Scales with moderators (not with reports)
- ✅ Pattern detection flags repeat offenders automatically
- ✅ Appeals process maintains fairness
- ✅ Prevents false moderation

**Key features:**

- Auto-classification by severity (low, medium, high, critical)
- Moderation queue sorted by priority
- Admin dashboard with analytics
- Appeal process (post author can challenge action)
- Rate limiting (prevent spam reporting)

**Timeline:** 5 days (2 days schema + 2 days API + 1 day dashboard)

---

## Feature Interdependencies

```
Tagging System
    ↓
    └─→ Enables tag-based filtering on feed
    └─→ Enables tag autocomplete
    └─→ Enables trending tags dashboard

Full-Text Search
    ↓
    └─→ Search posts by title + description
    └─→ Can search comments (future)
    └─→ Enables search analytics

Trending Algorithm
    ↓
    └─→ Feed sort option (trending vs newest)
    └─→ Trending tags (top tags by post count)
    └─→ Admin dashboard (hot posts)

Content Reporting
    ↓
    └─→ Moderation queue
    └─→ Pattern detection (repeat offenders)
    └─→ Admin safety metrics
```

**Build order:** Tagging → Search → Trending → Reporting (each unlocks next)

---

## Database Schema Changes Required

### New Tables

```prisma
// Tagging
model Tag { /* ... */ }
model PostTag { /* ... */ }

// Content Reporting
model ContentReport { /* ... */ }
model ContentAction { /* ... */ }
model ContentAppeal { /* ... */ }
```

### Modified Tables

```prisma
model Post {
  // Add:
  searchVector    Unsupported("tsvector")?
  trendingScore   Float
  allTimeScore    Float
  weeklyScore     Float
  tags            PostTag[]
  reports         ContentReport[]

  // Index:
  @@index([searchVector], type: "gin")
  @@index([trendingScore], type: "desc")
  @@index([status])
}

model User {
  // Add:
  reports         ContentReport[]
  reportedActions ContentAction[]
  appeals         ContentAppeal[]
  warningCount    Int
}
```

### Migration Strategy

```bash
# Single migration file (can be split later if needed)
pnpm prisma migrate dev --name add_phase3_search_growth

# Migrations needed:
1. Add search_vector to posts (with index)
2. Add trendingScore, allTimeScore to posts
3. Create Tag and PostTag tables
4. Create ContentReport, ContentAction, ContentAppeal tables
5. Add reporting columns to User
```

---

## Performance & Scaling Targets

### Phase 3 (MVP) Expectations

| Metric                 | Target  | Achieved With               |
| ---------------------- | ------- | --------------------------- |
| Search latency (P95)   | < 100ms | GIN index + caching         |
| Trending query (P95)   | < 20ms  | Index + materialized scores |
| Feed load (P95)        | < 50ms  | Includes + cache            |
| Tag autocomplete (P95) | < 30ms  | FTS on tag names            |
| Moderation queue (P95) | < 10ms  | Priority index              |

### Scale Progression

| Milestone      | Posts | QPS   | Search Strategy      | Next Action        |
| -------------- | ----- | ----- | -------------------- | ------------------ |
| Phase 3 Launch | 10k   | 100   | PostgreSQL FTS       | Monitor            |
| Phase 3.5      | 100k  | 300   | PostgreSQL FTS       | Add caching        |
| Phase 4        | 500k  | 1000  | PostgreSQL FTS       | Monitor re-rank    |
| Phase 5        | 1M+   | 3000+ | Evaluate Meilisearch | Consider migration |

**Key insight:** PostgreSQL FTS handles 1M+ posts. Only migrate if you need fuzzy search, distributed search, or have other Elasticsearch use cases.

---

## Implementation Timeline

### Total Effort: 3-4 weeks

```
Week 1: Tagging (2 days) + Full-Text Search (3 days)
  - Schema for Tag, PostTag
  - Tag CRUD operations + autocomplete
  - Search_vector column + GIN index
  - Search API endpoint
  - ┗━ Testing with 10k sample posts

Week 2: Trending (4 days) + Reporting (starts)
  - TrendingScore, AllTimeScore columns
  - NestJS @Cron() task (5-min refresh)
  - Feed sort endpoint (trending/newest)
  - Trending tags endpoint
  - ┗━ Start reporting schema design

Week 3: Reporting (4 days) + Polish
  - ContentReport, ContentAction, ContentAppeal tables
  - Report creation endpoint
  - Admin moderation queue endpoint
  - Appeal process endpoint
  - ┗━ Integration testing

Week 4: Dashboard + Deployment
  - Admin moderation dashboard UI
  - Analytics queries
  - Performance testing
  - ┗━ Deploy to production
```

---

## Risk Assessment & Mitigation

### High Risks

| Risk                           | Probability | Impact | Mitigation                                                      |
| ------------------------------ | ----------- | ------ | --------------------------------------------------------------- |
| Full-text search slow at scale | Medium      | High   | Use GIN index; test with 100k posts early                       |
| Trending algorithm gaming      | Medium      | High   | Anti-spam checks; combination of signals                        |
| Moderation burnout             | Low         | High   | Clear guidelines; pattern detection flags; queue prioritization |

### Medium Risks

| Risk                  | Probability | Impact | Mitigation                      |
| --------------------- | ----------- | ------ | ------------------------------- |
| Tag name conflicts    | Low         | Low    | Slug uniqueness constraint      |
| False report spam     | Medium      | Medium | Rate limiting; trust scoring    |
| Report review backlog | Low         | Medium | Auto-classification by severity |

### Mitigation Strategies

1. **Search Performance:** Load test with 50k real posts before launch
2. **Trending Gaming:** Combine signals (views + reactions + comments); monitor ratio anomalies
3. **Moderation Scale:** Auto-escalate critical reports; flag repeat offenders; clear SLAs
4. **Data Integrity:** Soft deletes (set `deletedAt`); audit trail for all moderation actions

---

## Known Limitations & Future Enhancements

### Current Scope (Phase 3)

✅ PostgreSQL full-text search (English only)
✅ Flat tagging system (1-level)
✅ Time-decay trending algorithm
✅ Basic content reporting with appeals
✅ Admin moderation dashboard

### Out of Scope (Future Phases)

❌ Fuzzy search (typo tolerance) → Meilisearch (Phase 4)
❌ Hierarchical tags → Schema enhancement (Phase 4)
❌ Advanced ranking (ML-based) → Phase 5+
❌ Multi-language support → Phase 4
❌ Community moderation (user voting) → Phase 5+
❌ Search analytics → Phase 4
❌ Personalized trending → Phase 5+

---

## Key Implementation Decisions

### Decision 1: PostgreSQL FTS vs Elasticsearch vs Meilisearch

**Chosen:** PostgreSQL FTS

**Rationale:**

- Single database; no sync complexity
- GIN indexes sufficient for 1M+ posts
- Can migrate to Meilisearch without API changes
- Team already comfortable with PostgreSQL
- Cost: $0 (vs $25-500+/mo for Meilisearch/Elasticsearch)

**Revisit condition:** After 1M+ posts OR if you need distributed multi-university search

---

### Decision 2: Flat vs Hierarchical Tags

**Chosen:** Flat with naming conventions

**Rationale:**

- Simple schema (easier to query)
- Flat tags fast (no tree traversal)
- Naming convention allows future hierarchy (e.g., "CS201::Linear Algebra")
- Academic content doesn't need complex taxonomies
- Can add true hierarchy later (low migration cost)

**Revisit condition:** If multi-level tag hierarchy proves essential for 50+ universities

---

### Decision 3: Materialized vs Computed Trending Scores

**Chosen:** Materialized (stored on Post table)

**Rationale:**

- Trending is queried 1000+ times; computing each time = waste
- 5-minute refresh keeps data fresh
- Single-table queries are fast
- Easy to extend (separate weekly, monthly, all-time scores)

**Alternative:** Materialized view (if you need multiple complex scoring algorithms later)

---

### Decision 4: Tiered Moderation vs Community Voting

**Chosen:** Admin-driven tiered workflow

**Rationale:**

- Clear authority (admins make decisions)
- Faster resolution (no voting delays)
- Prevents mob justice (students voting on peers)
- Appeals process maintains fairness
- Can add community voting later (reputation-based)

**Revisit condition:** After 100k+ posts if moderation queue becomes bottleneck

---

## Deployment Considerations

### Environment Variables Needed

```env
# .env (existing)
DATABASE_URL=postgresql://...

# No new env vars needed for Phase 3
# (All features use PostgreSQL; no external services)
```

### Database Migration Strategy

```bash
# In CI/CD:
cd apps/api
pnpm prisma migrate deploy  # Applies migrations to production DB

# Rollback if needed:
pnpm prisma migrate resolve --rolled-back "add_phase3_search_growth"
```

### Monitoring & Alerting

```typescript
// Key metrics to monitor:
1. Search query latency (P95, P99)
2. Trending score refresh duration
3. Moderation queue size
4. Report resolution time
5. False report ratio
6. Database connection pool usage
```

---

## Success Metrics for Phase 3

### User-Facing Metrics

| Metric                 | Target                | How to Measure           |
| ---------------------- | --------------------- | ------------------------ |
| Search usage           | > 10% of users        | Analytics event tracking |
| Trending posts viewed  | > 20% of feed views   | Sort preference tracking |
| Tag usage              | > 30% of posts tagged | Post creation analytics  |
| Report resolution time | < 24 hours (95%)      | Moderation dashboard     |

### Operational Metrics

| Metric               | Target          | How to Measure    |
| -------------------- | --------------- | ----------------- |
| Search latency (P95) | < 100ms         | Query logging     |
| False reports        | < 20% dismissed | Moderation stats  |
| Moderator queue time | < 2 hrs average | Report timestamps |
| Post deletion rate   | < 5%            | Content analytics |

---

## Open Questions for Phase 3.5+

1. **Multi-language search:** How many non-English universities will use Unishare?
2. **Search ranking tuning:** Do academic searches need field weights (title > description)?
3. **Trending for communities:** Should trending be per-department vs platform-wide?
4. **Automated moderation:** Would basic ML (keyword filtering) help moderators?
5. **Search analytics:** Do admins need to see what users search for?

---

## Confidence Levels by Area

| Area                    | Confidence | Evidence                                               | Next Validation           |
| ----------------------- | ---------- | ------------------------------------------------------ | ------------------------- |
| **Full-Text Search**    | HIGH       | PostgreSQL docs + production use cases                 | Load test with 100k posts |
| **Tagging System**      | HIGH       | Proven pattern (Stack Exchange, Reddit, Stackoverflow) | User testing post-launch  |
| **Trending Algorithm**  | MEDIUM     | Time-decay works (Reddit, HN) but needs tuning         | A/B test with real users  |
| **Content Reporting**   | HIGH       | Clear workflows (GitHub, Twitter, Reddit models)       | Moderation SLA testing    |
| **Performance & Scale** | MEDIUM     | Indexes work, but needs real-world data                | Monitor after launch      |

---

## Recommendations for Unishare's Roadmap

### Immediate (Week 1-4)

1. Implement tagging system first (simplest, highest impact)
2. Add full-text search (expected feature)
3. Implement trending algorithm (engagement driver)
4. Add content reporting (trust & safety table stakes)

### Short-term (Week 5-8)

1. Launch admin moderation dashboard
2. Gather user feedback on search/tagging
3. Monitor performance metrics
4. Plan Phase 4 (enhanced search, personalization)

### Medium-term (Phase 4, 2-3 months)

1. Add search analytics (what do users search for?)
2. Implement tag-based recommendations
3. Consider Meilisearch for fuzzy search (if needed)
4. Multi-university support (if growth continues)

### Long-term (Phase 5+, 6+ months)

1. Machine learning ranking
2. Personalized trending
3. Community-driven moderation
4. Distributed search (Elasticsearch)

---

## References & Sources

### PostgreSQL FTS

- Official docs: https://www.postgresql.org/docs/current/textsearch.html
- GIN indexes: https://www.postgresql.org/docs/current/gin.html

### Tagging Systems

- Prisma many-to-many: https://www.prisma.io/docs/concepts/components/prisma-schema/relations/many-to-many-relations
- Tag best practices: Stack Exchange, Reddit architecture

### Trending Algorithms

- Time-decay: https://en.wikipedia.org/wiki/Exponential_decay
- Reddit ranking: https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9
- Hacker News: http://www.paulgraham.com/roulette.html

### Content Moderation

- GitHub Community Guidelines: https://docs.github.com/en/site-policy/github-terms/github-community-guidelines
- Trust & Safety at Scale: Community moderation patterns

### Performance

- Prisma performance: https://www.prisma.io/docs/concepts/components/prisma-client/performance-optimization
- Index strategies: https://use-the-index-luke.com/

---

## Document Organization

This research is structured across 5 files:

1. **SEARCH_SOLUTIONS.md** — Full-text search options (PostgreSQL vs Meilisearch vs Elasticsearch)
2. **TAGGING_PATTERNS.md** — Tagging schema, autocomplete, trending tags
3. **TRENDING_ALGORITHMS.md** — Time-decay scoring, materialization, anti-gaming
4. **REPORTING_WORKFLOWS.md** — Moderation flows, appeals, admin dashboards
5. **PERFORMANCE_CONSIDERATIONS.md** — Indexing, caching, N+1 prevention, scaling

Each document includes implementation code, architecture diagrams, performance characteristics, and when to revisit decisions.

---

**Research completed:** January 2025
**Next step:** Begin Phase 3 implementation with tagging system (Week 1)
**Confidence level:** HIGH (all recommendations grounded in ecosystem analysis and production patterns)
