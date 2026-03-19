# Trending & Popularity Algorithms for Phase 3

**Project:** Unishare (Academic Content Sharing)
**Phase:** 3 (Search & Growth)
**Researched:** January 2025
**Confidence:** HIGH

## Executive Summary

For Unishare's trending feed, **implement a time-decay scoring model combining views + reactions + recency** because:

1. Academic content has seasonal relevance (exam periods boost engagement)
2. Simple algorithm (no complex ML) avoids operational overhead
3. Materialized view refreshes every 5 minutes = fresh without constant computation
4. Extensible to multiple popularity tiers (hourly, weekly, all-time)
5. Prevents low-engagement posts from dominating but prevents new posts from being buried

**Key insight:** Trending ≠ All-Time Popular. Trending surfaces recent content with good engagement; All-Time Popular celebrates classics.

---

## Recommended Algorithm: Time-Decay Scoring

### The Formula

```
Score = (views * 0.3 + reactions * 1.0 + comments * 0.5)
         * time_decay_factor
         * recency_boost

Where:
  time_decay_factor = 1 / (days_since_created + 1)
  recency_boost = 1.5 if created < 7 days ago, else 1.0
```

### Intuition

| Component         | Weight     | Reason                                                      |
| ----------------- | ---------- | ----------------------------------------------------------- |
| **Views**         | 0.3        | Popularity indicator (less reliable than reactions)         |
| **Reactions**     | 1.0        | High signal of quality (students explicitly mark "helpful") |
| **Comments**      | 0.5        | Engagement indicator; discussion = valuable content         |
| **Time decay**    | 1/(days+1) | 7-day-old post = 50% score of 1-day-old post                |
| **Recency boost** | 1.5x       | New posts get 50% bonus for 7 days                          |

---

## Implementation: Materialized Score Column

### Option 1: Computed Score Column (RECOMMENDED)

**Why:** Simple, fast, single table scan.

```prisma
model Post {
  id                  String   @id @default(cuid())
  // ... existing fields
  views               Int      @default(0)
  trendingScore       Float    @default(0)  // Materialized score
  allTimeScore        Float    @default(0)  // All-time ranking
  weeklyScore         Float    @default(0)  // Last 7 days

  @@index([trendingScore], type: "desc")  // For sorting
  @@index([createdAt])  // For time calculations
  @@map("post")
}
```

### Option 2: Separate Materialized View (ADVANCED)

**Why:** If you need multiple scoring algorithms or heavy querying.

```sql
CREATE MATERIALIZED VIEW post_trending_scores AS
SELECT
  p.id,
  p.created_at,
  CAST(
    (
      (p.views * 0.3 + COALESCE(reaction_count.count, 0) * 1.0 + COALESCE(comment_count.count, 0) * 0.5)
      / (EXTRACT(DAY FROM NOW() - p.created_at) + 1)
      * CASE WHEN (NOW() - p.created_at) < INTERVAL '7 days' THEN 1.5 ELSE 1.0 END
    ) AS FLOAT
  ) as trending_score,
  CAST(
    (p.views * 0.3 + COALESCE(reaction_count.count, 0) * 1.0 + COALESCE(comment_count.count, 0) * 0.5)
    AS FLOAT
  ) as all_time_score
FROM post p
LEFT JOIN (
  SELECT post_id, COUNT(*) as count FROM reaction GROUP BY post_id
) reaction_count ON p.id = reaction_count.post_id
LEFT JOIN (
  SELECT post_id, COUNT(*) as count FROM comment WHERE deleted_at IS NULL GROUP BY post_id
) comment_count ON p.id = comment_count.post_id
WHERE p.status = 'APPROVED' AND p.deleted_at IS NULL;

CREATE UNIQUE INDEX post_trending_scores_idx ON post_trending_scores(id);
```

### Refreshing Scores (Every 5 Minutes)

**Using a NestJS scheduled task:**

