# Phase 3 Implementation Quick Reference

## Feature Implementation Order

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Search & Growth Implementation Sequence            │
└─────────────────────────────────────────────────────────────┘

WEEK 1
├─ DAY 1-2: Tagging System
│  ├─ Create Tag & PostTag models
│  ├─ Implement tag CRUD
│  └─ Build tag autocomplete endpoint
│
└─ DAY 3-5: Full-Text Search
   ├─ Add search_vector to Post
   ├─ Create GIN index
   └─ Build search endpoint

WEEK 2
├─ Trending Algorithm (4 days)
│  ├─ Add trendingScore & allTimeScore columns
│  ├─ Create @Cron() refresh job (5-min interval)
│  └─ Build feed sort endpoint
│
└─ Begin Reporting Design

WEEK 3
├─ Reporting System (4 days)
│  ├─ Create ContentReport, ContentAction, ContentAppeal models
│  ├─ Build report creation endpoint
│  ├─ Create moderation queue
│  └─ Implement appeals process
│
└─ Admin Dashboard UI

WEEK 4
└─ Testing, Performance Validation, Deployment
```

## Technology Stack Summary

```
┌──────────────────────────────────────────────────────────────┐
│ Feature          │ Technology      │ Why This One            │
├──────────────────────────────────────────────────────────────┤
│ Full-Text Search │ PostgreSQL FTS  │ Already have DB, no ops │
│ Tagging          │ PostgreSQL      │ Simple junction table   │
│ Trending Scores  │ PostgreSQL      │ Materialized in DB      │
│ Caching          │ Redis (optional)│ Cache trending results  │
│ Reporting        │ PostgreSQL      │ Separate audit tables   │
└──────────────────────────────────────────────────────────────┘

