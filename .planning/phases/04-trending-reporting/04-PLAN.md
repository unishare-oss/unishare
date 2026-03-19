---
phase: 04-trending-reporting
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/prisma/schema.prisma
  - apps/api/src/modules/posts/entities/post.entity.ts
  - apps/api/src/modules/posts/dto/create-post.dto.ts
  - apps/api/src/modules/posts/dto/update-post.dto.ts
  - apps/api/src/modules/posts/posts.service.ts
  - apps/api/src/modules/posts/posts.controller.ts
  - apps/api/src/modules/trending/trending.service.ts
  - apps/api/src/modules/trending/trending.module.ts
  - apps/api/src/modules/trending/trending.scheduler.ts
  - apps/api/src/modules/reports/reports.service.ts
  - apps/api/src/modules/reports/reports.controller.ts
  - apps/api/src/modules/reports/reports.module.ts
  - apps/api/src/modules/reports/dto/create-report.dto.ts
  - apps/api/src/modules/reports/dto/list-reports.dto.ts
  - apps/api/src/modules/reports/entities/report.entity.ts
  - apps/api/src/app.module.ts
  - apps/api/prisma/migrations/[timestamp]_add_trending_reporting/migration.sql
  - apps/web/components/FeedSortDropdown.tsx
  - apps/web/components/ReportDialog.tsx
  - apps/web/hooks/useFeedSort.ts
  - apps/web/hooks/useReportPost.ts
  - apps/api/test/trending.e2e-spec.ts
  - apps/api/test/reports.e2e-spec.ts
autonomous: true
requirements: [TREND-01, TREND-02, REPORT-01, REPORT-02, ADMIN-01]
user_setup: []

must_haves:
  truths:
    - 'Students can see trending posts sorted by engagement and recency'
    - "Feed has working sort toggle between 'Recent' and 'Trending' views"
    - 'Users can report posts with reason and optional comment'
    - 'Reported posts are hidden from feed pending admin review'
    - 'Admins can access reports dashboard filtered by status and reason'
    - 'Admins can approve/reject reports with audit trail'
  artifacts:
    - path: 'apps/api/prisma/schema.prisma'
      provides: 'Trending score columns, Report model, Admin action audit trail'
      contains: 'trendingScore Float, postStatus enum, Report model'
    - path: 'apps/api/src/modules/trending/trending.service.ts'
      provides: 'Trending score calculation with time decay algorithm'
      exports: ['refreshTrendingScores', 'getTrendingPosts']
    - path: 'apps/api/src/modules/reports/reports.service.ts'
      provides: 'Report submission, admin actions, status tracking'
      exports: ['createReport', 'listReports', 'approveReport', 'rejectReport']
    - path: 'apps/api/src/modules/posts/posts.controller.ts'
      provides: 'GET /posts/trending, POST /posts/:id/report endpoints'
      exports: ['getTrendingPosts', 'reportPost']
    - path: 'apps/web/components/FeedSortDropdown.tsx'
      provides: 'UI for sort selection (Recent/Trending)'
      min_lines: 20
    - path: 'apps/api/test/trending.e2e-spec.ts'
      provides: 'E2E verification of trending algorithm and API'
      exports: "describe block: 'Trending Feed'"
    - path: 'apps/api/test/reports.e2e-spec.ts'
      provides: 'E2E verification of reporting workflow'
      exports: "describe block: 'Content Reporting'"
  key_links:
    - from: 'apps/web/components/FeedSortDropdown.tsx'
      to: 'GET /posts/trending'
      via: 'useQuery hook'
      pattern: 'useQuery.*trending'
    - from: 'apps/web/components/ReportDialog.tsx'
      to: 'POST /posts/:id/report'
      via: 'useMutation hook'
      pattern: 'useMutation.*report'
    - from: 'apps/api/src/modules/trending/trending.scheduler.ts'
      to: 'apps/api/src/modules/posts/posts.service.ts'
      via: 'refreshTrendingScores scheduled job'
      pattern: '@Cron.*EVERY_5_MINUTES'
    - from: 'apps/api/src/modules/reports/reports.controller.ts'
      to: 'apps/api/src/modules/posts/posts.service.ts'
      via: 'soft-delete post when report approved'
      pattern: 'posts.update.*status.*pending_review'
---

<objective>
**Goal:** Students see trending content; admins can moderate via reports.

Students can discover high-quality, recently-popular posts via a trending feed sort. Users can report posts for violations; admins review reports on a dedicated dashboard and approve/reject with audit trails. Reported posts are soft-deleted pending review.

**Purpose:**

- Enable discovery of quality academic content (trending algorithm surfaces popular posts with engagement signals)
- Maintain platform health via community-driven reporting and admin moderation
- Provide accountability through audit trails (who reported, when, admin actions, timestamps)

**Output:**

- Trending API endpoint with materialized scores refreshed every 5 minutes
- Reporting system with soft-delete logic and admin dashboard
- E2E test coverage for trending and reporting workflows
- Phase 3.1 features (search, tagging) remain unaffected
  </objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/execute-plan.md
@~/.copilot/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-trending-reporting/04-CONTEXT.md
@.planning/phases/03-search-tagging/03-SUMMARY.md
@.planning/codebase/STRUCTURE.md
@.planning/codebase/CONVENTIONS.md
@.planning/codebase/TESTING.md
@.planning/research/TRENDING_ALGORITHMS.md
@.planning/research/REPORTING_WORKFLOWS.md

**From Phase 3.1 Summary:** Search foundation uses PostgreSQL FTS with tsvector. Posts table has tags relation via PostTag junction table. Tag autocomplete and trending tags endpoints already exist. All Phase 1-2 features (posts, reactions, comments, bookmarks) are fully integrated.

**Key Decisions (from 04-CONTEXT.md):**

- Trending: Hybrid scoring (views _ 0.3 + reactions _ 0.7) with time decay factor, materialized every 5 minutes
- Reporting: Capture reporter, reason, comment; soft-delete reported posts; admin approve/reject with audit trail
- Post status field added: 'published', 'pending_review', 'rejected'
- Report reasons: spam, offensive, copyright, other
- Admin dashboard: list, filter, bulk actions, view action history

</context>

<interfaces>
**Key Exports from Phase 3.1 (Search & Tagging):**

From `apps/api/src/modules/tags/tags.service.ts`:

```typescript
export class TagsService {
  async findOrCreate(name: string, color?: string): Promise<Tag>
  async autocomplete(query: string, limit?: number): Promise<Tag[]>
  async getTrendingTags(limit?: number): Promise<Tag[]>
}
```

From `apps/api/src/modules/posts/posts.service.ts`:

```typescript
export class PostsService {
  async searchPosts(
    query: string,
    limit: number,
    page: number,
  ): Promise<{ posts: Post[]; total: number }>
  async tagPost(postId: string, tagNames: string[]): Promise<Post>
  async findPostsByTag(slug: string, limit: number, page: number): Promise<Post[]>
}
```

**Prisma Models (existing, will extend):**

```typescript
model Post {
  id          String
  title       String
  description String
  views       Int        // Already exists
  createdAt   DateTime
  status      PostStatus // Will add
  // ... other fields
}

model Reaction {
  id        String
  postId    String
  userId    String
  type      String
  createdAt DateTime
}
```

**New Interfaces to Create in This Plan:**

From `apps/api/src/modules/trending/trending.service.ts`:

```typescript
export class TrendingService {
  async refreshTrendingScores(): Promise<void>
  async getTrendingPosts(limit: number, page: number): Promise<{ posts: Post[]; total: number }>
  private calculateTrendingScore(post: Post, reactionCount: number, commentCount: number): number
}
```

From `apps/api/src/modules/reports/reports.service.ts`:

```typescript
export class ReportsService {
  async createReport(postId: string, userId: string, dto: CreateReportDto): Promise<Report>
  async listReports(filters: ListReportsDto): Promise<{ reports: Report[]; total: number }>
  async approveReport(reportId: string, adminId: string): Promise<Report>
  async rejectReport(reportId: string, adminId: string): Promise<Report>
}
```

</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Update Prisma schema with trending scores and reporting models</name>
  <files>
    apps/api/prisma/schema.prisma
  </files>
  <action>
Add the following to the Post model:
- `trendingScore Float @default(0)` — Materialized trending score (float for precision)
- `status PostStatus @default(PUBLISHED)` — Post visibility status (PUBLISHED, PENDING_REVIEW, REJECTED)
- `reports Report[] @relation("PostReports")` — Relationship to reports

Add new enum:

```prisma
enum PostStatus {
  PUBLISHED
  PENDING_REVIEW  // Soft-deleted: reported, pending admin review
  REJECTED        // Permanently deleted: admin rejected report
}

enum ReportReason {
  SPAM        // Duplicate, off-topic
  OFFENSIVE   // Inappropriate language
  COPYRIGHT   // IP violation
  OTHER       // Policy violation
}

enum ReportStatus {
  PENDING     // Awaiting admin review
  APPROVED    // Admin approved report
  REJECTED    // Admin rejected report (post remains published)
}
```

Add new Report model:

```prisma
model Report {
  id          String   @id @default(cuid())
  postId      String
  userId      String   // Reporter
  reason      ReportReason
  comment     String?  @db.Text
  status      ReportStatus @default(PENDING)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  post        Post     @relation("PostReports", fields: [postId], references: [id], onDelete: Cascade)
  reporter    User     @relation("ReportsSubmitted", fields: [userId], references: [id], onDelete: Cascade)

  adminAction AdminAction?

  @@unique([postId, userId])  // One report per user per post
  @@index([status])
  @@index([reason])
  @@index([createdAt])
  @@map("report")
}

model AdminAction {
  id          String   @id @default(cuid())
  reportId    String   @unique
  adminId     String
  action      String   // 'approve', 'reject'
  reason      String?  @db.Text
  createdAt   DateTime @default(now())

  report      Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
  admin       User     @relation("AdminActions", fields: [adminId], references: [id])

  @@index([createdAt])
  @@map("admin_action")
}
```

Update User model to add:

- `reports Report[] @relation("ReportsSubmitted")` — Reports submitted by user
- `adminActions AdminAction[] @relation("AdminActions")` — Admin moderation actions

Add database indexes:

- `@@index([trendingScore])` on Post for fast trending queries
- `@@index([status])` on Post for feed filtering (published vs pending/rejected)
- `@@index([createdAt])` on Post for time-based calculations

**Why:** Materialized trending_score column enables O(1) trending feed queries (single order by). PostStatus separates published from soft-deleted without cascading deletes. Report and AdminAction models provide audit trail and moderation workflow. Unique constraint on (postId, userId) prevents duplicate reports. Indexes optimize query performance.

**Follow conventions:** Use PascalCase for enum names, @db.Text for long text fields, @unique for constraints, @default(cuid()) for IDs, @@map for snake_case table names.
</action>
<verify>
<automated>cd apps/api && npx prisma validate</automated>
</verify>
<done>schema.prisma updated with PostStatus, ReportReason, ReportStatus enums; Report and AdminAction models created; Post extended with trendingScore, status, reports relation; User extended with reports and adminActions relations; all indexes defined; schema validates successfully</done>
</task>

<task type="auto">
  <name>Task 2: Create and apply Prisma migration for trending and reporting</name>
  <files>
    apps/api/prisma/migrations/[timestamp]_add_trending_reporting/migration.sql
  </files>
  <action>
Create migration:
```bash
cd apps/api
npx prisma migrate dev --name add_trending_reporting
```

The migration will auto-generate SQL from the updated schema. Verify the generated migration includes:

1. **Enum creation:**
   - CREATE TYPE "PostStatus" AS ENUM ('PUBLISHED', 'PENDING_REVIEW', 'REJECTED')
   - CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'OFFENSIVE', 'COPYRIGHT', 'OTHER')
   - CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED')

2. **Post table alterations:**
   - ALTER TABLE post ADD COLUMN "trendingScore" DOUBLE PRECISION NOT NULL DEFAULT 0
   - ALTER TABLE post ADD COLUMN "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED'
   - CREATE INDEX post_trendingScore_idx ON post("trendingScore")
   - CREATE INDEX post_status_idx ON post("status")
   - CREATE INDEX post_createdAt_idx ON post("createdAt")

3. **Report table creation:**
   - CREATE TABLE report (
     id TEXT PRIMARY KEY,
     postId TEXT NOT NULL,
     userId TEXT NOT NULL,
     reason "ReportReason" NOT NULL,
     comment TEXT,
     status "ReportStatus" NOT NULL DEFAULT 'PENDING',
     createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updatedAt TIMESTAMP NOT NULL,
     FOREIGN KEY (postId) REFERENCES post(id) ON DELETE CASCADE,
     FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE,
     UNIQUE (postId, userId)
     )
   - CREATE INDEX report_status_idx ON report("status")
   - CREATE INDEX report_reason_idx ON report("reason")
   - CREATE INDEX report_createdAt_idx ON report("createdAt")

4. **AdminAction table creation:**
   - CREATE TABLE admin_action (
     id TEXT PRIMARY KEY,
     reportId TEXT NOT NULL UNIQUE,
     adminId TEXT NOT NULL,
     action TEXT NOT NULL,
     reason TEXT,
     createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (reportId) REFERENCES report(id) ON DELETE CASCADE,
     FOREIGN KEY (adminId) REFERENCES user(id)
     )

5. **User table alterations:**
   - Add audit columns if not present

**Verify migration:** Run `npx prisma migrate status` to confirm applied successfully.

**Why:** Prisma migrations are atomic and reversible. The migration SQL must be reviewed before application to ensure no data loss. Enum types in PostgreSQL are type-safe. Indexes on trendingScore, status, and createdAt optimize query performance.
</action>
<verify>
<automated>cd apps/api && npx prisma migrate status && npx prisma validate</automated>
</verify>
<done>Migration created with SQL for PostStatus/ReportReason/ReportStatus enums, Report and AdminAction tables, Post table extensions; migration applied successfully via `prisma migrate dev`; Prisma client regenerated with new types</done>
</task>

<task type="auto">
  <name>Task 3: Extend Post entity and DTOs with status field</name>
  <files>
    apps/api/src/modules/posts/entities/post.entity.ts
    apps/api/src/modules/posts/dto/create-post.dto.ts
    apps/api/src/modules/posts/dto/update-post.dto.ts
  </files>
  <action>
**Update `apps/api/src/modules/posts/entities/post.entity.ts`:**
Add trendingScore and status to PostDetail entity:
```typescript
import { PostStatus } from '@/generated/prisma/client'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PostDetail {
@ApiProperty()
id: string

@ApiProperty()
title: string

@ApiProperty()
description: string

@ApiProperty()
views: number

@ApiProperty()
trendingScore: number // New field

@ApiProperty({ enum: PostStatus })
status: PostStatus // New field (default: PUBLISHED)

@ApiProperty()
createdAt: Date

@ApiProperty()
updatedAt: Date

// ... existing fields (author, tags, reactions, etc.)
}

````

**Update `apps/api/src/modules/posts/dto/create-post.dto.ts`:**
- No changes needed — status is auto-set to PUBLISHED on creation
- Trending score is auto-calculated by the scheduler
- Keep existing fields (title, description, tags, etc.)

**Update `apps/api/src/modules/posts/dto/update-post.dto.ts`:**
- No changes needed — status not editable by regular users
- Admin status changes handled in separate admin endpoint (Phase 3.3)

**Why:** Entity exports are used by API responses. PostStatus must be available in responses for frontend filtering. DTOs define API contracts; status/trendingScore are auto-managed (not user inputs).

**Conventions:** PascalCase class names, @ApiProperty decorators for Swagger, fields match Post model exactly.
  </action>
  <verify>
    <automated>cd apps/api && npm run build</automated>
  </verify>
  <done>PostDetail entity has trendingScore (float) and status (PostStatus enum) fields with @ApiProperty decorators; DTOs unchanged for create/update (status auto-managed); TypeScript compilation successful</done>
</task>

<task type="auto">
  <name>Task 4: Create trending service with score calculation and refresh logic</name>
  <files>
    apps/api/src/modules/trending/trending.service.ts
    apps/api/src/modules/trending/trending.module.ts
  </files>
  <action>
**Create `apps/api/src/modules/trending/trending.service.ts`:**

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { Post } from '@/generated/prisma/client'

@Injectable()
export class TrendingService {
  private readonly logger = new Logger(TrendingService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Refresh trending scores for all published posts.
   * Called every 5 minutes via scheduled task.
   *
   * Formula: score = (views * 0.3 + reactions * 0.7) * time_decay_factor
   * time_decay_factor = 1.0 - (hours_since_creation / 168)  (1 week half-life)
   */
  async refreshTrendingScores(): Promise<void> {
    this.logger.log('[TrendingService] Refreshing trending scores...')

    try {
      const posts = await this.prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
        },
        include: {
          reactions: { select: { id: true } },
          comments: { select: { id: true } },
        },
      })

      const now = Date.now()
      const scoreUpdates = posts.map((post) => {
        const hoursSinceCreation = (now - post.createdAt.getTime()) / (1000 * 60 * 60)
        const daysSinceCreation = hoursSinceCreation / 24

        // Time decay factor: 1.0 - (hours / 168) → half-life at 7 days
        // Prevents negative: cap at 0
        const timeDecayFactor = Math.max(1.0 - (hoursSinceCreation / 168), 0.1)

        // Reaction count is higher signal than views
        const reactionCount = post.reactions.length
        const commentCount = post.comments.length

        // Base score: (views * 0.3 + reactions * 0.7)
        const engagementScore = post.views * 0.3 + reactionCount * 0.7

        // Apply time decay
        const trendingScore = engagementScore * timeDecayFactor

        return this.prisma.post.update({
          where: { id: post.id },
          data: { trendingScore },
        })
      })

      await this.prisma.$transaction(scoreUpdates)
      this.logger.log(`[TrendingService] Refreshed scores for ${posts.length} posts`)
    } catch (error) {
      this.logger.error('[TrendingService] Error refreshing scores', error)
      throw error
    }
  }

  /**
   * Get trending posts with pagination.
   * Returns posts with highest trending scores, most recent first for ties.
   */
  async getTrendingPosts(limit: number = 20, page: number = 1): Promise<{
    posts: Post[]
    total: number
    page: number
    limit: number
  }> {
    const skip = (page - 1) * limit

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
        },
        orderBy: [
          { trendingScore: 'desc' },
          { createdAt: 'desc' }, // Secondary sort by recency
        ],
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true, email: true } },
          tags: { include: { tag: true } },
          reactions: { select: { id: true } },
          comments: { select: { id: true } },
        },
      }),
      this.prisma.post.count({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
        },
      }),
    ])

    return {
      posts,
      total,
      page,
      limit,
    }
  }

  /**
   * Calculate trending score for a single post.
   * Used for testing and debugging.
   */
  private calculateTrendingScore(
    post: Post,
    reactionCount: number,
    commentCount: number,
  ): number {
    const now = Date.now()
    const hoursSinceCreation = (now - post.createdAt.getTime()) / (1000 * 60 * 60)

    const timeDecayFactor = Math.max(1.0 - (hoursSinceCreation / 168), 0.1)
    const engagementScore = post.views * 0.3 + reactionCount * 0.7

    return engagementScore * timeDecayFactor
  }
}
````

**Create `apps/api/src/modules/trending/trending.module.ts`:**

```typescript
import { Module } from '@nestjs/common'
import { TrendingService } from './trending.service'

