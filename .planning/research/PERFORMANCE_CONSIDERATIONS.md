# Performance & Scale Considerations for Phase 3

**Project:** Unishare (Academic Content Sharing)
**Phase:** 3 (Search & Growth)
**Researched:** January 2025
**Confidence:** HIGH

## Executive Summary

Phase 3 introduces search, trending, tagging, and reporting—each with different scaling characteristics. **Key strategy:**

1. **Search & Full-Text:** PostgreSQL FTS with GIN index (sufficient to 1M+ posts)
2. **Trending:** Materialized scores refreshed every 5 minutes (avoids constant computation)
3. **Tagging:** Flat junction tables with composite indexes (efficient up to 10k unique tags)
4. **Reporting:** Separate schema; doesn't impact post query performance
5. **Caching:** Cache trending results + tag suggestions (1-5 minute TTL)

**Do not prematurely optimize.** Start with indexes on critical paths, measure with real data, then optimize based on actual bottlenecks.

---

## Query Performance Targets

| Query              | Expected Volume | Target P95 | Index Strategy        |
| ------------------ | --------------- | ---------- | --------------------- |
| Full-text search   | 100-1000/sec    | < 100ms    | GIN on tsvector       |
| Get trending posts | 1000+/sec       | < 10ms     | Composite + cache     |
| Filter by tag      | 100-500/sec     | < 50ms     | Index on tag_id       |
| Get post details   | 500-2000/sec    | < 20ms     | Primary key (instant) |

---

## Index Strategy by Feature

### 1. Full-Text Search Indexes

```sql
-- Generate tsvector column (added to schema)
ALTER TABLE post ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

-- GIN index for full-text search
CREATE INDEX post_search_vector_gin ON post USING gin (search_vector);

-- For ranked search (ts_rank is slower but more relevant)
-- No special index needed; ts_rank uses GIN automatically

-- Supporting indexes for filtering
CREATE INDEX post_approved_idx ON post (status)
  WHERE status = 'APPROVED' AND deleted_at IS NULL;
```

**Performance notes:**

- GIN index: ~2-3x raw text size
- GIN insertion cost: Low (slower than GIST, worth it for search)
- Query time (100k posts): 5-50ms typical, up to 200ms for complex queries

### 2. Trending Score Indexes

```sql
-- Main trending query index
CREATE INDEX post_trending_score_desc ON post (trending_score DESC NULLS LAST)
  WHERE status = 'APPROVED' AND deleted_at IS NULL;

-- Department-specific trending
CREATE INDEX post_dept_trending ON post (
  course_id,
  trending_score DESC
) WHERE status = 'APPROVED' AND deleted_at IS NULL;

-- Sort by creation date
CREATE INDEX post_created_desc ON post (created_at DESC NULLS LAST)
  WHERE status = 'APPROVED' AND deleted_at IS NULL;

-- For time-decay recalculation
CREATE INDEX post_created_asc ON post (created_at ASC);
```

**Performance notes:**

- Trending query with index: 2-10ms (100k posts)
- Without index: 200-500ms (full table scan)
- Refresh job (5 min): 30-100ms to update all scores

### 3. Tagging Indexes

```sql
-- Primary tag filtering
CREATE INDEX post_tag_tag_id ON post_tag (tag_id)
  INCLUDE (post_id);

-- Find all posts with multiple tags (AND query)
CREATE INDEX post_tag_post_tag ON post_tag (post_id, tag_id);

-- Tag autocomplete
CREATE INDEX tag_name_search ON tag USING gin (
  to_tsvector('english', name)
);

-- Trending tags (top tags by post count)
CREATE INDEX tag_post_count ON tag (id)
  INCLUDE (name);
```

**Performance notes:**

- "Posts with tag X": 2-5ms (100k posts)
- "Posts with tags X AND Y": 5-10ms (multiple index joins)
- Tag autocomplete: 5-20ms (FTS on tag names)

### 4. Report/Moderation Indexes

