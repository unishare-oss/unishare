# Full-Text Search Solutions for Phase 3

**Project:** Unishare (Academic Content Sharing)
**Phase:** 3 (Search & Growth)
**Researched:** January 2025
**Confidence:** HIGH

## Executive Summary

For Unishare's Phase 3, **PostgreSQL native full-text search (FTS) is the recommended starting point** because:

1. Your stack already includes PostgreSQL with Prisma
2. Academic content is text-heavy (titles, descriptions, comments) — ideal FTS domain
3. PostgreSQL FTS is production-ready at your likely scale (thousands to tens of thousands of students)
4. No additional infrastructure; deployment complexity stays low
5. Migrate to Elasticsearch/Meilisearch only if reaching 100k+ posts or needing distributed indexing

**When to migrate later:** After achieving 1M+ posts with complex ranking requirements or multi-language support across 50+ universities.

---

## Option 1: PostgreSQL Native Full-Text Search (RECOMMENDED)

### What It Is

PostgreSQL's built-in full-text search using `tsvector` (text search vector) and `@@` operator. Converts text into a searchable token format with stemming, stopword removal, and relevance ranking.

### Pros

| Aspect                   | Benefit                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| **Cost**                 | Zero additional infrastructure; no separate service                |
| **Integration**          | Native Prisma support; queries in your data layer                  |
| **Simplicity**           | Single database connection; no sync between systems                |
| **Scaling**              | Handles 1M+ posts efficiently with proper indexing                 |
| **Relevance**            | Supports phrase search, boolean operators, ranking                 |
| **Language support**     | 15+ built-in language dictionaries (English, French, German, etc.) |
| **Development velocity** | Implement in a weekend; no new deployment tooling                  |

### Cons

| Aspect                  | Limitation                                                          |
| ----------------------- | ------------------------------------------------------------------- |
| **Distributed search**  | Requires database replication for true distributed search           |
| **Typo tolerance**      | No fuzzy matching; typos = no results (fixable with Levenshtein)    |
| **Analyzers**           | Less sophisticated than Elasticsearch (no custom tokenizers easily) |
| **Auto-complete**       | Prefix search works, but not as refined as dedicated solutions      |
| **Multi-field ranking** | Complex ranking across different field types requires custom logic  |

### Architecture

```
User Search Query
    ↓
NestJS API Controller
    ↓
Prisma Query (with @@ operator)
    ↓
PostgreSQL FTS Index (GIN)
    ↓
Results with ts_rank() relevance scoring
    ↓
JSON Response to Frontend
```

### Schema & Indexing

**Add to Prisma schema (Post model):**

```prisma
model Post {
  id                  String   @id @default(cuid())
  title               String?
  description         String?
  searchVector        Unsupported("tsvector")?  // Generated column
  // ... existing fields

  @@index([searchVector], map: "post_search_vector_idx", type: "gin")
  @@map("post")
}
```

**Migration SQL:**

```sql
-- Add tsvector column as generated column
ALTER TABLE post ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX post_search_vector_idx ON post USING gin (search_vector);
```

### NestJS Integration Example

```typescript
// posts.service.ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '@prisma/prisma.service'

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async searchPosts(query: string, limit: number = 20) {
    const searchQuery = query
      .trim()
      .split(/\s+/)
      .map((word) => word + ':*') // Allow prefix matching
      .join(' & ')

    return this.prisma.$queryRaw`
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
  }

  async searchPostsByUser(query: string, userId: string, limit: number = 20) {
    // Search only in user's saved posts or followed authors
    return this.prisma.$queryRaw`
      SELECT 
        p.*,
        ts_rank(p.search_vector, plainto_tsquery('english', ${query})) as relevance
      FROM post p
      WHERE (
        p.search_vector @@ plainto_tsquery('english', ${query})
        OR EXISTS (
          SELECT 1 FROM saved_post sp 
          WHERE sp.post_id = p.id AND sp.user_id = ${userId}
        )
      )
      AND p.status = 'APPROVED'
      ORDER BY relevance DESC
      LIMIT ${limit}
    `
  }
}
```

### Query Patterns

```typescript
// Simple search (phrase search)
plainto_tsquery('english', 'machine learning')
// Returns: 'machin' & 'learn'

// Prefix matching (autocomplete-like)
query.split(/\s+/).map(w => w + ':*').join(' & ')
// Query 'mach le' returns: 'mach:*' & 'le:*'

// Boolean operators (if user provides them)
to_tsquery('english', 'linear & algebra | calculus')
// Exact operator syntax