```typescript
// trending.service.ts
import { Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class TrendingService {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshTrendingScores() {
    console.log('[TrendingService] Refreshing trending scores...')

    const posts = await this.prisma.post.findMany({
      where: {
        status: 'APPROVED',
        deletedAt: null,
      },
      include: {
        reactions: { select: { id: true } },
        comments: { select: { id: true } },
      },
    })

    const scoreUpdates = posts.map((post) => {
      const daysSinceCreated = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60 * 24)

      const recencyBoost = daysSinceCreated < 7 ? 1.5 : 1.0
      const timeDecay = 1 / (daysSinceCreated + 1)

      const trendingScore =
        (post.views * 0.3 + post.reactions.length * 1.0 + post.comments.length * 0.5) *
        timeDecay *
        recencyBoost

      const allTimeScore =
        post.views * 0.3 + post.reactions.length * 1.0 + post.comments.length * 0.5

      return this.prisma.post.update({
        where: { id: post.id },
        data: { trendingScore, allTimeScore },
      })
    })

    await this.prisma.$transaction(scoreUpdates)
    console.log(`[TrendingService] Updated ${posts.length} posts`)
  }
}
```

**Enable scheduling in your NestJS app:**

```typescript
// app.module.ts
import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
  imports: [ScheduleModule.forRoot()],
  // ...
})
export class AppModule {}
```

---

## Querying Trending Content

### Trending This Week

```typescript
// posts.service.ts
async getTrendingPosts(limit: number = 20) {
  return this.prisma.post.findMany({
    where: {
      status: 'APPROVED',
      deletedAt: null,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { trendingScore: 'desc' },
    include: {
      author: true,
      course: { include: { department: true } },
      reactions: true,
      comments: true,
    },
    take: limit,
  });
}
```

### All-Time Popular Posts

```typescript
async getAllTimePopularPosts(limit: number = 20) {
  return this.prisma.post.findMany({
    where: {
      status: 'APPROVED',
      deletedAt: null,
    },
    orderBy: { allTimeScore: 'desc' },
    include: {
      author: true,
      course: { include: { department: true } },
    },
    take: limit,
  });
}
```

### Department-Specific Trending

```typescript
async getTrendingInDepartment(departmentId: string, limit: number = 20) {
  return this.prisma.post.findMany({
    where: {
      status: 'APPROVED',
      deletedAt: null,
      course: {
        department: { id: departmentId },
      },
    },
    orderBy: { trendingScore: 'desc' },
    take: limit,
  });
}
```

---

## Feed Sorting Options

### Frontend Dropdown

```typescript
type FeedSort = 'TRENDING' | 'NEWEST' | 'MOST_HELPFUL' | 'MOST_DISCUSSED';

async getFeed(sort: FeedSort, departmentId?: string) {
  const where = {
    status: 'APPROVED',
    deletedAt: null,
    ...(departmentId && { course: { department: { id: departmentId } } }),
  };

  switch (sort) {
    case 'TRENDING':
      return this.prisma.post.findMany({
        where,
        orderBy: { trendingScore: 'desc' },
        take: 50,
      });

    case 'NEWEST':
      return this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

    case 'MOST_HELPFUL':
      return this.prisma.post.findMany({
        where: { ...where, reactions: { some: {} } },
        orderBy: { allTimeScore: 'desc' },
        take: 50,
      });

    case 'MOST_DISCUSSED':
      return this.prisma.post.findMany({
        where: { ...where, comments: { some: {} } },
        orderBy: { comments: { _count: 'desc' } },
        take: 50,
      });
  }
}
```

---

## Advanced Variations

### Seasonal Boost for Exam Periods

```typescript
function getSeasonalBoost(date: Date): number {
  const month = date.getMonth()

  // Exam months (December, April, May) get 1.5x boost
  if ([11, 3, 4].includes(month)) {
    return 1.5
  }

  return 1.0
}

// Usage in score calculation:
const seasonalBoost = getSeasonalBoost(post.createdAt)
const trendingScore = baseScore * timeDecay * seasonalBoost
```

### Course-Specific Trending

Students in CS201 see trending content for CS201 ranked higher:

```typescript
async getFeedForUser(userId: string, sort: FeedSort = 'TRENDING') {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { department: true },
  });

  // Boost posts in user's department
  const posts = await this.prisma.post.findMany({
    where: {
      status: 'APPROVED',
      deletedAt: null,
    },
    take: 50,
  });

  // Rescore with department boost
  return posts
    .map(post => ({
      ...post,
      boostScore: post.trendingScore *
        (post.course.department.id === user.departmentId ? 1.5 : 1.0),
    }))
    .sort((a, b) => b.boostScore - a.boostScore);
}
```

### Comment Activity Boost

Posts with recent comments stay trending longer:

```typescript
const lastCommentAge =
  Math.max(...post.comments.map((c) => c.createdAt.getTime())) || post.createdAt.getTime()

const commentRecency = 1 / ((Date.now() - lastCommentAge) / (1000 * 60 * 60) + 1)

const adjustedScore = baseScore * commentRecency
```

