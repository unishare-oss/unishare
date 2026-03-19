# Tagging Systems & Discovery Patterns for Phase 3

**Project:** Unishare (Academic Content Sharing)
**Phase:** 3 (Search & Growth)
**Researched:** January 2025
**Confidence:** HIGH

## Executive Summary

For Unishare's tagging system, **implement a flat, hierarchical-aware tagging model using junction tables** because:

1. Academic content (notes, exam papers) has natural tags (e.g., "Linear Algebra", "Final 2024", "Midterm")
2. Flat structure avoids complexity; hierarchies (via naming conventions) can be added later
3. Junction table pattern integrates seamlessly with your existing Prisma schema
4. Enables autocomplete and trending tags without extra infrastructure
5. Scales to 10k+ unique tags efficiently

**Key insight:** Tags drive discoverability when combined with search. Together they transform Unishare from "browse filtered posts" to "explore trending topics."

---

## Recommended Schema Design: Flat Tagging with Hierarchy Support

### Why Flat Tags (Not Hierarchical)

| Approach         | Schema Complexity             | Query Performance       | Common Use Cases            |
| ---------------- | ----------------------------- | ----------------------- | --------------------------- |
| **Flat**         | Simple junction table         | Fast; no tree traversal | Academic content discovery  |
| **Hierarchical** | Nested sets or ltree          | Slower; tree queries    | Org charts, taxonomies      |
| **Mixed**        | Flat tags + naming convention | Simple + flexible       | Tags with implied structure |

**Recommendation:** Start flat. Use naming conventions like `"CS201::Linear Algebra"` if hierarchy needed later.

### Database Schema

**Add to Prisma schema:**

```prisma
model Tag {
  id        String   @id @default(cuid())
  name      String   @unique
  slug      String   @unique  // "linear-algebra" for URLs
  color     String?  @default("#3B82F6")  // Optional badge color
  createdAt DateTime @default(now())

  posts     PostTag[]

  @@index([slug])
  @@map("tag")
}

model PostTag {
  postId String
  tagId  String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@index([tagId])  // For "all posts with tag"
  @@map("post_tag")
}

// Extend Post model:
model Post {
  // ... existing fields
  tags    PostTag[]

  @@map("post")
}
```

**Prisma migration:**

```bash
pnpm prisma migrate dev --name add_tagging_system
```

### Why This Schema

| Choice                       | Reason                                           |
| ---------------------------- | ------------------------------------------------ |
| **`slug` (unique)**          | Clean URLs; "view posts tagged 'linear-algebra'" |
| **`color` (optional)**       | Frontend badge styling; user experience          |
| **Composite PK on PostTag**  | Prevents duplicate tags per post                 |
| **Index on `PostTag.tagId`** | Fast "all posts with tag X" queries              |
| **OnDelete: Cascade**        | Delete post → auto-delete post_tag rows          |

---

## Core Operations

### 1. Create/Get Tag

```typescript
// tags.service.ts
@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findOrCreate(name: string, color?: string) {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    return this.prisma.tag.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        color: color || '#3B82F6',
      },
    })
  }

  async findBySlug(slug: string) {
    return this.prisma.tag.findUnique({
      where: { slug },
      include: {
        posts: {
          include: { post: true },
          orderBy: { post: { createdAt: 'desc' } },
          take: 100,
        },
      },
    })
  }
}
```

### 2. Tag a Post

```typescript
// posts.service.ts
async tagPost(postId: string, tagNames: string[]) {
  // Get or create tags
  const tags = await Promise.all(
    tagNames.map(name => this.tagsService.findOrCreate(name))
  );

  // Connect tags to post (clear existing first)
  await this.prisma.post.update({
    where: { id: postId },
    data: {
      tags: {
        deleteMany: {},  // Remove old tags
        create: tags.map(tag => ({
          tag: { connect: { id: tag.id } },
        })),
      },
    },
    include: { tags: { include: { tag: true } } },
  });
}

async createPost(data: CreatePostDto, tags: string[]) {
  const post = await this.prisma.post.create({
    data: {
      ...data,
      tags: {
        create: (await Promise.all(
          tags.map(name => this.tagsService.findOrCreate(name))
        )).map(tag => ({
          tag: { connect: { id: tag.id } },
        })),
      },
    },
    include: { tags: { include: { tag: true } } },
  });

  return post;
}
```