// Ranking by relevance + recency
ORDER BY ts_rank(search_vector, query) DESC, created_at DESC
```

### Performance Characteristics

| Metric                      | Value                                      |
| --------------------------- | ------------------------------------------ |
| **Index type**              | GIN (Generalized Inverted Index)           |
| **Index size**              | ~2-3x raw text size                        |
| **Query time (100k posts)** | 5-50ms for typical queries                 |
| **Query time (1M posts)**   | 50-200ms; may need pagination              |
| **Memory overhead**         | Minimal (index in disk)                    |
| **Update cost**             | Low; tsvector regenerated on INSERT/UPDATE |

### When to Use

✅ **Use PostgreSQL FTS when:**

- Posting < 500k posts initially
- Searching primarily in 2-3 fields (title, description)
- Single-deployment model (one university)
- Need to ship search quickly
- Your team is PostgreSQL-comfortable

❌ **Don't use when:**

- Supporting 50+ universities with distributed search
- Needing advanced fuzzy/typo tolerance
- Complex multi-language content analysis
- Real-time analytics on search patterns
- Existing Elasticsearch stack elsewhere

---

## Option 2: Meilisearch (MODERN ALTERNATIVE)

### What It Is

Lightweight, developer-friendly search engine. Written in Rust. Easier than Elasticsearch, more advanced than PostgreSQL FTS.

### Pros

| Aspect                   | Benefit                                                               |
| ------------------------ | --------------------------------------------------------------------- |
| **Developer experience** | Clean API, instant search (sub-100ms), typo tolerance out-of-box      |
| **Ranking**              | Smarter relevance; considers field weights, recency, custom scoring   |
| **Typo handling**        | Built-in fuzzy matching; "mahcine lerning" → finds "machine learning" |
| **Analytics**            | Native search analytics; see what users search for                    |
| **Scaling**              | Better than PostgreSQL for 10M+ documents                             |
| **Managed options**      | Meilisearch Cloud for SaaS (no DevOps)                                |
| **Multi-language**       | Better language support than PostgreSQL out-of-box                    |

### Cons

| Aspect                | Limitation                                                      |
| --------------------- | --------------------------------------------------------------- |
| **Infrastructure**    | Requires separate Meilisearch instance + sync logic             |
| **Data sync**         | Must keep Meilisearch and PostgreSQL in sync                    |
| **Complexity**        | Additional service to deploy/scale                              |
| **Cost**              | $0 if self-hosted; but ops overhead. Managed plans: $25-200+/mo |
| **Smaller ecosystem** | Fewer third-party integrations than Elasticsearch               |
| **Learning curve**    | Another tool to debug if search breaks                          |

### Architecture

```
User Search Query
    ↓
NestJS API Controller
    ↓
Meilisearch HTTP Client (HTTP REST)
    ↓
Meilisearch Index (in-memory + disk)
    ↓
Typo-tolerant ranking
    ↓
Results + analytics
    ↓
JSON Response to Frontend

Sync Loop (every minute or on POST INSERT):
POST INSERT/UPDATE → PostgreSQL
    ↓
Prisma Trigger / NestJS Event
    ↓
Meilisearch Client.addDocuments()
    ↓
Meilisearch Index Updated
```

### Setup for Unishare

**1. Install NestJS Meilisearch module:**

```bash
npm install meilisearch
# or
npm install @meilisearch/sdk
```

**2. Configure in NestJS:**

```typescript
// search.module.ts
import { Module } from '@nestjs/common'
import { MeilisearchService } from './meilisearch.service'

@Module({
  providers: [MeilisearchService],
  exports: [MeilisearchService],
})
export class SearchModule {}
```

```typescript
// meilisearch.service.ts
import { Injectable } from '@nestjs/common'
import { MeiliSearch } from 'meilisearch'

@Injectable()
export class MeilisearchService {
  private client: MeiliSearch

  constructor() {
    this.client = new MeiliSearch({
      host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY,
    })
  }

  async indexPost(post: Post) {
    const index = this.client.index('posts')
    await index.addDocuments([
      {
        id: post.id,
        title: post.title,
        description: post.description,
        courseId: post.courseId,
        departmentId: post.course.department.id,
        authorId: post.authorId,
        type: post.type,
        views: post.views,
        reactionCount: post.reactions.length,
        createdAt: post.createdAt.getTime(),
      },
    ])
  }