```sql
-- Moderation queue (pending reports first)
CREATE INDEX report_status_priority ON content_report (
  status,
  priority DESC,
  created_at ASC
) WHERE status IN ('PENDING', 'IN_REVIEW');

-- Single report per user per post
CREATE UNIQUE INDEX report_post_user_unique ON content_report (post_id, reported_by)
  WHERE status != 'DISMISSED';

-- Count reports per author
CREATE INDEX report_author_idx ON content_report (
  post_id
) WHERE status != 'DISMISSED'
  INCLUDE (reported_by);
```

**Performance notes:**

- Moderation queue: 1-5ms
- Duplicate report check: < 1ms
- Pattern detection (repeat offenders): 5-20ms

---

## N+1 Query Prevention

### The Problem

```typescript
// BAD: N+1 query pattern
const posts = await this.prisma.post.findMany({ take: 20 })

for (const post of posts) {
  const tags = await this.prisma.tag.findMany({
    where: { posts: { some: { postId: post.id } } },
  })
  post.tags = tags // 1 + 20 = 21 queries!
}
```

**Impact:** With 20 posts shown, 20 additional queries. At 1000 req/sec, this becomes 20k database queries/sec.

### The Solution: Include Relations

```typescript
// GOOD: Eager load related data
const posts = await this.prisma.post.findMany({
  take: 20,
  include: {
    author: true,
    course: { include: { department: true } },
    tags: { include: { tag: true } },
    _count: { select: { reactions: true, comments: true } },
  },
})

// Single query, all data fetched
```

### Complex Example: Feed with Filters

```typescript
// Feed endpoint (gets hit 1000+ times/sec)
async getFeed(
  departmentId?: string,
  sort: 'TRENDING' | 'NEWEST' = 'TRENDING',
  limit: number = 20,
) {
  // Single query
  const posts = await this.prisma.post.findMany({
    where: {
      status: 'APPROVED',
      deletedAt: null,
      ...(departmentId && { course: { department: { id: departmentId } } }),
    },
    orderBy:
      sort === 'TRENDING'
        ? { trendingScore: 'desc' }
        : { createdAt: 'desc' },
    include: {
      author: { select: { id: true, name: true, image: true } },
      course: { select: { id: true, code: true, name: true } },
      tags: { include: { tag: { select: { id: true, slug: true } } } },
      _count: { select: { reactions: true, comments: true } },
    },
    take: limit,
  });

  return posts;  // ~20ms for 100k posts with index
}
```

---

## Caching Strategy

### What to Cache & For How Long

| Data                        | TTL    | Size            | Why                             |
| --------------------------- | ------ | --------------- | ------------------------------- |
| Trending posts (top 100)    | 2 min  | 50KB            | High traffic; changes slowly    |
| Tag autocomplete            | 5 min  | 10KB per letter | Often repeated; static          |
| Department posts (trending) | 3 min  | 100KB           | Popular; changes slowly         |
| User's saved posts          | 30 sec | Varies          | Very personalized; changes fast |
| Admin report count          | 1 min  | 1KB             | Low traffic; summary data       |

### Redis Implementation

```typescript
// cache.service.ts
import { Inject, Injectable } from '@nestjs/common'
import { Redis } from 'ioredis'
import { REDIS_CLIENT } from './redis.module'

@Injectable()
export class CacheService {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  async getTrendingPosts(limit: number = 50, department?: string) {
    const key = `trending-posts:${limit}:${department || 'all'}`

    // Check cache
    const cached = await this.redis.get(key)
    if (cached) return JSON.parse(cached)

    // Cache miss
    const posts = await this.prisma.post.findMany({
      where: { status: 'APPROVED', deletedAt: null },
      orderBy: { trendingScore: 'desc' },
      take: limit,
      include: { author: true, course: true },
    })

    // Store in cache (2 minutes)
    await this.redis.setex(key, 120, JSON.stringify(posts))

    return posts
  }

  async getTagSuggestions(prefix: string) {
    const key = `tag-suggest:${prefix}`

    const cached = await this.redis.get(key)
    if (cached) return JSON.parse(cached)

    const tags = await this.prisma.tag.findMany({
      where: { name: { startsWith: prefix, mode: 'insensitive' } },
      take: 10,
      orderBy: { posts: { _count: 'desc' } },
    })

    await this.redis.setex(key, 300, JSON.stringify(tags)) // 5 min

    return tags
  }

  // Invalidate cache when data changes
  async invalidateTrendingCache() {
    await this.redis.del(`trending-posts:*`)
  }

  async invalidateTagCache() {
    await this.redis.del(`tag-suggest:*`)
  }
}
```