@Module({
  providers: [TrendingService],
  exports: [TrendingService],
})
export class TrendingModule {}
```

**Why:**

- Service layer encapsulates trending business logic (calculation, refresh, query)
- Materialized approach: scores recalculated every 5 minutes, then queries just sort
- Time decay formula prevents old posts from dominating (half-life = 7 days)
- Weights: views 0.3, reactions 0.7 (reactions = stronger signal)
- Transactional update prevents partial refreshes

**Conventions:**

- Logger for tracking scheduled job execution
- Dependency injection for PrismaService
- JSDoc comments on public methods
- Error handling with try/catch and logging
- Async/await with Promise.all for parallel queries
  </action>
  <verify>
  <automated>cd apps/api && npm run build</automated>
  </verify>
  <done>TrendingService created with refreshTrendingScores() and getTrendingPosts() methods; time-decay algorithm implemented (views 0.3 + reactions 0.7, decay factor 1.0 - hours/168); TrendingModule exports TrendingService; TypeScript compilation successful</done>
  </task>

<task type="auto">
  <name>Task 5: Create scheduled task to refresh trending scores every 5 minutes</name>
  <files>
    apps/api/src/modules/trending/trending.scheduler.ts
  </files>
  <action>
**Create `apps/api/src/modules/trending/trending.scheduler.ts`:**

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { TrendingService } from './trending.service'

@Injectable()
export class TrendingScheduler {
  private readonly logger = new Logger(TrendingScheduler.name)

  constructor(private readonly trendingService: TrendingService) {}

  /**
   * Refresh trending scores every 5 minutes.
   * Runs automatically when application starts.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleTrendingRefresh(): Promise<void> {
    try {
      await this.trendingService.refreshTrendingScores()
    } catch (error) {
      this.logger.error('[TrendingScheduler] Failed to refresh trending scores', error)
      // Don't re-throw: scheduler should continue running
    }
  }
}
```

**Update `apps/api/src/modules/trending/trending.module.ts` to include scheduler:**

```typescript
import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { TrendingService } from './trending.service'
import { TrendingScheduler } from './trending.scheduler'

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TrendingService, TrendingScheduler],
  exports: [TrendingService],
})
export class TrendingModule {}
```

**Update `apps/api/src/app.module.ts` to import TrendingModule:**

Add to imports array:

```typescript
import { TrendingModule } from '@/modules/trending/trending.module'

@Module({
  imports: [
    // ... existing imports
    TrendingModule, // Add here
  ],
})
export class AppModule {}
```

**Why:**

- @Cron decorator (from @nestjs/schedule) runs refreshTrendingScores every 5 minutes
- CronExpression.EVERY_5_MINUTES = '_/5 _ \* \* \*'
- Scheduler runs automatically after app boot, no manual trigger needed
- Error handling: log errors but don't throw (scheduler should be resilient)
- Materialized approach: refresh is fast (transactional batch update), queries stay <100ms

**Conventions:**

- Scheduler is separate from service (single responsibility)
- Logger tracks execution for monitoring
- @Cron is NestJS standard for scheduled tasks
  </action>
  <verify>
  <automated>cd apps/api && npm run build</automated>
  </verify>
  <done>TrendingScheduler created with @Cron(EVERY_5_MINUTES) handleTrendingRefresh method; TrendingModule imports ScheduleModule and exports providers; AppModule updated to import TrendingModule; TypeScript compilation successful</done>
  </task>

<task type="auto">
  <name>Task 6: Extend Posts controller with trending endpoint</name>
  <files>
    apps/api/src/modules/posts/posts.controller.ts
  </files>
  <action>
**Add to `apps/api/src/modules/posts/posts.controller.ts`:**

```typescript
import { Controller, Get, Query } from '@nestjs/common'
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { PostsService } from './posts.service'
import { TrendingService } from '@/modules/trending/trending.service'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { PostDetail } from './entities/post.entity'

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly trendingService: TrendingService,
  ) {}

  /**
   * Get trending posts with pagination.
   * Sorted by trending score (time-decay algorithm), then by recency.
   * Only returns published posts (status = PUBLISHED).
   */
  @Get('trending')
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (1-indexed)',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Results per page',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: {
          posts: [
            {
              id: 'post123',
              title: 'Linear Algebra Notes',
              trendingScore: 42.5,
              views: 150,
              createdAt: '2026-03-19T12:00:00Z',
            },
          ],
          total: 250,
          page: 1,
          limit: 20,
        },
      },
    },
  })
  async getTrendingPosts(@Query() paginationDto: PaginationDto): Promise<{
    success: boolean
    data: {
      posts: PostDetail[]
      total: number
      page: number
      limit: number
    }
  }> {
    const limit = paginationDto.limit || 20
    const page = paginationDto.page || 1

    const result = await this.trendingService.getTrendingPosts(limit, page)

    return {
      success: true,
      data: result,
    }
  }

  // ... existing endpoints (create, update, delete, etc.)
}
```

**Ensure TrendingService is injected in PostsController constructor** (above example shows this).

**Why:**

- GET /posts/trending is the public-facing API for trending feed
- Returns paginated results with metadata (total, page, limit)
- Only published posts included (soft-deleted excluded)
- Sorted by trendingScore DESC, then createdAt DESC
- Response follows existing pattern: { success, data }
- @ApiQuery/@ApiResponse decorators auto-generate Swagger docs

**Conventions:**

- Use PaginationDto for limit/page
- Query params are optional with defaults (page=1, limit=20)
- Response includes pagination metadata for frontend
- Error handling done in global HttpExceptionFilter (existing)
  </action>
  <verify>
  <automated>cd apps/api && npm run build</automated>
  </verify>
  <done>getTrendingPosts endpoint added to PostsController; GET /posts/trending returns paginated posts sorted by trendingScore DESC then createdAt DESC; @ApiQuery/@ApiResponse decorators for Swagger; TrendingService injected; TypeScript compilation successful</done>
  </task>

<task type="auto">
  <name>Task 7: Create reports module with service, controller, DTOs</name>
  <files>
    apps/api/src/modules/reports/reports.service.ts
    apps/api/src/modules/reports/reports.controller.ts
    apps/api/src/modules/reports/reports.module.ts
    apps/api/src/modules/reports/dto/create-report.dto.ts
    apps/api/src/modules/reports/dto/list-reports.dto.ts
    apps/api/src/modules/reports/entities/report.entity.ts
  </files>
  <action>