  async search(query: string, filters?: string) {
    const index = this.client.index('posts')
    return await index.search(query, {
      filter: filters, // "departmentId = 'dept-123' AND type = 'NOTE'"
      limit: 20,
      attributesToHighlight: ['title', 'description'],
    })
  }
}
```

**3. Sync on POST creation:**

```typescript
// posts.service.ts
@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private meilisearch: MeilisearchService,
  ) {}

  async createPost(data: CreatePostDto) {
    const post = await this.prisma.post.create({
      data,
      include: { course: { include: { department: true } } },
    })

    // Async sync to Meilisearch
    this.meilisearch.indexPost(post).catch((err) => console.error('Meilisearch sync failed:', err))

    return post
  }
}
```

### Docker Compose for Local Dev

```yaml
services:
  meilisearch:
    image: getmeili/meilisearch:latest
    ports:
      - '7700:7700'
    environment:
      MEILI_MASTER_KEY: ${MEILISEARCH_API_KEY}
    volumes:
      - meilisearch_data:/meili_data
volumes:
  meilisearch_data:
```

### Performance Characteristics

| Metric                     | Value                              |
| -------------------------- | ---------------------------------- |
| **Query time (100k docs)** | 10-50ms                            |
| **Query time (1M docs)**   | 50-100ms                           |
| **Typo tolerance**         | ±2 characters by default           |
| **Memory per 100k docs**   | ~50-100MB (in-memory index)        |
| **Indexing speed**         | ~10-20k docs/sec                   |
| **Memory usage**           | Higher than PostgreSQL (in-memory) |

### Cost Comparison

| Approach           | Self-Hosted Cost | Managed Cost                   |
| ------------------ | ---------------- | ------------------------------ |
| **PostgreSQL FTS** | $0 (included)    | Included in DB                 |
| **Meilisearch**    | $0 (but DevOps)  | $25-200/mo (Meilisearch Cloud) |
| **Elasticsearch**  | $0 (but 2x ops)  | $50-500+/mo                    |

### When to Use

✅ **Use Meilisearch when:**

- Want instant search + typo tolerance without ops overhead
- Managed option (Meilisearch Cloud) removes DevOps
- Need analytics on search behavior
- Can afford separate infrastructure
- Expect 100k-10M posts

❌ **Don't use when:**

- Hosting costs are critical
- Team has no DevOps capacity
- Single PostgreSQL connection sufficient

---

## Option 3: Elasticsearch (NOT RECOMMENDED FOR PHASE 3)

### Why Not Now

Elasticsearch is industry-standard for massive scale, but overengineered for Unishare's Phase 3:

| Reason                   | Impact                                                      |
| ------------------------ | ----------------------------------------------------------- |
| **Complexity**           | Requires separate cluster, version management, shard tuning |
| **Operational overhead** | Need dedicated DevOps for production                        |
| **Learning curve**       | Steep; Lucene query syntax is complex                       |
| **Infrastructure cost**  | $100-500+/mo minimum for production                         |
| **Overkill**             | Unnecessary at <10M posts                                   |

**Defer to Phase 4+** when you've proven product-market fit and need distributed, multi-university search.

---

## Migration Path (PostgreSQL FTS → Meilisearch)

If you start with PostgreSQL and later need to migrate:

**Phase 3:** PostgreSQL FTS (MVP)
**Phase 3.5:** Add Meilisearch alongside
**Phase 4:** Gradual traffic shift to Meilisearch
**Phase 5:** Deprecate PostgreSQL FTS

**Effort:** 2-3 days to add Meilisearch layer (low risk, both systems run in parallel)

---

## Recommendation Summary

### Start With: PostgreSQL Native FTS

```typescript
// Minimal implementation to ship Phase 3
async searchPosts(query: string) {
  return this.prisma.$queryRaw`
    SELECT * FROM post
    WHERE search_vector @@ plainto_tsquery('english', ${query})
      AND status = 'APPROVED'
    ORDER BY ts_rank(search_vector, query) DESC
    LIMIT 20
  `;
}
```

**Why:**

- Ship in days, not weeks
- Zero additional infrastructure
- Your database is already running PostgreSQL
- Sufficient for first 500k posts
- Can migrate to Meilisearch without code rewrite

### Implementation Timeline

**Week 1:**

- Add `search_vector` column to Post (generated column)
- Create GIN index
- Add `searchPosts()` method to PostsService

**Week 2:**

- Add search endpoint to PostsController
- Frontend search input integration
- Performance testing with 10k sample posts

**Week 3:**

- Launch Phase 3 with search
- Monitor query performance

---

## Sources

- PostgreSQL Full-Text Search Documentation: https://www.postgresql.org/docs/current/textsearch.html
- Prisma Raw Queries Guide: https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access
- Meilisearch Official Docs: https://docs.meilisearch.com/
- "Full-Text Search in PostgreSQL" by PostgreSQL community (verified)
- NestJS Database Integration Patterns (team experience)