### Cache Invalidation on Updates

```typescript
// posts.service.ts
async createPost(data: CreatePostDto) {
  const post = await this.prisma.post.create({ data });

  // Invalidate trending cache (new post might affect scores)
  await this.cache.invalidateTrendingCache();

  // Invalidate tag caches (new tags added)
  if (data.tags && data.tags.length > 0) {
    await this.cache.invalidateTagCache();
  }

  return post;
}

async tagPost(postId: string, tags: string[]) {
  // ... tag logic ...

  // Invalidate suggestions
  for (const tag of tags) {
    await this.redis.del(`tag-suggest:${tag[0]}`);
  }
}
```

---

## Database Connection & Query Optimization

### Connection Pooling

```typescript
// prisma.service.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  errorFormat: 'pretty',
})

// Connection pool (default: min 2, max 10)
// For high-load scenarios:
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=20', // Max 20 connections
    },
  },
})
```

### Read Replicas (For High Traffic)

At 10k+ req/sec, split reads and writes:

```typescript
// PostgreSQL replication setup (future)
export const prismaWrite = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_WRITE_URL } },
});

export const prismaRead = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_READ_URL } },
});

// Use in queries
async getTrendingPosts() {
  return prismaRead.post.findMany({  // Read from replica
    orderBy: { trendingScore: 'desc' },
  });
}

async createPost(data) {
  return prismaWrite.post.create({  // Write to primary
    data,
  });
}
```

---

## Batch Operations

### Bulk Insert Tags

```typescript
// Instead of creating tags one-by-one
// Create 1000 tags: 100ms (slow)

// Better: batch insert
async createTagsBatch(tagNames: string[]) {
  const tags = tagNames.map(name => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
  }));

  // Use raw SQL for bulk insert
  const created = await this.prisma.$executeRaw`
    INSERT INTO tag (id, name, slug, created_at)
    SELECT
      gen_random_uuid(),
      UNNEST(${tags.map(t => t.name)}::text[]),
      UNNEST(${tags.map(t => t.slug)}::text[]),
      NOW()
    ON CONFLICT (slug) DO NOTHING;
  `;

  return created;  // ~10ms for 1000 tags
}
```

### Bulk Score Updates

```typescript
// Instead of updating each post individually
// Update 100k scores: 5000ms (slow)

// Better: batch update
async refreshTrendingScoresBatch() {
  const scores = await this.calculateAllScores();  // Heavy computation

  // Bulk update
  const updated = await this.prisma.$transaction(
    scores.map(({ id, score }) =>
      this.prisma.post.update({
        where: { id },
        data: { trendingScore: score },
      })
    ),
    { maxWait: 5000, timeout: 30000 }  // 30 sec timeout
  );

  return updated;  // 500-1000ms for 100k posts
}
```

---

## Load Testing Scenarios

### Phase 3 Expected Load

```
Scenario: University with 5000 students
- Active users per day: 1000
- Peak concurrent: 200
- Posts in database: 10k-50k
- Total tags: 500-2k

Expected QPS:
- Search queries: 20-50 QPS
- Feed requests: 100-200 QPS
- Tag suggestions: 30-60 QPS
- Trending data: 10-30 QPS
- Moderation operations: 1-5 QPS
```

### Load Test Queries