### 3. Search Posts by Tag

```typescript
async findPostsByTag(tagSlug: string, limit: number = 20) {
  return this.prisma.post.findMany({
    where: {
      tags: {
        some: {
          tag: { slug: tagSlug },
        },
      },
      status: 'APPROVED',
      deletedAt: null,
    },
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async findPostsByMultipleTags(tagSlugs: string[], limit: number = 20) {
  // All tags (AND logic)
  return this.prisma.post.findMany({
    where: {
      AND: tagSlugs.map(slug => ({
        tags: {
          some: { tag: { slug } },
        },
      })),
      status: 'APPROVED',
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
```

---

## Tag Autocomplete & Discovery

### Autocomplete API

```typescript
// tags.controller.ts
@Get('autocomplete')
async autocomplete(@Query('q') query: string) {
  const tags = await this.prisma.tag.findMany({
    where: {
      name: {
        search: query,  // Full-text search on tag name
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      _count: {
        select: { posts: true },  // Count of posts with tag
      },
    },
    orderBy: {
      posts: { _count: 'desc' },  // Trending tags first
    },
    take: 10,
  });

  return tags;
}
```

**Frontend:**

```typescript
// tags autocomplete in post creation form
const [suggestions, setSuggestions] = useState<Tag[]>([])

const handleTagInput = async (value: string) => {
  if (value.length < 2) return
  const res = await fetch(`/api/tags/autocomplete?q=${value}`)
  setSuggestions(await res.json())
}
```

### Trending Tags Endpoint

```typescript
async getTrendingTags(limit: number = 10) {
  const tags = await this.prisma.tag.findMany({
    include: {
      _count: {
        select: { posts: true },
      },
    },
    orderBy: {
      posts: { _count: 'desc' },
    },
    take: limit,
  });

  return tags.map(tag => ({
    ...tag,
    postCount: tag._count.posts,
  }));
}

async getTrendingTagsThisWeek(limit: number = 10) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const tags = await this.prisma.tag.findMany({
    where: {
      posts: {
        some: {
          post: { createdAt: { gte: sevenDaysAgo } },
        },
      },
    },
    include: {
      _count: {
        select: {
          posts: {
            where: { post: { createdAt: { gte: sevenDaysAgo } } },
          },
        },
      },
    },
    orderBy: { posts: { _count: 'desc' } },
    take: limit,
  });

  return tags;
}
```

---

## UI/UX Patterns for Tagging

### During Post Creation

```
[Post Form]

Title: [_________________]
Description: [__________________]

Tags: [Input]
       ↓ (autocomplete dropdown shows)
       ┌─────────────────────┐
       │ Linear Algebra (45) │  ← Post count
       │ Calculus (32)       │
       │ Algorithms (18)     │
       └─────────────────────┘

Selected Tags:
[Linear Algebra] [x]  [Calculus] [x]  [New Tag] [+]
```

### Tag Display on Post Card

```
[Post Card]
─────────────────────────
Title: Exam Prep Notes
Author: John (@)
[🏷️ Linear Algebra] [🏷️ Exam] [🏷️ Spring 2024]
─────────────────────────
♥️ 42  💬 12  👁️ 234
```

### Browsing by Tag

```
[Tag Page: Linear Algebra]

Posts tagged with Linear Algebra (234)

Filter by:
┌──────────────────────┐
│ ☑ 2024              │
│ ☑ Final Exam        │  ← Multiple tag filters
│ ☐ Midterm           │
└──────────────────────┘

[Posts list sorted by newest]
```

---

## Performance Optimization

### Indexing Strategy