**Create `apps/api/src/modules/reports/dto/create-report.dto.ts`:**

```typescript
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ReportReason } from '@/generated/prisma/client'

export class CreateReportDto {
  @ApiProperty({ enum: ReportReason, description: 'Reason for report' })
  @IsEnum(ReportReason)
  reason: ReportReason

  @ApiPropertyOptional({ description: 'Optional context/details for the report' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string
}
```

**Create `apps/api/src/modules/reports/dto/list-reports.dto.ts`:**

```typescript
import { IsEnum, IsOptional, IsNumber, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { ReportReason, ReportStatus } from '@/generated/prisma/client'

export class ListReportsDto {
  @ApiPropertyOptional({ enum: ReportStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus

  @ApiPropertyOptional({ enum: ReportReason, description: 'Filter by reason' })
  @IsOptional()
  @IsEnum(ReportReason)
  reason?: ReportReason

  @ApiPropertyOptional({ type: Number, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number

  @ApiPropertyOptional({ type: Number, description: 'Results per page' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number
}
```

**Create `apps/api/src/modules/reports/entities/report.entity.ts`:**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ReportReason, ReportStatus } from '@/generated/prisma/client'

export class ReportDetail {
  @ApiProperty()
  id: string

  @ApiProperty()
  postId: string

  @ApiProperty()
  userId: string

  @ApiProperty({ enum: ReportReason })
  reason: ReportReason

  @ApiPropertyOptional()
  comment?: string

  @ApiProperty({ enum: ReportStatus })
  status: ReportStatus

  @ApiProperty()
  createdAt: Date

  @ApiPropertyOptional()
  adminAction?: {
    id: string
    action: string
    reason?: string
    createdAt: Date
  }
}
```

**Create `apps/api/src/modules/reports/reports.service.ts`:**

```typescript
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { PostsService } from '@/modules/posts/posts.service'
import { CreateReportDto } from './dto/create-report.dto'
import { ListReportsDto } from './dto/list-reports.dto'
import { Report } from '@/generated/prisma/client'

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService,
  ) {}

  /**
   * Submit a report for a post.
   * Only one report per user per post.
   * Soft-deletes post to status PENDING_REVIEW.
   */
  async createReport(postId: string, userId: string, dto: CreateReportDto): Promise<Report> {
    // Verify post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      throw new NotFoundException('Post not found')
    }

    // Check for duplicate report
    const existing = await this.prisma.report.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    })
    if (existing) {
      throw new BadRequestException('You have already reported this post')
    }

    // Create report
    const report = await this.prisma.report.create({
      data: {
        postId,
        userId,
        reason: dto.reason,
        comment: dto.comment,
        status: 'PENDING',
      },
    })

    // Soft-delete: mark post as PENDING_REVIEW
    await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'PENDING_REVIEW' },
    })

    this.logger.log(`[ReportsService] Report ${report.id} created for post ${postId}`)

    return report
  }

  /**
   * List reports with optional filters.
   * Admin-only access should be verified in controller.
   */
  async listReports(filters: ListReportsDto): Promise<{
    reports: Report[]
    total: number
    page: number
    limit: number
  }> {
    const limit = filters.limit || 20
    const page = filters.page || 1
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (filters.status) where.status = filters.status
    if (filters.reason) where.reason = filters.reason

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          adminAction: true,
          post: { select: { id: true, title: true, description: true } },
          reporter: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ])

    return { reports, total, page, limit }
  }

  /**
   * Approve a report: keep post PENDING_REVIEW (or REJECTED if approved = delete).
   * Update report status to APPROVED.
   * Create AdminAction audit entry.
   */
  async approveReport(reportId: string, adminId: string, reason?: string): Promise<Report> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { post: true },
    })

    if (!report) {
      throw new NotFoundException('Report not found')
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestException('Only pending reports can be approved')
    }

    // Update report and post in transaction
    const updated = await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'APPROVED' },
      }),
      this.prisma.post.update({
        where: { id: report.postId },
        data: { status: 'REJECTED' }, // Post is rejected/deleted
      }),
      this.prisma.adminAction.create({
        data: {
          reportId,
          adminId,
          action: 'approve',
          reason,
        },
      }),
    ])

    this.logger.log(`[ReportsService] Report ${reportId} approved by admin ${adminId}`)

    return updated[0] // Return updated report
  }

  /**
   * Reject a report: restore post to PUBLISHED.
   * Update report status to REJECTED.
   * Create AdminAction audit entry.
   */
  async rejectReport(reportId: string, adminId: string, reason?: string): Promise<Report> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { post: true },
    })

    if (!report) {
      throw new NotFoundException('Report not found')
    }

    if (report.status !== 'PENDING') {
      throw new BadRequestException('Only pending reports can be rejected')
    }

    // Update report and post in transaction
    const updated = await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data: { status: 'REJECTED' },
      }),
      this.prisma.post.update({
        where: { id: report.postId },
        data: { status: 'PUBLISHED' }, // Post restored
      }),
      this.prisma.adminAction.create({
        data: {
          reportId,
          adminId,
          action: 'reject',
          reason,
        },
      }),
    ])

    this.logger.log(`[ReportsService] Report ${reportId} rejected by admin ${adminId}`)

    return updated[0] // Return updated report
  }
}
```

**Create `apps/api/src/modules/reports/reports.controller.ts`:**

```typescript
import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common'
import { ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { OptionalAuth, RequireAuth } from '@thallesp/nestjs-better-auth'
import { Session } from 'better-auth/types'
import { ReportsService } from './reports.service'
import { CreateReportDto } from './dto/create-report.dto'
import { ListReportsDto } from './dto/list-reports.dto'
import { ReportDetail } from './entities/report.entity'

@ApiTags('reports')
@Controller('posts')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Submit a report for a post.
   * Requires authentication.
   */
  @Post(':id/report')
  @RequireAuth()
  @ApiResponse({
    status: 201,
    schema: {
      example: {
        success: true,
        data: {
          id: 'report123',
          postId: 'post456',
          userId: 'user789',
          reason: 'SPAM',
          status: 'PENDING',
          createdAt: '2026-03-19T12:00:00Z',
        },
      },
    },
  })
  async reportPost(
    @Param('id') postId: string,
    @Body() dto: CreateReportDto,
    @Session() session: Session,
  ): Promise<{ success: boolean; data: ReportDetail }> {
    const report = await this.reportsService.createReport(postId, session.user.id, dto)

    return {
      success: true,
      data: report as ReportDetail,
    }
  }
}

@ApiTags('admin')
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * List reports with filters.
   * Admin-only access.
   */
  @Get()
  @RequireAuth()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: {
          reports: [],
          total: 5,
          page: 1,
          limit: 20,
        },
      },
    },
  })
  async listReports(
    @Query() filters: ListReportsDto,
    @Session() session: Session,
  ): Promise<{ success: boolean; data: any }> {
    // TODO: Verify admin role (Phase 3.3)
    // if (session.user.role !== 'ADMIN') throw new ForbiddenException()

    const result = await this.reportsService.listReports(filters)

    return {
      success: true,
      data: result,
    }
  }

  /**
   * Approve a report.
   * Admin-only access.
   */
  @Patch(':id/approve')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: {
          id: 'report123',
          status: 'APPROVED',
        },
      },
    },
  })
  async approveReport(
    @Param('id') reportId: string,
    @Body() body: { reason?: string },
    @Session() session: Session,
  ): Promise<{ success: boolean; data: ReportDetail }> {
    // TODO: Verify admin role (Phase 3.3)
    const report = await this.reportsService.approveReport(reportId, session.user.id, body.reason)

    return {
      success: true,
      data: report as ReportDetail,
    }
  }

  /**
   * Reject a report.
   * Admin-only access.
   */
  @Patch(':id/reject')
  @RequireAuth()
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: {
          id: 'report123',
          status: 'REJECTED',
        },
      },
    },
  })
  async rejectReport(
    @Param('id') reportId: string,
    @Body() body: { reason?: string },
    @Session() session: Session,
  ): Promise<{ success: boolean; data: ReportDetail }> {
    // TODO: Verify admin role (Phase 3.3)
    const report = await this.reportsService.rejectReport(reportId, session.user.id, body.reason)

    return {
      success: true,
      data: report as ReportDetail,
    }
  }
}
```

**Create `apps/api/src/modules/reports/reports.module.ts`:**

```typescript
import { Module } from '@nestjs/common'
import { ReportsService } from './reports.service'
import { ReportsController, AdminReportsController } from './reports.controller'
import { PostsModule } from '@/modules/posts/posts.module'