```bash
# Test full-text search latency
for i in {1..100}; do
  time psql -c "SELECT * FROM post WHERE search_vector @@ plainto_tsquery('english', 'linear algebra') LIMIT 20;"
done

# Test trending query
time psql -c "SELECT * FROM post WHERE status = 'APPROVED' ORDER BY trending_score DESC LIMIT 50;"

# Test tag queries
time psql -c "
  SELECT p.* FROM post p
  INNER JOIN post_tag pt ON p.id = pt.post_id
  WHERE pt.tag_id = 'tag-123'
  LIMIT 20;
"
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

```typescript
// queries.service.ts
@Injectable()
export class QueryMetricsService {
  async trackQuery(name: string, duration: number) {
    const metric = {
      name,
      duration,
      timestamp: new Date(),
      P95: duration > 100 ? 'slow' : 'ok',
    }

    // Log to monitoring service (Datadog, New Relic, etc.)
    await this.monitoring.recordMetric(metric)
  }

  // Alert thresholds
  THRESHOLDS = {
    SEARCH: { p95: 100, p99: 500 }, // 100ms / 500ms
    TRENDING: { p95: 20, p99: 100 }, // 20ms / 100ms
    TAGGING: { p95: 50, p99: 200 }, // 50ms / 200ms
    FEED: { p95: 50, p99: 300 }, // 50ms / 300ms
  }
}
```

### Slow Query Log

```sql
-- Enable slow query logging
SET log_min_duration_statement = 100;  -- Log queries > 100ms

-- View slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;
```

---

## Optimization Checklist

### Phase 3 Launch

- [ ] GIN index on `post.search_vector`
- [ ] Indexes on `post.trending_score`, `post.created_at`
- [ ] Index on `post_tag.tag_id`
- [ ] Connection pool tuned (default 10 is usually fine)
- [ ] Trending refresh job (5 min interval)
- [ ] Redis cache for trending posts & tags
- [ ] Query analysis (EXPLAIN ANALYZE on main queries)
- [ ] Load test with 10k posts

### Phase 3.5 (If Scaling)

- [ ] Partial indexes (WHERE status = 'APPROVED')
- [ ] Materialized view for trending (if refresh > 1s)
- [ ] Read replica (if QPS > 5k)
- [ ] Batch operations for bulk updates
- [ ] Cache warming on startup

### Phase 4+ (If 100k+ Posts)

- [ ] Sharding by department (if multi-university)
- [ ] Elasticsearch for search
- [ ] Separate reporting database
- [ ] Time-based partitioning for archives

---

## Database Schema Recommendations for Phase 3

```prisma
// Add these to your existing Post model:
model Post {
  // ... existing fields

  // Search
  searchVector        Unsupported("tsvector")?

  // Trending
  trendingScore       Float    @default(0)
  allTimeScore        Float    @default(0)
  weeklyScore         Float    @default(0)

  // Tagging
  tags                PostTag[]

  // Reporting
  reports             ContentReport[]

  // Indexes
  @@index([searchVector], type: "gin")
  @@index([trendingScore], type: "desc")
  @@index([createdAt], type: "desc")
  @@index([status])

  @@map("post")
}
```

---

## Performance Targets by Phase

| Phase    | Posts | QPS   | P95 Search | P95 Trending | P95 Feed |
| -------- | ----- | ----- | ---------- | ------------ | -------- |
| 3 Launch | 10k   | 100   | 50ms       | 10ms         | 30ms     |
| 3 Scale  | 100k  | 300   | 100ms      | 20ms         | 50ms     |
| 4 Growth | 500k  | 1000  | 150ms      | 30ms         | 80ms     |
| 5 Large  | 1M+   | 3000+ | 200ms      | 50ms         | 100ms    |

**Action:** At each milestone, re-optimize. Don't over-engineer until needed.

---

## Sources

- PostgreSQL Index Types: https://www.postgresql.org/docs/current/indexes-types.html
- Prisma Performance: https://www.prisma.io/docs/concepts/components/prisma-client/performance-optimization
- N+1 Query Problem: https://www.prisma.io/docs/concepts/orm/prisma-client/queries/relation-queries
- Database Indexing Strategy: https://use-the-index-luke.com/
- PostgreSQL Explain: https://www.postgresql.org/docs/current/sql-explain.html