```sql
-- Existing Prisma indexes (auto-created):
-- - Tag.slug (unique)
-- - PostTag.tagId

-- Add for tag search performance:
CREATE INDEX tag_name_search_idx ON tag USING gin (
  to_tsvector('english', name)
);

-- For "trending tags this week" queries:
CREATE INDEX post_tag_created_idx ON post_tag
USING btree (tag_id)
INCLUDE (post_id);
```

### N+1 Prevention

**Bad:**

```typescript
const posts = await this.prisma.post.findMany();
// Then loop:
for (const post of posts) {
  post.tags = await this.prisma.tag.findMany({...});  // N queries!
}
```

**Good:**

```typescript
const posts = await this.prisma.post.findMany({
  include: { tags: { include: { tag: true } } }, // 1 query
})
```

### Materialized Tag Statistics

For dashboards showing trending tags, cache counts:

```typescript
// Refresh every 6 hours (async job)
async refreshTagStats() {
  const stats = await this.prisma.tag.findMany({
    include: {
      _count: { select: { posts: true } },
    },
  });

  // Cache in Redis or in a materialized view
  await redis.set('tag-stats', JSON.stringify(stats), 'EX', 21600);
}
```

---

## Tag Governance

### Allowed Characters & Validation

```typescript
// Tag name rules
const TAG_REGEX = /^[a-z0-9\s\-&()]{2,50}$/i;

function validateTag(name: string): boolean {
  return TAG_REGEX.test(name.trim());
}

// Examples:
✅ "Linear Algebra"
✅ "CS201"
✅ "2024 Final"
✅ "C++ (Advanced)"
✅ "Algorithms & Data Structures"
❌ "@hashtag"  (special chars)
❌ "A"  (too short)
❌ "This is a very long tag that exceeds limits"  (too long)
```

### Preventing Tag Abuse (Admin Dashboard)

```typescript
async getTagStats() {
  return this.prisma.tag.findMany({
    include: {
      _count: { select: { posts: true } },
    },
    orderBy: { name: 'asc' },
  });
}

async mergeTagDuplicates(tagId1: string, tagId2: string) {
  // Move all posts from tagId2 to tagId1
  await this.prisma.postTag.updateMany({
    where: { tagId: tagId2 },
    data: { tagId: tagId1 },
  });

  // Delete tagId2
  await this.prisma.tag.delete({ where: { id: tagId2 } });
}

async deleteUnusedTags() {
  return this.prisma.tag.deleteMany({
    where: {
      posts: { none: {} },  // No posts tagged
    },
  });
}
```

---

## Tag Metadata (Future Enhancement)

### Color Coding by Department

```prisma
model Tag {
  // ... existing fields
  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id])

  @@index([departmentId])
}
```

### Official vs User-Created Tags

```prisma
model Tag {
  // ... existing fields
  isOfficial   Boolean  @default(false)  // Admin-curated
  createdBy    String?  // null if official

  @@index([isOfficial])
}
```

---

## Implementation Roadmap

### Week 1: Core Tagging

- Add Tag & PostTag models to schema
- Implement tag CRUD operations
- Add tags during post creation

### Week 2: Discovery

- Implement autocomplete endpoint
- Add trending tags endpoint
- Tag filtering on feed

### Week 3: UI & Polish

- Frontend tag input component
- Tag pages (view all posts with tag)
- Admin tag management dashboard

### Week 4+: Analytics

- Track most-searched tags
- Recommendations based on user's tags
- Tag-based discovery algorithms

---

## Schema Evolution Path

**Phase 3:** Flat tags
**Phase 4:** Add `departmentId` for scoped tagging
**Phase 5:** Add `isOfficial` for curated tag system
**Phase 6+:** Hierarchical tags (if needed by multiple universities)

---

## Sources

- Prisma Many-to-Many Relationships: https://www.prisma.io/docs/concepts/components/prisma-schema/relations/many-to-many-relations
- PostgreSQL Full-Text Search for Tags: https://www.postgresql.org/docs/current/textsearch.html
- Tagging Best Practices (Stackoverflow, Reddit, Stack Exchange patterns)
- N+1 Query Problem: https://www.prisma.io/docs/concepts/orm/prisma-client/queries/relation-queries