@Module({
  imports: [PostsModule],
  controllers: [ReportsController, AdminReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
```

**Update `apps/api/src/app.module.ts` to import ReportsModule:**

Add to imports array:

```typescript
import { ReportsModule } from '@/modules/reports/reports.module'

@Module({
  imports: [
    // ... existing imports
    ReportsModule, // Add here
  ],
})
export class AppModule {}
```

**Why:**

- DTOs define API contract with validation (reason enum, optional comment)
- Service encapsulates reporting logic (create, list, approve, reject)
- ReportDetail entity is response type
- Two controllers: ReportsController (public: POST report), AdminReportsController (admin: GET/PATCH)
- Soft-delete on report approval: post.status = PENDING_REVIEW then REJECTED
- AdminAction creates audit trail: who approved, when, reason
- Transactional updates prevent inconsistency
- Phase 3.3 will add admin role verification

**Conventions:**

- Separate public and admin endpoints
- @RequireAuth() for authentication, TODO for admin role check
- Error handling: NotFoundException, BadRequestException, ForbiddenException
- Logger for audit trail
- Response follows { success, data } pattern
  </action>
  <verify>
  <automated>cd apps/api && npm run build</automated>
  </verify>
  <done>ReportsService with createReport, listReports, approveReport, rejectReport methods; ReportsController (POST /posts/:id/report) and AdminReportsController (GET/PATCH /admin/reports/\*); DTOs with validation; ReportDetail entity; ReportsModule created and imported in AppModule; TypeScript compilation successful</done>
  </task>

<task type="auto">
  <name>Task 8: Update Posts service to filter out soft-deleted posts from feed</name>
  <files>
    apps/api/src/modules/posts/posts.service.ts
  </files>
  <action>
**Update `apps/api/src/modules/posts/posts.service.ts`:**

In the `findAll()` or feed list method, add status filter to exclude soft-deleted posts:

```typescript
// Before (existing method):
async findAll(limit: number, page: number): Promise<{ posts: Post[], total: number }> {
  const skip = (page - 1) * limit

  const [posts, total] = await Promise.all([
    this.prisma.post.findMany({
      where: { deletedAt: null },  // Existing hard delete filter
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { /* ... */ }
    }),
    this.prisma.post.count({ where: { deletedAt: null } })
  ])

  return { posts, total }
}

// After (with soft delete filter):
async findAll(limit: number, page: number): Promise<{ posts: Post[], total: number }> {
  const skip = (page - 1) * limit

  const [posts, total] = await Promise.all([
    this.prisma.post.findMany({
      where: {
        deletedAt: null,                    // Hard delete filter (existing)
        status: 'PUBLISHED',                // NEW: soft delete filter
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { /* ... */ }
    }),
    this.prisma.post.count({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
      }
    })
  ])

  return { posts, total }
}
```

**Check ALL methods that query posts:**

- `findAll()` — Feed listing (exclude PENDING_REVIEW, REJECTED)
- `findById()` — Detail view (include PENDING_REVIEW/REJECTED for admin, not for regular users)
- `searchPosts()` — Search (exclude soft-deleted)
- `findPostsByTag()` — Tag filter (exclude soft-deleted)
- `findByDepartment()` — Department view (exclude soft-deleted)
- `getFollowingPosts()` — Following feed (exclude soft-deleted)

**For detail view, add logic:**

```typescript
async findById(id: string, userId?: string): Promise<Post> {
  const post = await this.prisma.post.findUnique({
    where: { id },
    include: { /* ... */ }
  })

  if (!post) throw new NotFoundException('Post not found')

  // If post is soft-deleted and user is not admin/author, throw 404
  if (post.status !== 'PUBLISHED') {
    const isAuthor = userId && post.authorId === userId
    const isAdmin = false // TODO: check admin role in Phase 3.3

    if (!isAuthor && !isAdmin) {
      throw new NotFoundException('Post not found')
    }
  }

  return post
}
```

**Why:**

- Feed and search should not show PENDING_REVIEW posts (soft-deleted pending admin review)
- Detail view can show to author (to see why reported) or admin (to review)
- Regular users see 404, not "post is hidden"
- Prevents users from seeing what they can't access

**Conventions:**

- where clause filters at database level (efficient)
- Check status early before returning
- Separate public vs authorized responses
  </action>
  <verify>
  <automated>cd apps/api && npm run build && npm run test</automated>
  </verify>
  <done>Posts service findAll, findById, searchPosts, findPostsByTag, findByDepartment, getFollowingPosts methods updated to filter by status = 'PUBLISHED'; soft-deleted posts excluded from feed/search; detail view shows to author/admin only; TypeScript compilation and existing tests successful</done>
  </task>

<task type="auto">
  <name>Task 9: Create frontend components for feed sort and post reporting</name>
  <files>
    apps/web/components/FeedSortDropdown.tsx
    apps/web/components/ReportDialog.tsx
    apps/web/hooks/useFeedSort.ts
    apps/web/hooks/useReportPost.ts
  </files>
  <action>
**Create `apps/web/components/FeedSortDropdown.tsx`:**

```typescript
'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FeedSortDropdownProps {
  onChange: (sort: 'recent' | 'trending') => void
  defaultSort?: 'recent' | 'trending'
}

export function FeedSortDropdown({ onChange, defaultSort = 'recent' }: FeedSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<'recent' | 'trending'>(defaultSort)

  const handleSelect = (sort: 'recent' | 'trending') => {
    setSelected(sort)
    onChange(sort)
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-sm font-medium"
      >
        {selected === 'recent' ? 'Recent' : 'Trending'}
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[140px]">
          <button
            onClick={() => handleSelect('recent')}
            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
              selected === 'recent' ? 'bg-gray-50 font-semibold' : ''
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => handleSelect('trending')}
            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 border-t border-gray-200 ${
              selected === 'trending' ? 'bg-gray-50 font-semibold' : ''
            }`}
          >
            Trending
          </button>
        </div>
      )}
    </div>
  )
}
```

**Create `apps/web/components/ReportDialog.tsx`:**

```typescript
'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { useReportPost } from '@/hooks/useReportPost'

interface ReportDialogProps {
  postId: string
  onSuccess?: () => void
}

type ReportReason = 'SPAM' | 'OFFENSIVE' | 'COPYRIGHT' | 'OTHER'

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'SPAM', label: 'Spam', description: 'Duplicate or off-topic' },
  { value: 'OFFENSIVE', label: 'Offensive', description: 'Inappropriate language' },
  { value: 'COPYRIGHT', label: 'Copyright', description: 'IP violation' },
  { value: 'OTHER', label: 'Other', description: 'Other policy violation' },
]

export function ReportDialog({ postId, onSuccess }: ReportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [comment, setComment] = useState('')
  const { mutate: reportPost, isPending } = useReportPost()

  const handleSubmit = () => {
    if (!selectedReason) return

    reportPost(
      { postId, reason: selectedReason, comment: comment || undefined },
      {
        onSuccess: () => {
          setIsOpen(false)
          setSelectedReason(null)
          setComment('')
          onSuccess?.()
        },
      },
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-2 py-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
        title="Report this post"
      >
        <Flag size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Report Post</h2>

            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium">Reason</label>
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={() => setSelectedReason(reason.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{reason.label}</div>
                    <div className="text-sm text-gray-600">{reason.description}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mb-6">
              <label htmlFor="comment" className="block text-sm font-medium mb-2">
                Additional details (optional)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Provide context for your report..."
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                rows={3}
              />
              <div className="text-xs text-gray-500 mt-1">{comment.length}/500</div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedReason || isPending}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300"
              >
                {isPending ? 'Submitting...' : 'Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

**Create `apps/web/hooks/useFeedSort.ts`:**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

type SortType = 'recent' | 'trending'

interface UseFeedSortOptions {
  initialSort?: SortType
  limit?: number
}

export function useFeedSort({ initialSort = 'recent', limit = 20 }: UseFeedSortOptions = {}) {
  const [sort, setSort] = useState<SortType>(initialSort)
  const [page, setPage] = useState(1)

  const endpoint = sort === 'trending' ? '/posts/trending' : '/posts'

  const { data, isLoading, error } = useQuery({
    queryKey: ['feed', sort, page],
    queryFn: async () => {
      const response = await fetch(`/api${endpoint}?page=${page}&limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch posts')
      return response.json()
    },
    staleTime: 30000, // 30 seconds
  })

  const handleSortChange = useCallback((newSort: SortType) => {
    setSort(newSort)
    setPage(1) // Reset to first page on sort change
  }, [])

  return {
    posts: data?.data?.posts || [],
    total: data?.data?.total || 0,
    page,
    setPage,
    sort,
    setSortType: handleSortChange,
    isLoading,
    error,
  }
}
```

**Create `apps/web/hooks/useReportPost.ts`:**

```typescript
'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