Infrastructure: PostgreSQL + NestJS + Prisma (no new services)
Cost: $0 (all included in existing infrastructure)
Ops: Minimal (single database monitoring)
```

## Database Migration Checklist

```sql
-- 1. TAGGING SYSTEM
CREATE TABLE tag (
  id STRING PRIMARY KEY,
  name STRING UNIQUE,
  slug STRING UNIQUE,
  color STRING DEFAULT '#3B82F6',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE post_tag (
  post_id STRING REFERENCES post(id) ON DELETE CASCADE,
  tag_id STRING REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX post_tag_tag_id ON post_tag(tag_id);

-- 2. FULL-TEXT SEARCH
ALTER TABLE post ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX post_search_vector_idx ON post USING gin(search_vector);

-- 3. TRENDING ALGORITHM
ALTER TABLE post
  ADD COLUMN trending_score FLOAT DEFAULT 0,
  ADD COLUMN all_time_score FLOAT DEFAULT 0,
  ADD COLUMN weekly_score FLOAT DEFAULT 0;

CREATE INDEX post_trending_score_idx ON post(trending_score DESC)
  WHERE status = 'APPROVED' AND deleted_at IS NULL;

-- 4. CONTENT REPORTING
CREATE TABLE content_report (
  id STRING PRIMARY KEY,
  post_id STRING REFERENCES post(id) ON DELETE CASCADE,
  reported_by STRING REFERENCES "user"(id),
  reason STRING,
  description TEXT,
  status STRING DEFAULT 'PENDING',
  severity STRING DEFAULT 'LOW',
  priority INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolved_by STRING REFERENCES "user"(id),
  UNIQUE(post_id, reported_by)
);

CREATE TABLE content_action (
  id STRING PRIMARY KEY,
  report_id STRING UNIQUE REFERENCES content_report(id),
  action STRING,
  reason TEXT,
  post_deleted BOOLEAN DEFAULT FALSE,
  author_warned BOOLEAN DEFAULT FALSE,
  author_banned BOOLEAN DEFAULT FALSE,
  ban_duration INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE content_appeal (
  id STRING PRIMARY KEY,
  report_id STRING UNIQUE REFERENCES content_report(id),
  appealed_by STRING REFERENCES "user"(id),
  reason TEXT,
  status STRING DEFAULT 'PENDING',
  decision TEXT,
  decided_by STRING REFERENCES "user"(id),
  created_at TIMESTAMP DEFAULT NOW(),
  decided_at TIMESTAMP
);

CREATE INDEX report_status_priority ON content_report(status, priority DESC)
  WHERE status IN ('PENDING', 'IN_REVIEW');

-- 5. USER TABLE EXTENSIONS
ALTER TABLE "user" ADD COLUMN warning_count INT DEFAULT 0;
```

## Core API Endpoints

### Tagging

```
POST   /api/posts/:id/tags         Create/update post tags
GET    /api/tags/autocomplete?q=   Tag suggestions
GET    /api/tags/:slug/posts       All posts with tag
GET    /api/tags/trending          Trending tags
```

### Search

```
GET    /api/search?q=query&limit=  Full-text search
GET    /api/search/suggestions?q=  Search suggestions (cached)
```

### Trending

```
GET    /api/feed?sort=trending     Feed sorted by trending
GET    /api/feed?sort=newest       Feed sorted by newest
GET    /api/trending/posts         Top trending posts
GET    /api/trending/department/:id Trending in department
```

### Reporting

```
POST   /api/reports                Submit report
GET    /api/reports (admin)        Moderation queue
POST   /api/reports/:id/action     Take moderation action
POST   /api/reports/:id/appeal     Appeal decision
```

## Critical Code Examples

### 1. Search Query

```typescript
const posts = await this.prisma.$queryRaw`
  SELECT 
    p.*,
    ts_rank(p.search_vector, plainto_tsquery('english', ${query})) as relevance
  FROM post p
  WHERE p.search_vector @@ plainto_tsquery('english', ${query})
    AND p.status = 'APPROVED'
    AND p.deleted_at IS NULL
  ORDER BY relevance DESC, p.created_at DESC
  LIMIT ${limit}
`
```

### 2. Tag Autocomplete

```typescript
const tags = await this.prisma.tag.findMany({
  where: { name: { startsWith: prefix, mode: 'insensitive' } },
  include: { _count: { select: { posts: true } } },
  orderBy: { posts: { _count: 'desc' } },
  take: 10,
})
```

### 3. Trending Score Calculation

```typescript
const daysSince = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60 * 24)
const timeDecay = 1 / (daysSince + 1)
const recencyBoost = daysSince < 7 ? 1.5 : 1.0
const score =
  (post.views * 0.3 + post.reactions.length * 1.0 + post.comments.length * 0.5) *
  timeDecay *
  recencyBoost
```

### 4. Moderation Action

```typescript
await this.prisma.$transaction(async (tx) => {
  // 1. Delete post if action is DELETE_POST
  if (action === 'DELETE_POST') {
    await tx.post.update({ where: { id: postId }, data: { deletedAt: new Date() } })
  }

  // 2. Update report status
  await tx.contentReport.update({
    where: { id: reportId },
    data: { status: 'ACTION_TAKEN', resolvedAt: new Date() },
  })

  // 3. Create action record
  await tx.contentAction.create({ data: { reportId, action, reason } })

  // 4. Notify affected users
  await this.notifyAuthor(postId, 'Your post was removed')
  await this.notifyReporter(reportId, 'Action taken')
})
```

## Performance Targets

| Query                   | Target P95 | Index Used              |
| ----------------------- | ---------- | ----------------------- |
| Search (100k posts)     | < 100ms    | GIN on search_vector    |
| Trending (100k posts)   | < 20ms     | Index on trending_score |
| Tag filter (100k posts) | < 50ms     | Index on tag_id         |
| Feed load with tags     | < 50ms     | Includes + index        |
| Moderation queue        | < 10ms     | Priority index          |

**If slower:** Check indexes exist, run ANALYZE, cache results.

## Testing Checklist

### Unit Tests

- [ ] Tag creation & slug generation
- [ ] Score calculation formula
- [ ] Severity classification
- [ ] Appeal eligibility logic

### Integration Tests

- [ ] Search with different queries
- [ ] Tag CRUD with N+1 prevention
- [ ] Trending score refresh
- [ ] Moderation workflow (report → action → appeal)

### Performance Tests

- [ ] Search 100k posts (target: < 100ms)
- [ ] Trending query (target: < 20ms)
- [ ] Bulk tag operations (1000+ tags)
- [ ] Report queue operations

### Manual Tests

- [ ] Search finds posts by title
- [ ] Search finds posts by description
- [ ] Tag autocomplete suggests trending tags first
- [ ] Trending feed sorts by score
- [ ] Report creation prevents duplicates
- [ ] Appeal reverses moderation action

## Monitoring & Alerts

```typescript
// Key metrics to monitor
Metrics = {
  search_query_latency_p95: 100, // ms
  trending_score_refresh_time: 500, // ms
  moderation_queue_size: 100, // reports
  report_resolution_time: 24, // hours
  false_report_rate: 0.2, // 20%
  tag_suggestion_accuracy: 0.9, // 90%
}

// Alert thresholds
Alerts = {
  search_latency_p95_exceeds: 200, // ms (2x target)
  trending_refresh_duration: 2000, // ms (4x target)
  moderation_backlog: 500, // reports
  repeated_false_reports: { userId: 10, in_days: 7 },
}
```

## Rollback Plan

If something breaks during deployment:

1. **Search fails:** Disable search endpoint; it's optional feature
2. **Trending scores wrong:** Stop refresh job; revert recent code
3. **Moderation broken:** Admin can manually flag posts (worst case)
4. **Database migration issues:** Prisma rollback to previous version

```bash
# Rollback schema
pnpm prisma migrate resolve --rolled-back "migration_name"

# Restart services
docker-compose restart api
```

## Success Criteria for Phase 3

### Launch Readiness

- [ ] All 4 features (search, tags, trending, reporting) implemented
- [ ] Performance targets met (P95 latencies within limits)
- [ ] Moderation SLA defined (< 24h resolution)
- [ ] Monitoring & alerting configured
- [ ] Team trained on moderation dashboard

### First Month Goals

- [ ] 10%+ of users search
- [ ] 30%+ of posts tagged
- [ ] Trending feed used 20%+ of time
- [ ] 0 reports of search relevance issues
- [ ] 0 moderator complaints about workflow

### After 100k Posts

- [ ] Search still responsive (< 100ms)
- [ ] Tag suggestions remain accurate
- [ ] No false moderation actions
- [ ] System handles 5k QPS

## References for Implementers

| Topic                 | Document                      | Section               |
| --------------------- | ----------------------------- | --------------------- |
| Search implementation | SEARCH_SOLUTIONS.md           | NestJS Integration    |
| Tag schema            | TAGGING_PATTERNS.md           | Schema Design         |
| Trending formula      | TRENDING_ALGORITHMS.md        | Recommended Algorithm |
| Moderation flows      | REPORTING_WORKFLOWS.md        | Workflows             |
| Performance           | PERFORMANCE_CONSIDERATIONS.md | Index Strategy        |

---

**Ready to build?** Start with Tagging (simplest), then Search, then Trending, then Reporting.
**Estimated total:** 3-4 weeks for full Phase 3 implementation.
**Go live:** Week 4-5.