---

## Performance Optimization

### Indexing Strategy

```sql
-- Primary trending query index
CREATE INDEX post_trending_score_idx ON post (
  trending_score DESC,
  status,
  deleted_at
);

-- Department-specific trending
CREATE INDEX post_dept_trending_idx ON post (
  course_id,
  trending_score DESC
) WHERE status = 'APPROVED' AND deleted_at IS NULL;

-- For "newest" sort
CREATE INDEX post_created_at_idx ON post (
  created_at DESC
) WHERE status = 'APPROVED' AND deleted_at IS NULL;

-- For materialized view refresh
CREATE INDEX post_updated_idx ON post (updated_at);
```

### Caching Strategy

```typescript
// Cache trending posts in Redis for 1 minute
async getTrendingPosts(limit: number = 20) {
  const cacheKey = `trending-posts-${limit}`;

  const cached = await this.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const posts = await this.prisma.post.findMany({
    where: { status: 'APPROVED', deletedAt: null },
    orderBy: { trendingScore: 'desc' },
    take: limit,
  });

  await this.redis.setex(cacheKey, 60, JSON.stringify(posts));
  return posts;
}
```

---

## Preventing Manipulation & Gaming

### Anti-Spam Measures

```typescript
// Reactions (prevent self-reactions)
@@unique([userId, postId])  // User can only react once per post

// Comments (rate limiting)
// Monitor: User posting 50+ comments in 1 hour = potential spam

// Post creation (rate limiting)
// Monitor: User creating 10+ posts in 1 hour = potential spam
```

### Detection

```typescript
async detectSuspiciousActivity() {
  // Posts with unusually high engagement ratio
  const suspiciousPosts = await this.prisma.post.findMany({
    where: {
      reactions: { _count: { gt: 50 } },
      views: { lt: 200 },  // More reactions than views?
    },
  });

  // Mark for manual review
  for (const post of suspiciousPosts) {
    console.warn(`Suspicious post: ${post.id}`);
  }
}
```

---

## Admin Dashboard Queries

### Trending This Hour

```typescript
async getTrendingLastHour() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  return this.prisma.post.findMany({
    where: {
      createdAt: { gte: oneHourAgo },
      status: 'APPROVED',
      deletedAt: null,
    },
    orderBy: { trendingScore: 'desc' },
    include: {
      author: { select: { name: true } },
      course: true,
      _count: {
        select: { reactions: true, comments: true },
      },
    },
  });
}
```

### Engagement Analytics

```typescript
async getEngagementMetrics() {
  const posts = await this.prisma.post.findMany({
    where: { status: 'APPROVED', deletedAt: null },
    include: {
      _count: {
        select: { views: true, reactions: true, comments: true },
      },
    },
  });

  const avg = {
    views: posts.reduce((s, p) => s + p.views, 0) / posts.length,
    reactions: posts.reduce((s, p) => s + p._count.reactions, 0) / posts.length,
    comments: posts.reduce((s, p) => s + p._count.comments, 0) / posts.length,
  };

  return avg;
}
```

---

## Evolution Path

### Phase 3

- Basic trending (views + reactions + recency)
- Weekly and all-time sorts

### Phase 3.5

- Comment boost to trending algorithm
- Department-specific trending

### Phase 4

- Machine learning ranking (if needed)
- Personalized trending based on user history
- Multi-university trending normalization

### Phase 5+

- Seasonal boosts for exam periods
- Collaborative filtering recommendations

---

## Implementation Checklist

- [ ] Add `trendingScore` and `allTimeScore` columns to Post
- [ ] Create index on `trendingScore DESC`
- [ ] Implement `TrendingService` with scheduled task
- [ ] Add `@Cron` decorator for 5-minute refresh
- [ ] Create `getTrendingPosts()` endpoint
- [ ] Add feed sort options to frontend
- [ ] Test with 10k sample posts (performance)
- [ ] Monitor refresh job performance
- [ ] Document score calculation for admins

---

## Sources

- Reddit's ranking algorithm: https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9
- Hacker News ranking: http://www.paulgraham.com/roulette.html
- Time-decay functions in recommender systems: https://en.wikipedia.org/wiki/Exponential_decay
- Prisma Aggregations: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#aggregations
- NestJS Scheduling: https://docs.nestjs.com/techniques/task-scheduling