interface ReportPostPayload {
  postId: string
  reason: 'SPAM' | 'OFFENSIVE' | 'COPYRIGHT' | 'OTHER'
  comment?: string
}

export function useReportPost() {
  return useMutation({
    mutationFn: async (payload: ReportPostPayload) => {
      const response = await fetch(`/api/posts/${payload.postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: payload.reason,
          comment: payload.comment,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to report post')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Post reported. Thank you for helping keep Unishare safe.')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to report post')
    },
  })
}
```

**Why:**

- FeedSortDropdown is a reusable dropdown component (fits Design System)
- ReportDialog is modal with reason selection, optional comment
- useFeedSort hook manages feed state (sort, page, loading, data)
- useReportPost mutation handles POST to /posts/:id/report
- All components use TanStack Query for server state
- Error handling via toast notifications
- Accessible HTML: radio buttons, textarea, proper ARIA labels

**Conventions:**

- 'use client' directive for client components
- PascalCase component names
- Interface for props
- Hooks use camelCase
- Tailwind CSS for styling
- Sonner for toast notifications
  </action>
  <verify>
  <automated>cd apps/web && npm run build</automated>
  </verify>
  <done>FeedSortDropdown component with Recent/Trending toggle; ReportDialog modal with reason selection and comment field; useFeedSort hook for managing feed data and pagination; useReportPost hook for submitting reports via POST /posts/:id/report; all components TypeScript-typed, use TanStack Query, styled with Tailwind; Next.js build successful</done>
  </task>

<task type="auto">
  <name>Task 10: Write E2E tests for trending and reporting endpoints</name>
  <files>
    apps/api/test/trending.e2e-spec.ts
    apps/api/test/reports.e2e-spec.ts
  </files>
  <action>
**Create `apps/api/test/trending.e2e-spec.ts`:**

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { TrendingService } from '../src/modules/trending/trending.service'

describe('Trending Feed (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let trendingService: TrendingService

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    prisma = moduleFixture.get<PrismaService>(PrismaService)
    trendingService = moduleFixture.get<TrendingService>(TrendingService)

    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    // Clear existing posts
    await prisma.post.deleteMany({})
  })

  describe('GET /posts/trending', () => {
    it('should return empty list when no posts exist', async () => {
      const response = await request(app.getHttpServer()).get('/posts/trending').expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          posts: [],
          total: 0,
          page: 1,
          limit: 20,
        },
      })
    })

    it('should return published posts sorted by trending score', async () => {
      // Create test user
      const user = await prisma.user.create({
        data: {
          id: 'test-user-1',
          email: 'test@example.com',
          name: 'Test User',
          department: { create: { name: 'CS' } },
        },
      })

      // Create posts with different engagement
      const post1 = await prisma.post.create({
        data: {
          title: 'Popular Post',
          description: 'High engagement',
          authorId: user.id,
          departmentId: user.departmentId || '',
          views: 100,
          status: 'PUBLISHED',
          trendingScore: 50, // Higher score
        },
      })

      const post2 = await prisma.post.create({
        data: {
          title: 'Less Popular Post',
          description: 'Low engagement',
          authorId: user.id,
          departmentId: user.departmentId || '',
          views: 10,
          status: 'PUBLISHED',
          trendingScore: 10, // Lower score
        },
      })

      // Refresh trending scores
      await trendingService.refreshTrendingScores()

      const response = await request(app.getHttpServer()).get('/posts/trending').expect(200)

      expect(response.body.data.posts).toHaveLength(2)
      expect(response.body.data.posts[0].id).toBe(post1.id)
      expect(response.body.data.posts[1].id).toBe(post2.id)
      expect(response.body.data.total).toBe(2)
    })

    it('should exclude soft-deleted posts', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-user-2',
          email: 'test2@example.com',
          name: 'Test User 2',
          department: { create: { name: 'CS' } },
        },
      })

      // Create published post
      const post1 = await prisma.post.create({
        data: {
          title: 'Published Post',
          description: 'Visible',
          authorId: user.id,
          departmentId: user.departmentId || '',
          status: 'PUBLISHED',
        },
      })

      // Create soft-deleted post
      const post2 = await prisma.post.create({
        data: {
          title: 'Reported Post',
          description: 'Pending review',
          authorId: user.id,
          departmentId: user.departmentId || '',
          status: 'PENDING_REVIEW',
        },
      })

      const response = await request(app.getHttpServer()).get('/posts/trending').expect(200)

      expect(response.body.data.posts).toHaveLength(1)
      expect(response.body.data.posts[0].id).toBe(post1.id)
    })

    it('should support pagination', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-user-3',
          email: 'test3@example.com',
          name: 'Test User 3',
          department: { create: { name: 'CS' } },
        },
      })

      // Create 25 posts
      for (let i = 0; i < 25; i++) {
        await prisma.post.create({
          data: {
            title: `Post ${i}`,
            description: `Description ${i}`,
            authorId: user.id,
            departmentId: user.departmentId || '',
            status: 'PUBLISHED',
            trendingScore: 25 - i, // Reverse order for consistent sorting
          },
        })
      }

      // Page 1
      const page1 = await request(app.getHttpServer())
        .get('/posts/trending?page=1&limit=20')
        .expect(200)

      expect(page1.body.data.posts).toHaveLength(20)
      expect(page1.body.data.total).toBe(25)
      expect(page1.body.data.page).toBe(1)

      // Page 2
      const page2 = await request(app.getHttpServer())
        .get('/posts/trending?page=2&limit=20')
        .expect(200)

      expect(page2.body.data.posts).toHaveLength(5)
      expect(page2.body.data.page).toBe(2)
    })
  })

  describe('Trending Score Calculation', () => {
    it('should calculate scores with time decay', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-user-4',
          email: 'test4@example.com',
          name: 'Test User 4',
          department: { create: { name: 'CS' } },
        },
      })

      // Create new post (minimal decay)
      const newPost = await prisma.post.create({
        data: {
          title: 'New Post',
          description: 'Just created',
          authorId: user.id,
          departmentId: user.departmentId || '',
          views: 50,
          status: 'PUBLISHED',
        },
      })

      // Add reactions
      for (let i = 0; i < 5; i++) {
        await prisma.reaction.create({
          data: {
            postId: newPost.id,
            userId: user.id,
            type: 'HELPFUL',
          },
        })
      }

      await trendingService.refreshTrendingScores()

      const updated = await prisma.post.findUnique({ where: { id: newPost.id } })

      // Score should be: (50 * 0.3 + 5 * 0.7) * timeDecay ≈ 18.5 * 0.9 ≈ 16.65
      expect(updated?.trendingScore).toBeGreaterThan(15)
      expect(updated?.trendingScore).toBeLessThan(20)
    })
  })
})
```

**Create `apps/api/test/reports.e2e-spec.ts`:**

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'

describe('Content Reporting (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let authToken: string
  let adminToken: string
  let userId: string
  let adminId: string
  let postId: string

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    prisma = moduleFixture.get<PrismaService>(PrismaService)

    await app.init()

    // Create test users
    const dept = await prisma.department.create({ data: { name: 'Test Dept' } })

    const user = await prisma.user.create({
      data: {
        id: 'user-reporter',
        email: 'reporter@example.com',
        name: 'Reporter User',
        departmentId: dept.id,
      },
    })
    userId = user.id

    const admin = await prisma.user.create({
      data: {
        id: 'user-admin',
        email: 'admin@example.com',
        name: 'Admin User',
        departmentId: dept.id,
      },
    })
    adminId = admin.id

    // Create test post
    const post = await prisma.post.create({
      data: {
        title: 'Test Post',
        description: 'Test content',
        authorId: user.id,
        departmentId: dept.id,
        status: 'PUBLISHED',
      },
    })
    postId = post.id

    // TODO: Mock authentication tokens (Phase 3.3)
    // authToken = await mockAuthToken(userId)
    // adminToken = await mockAuthToken(adminId)
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /posts/:id/report', () => {
    it('should create a report for a post', async () => {
      // Note: This test requires auth token mocking (Phase 3.3)
      const response = await request(app.getHttpServer())
        .post(`/posts/${postId}/report`)
        .send({
          reason: 'SPAM',
          comment: 'Duplicate of another post',
        })
        // .set('Authorization', `Bearer ${authToken}`)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBeDefined()
      expect(response.body.data.status).toBe('PENDING')
      expect(response.body.data.reason).toBe('SPAM')
    })

    it('should prevent duplicate reports from same user', async () => {
      // First report succeeds
      await request(app.getHttpServer()).post(`/posts/${postId}/report`).send({ reason: 'SPAM' })
      // .set('Authorization', `Bearer ${authToken}`)

      // Second report from same user fails
      const response = await request(app.getHttpServer())
        .post(`/posts/${postId}/report`)
        .send({ reason: 'OFFENSIVE' })
        // .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      expect(response.body.message).toContain('already reported')
    })

    it('should soft-delete post on report', async () => {
      const response = await request(app.getHttpServer())
        .post(`/posts/${postId}/report`)
        .send({ reason: 'SPAM' })
        // .set('Authorization', `Bearer ${authToken}`)
        .expect(201)

      const post = await prisma.post.findUnique({ where: { id: postId } })
      expect(post?.status).toBe('PENDING_REVIEW')
    })

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post(`/posts/${postId}/report`)
        .send({ reason: 'SPAM' })
        .expect(401)
    })
  })

  describe('GET /admin/reports', () => {
    it('should list pending reports', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/reports?status=PENDING')
        // .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.reports).toBeInstanceOf(Array)
      expect(response.body.data.total).toBeGreaterThanOrEqual(0)
    })

    it('should filter reports by reason', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/reports?reason=SPAM')
        // .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.reports.every((r: any) => r.reason === 'SPAM')).toBe(true)
    })

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/reports?page=1&limit=10')
        // .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.limit).toBe(10)
      expect(response.body.data.page).toBe(1)
    })

    it('should require admin access', async () => {
      const response = await request(app.getHttpServer()).get('/admin/reports').expect(401) // Not authenticated
    })
  })

  describe('PATCH /admin/reports/:id/approve', () => {
    let reportId: string

    beforeEach(async () => {
      // Create a new report
      const report = await prisma.report.create({
        data: {
          postId,
          userId,
          reason: 'OFFENSIVE',
        },
      })
      reportId = report.id
    })

    it('should approve a report', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/reports/${reportId}/approve`)
        .send({ reason: 'Content violates policy' })
        // .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe('APPROVED')
    })

    it('should update post status to REJECTED on approval', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/reports/${reportId}/approve`)
        .send({ reason: 'Confirmed violation' })
      // .set('Authorization', `Bearer ${adminToken}`)

      const post = await prisma.post.findUnique({ where: { id: postId } })
      expect(post?.status).toBe('REJECTED')
    })

    it('should create audit trail', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/reports/${reportId}/approve`)
        .send({ reason: 'Admin notes' })
      // .set('Authorization', `Bearer ${adminToken}`)

      const action = await prisma.adminAction.findUnique({
        where: { reportId },
      })

      expect(action?.action).toBe('approve')
      expect(action?.adminId).toBe(adminId)
      expect(action?.reason).toBe('Admin notes')
    })
  })

  describe('PATCH /admin/reports/:id/reject', () => {
    let reportId: string

    beforeEach(async () => {
      const report = await prisma.report.create({
        data: {
          postId,
          userId,
          reason: 'COPYRIGHT',
        },
      })
      reportId = report.id
    })

    it('should reject a report', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/reports/${reportId}/reject`)
        .send({ reason: 'No violation found' })
        // .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body.data.status).toBe('REJECTED')
    })

    it('should restore post to PUBLISHED on rejection', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/reports/${reportId}/reject`)
        .send({ reason: 'False report' })
      // .set('Authorization', `Bearer ${adminToken}`)

      const post = await prisma.post.findUnique({ where: { id: postId } })
      expect(post?.status).toBe('PUBLISHED')
    })
  })
})
```

**Why:**

- E2E tests verify HTTP endpoints work correctly (request → response)
- Test happy path (create report, list, approve/reject)
- Test edge cases (duplicate reports, soft-delete, pagination)
- Test authorization (require auth, admin-only endpoints)
- TODO comments for auth token mocking (Phase 3.3 will add Better Auth support)
- Tests create isolated data (beforeEach setup/teardown)
- Assert both response format and side effects (database changes)

**Conventions:**

- Use supertest for HTTP calls
- describe blocks organize tests by feature
- beforeAll/afterAll for app setup/teardown
- beforeEach for per-test setup
- expect() for assertions
- Comments indicate Phase 3.3 work
  </action>
  <verify>
  <automated>cd apps/api && npm run test:e2e</automated>
  </verify>
  <done>trending.e2e-spec.ts with tests for GET /posts/trending, pagination, soft-delete filtering, score calculation; reports.e2e-spec.ts with tests for POST /posts/:id/report, GET /admin/reports, PATCH approve/reject, audit trail; all tests use supertest and Prisma for database operations; E2E suite runs successfully</done>
  </task>

<task type="auto">
  <name>Task 11: Verify integration and run full test suite</name>
  <files>
    apps/api/src/app.module.ts
  </files>
  <action>
**Verify TrendingModule and ReportsModule are imported in AppModule:**

Check `apps/api/src/app.module.ts` contains:

```typescript
import { TrendingModule } from '@/modules/trending/trending.module'
import { ReportsModule } from '@/modules/reports/reports.module'

@Module({
  imports: [
    ConfigModule.forRoot(/* ... */),
    DatabaseModule,
    // ... other modules
    TrendingModule, // Already added in Task 5
    ReportsModule, // Already added in Task 7
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

**Run full test suite:**

```bash
# Build the API
cd apps/api
npm run build

# Run all unit tests
npm run test

# Run all E2E tests
npm run test:e2e

# Check code coverage
npm run test:cov
```

**Verify no regressions:**

```bash
# Run existing tests to ensure Phase 1-2 features still work
npm run test -- --testPathPattern="(app|posts|tags|search)"
```

**Generate Swagger documentation:**

```bash
# API will start at http://localhost:3000/api/docs (if running)
# Swagger schema includes new endpoints:
# - GET /posts/trending
# - POST /posts/:id/report
# - GET /admin/reports
# - PATCH /admin/reports/:id/approve
# - PATCH /admin/reports/:id/reject
```

**Why:**

- AppModule must import all feature modules for them to be registered
- Build ensures TypeScript compilation succeeds
- Unit tests verify business logic
- E2E tests verify HTTP contracts
- Regression tests confirm no breaking changes
- Swagger docs generated from @ApiProperty/@ApiResponse decorators

**Conventions:**

- All tests must pass before proceeding to Phase 3.3
- Coverage report shows gaps for Phase 3.3 testing phase
- Swagger docs are auto-generated (no manual updates needed)
  </action>
  <verify>
  <automated>cd apps/api && npm run build && npm run test:e2e 2>&1 | head -50</automated>
  </verify>
  <done>AppModule imports TrendingModule and ReportsModule; npm run build succeeds with zero TypeScript errors; npm run test:e2e passes (all trending and reporting tests pass); no Phase 1-2 regression detected; Swagger docs include new endpoints with proper decorators</done>
  </task>

<task type="auto">
  <name>Task 12: Update Feed component to use trending and reporting features</name>
  <files>
    apps/web/app/(app)/page.tsx
  </files>
  <action>
**Update main feed page `apps/web/app/(app)/page.tsx` to integrate sort dropdown and report dialog:**

Find or create the Feed component section and update it:

```typescript
'use client'

import { useAuth } from '@/contexts/auth-context'
import { FeedSortDropdown } from '@/components/FeedSortDropdown'
import { ReportDialog } from '@/components/ReportDialog'
import { useFeedSort } from '@/hooks/useFeedSort'
import { PostCard } from '@/components/PostCard'
import { Pagination } from '@/components/Pagination'
import { Loader } from 'lucide-react'

export default function FeedPage() {
  const { session } = useAuth()
  const { posts, total, page, setPage, sort, setSortType, isLoading, error } = useFeedSort()

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        Failed to load feed. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Feed Header with Sort */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feed</h1>
        <FeedSortDropdown onChange={setSortType} defaultSort={sort} />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center p-8">
          <Loader className="animate-spin" size={24} />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && posts.length === 0 && (
        <div className="text-center p-8 text-gray-600">
          No posts found. Be the first to share!
        </div>
      )}

      {/* Posts List */}
      {!isLoading && posts.length > 0 && (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="relative">
                <PostCard post={post} />

                {/* Report Button (only if authenticated) */}
                {session && (
                  <div className="absolute top-2 right-2">
                    <ReportDialog
                      postId={post.id}
                      onSuccess={() => {
                        // Optional: Show success toast
                        // refetch posts to update UI
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > 0 && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / 20)}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Metadata */}
      {!isLoading && posts.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {posts.length} of {total} posts
          {sort === 'trending' && ' (sorted by trending)'}
        </div>
      )}
    </div>
  )
}
```

**Verify the following components/hooks already exist or are newly created:**

- `@/components/PostCard` — Displays individual post (should already exist from Phase 1)
- `@/components/Pagination` — Pagination controls (should already exist)
- `@/contexts/auth-context` — Auth context (should already exist)
- `@/components/FeedSortDropdown` — NEW from Task 9
- `@/components/ReportDialog` — NEW from Task 9
- `@/hooks/useFeedSort` — NEW from Task 9

**If PostCard doesn't already have report button, add it:**

```typescript
// In PostCard component (apps/web/components/PostCard.tsx):
export function PostCard({ post, onReport }: PostCardProps) {
  return (
    <div className="card p-4 space-y-3">
      {/* Post content */}
      <h3 className="text-lg font-semibold">{post.title}</h3>
      <p className="text-gray-600">{post.description}</p>

      {/* Post metadata and actions */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>{post.views} views</div>
        <div className="flex gap-2">
          {/* Existing actions (like, bookmark, etc) */}
          {/* Add report dialog here */}
        </div>
      </div>
    </div>
  )
}
```

**Why:**

- FeedSortDropdown appears prominently in header for sort selection
- ReportDialog integrated directly into post card for easy access
- useFeedSort hook manages all feed state (sort, pagination, loading)
- Pagination controls allow browsing multiple pages
- Empty state and error state provide good UX
- Report button only shown to authenticated users (session check)
- Metadata shows current sort and pagination info

**Conventions:**

- Page component uses 'use client' for client-side rendering
- Hooks manage server state (TanStack Query)
- Components are composable (sort, posts, pagination)
- Accessibility: proper headings, alt text, semantic HTML
- Tailwind CSS classes for styling
  </action>
  <verify>
  <automated>cd apps/web && npm run build</automated>
  </verify>
  <done>Feed page updated to display FeedSortDropdown for Recent/Trending toggle; ReportDialog integrated into post cards for authenticated users; useFeedSort hook manages pagination and data fetching; empty state and loading states implemented; Next.js build successful with no errors</done>
  </task>

</tasks>

<verification>
## Verification Checklist

**Phase 3.2 Completion Criteria:**

- [ ] Database schema updated with `trendingScore`, `status`, `Report`, `AdminAction` models
- [ ] Prisma migration applied successfully
- [ ] TrendingService calculates scores (views _ 0.3 + reactions _ 0.7 \* time_decay)
- [ ] TrendingScheduler refreshes scores every 5 minutes
- [ ] GET /posts/trending endpoint returns paginated trending posts
- [ ] ReportsService creates, lists, approves, rejects reports
- [ ] POST /posts/:id/report creates report and soft-deletes post
- [ ] GET /admin/reports lists reports with filters (status, reason, pagination)
- [ ] PATCH /admin/reports/:id/approve approves and creates audit trail
- [ ] PATCH /admin/reports/:id/reject rejects and restores post
- [ ] Feed soft-deletes posts (status PENDING_REVIEW) from feed queries
- [ ] FeedSortDropdown component toggles between Recent/Trending
- [ ] ReportDialog component submits reports with reason and optional comment
- [ ] useFeedSort hook manages feed state and pagination
- [ ] useReportPost hook submits POST to /posts/:id/report
- [ ] E2E tests for trending algorithm, endpoint, pagination
- [ ] E2E tests for report creation, listing, approval, audit trail
- [ ] No Phase 1-2 regressions (existing tests pass)
- [ ] TypeScript compilation successful (zero errors)
- [ ] ESLint passes (zero errors/warnings)
- [ ] Swagger docs include new endpoints and DTOs

**Manual Verification Steps:**

1. **Trending Algorithm:**
   - POST /posts (create test post with 100 views)
   - Call TrendingService.refreshTrendingScores()
   - GET /posts/trending → post appears with trendingScore > 0
   - Create 5 reactions on post
   - Refresh scores again → trendingScore increases

2. **Reporting Workflow:**
   - GET /posts/[id] → post visible (status = PUBLISHED)
   - POST /posts/:id/report with reason=SPAM
   - GET /posts/[id] → returns 404 (soft-deleted to PENDING_REVIEW)
   - GET /posts (feed) → post hidden
   - PATCH /admin/reports/:id/approve
   - GET /admin/reports → report status = APPROVED
   - GET /posts/[id] → still 404 (status = REJECTED)
   - Check AdminAction table → audit entry exists

3. **Frontend Integration:**
   - Load feed page
   - Click FeedSortDropdown → select "Trending"
   - Feed re-fetches and shows trending posts
   - Click report icon on post
   - ReportDialog opens with reason selection
   - Select reason, add comment, click "Report"
   - Toast shows success message
   - Post disappears from feed

4. **Admin Dashboard (Phase 3.3):**
   - Navigate to /admin/reports (protected)
   - See list of pending reports
   - Filter by status/reason
   - Click approve/reject
   - See updated status and admin action history

</verification>

<success_criteria>

## Phase 3.2 Success Criteria

**✅ Trending Feed Functional:**

- Students can see Posts sorted by trending algorithm (engagement + time decay)
- Feed has working "Recent" and "Trending" sort toggle
- Trending queries execute in <100ms
- Trending scores refresh every 5 minutes (automated, no user interaction)

**✅ Reporting System Complete:**

- Users can report posts with reason (spam, offensive, copyright, other) and optional comment
- Reported posts are immediately hidden from feed (soft-delete to PENDING_REVIEW)
- One report per user per post (duplicates rejected)
- Unique constraint enforced at database level

**✅ Admin Reporting Dashboard (Backend Ready):**

- GET /admin/reports lists all reports with post previews
- Filters by status (pending, approved, rejected) and reason
- Pagination support (page, limit)
- Admin can approve/reject reports
- Approve marks post as REJECTED and hides permanently
- Reject marks post as PUBLISHED and restores visibility
- Audit trail created for every admin action (who, when, reason)

**✅ Database & API Complete:**

- Prisma migration applied with PostStatus enum, Report/AdminAction models
- All 5 new API endpoints functional and documented in Swagger
- Post model extended with trendingScore, status fields
- Indexes on trendingScore, status, createdAt for query performance

**✅ Frontend Components Created:**

- FeedSortDropdown: Recent/Trending toggle dropdown
- ReportDialog: Modal with reason selection, comment field, submit button
- useFeedSort: Hook managing feed data, pagination, sort state
- useReportPost: Hook for POST /posts/:id/report with error handling

**✅ E2E Tests Written:**

- Trending: GET /posts/trending returns posts sorted by score, pagination works, soft-deleted excluded
- Reporting: POST /posts/:id/report creates report and soft-deletes, GET /admin/reports lists, PATCH approve/reject works
- Audit trail: AdminAction created with correct admin/action/reason/timestamp

**✅ No Phase 1-2 Regressions:**

- All existing tests pass
- Posts table extended (backward compatible)
- Feed queries filtered by status (excludes soft-deleted)
- Search, tagging, reactions, comments all unaffected

**✅ Performance Targets Met:**

- Trending queries: <100ms (via index on trendingScore)
- Report creation: <500ms (single insert + post update)
- Admin dashboard: <2s (with pagination limits)

**Phase 3.2 Ready for Deployment** when:

1. All 12 tasks completed and verified
2. All E2E tests passing
3. No TypeScript/ESLint errors
4. Trending algorithm produces correct scores
5. Soft-delete logic hides reported posts
6. Admin endpoints return correct data structures
7. Audit trails created for all admin actions
8. Phase 1-2 features unaffected
   </success_criteria>

<output>
After successful execution, create `.planning/phases/04-trending-reporting/04-SUMMARY.md` documenting:

1. **Execution Summary** — All tasks completed with commit hashes
2. **What Was Built** — Backend (trending, reporting, audit), Frontend (sort, dialog, hooks), Tests
3. **Performance Metrics** — Trending score calculation time, trending query latency, report submission latency
4. **Database Schema** — PostStatus enum, Report/AdminAction models, indexes
5. **API Endpoints** — All 5 new endpoints with response examples
6. **Frontend Components** — 4 new components with usage examples
7. **Hooks** — useFeedSort, useReportPost with behavior
8. **Deviations from Plan** — Any changes made during execution
9. **Known Limitations** — Admin role verification deferred to Phase 3.3, appeal workflow deferred to Phase 4
10. **Regression Testing** — Phase 1-2 features verified
11. **Deployment Checklist** — Migration, build, test, Swagger docs status
12. **Next Phase (3.3) Prerequisites** — E2E tests, performance optimization, admin dashboard UI, deployment documentation

**File to create:** `.planning/phases/04-trending-reporting/04-SUMMARY.md`
</output>
