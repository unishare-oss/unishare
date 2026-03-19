---
phase: 3-1-search-tagging
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - apps/api/src/modules/tags/tags.module.ts
  - apps/api/src/modules/tags/tags.service.ts
  - apps/api/src/modules/tags/tags.controller.ts
  - apps/api/src/modules/tags/dto/create-tag.dto.ts
  - apps/api/src/modules/tags/dto/tag.dto.ts
  - apps/api/src/modules/posts/posts.service.ts
  - apps/api/src/modules/posts/posts.controller.ts
  - apps/api/src/modules/posts/dto/create-post.dto.ts
  - apps/api/src/modules/posts/dto/update-post.dto.ts
  - apps/api/src/app.module.ts
  - apps/api/test/search.e2e-spec.ts
  - apps/api/test/tags.e2e-spec.ts
  - apps/api/src/modules/tags/tags.service.spec.ts
  - apps/web/app/components/SearchBox.tsx
  - apps/web/app/components/SearchResults.tsx
  - apps/web/app/components/TagInput.tsx
  - apps/web/app/components/TagFilter.tsx
  - apps/web/app/hooks/useSearch.ts
  - apps/web/app/hooks/useTags.ts
  - openapi.json
  - .github/workflows/ci.yml
autonomous: true
requirements:
  - AUTH-01
  - SEARCH-01
  - SEARCH-02
  - TAG-01
  - TAG-02

must_haves:
  truths:
    - 'Users can type a search query and see matching posts ranked by relevance'
    - 'Search queries complete in <100ms on typical datasets'
    - 'Users can add tags to posts during creation and editing'
    - 'Posts display associated tags on feed and detail views'
    - 'Users can filter feed by selecting one or more tags'
    - 'Tag autocomplete suggests existing tags by frequency'
    - 'Search is case-insensitive and handles special characters gracefully'
    - 'Empty search shows all posts (no filter applied)'
    - 'Phase 1-2 features remain fully functional (no regression)'
  artifacts:
    - path: prisma/schema.prisma
      provides: Tag and PostTag models with proper relationships and indexes
      min_lines: 20
    - path: apps/api/src/modules/tags/tags.service.ts
      provides: Tag CRUD operations and autocomplete logic
      min_lines: 80
    - path: apps/api/src/modules/posts/posts.service.ts
      provides: Search functionality using PostgreSQL FTS
      exports: ['searchPosts', 'tagPost', 'createPost']
    - path: apps/api/src/modules/tags/tags.controller.ts
      provides: REST endpoints for tag operations
      exports: ['GET /tags/autocomplete', 'POST /posts/:id/tags', 'DELETE /posts/:id/tags/:tagId']
    - path: apps/web/app/components/SearchBox.tsx
      provides: Search input with debouncing and result display
      min_lines: 50
    - path: apps/web/app/components/TagInput.tsx
      provides: Multi-select tag input with autocomplete
      min_lines: 80
    - path: apps/api/test/search.e2e-spec.ts
      provides: End-to-end tests for search functionality
      exports: ['User can search for post by title', 'Search returns results in order of relevance']
    - path: apps/api/test/tags.e2e-spec.ts
      provides: End-to-end tests for tagging functionality
      exports: ['User can add tags to post', 'User can filter posts by tag']
  key_links:
    - from: apps/api/src/modules/posts/posts.service.ts
      to: prisma/schema.prisma
      via: Prisma ORM $queryRaw for FTS
      pattern: this.prisma.\$queryRaw.*search_vector.*plainto_tsquery
    - from: apps/web/app/components/SearchBox.tsx
      to: apps/api/src/modules/posts/posts.controller.ts
      via: fetch('/api/posts/search')
      pattern: fetch.*api/posts/search
    - from: apps/web/app/components/TagInput.tsx
      to: apps/api/src/modules/tags/tags.controller.ts
      via: fetch('/api/tags/autocomplete')
      pattern: fetch.*api/tags/autocomplete
    - from: apps/api/src/modules/tags/tags.service.ts
      to: prisma/schema.prisma
      via: Prisma Tag and PostTag models
      pattern: this.prisma.tag\.(findMany|upsert|create)
    - from: apps/api/src/app.module.ts
      to: apps/api/src/modules/tags/tags.module.ts
      via: TagsModule import
      pattern: import.*TagsModule
---

<objective>
**Phase 3.1: Full-Text Search & Tagging Foundation**

This phase enables students to discover posts through search and tagging, laying the foundation for content discoverability at scale.

**What We Deliver:**

1. PostgreSQL full-text search (FTS) with tsvector and GIN indexing
2. Search API endpoint (GET /posts/search) with relevance ranking
3. Search UI with input, debouncing, and result pagination
4. Tag data model (tags table + post_tag junction)
5. Tag CRUD API endpoints and autocomplete
6. Tag input component with multi-select and autocomplete
7. Tag filtering on feed UI
8. Unit and E2E tests covering all functionality
9. Updated Swagger OpenAPI documentation
10. No regression in Phase 1-2 features

**Why This Matters:**
Students need to find relevant content without scrolling infinitely. Search + tagging transform Unishare from a course-scoped browser into a discoverable knowledge platform. This phase is foundational for Phase 3.2 (trending) and Phase 3.3 (reporting).

**Success Metrics:**

- Search query latency <100ms (P95)
- 100% of E2E search test scenarios passing
- 100% of E2E tag test scenarios passing
- Zero regression in Phase 1-2 test suite
- Tag autocomplete returns suggestions within <30ms
  </objective>

<execution_context>
@~/.copilot/get-shit-done/workflows/execute-plan.md
@~/.copilot/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/3-1-search-tagging/3-1-CONTEXT.md
@.planning/research/SEARCH_SOLUTIONS.md
@.planning/research/TAGGING_PATTERNS.md
@.planning/research/IMPLEMENTATION_GUIDE.md
@.planning/codebase/STRUCTURE.md
@.planning/codebase/CONVENTIONS.md
@.planning/codebase/TESTING.md

**Key Interfaces from Existing Codebase:**

From `apps/api/src/modules/posts/entities/post.entity.ts`:

```typescript
export class Post {
  id: string
  title: string
  description: string
  authorId: string
  courseId: string
  type: PostType
  status: PostStatus
  views: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}
```

From `apps/api/src/common/dto/pagination.dto.ts`:

```typescript
export class PaginationDto {
  page: number = 1
  limit: number = 20
}
```

From API conventions:

- Controllers use `@Controller()`, `@Get()`, `@Post()`, `@Delete()` decorators
- Services inject PrismaService for data access
- DTOs use class-validator decorators with @ApiProperty
- Responses follow standard structure: `{ success: boolean, data: T, message?: string }`
- Error handling via NestJS HTTP exceptions caught by global HttpExceptionFilter
  </context>

<tasks>

<task type="auto">
  <name>Task 1: Create Tagging Data Model (Prisma Schema + Migration)</name>
  <files>
    prisma/schema.prisma
  </files>
  <action>
    Add two new models to the Prisma schema to support tagging:

    1. **Tag model:**
       - `id`: String with @id @default(cuid())
       - `name`: String with @unique (case-insensitive index)
       - `slug`: String with @unique (generated from name: lowercase, replace spaces with hyphens, remove special chars)
       - `color`: String with @default("#3B82F6")
       - `createdAt`: DateTime with @default(now())
       - Relation: `posts` with PostTag[]
       - Indexes: @index on slug for fast lookups

    2. **PostTag junction model (many-to-many):**
       - `postId`: String (FK to Post.id with onDelete: Cascade)
       - `tagId`: String (FK to Tag.id with onDelete: Cascade)
       - Composite primary key: @id([postId, tagId])
       - Indexes: @index([tagId]) for "all posts with tag" queries
       - Relations: post and tag with proper back-references

    3. **Extend Post model:**
       - Add `tags`: PostTag[] relation
       - Add `searchVector`: Unsupported("tsvector")? for PostgreSQL FTS (marked optional with ?)

    4. **Add custom SQL for tsvector generation:**
       - Create a SQL migration that adds a generated column for full-text search:
         ```sql
         ALTER TABLE post ADD COLUMN search_vector tsvector
           GENERATED ALWAYS AS (
             setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
             setweight(to_tsvector('english', coalesce(description, '')), 'B')
           ) STORED;
         CREATE INDEX post_search_vector_idx ON post USING gin(search_vector);
         ```
       - Place this migration file as `prisma/migrations/{timestamp}_add_search_tagging/migration.sql`

    **Key Implementation Details:**
    - Tags table slug is unique to prevent duplicates
    - PostTag uses composite primary key to prevent duplicate tag assignments
    - Indexes positioned for performance: slug for tag lookups, tagId for "posts with tag X"
    - Color field optional for future frontend badge styling
    - Use Prisma's built-in CUID generator for IDs (matches existing patterns)

    **Validation:**
    - Schema compiles without errors
    - Migration file is syntactically correct SQL
    - Relations are properly defined (no missing back-references)
    - Indexes are created in migration SQL

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && pnpm prisma generate && pnpm prisma migrate status && echo "✓ Prisma schema valid" || echo "✗ Schema has errors"</automated>
  </verify>
  <done>
    Prisma schema includes Tag and PostTag models with proper indexes. Migration file exists with tsvector column and GIN index. `pnpm prisma generate` succeeds without errors. Post model has searchVector and tags fields properly defined.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement Tags Service (CRUD + Autocomplete)</name>
  <files>
    apps/api/src/modules/tags/tags.service.ts
    apps/api/src/modules/tags/tags.service.spec.ts
    apps/api/src/modules/tags/dto/create-tag.dto.ts
    apps/api/src/modules/tags/dto/tag.dto.ts
  </files>
  <action>
    Create a comprehensive TagsService with full CRUD and discovery operations:

    **File: `apps/api/src/modules/tags/dto/create-tag.dto.ts`**
    ```typescript
    import { IsString, MinLength, MaxLength, Matches } from 'class-validator'
    import { ApiProperty } from '@nestjs/swagger'

    export class CreateTagDto {
      @ApiProperty({ example: 'Linear Algebra' })
      @IsString()
      @MinLength(2)
      @MaxLength(50)
      @Matches(/^[a-z0-9\s\-&()]{2,50}$/i, {
        message: 'Tag must contain only letters, numbers, spaces, hyphens, ampersand, and parentheses'
      })
      name: string

      @ApiProperty({ required: false, example: '#3B82F6' })
      @IsString()
      color?: string
    }
    ```

    **File: `apps/api/src/modules/tags/dto/tag.dto.ts`**
    ```typescript
    import { Expose } from 'class-transformer'
    import { ApiProperty } from '@nestjs/swagger'

    export class TagDto {
      @ApiProperty()
      @Expose()
      id: string

      @ApiProperty()
      @Expose()
      name: string

      @ApiProperty()
      @Expose()
      slug: string

      @ApiProperty()
      @Expose()
      color: string

      @ApiProperty()
      @Expose()
      createdAt: Date

      @ApiProperty({ required: false })
      @Expose({ name: '_count' })
      postCount?: number
    }
    ```

    **File: `apps/api/src/modules/tags/tags.service.ts`**
    Create service with these methods:

    1. **`findOrCreate(name: string, color?: string): Promise<Tag>`**
       - Generate slug: lowercase, trim, replace spaces with hyphens, remove non-alphanumeric chars
       - Use Prisma upsert with where: { slug } to prevent duplicates
       - Return created or existing tag

    2. **`findBySlug(slug: string): Promise<Tag | null>`**
       - Query by unique slug
       - Include post count in response (using _count)

    3. **`autocomplete(query: string, limit: number = 10): Promise<Tag[]>`**
       - Filter tags where name starts with query (case-insensitive)
       - Order by post count descending (trending tags first)
       - Include post count in response
       - Limit to 10 results by default

    4. **`getTrendingTags(limit: number = 10): Promise<Tag[]>`**
       - Return tags ordered by post count descending
       - Include post count via _count
       - Limit to 10 results

    5. **`getTagStats(): Promise<{ total: number, mostUsed: Tag[], recentlyAdded: Tag[] }>`**
       - Return total tag count
       - Return top 5 most-used tags
       - Return 5 most recently created tags

    6. **`validateTag(name: string): boolean`**
       - Check name matches regex: /^[a-z0-9\s\-&()]{2,50}$/i
       - Return true if valid

    **Implementation Guidelines:**
    - Use Prisma constructor injection (private readonly prisma: PrismaService)
    - All methods return Promise<T> with explicit type annotations
    - Use include: { _count: { select: { posts: true } } } for post counts
    - Order by clause for autocomplete: { posts: { _count: 'desc' } }
    - No try/catch in service; let global filter handle exceptions
    - Follow naming conventions: camelCase methods, no underscore prefixes

    **File: `apps/api/src/modules/tags/tags.service.spec.ts`**
    Create unit tests with NestJS TestingModule:
    - Test findOrCreate creates new tag with correct slug
    - Test findOrCreate returns existing tag on duplicate
    - Test autocomplete returns tags matching prefix
    - Test autocomplete orders by post count (trending first)
    - Test validateTag rejects invalid names
    - Test getTrendingTags orders by post count

    Mock PrismaService using jest.fn() for tests.

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && pnpm test -- apps/api/src/modules/tags/tags.service.spec.ts --passWithNoTests 2>&1 | grep -E "(PASS|FAIL|✓|✗)"</automated>
  </verify>
  <done>
    TagsService class created with all CRUD and autocomplete methods. DTOs created with proper validation decorators. Unit tests exist and pass (or config allows no tests). All methods have explicit return type annotations. Service follows project conventions (no semicolons, single quotes, 100-char print width).
  </done>
</task>

<task type="auto">
  <name>Task 3: Implement Tags Controller (REST API Endpoints)</name>
  <files>
    apps/api/src/modules/tags/tags.controller.ts
  </files>
  <action>
    Create a NestJS controller exposing tag operations with proper HTTP methods and status codes:

    **File: `apps/api/src/modules/tags/tags.controller.ts`**

    Create controller with these endpoints:

    1. **`GET /tags/autocomplete?q=<query>`**
       - Inject TagsService via constructor
       - Query parameter: `q` (string, required, min length 1)
       - Call service.autocomplete(q, 10)
       - Return: `{ success: true, data: Tag[] }`
       - Status: 200

    2. **`GET /tags/trending`**
       - Call service.getTrendingTags(10)
       - Return: `{ success: true, data: Tag[] }`
       - Status: 200

    3. **`POST /posts/:id/tags`**
       - Path parameter: `id` (post id)
       - Body: `{ tags: string[] }` (array of tag names)
       - Inject PostsService to fetch post and validate ownership (if needed)
       - Call postsService.tagPost(id, dto.tags)
       - Return: `{ success: true, data: Post }`
       - Status: 200
       - Decorators: `@Post('posts/:id/tags')`
       - Note: Tag operations auto-create tags if they don't exist

    4. **`DELETE /posts/:id/tags/:tagId`**
       - Path parameters: `id` (post id), `tagId` (tag id)
       - Remove tag from post via Prisma postTag.delete()
       - Return: `{ success: true }`
       - Status: 200

    5. **`GET /tags/stats`** (admin)
       - Call service.getTagStats()
       - Return: `{ success: true, data: { total, mostUsed, recentlyAdded } }`
       - Status: 200

    **Implementation Details:**
    - Use `@Controller('tags')` class decorator
    - Use `@Get()`, `@Post()`, `@Delete()` method decorators
    - Use `@Query()`, `@Param()`, `@Body()` parameter decorators
    - All endpoints follow response pattern: `{ success: true, data: T, message?: string }`
    - Use API response DTOs (DTO.ts files) for Swagger documentation
    - Add `@ApiProperty()` decorators to DTOs for OpenAPI spec
    - Endpoints NOT requiring auth: autocomplete, trending, get tags by slug
    - Endpoints requiring auth: POST/DELETE (modifying operations)
    - No semicolons, single quotes, 100-char line width per conventions

    **Swagger Decorators:**
    - `@ApiResponse({ status: 200, description: '...', type: TagDto })` on each endpoint
    - `@ApiQuery()` for query parameters
    - `@ApiParam()` for path parameters

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && grep -n "GET.*autocomplete\|POST.*tags\|DELETE.*tags" apps/api/src/modules/tags/tags.controller.ts && echo "✓ Endpoints defined" || echo "✗ Missing endpoints"</automated>
  </verify>
  <done>
    TagsController created with all required endpoints (autocomplete, trending, tag post, untag post, stats). All endpoints return standard response format. Swagger decorators present for API documentation. No errors on controller import.
  </done>
</task>

<task type="auto">
  <name>Task 4: Create Tags Module and Register in App Module</name>
  <files>
    apps/api/src/modules/tags/tags.module.ts
    apps/api/src/app.module.ts
  </files>
  <action>
    Create a NestJS module for tags feature:

    **File: `apps/api/src/modules/tags/tags.module.ts`**
    ```typescript
    import { Module } from '@nestjs/common'
    import { PrismaService } from '@/prisma/prisma.service'
    import { TagsController } from './tags.controller'
    import { TagsService } from './tags.service'

    @Module({
      controllers: [TagsController],
      providers: [TagsService, PrismaService],
      exports: [TagsService],
    })
    export class TagsModule {}
    ```

    **Update: `apps/api/src/app.module.ts`**
    - Add `TagsModule` to imports array in AppModule
    - Import statement: `import { TagsModule } from '@/modules/tags/tags.module'`
    - Placement: after existing modules, before global features

    **Key Details:**
    - Module exports TagsService so PostsModule can inject it
    - Providers include both TagsService and PrismaService
    - Controllers array includes TagsController
    - Follow existing module pattern in codebase

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && grep -c "TagsModule" apps/api/src/app.module.ts && echo "✓ TagsModule registered" || echo "✗ Not registered"</automated>
  </verify>
  <done>
    TagsModule created with proper structure. AppModule imports TagsModule. Module exports TagsService for other modules to use. API starts without errors (verify via build or test).
  </done>
</task>

<task type="auto">
  <name>Task 5: Extend Posts Service for Search and Tagging</name>
  <files>
    apps/api/src/modules/posts/posts.service.ts
  </files>
  <action>
    Add search and tagging methods to existing PostsService:

    **Add these methods to PostsService:**

    1. **`searchPosts(query: string, limit: number = 20, page: number = 1): Promise<{ results: Post[], total: number, page: number, limit: number }>`**
       - Escape query string (remove special PostgreSQL characters)
       - Use Prisma raw query with plainto_tsquery for full-text search:
         ```typescript
         const results = await this.prisma.$queryRaw`
           SELECT
             p.*,
             ts_rank(p.search_vector, plainto_tsquery('english', ${query})) as relevance
           FROM post p
           WHERE p.search_vector @@ plainto_tsquery('english', ${query})
             AND p.status = 'APPROVED'
             AND p.deleted_at IS NULL
           ORDER BY relevance DESC, p.created_at DESC
           LIMIT ${limit}
           OFFSET ${(page - 1) * limit}
         `
         ```
       - Also query total count for pagination
       - Return paginated results with total count
       - If query is empty, return empty results (don't default to all posts)

    2. **`tagPost(postId: string, tagNames: string[]): Promise<Post>`**
       - Validate post exists, throw NotFoundException if not
       - For each tag name: call tagsService.findOrCreate(name)
       - Use Prisma transaction to:
         a. Delete existing postTag entries for this post
         b. Create new postTag entries for all tags
       - Include tags in response: `include: { tags: { include: { tag: true } } }`
       - Return updated post with tags

    3. **`untagPost(postId: string, tagId: string): Promise<void>`**
       - Delete PostTag record with where: { postId_tagId: { postId, tagId } }
       - Throw BadRequestException if not found

    4. **`findPostsByTag(tagSlug: string, limit: number = 20, page: number = 1): Promise<{ results: Post[], total: number }>`**
       - Query posts where tags.some({ tag: { slug: tagSlug } })
       - Filter by status = 'APPROVED' and deletedAt = null
       - Order by createdAt descending
       - Include tags in results
       - Return paginated results

    5. **`findPostsByMultipleTags(tagSlugs: string[], limit: number = 20): Promise<Post[]>`**
       - Return posts that have ALL specified tags (AND logic)
       - Use AND clause in where: { AND: tagSlugs.map(slug => ...) }

    **Key Implementation Details:**
    - Import TagsService: `private readonly tagsService: TagsService`
    - Use Prisma.$transaction() for multi-step operations (delete + create)
    - searchPosts handles empty query by returning empty results
    - All methods include proper type annotations
    - Error handling: throw NotFoundException for missing posts, BadRequestException for invalid operations
    - No try/catch; let global filter handle exceptions
    - Query escaping: use Prisma parameterized queries (\${...}) to prevent injection

    **Modification to existing createPost and updatePost methods:**
    - If these methods exist, extend them to accept optional tags parameter
    - After creating/updating post, call tagPost(postId, tags) if tags provided
    - Return post with tags included

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && grep -E "searchPosts|tagPost|findPostsByTag" apps/api/src/modules/posts/posts.service.ts && echo "✓ Search/tag methods exist" || echo "✗ Methods missing"</automated>
  </verify>
  <done>
    PostsService includes searchPosts, tagPost, untagPost, and findPostsByTag methods. All methods have explicit return types. Search uses plainto_tsquery with tsvector. Tagging uses Prisma transactions. All methods properly handle pagination and filtering.
  </done>
</task>

<task type="auto">
  <name>Task 6: Extend Posts Controller for Search and Tagging Endpoints</name>
  <files>
    apps/api/src/modules/posts/posts.controller.ts
  </files>
  <action>
    Add search and tagging endpoints to existing PostsController:

    **Add these endpoints:**

    1. **`GET /posts/search?q=<query>&page=1&limit=20`**
       - Query parameters: `q` (string), `page` (number), `limit` (number)
       - Call postsService.searchPosts(q, limit, page)
       - Return: `{ success: true, data: { results, total, page, limit } }`
       - Status: 200
       - No auth required

    2. **`GET /posts?tags=<slug1>,<slug2>&page=1&limit=20`** (extend existing)
       - Add optional query parameter: `tags` (comma-separated slugs)
       - If tags provided, filter by tags
       - Call postsService.findPostsByMultipleTags(slugs.split(','))
       - Return standard paginated response
       - Combine with existing filtering (department, course)

    3. **`POST /posts/:id/tags`** (tag a post)
       - Path parameter: `id` (post id)
       - Body: `{ tags: string[] }` (array of tag names)
       - Require authentication
       - Validate user owns the post (optional: allow admins to tag any post)
       - Call postsService.tagPost(id, dto.tags)
       - Return: `{ success: true, data: Post }`
       - Status: 200

    4. **`DELETE /posts/:id/tags/:tagId`** (remove tag from post)
       - Path parameters: `id`, `tagId`
       - Require authentication
       - Validate user owns the post
       - Call postsService.untagPost(id, tagId)
       - Return: `{ success: true }`
       - Status: 200

    **Implementation Details:**
    - Use `@Get('search')` decorator for search endpoint
    - Use `@Query()` decorators for pagination and filter params
    - Use `@Param()` for path parameters
    - Use `@Body()` for request body
    - Add `@Session()` decorator for authenticated endpoints
    - Use `@OptionalAuth()` for endpoints that work with or without auth
    - Swagger decorators: `@ApiQuery()`, `@ApiResponse()` with status codes
    - Response format: `{ success: true, data: T }`
    - Status codes: 200 for success, 400 for bad request, 401 for auth, 404 for not found

    **Swagger Documentation:**
    ```typescript
    @Get('search')
    @ApiQuery({ name: 'q', required: true, type: String })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
    @ApiResponse({ status: 200, description: 'Search results' })
    search(@Query('q') q: string, @Query('page') page?: number, @Query('limit') limit?: number)
    ```

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && grep -E "GET.*search|POST.*tags|DELETE.*tags" apps/api/src/modules/posts/posts.controller.ts && echo "✓ Endpoints defined" || echo "✗ Missing endpoints"</automated>
  </verify>
  <done>
    PostsController includes search endpoint (GET /posts/search). Tag endpoints present (POST/DELETE /posts/:id/tags). All endpoints have proper decorators and documentation. Controller compiles without errors.
  </done>
</task>

<task type="auto">
  <name>Task 7: Update DTOs for Posts (Add Tags Field)</name>
  <files>
    apps/api/src/modules/posts/dto/create-post.dto.ts
    apps/api/src/modules/posts/dto/update-post.dto.ts
  </files>
  <action>
    Extend Post DTOs to include tags:

    **File: `apps/api/src/modules/posts/dto/create-post.dto.ts`**
    - Add field: `tags?: string[]` (optional, array of tag names)
    - Decorator: `@IsOptional() @IsArray() @ArrayMinSize(0) @ArrayMaxSize(5)`
    - Rationale: Allow users to add tags during post creation
    - Message: "Maximum 5 tags per post"

    **File: `apps/api/src/modules/posts/dto/update-post.dto.ts`**
    - Add field: `tags?: string[]` (optional)
    - Same decorators as create DTO
    - Rationale: Allow users to edit tags when editing post

    **Implementation:**
    - Use class-validator decorators: `@IsOptional()`, `@IsArray()`, `@ArrayMinSize()`, `@ArrayMaxSize()`
    - Add `@ApiPropertyOptional()` for Swagger documentation
    - Example value: `["Linear Algebra", "Calculus"]`
    - Keep existing fields unchanged
    - No semicolons, follow 100-char line width

    **Example:**
    ```typescript
    @ApiPropertyOptional({
      type: [String],
      example: ['Linear Algebra', 'Calculus'],
    })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(0)
    @ArrayMaxSize(5)
    tags?: string[]
    ```

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && grep -c "tags" apps/api/src/modules/posts/dto/create-post.dto.ts && echo "✓ Tags field added" || echo "✗ Field missing"</automated>
  </verify>
  <done>
    CreatePostDto and UpdatePostDto include optional tags field. Decorators properly constrain array length and values. Swagger documentation includes tags parameter. DTOs compile without errors.
  </done>
</task>

<task type="auto">
  <name>Task 8: Create Search and Tags E2E Tests</name>
  <files>
    apps/api/test/search.e2e-spec.ts
    apps/api/test/tags.e2e-spec.ts
  </files>
  <action>
    Create comprehensive E2E tests for search and tagging functionality:

    **File: `apps/api/test/search.e2e-spec.ts`**

    Use NestJS testing utilities with Supertest. Test structure:
    ```typescript
    import { Test, TestingModule } from '@nestjs/testing'
    import { INestApplication } from '@nestjs/common'
    import request from 'supertest'
    import { AppModule } from '@/app.module'

    describe('Search (e2e)', () => {
      let app: INestApplication
      let moduleFixture: TestingModule

      beforeAll(async () => {
        moduleFixture = await Test.createTestingModule({
          imports: [AppModule],
        }).compile()
        app = moduleFixture.createNestApplication()
        await app.init()
      })

      afterAll(async () => {
        await app.close()
      })

      it('GET /posts/search should return 200 with empty query', async () => {
        const response = await request(app.getHttpServer())
          .get('/posts/search')
          .query({ q: '' })
          .expect(200)

        expect(response.body).toHaveProperty('success', true)
        expect(response.body.data).toEqual([])
      })

      it('GET /posts/search should find post by title', async () => {
        // Create a test post with title containing "algebra"
        // Then search for "algebra" and verify post appears
        // Verify response includes: results, total, page, limit
        // Verify results ordered by relevance
      })

      it('GET /posts/search should find post by description', async () => {
        // Similar to above but search description
      })

      it('GET /posts/search should handle pagination', async () => {
        // Create multiple posts
        // Search with page=1, limit=5
        // Verify correct page of results
      })

      it('GET /posts/search should be case-insensitive', async () => {
        // Search for "Linear" should match "linear algebra"
      })

      it('GET /posts/search should handle special characters gracefully', async () => {
        // Search for "C++" or "C#" should not error
      })

      it('GET /posts/search should execute in <100ms', async () => {
        // Measure query time
        // Verify latency < 100ms
      })
    })
    ```

    **File: `apps/api/test/tags.e2e-spec.ts`**

    Similar structure with tests for:
    - `GET /tags/autocomplete?q=<query>` — Returns matching tags
    - `GET /tags/trending` — Returns tags ordered by post count
    - `POST /posts/:id/tags` — Adds tags to post
    - `DELETE /posts/:id/tags/:tagId` — Removes tag from post
    - `GET /posts?tags=<slug1>,<slug2>` — Filters posts by tags
    - Tag validation (invalid characters rejected)
    - Autocomplete returns trending tags first

    **Key Test Patterns:**
    - Use request(app.getHttpServer()).get/post/delete for HTTP methods
    - Use .query() for query parameters, .send() for body
    - Use .expect(statusCode) for assertions
    - Verify response shape: `{ success, data, message }`
    - For timing tests, use performance.now() before/after
    - Create fixtures in beforeEach (test data cleanup)

    **What to Test:**
    1. Happy path: create post, add tags, search finds it
    2. Edge cases: empty search, special chars, pagination
    3. Error cases: missing post, invalid tag name, duplicate tags
    4. Performance: search latency, autocomplete speed
    5. Ordering: relevance ranking, trending order

    **Do NOT test:**
    - Internal service logic (covered by unit tests)
    - Prisma directly (ORM is tested upstream)
    - Authentication (if already tested elsewhere)

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && pnpm test:e2e -- search.e2e-spec.ts --passWithNoTests 2>&1 | head -5</automated>
  </verify>
  <done>
    E2E test files created for search and tags. Tests cover happy path, edge cases, and error scenarios. Tests use NestJS TestingModule and Supertest. Performance tests verify latency targets. Test files execute without errors (even if tests are skipped).
  </done>
</task>

<task type="auto">
  <name>Task 9: Create Frontend Search Components (SearchBox + SearchResults)</name>
  <files>
    apps/web/app/components/SearchBox.tsx
    apps/web/app/components/SearchResults.tsx
    apps/web/app/hooks/useSearch.ts
  </files>
  <action>
    Build search UI components for frontend:

    **File: `apps/web/app/hooks/useSearch.ts`**

    Create custom hook for search state and API calls:
    ```typescript
    'use client'

    import { useState, useCallback, useRef, useEffect } from 'react'
    import { useQuery } from '@tanstack/react-query'

    interface SearchResult {
      results: Post[]
      total: number
      page: number
      limit: number
    }

    export function useSearch() {
      const [query, setQuery] = useState('')
      const [page, setPage] = useState(1)
      const debouncedQueryRef = useRef<NodeJS.Timeout>()
      const [debouncedQuery, setDebouncedQuery] = useState('')

      useEffect(() => {
        clearTimeout(debouncedQueryRef.current)
        debouncedQueryRef.current = setTimeout(() => {
          setDebouncedQuery(query)
          setPage(1)
        }, 300) // 300ms debounce

        return () => clearTimeout(debouncedQueryRef.current)
      }, [query])

      const { data, isLoading, error } = useQuery({
        queryKey: ['search', debouncedQuery, page],
        queryFn: async () => {
          if (!debouncedQuery.trim()) return { results: [], total: 0, page: 1, limit: 20 }
          const res = await fetch(\`/api/posts/search?q=\${encodeURIComponent(debouncedQuery)}&page=\${page}&limit=20\`)
          if (!res.ok) throw new Error('Search failed')
          return res.json()
        },
        enabled: debouncedQuery.trim().length > 0,
      })

      return {
        query,
        setQuery,
        debouncedQuery,
        page,
        setPage,
        results: data?.data?.results || [],
        total: data?.data?.total || 0,
        isLoading,
        error,
      }
    }
    ```

    **File: `apps/web/app/components/SearchBox.tsx`**

    Create input component with debouncing:
    ```typescript
    'use client'

    import { Input } from '@/components/ui/input'
    import { useSearch } from '@/hooks/useSearch'
    import { SearchResults } from './SearchResults'

    export function SearchBox() {
      const { query, setQuery, debouncedQuery, results, isLoading, error } = useSearch()

      return (
        <div className="w-full">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search posts by title or description..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-4"
            />
            {/* Search icon */}
          </div>

          {/* Show loading state */}
          {isLoading && debouncedQuery && (
            <div className="mt-2 text-sm text-gray-500">Searching...</div>
          )}

          {/* Show error */}
          {error && (
            <div className="mt-2 text-sm text-red-500">Search failed. Try again.</div>
          )}

          {/* Show results */}
          {debouncedQuery && !isLoading && (
            <SearchResults results={results} total={results.length} />
          )}
        </div>
      )
    }
    ```

    **File: `apps/web/app/components/SearchResults.tsx`**

    Display paginated search results:
    ```typescript
    'use client'

    import { Post } from '@/generated/api'
    import { PostCard } from './PostCard'

    interface SearchResultsProps {
      results: Post[]
      total: number
    }

    export function SearchResults({ results, total }: SearchResultsProps) {
      if (results.length === 0) {
        return <div className="py-8 text-center text-gray-500">No posts found</div>
      }

      return (
        <div className="mt-4 space-y-4">
          <div className="text-sm text-gray-600">{total} results found</div>
          {results.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )
    }
    ```

    **Implementation Details:**
    - Use 'use client' directive (client component)
    - TanStack Query for caching and state management
    - 300ms debounce delay for input (prevents excessive API calls)
    - Empty query returns empty results (no default "show all")
    - Loading state while fetching
    - Error state for API failures
    - Results display in component or modal
    - Style with Tailwind CSS (match existing design)
    - No semicolons, single quotes per conventions

    **Integration Points:**
    - Hook useSearch() encapsulates search logic
    - SearchBox controls input and passes state to SearchResults
    - SearchResults displays paginated list
    - Components integrate into existing feed (or modal overlay)

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && grep -l "useSearch\|SearchBox\|SearchResults" apps/web/app/components/*.tsx apps/web/app/hooks/*.ts 2>/dev/null | wc -l && echo "✓ Components created"</automated>
  </verify>
  <done>
    SearchBox component created with debounced input and API integration. SearchResults component displays paginated results. useSearch hook handles state and data fetching via TanStack Query. All components follow React/Next.js conventions (functional, hooks-based, 'use client' directives).
  </done>
</task>

<task type="auto">
  <name>Task 10: Create Frontend Tag Components (TagInput + TagFilter)</name>
  <files>
    apps/web/app/components/TagInput.tsx
    apps/web/app/components/TagFilter.tsx
    apps/web/app/hooks/useTags.ts
  </files>
  <action>
    Build tag UI components for post creation/editing and feed filtering:

    **File: `apps/web/app/hooks/useTags.ts`**

    Create hook for tag autocomplete and management:
    ```typescript
    'use client'

    import { useState, useEffect } from 'react'
    import { useQuery } from '@tanstack/react-query'

    export function useTags(query: string = '') {
      const { data, isLoading } = useQuery({
        queryKey: ['tags-autocomplete', query],
        queryFn: async () => {
          if (!query.trim()) {
            // Return trending tags
            const res = await fetch('/api/tags/trending')
            return res.json()
          }
          // Return suggestions matching query
          const res = await fetch(\`/api/tags/autocomplete?q=\${encodeURIComponent(query)}\`)
          return res.json()
        },
      })

      return {
        suggestions: data?.data || [],
        isLoading,
      }
    }
    ```

    **File: `apps/web/app/components/TagInput.tsx`**

    Multi-select tag input with autocomplete:
    ```typescript
    'use client'

    import { useState, useRef } from 'react'
    import { Badge } from '@/components/ui/badge'
    import { Input } from '@/components/ui/input'
    import { useTags } from '@/hooks/useTags'

    interface TagInputProps {
      value: string[]
      onChange: (tags: string[]) => void
      maxTags?: number
    }

    export function TagInput({ value, onChange, maxTags = 5 }: TagInputProps) {
      const [inputValue, setInputValue] = useState('')
      const [isOpen, setIsOpen] = useState(false)
      const { suggestions, isLoading } = useTags(inputValue)
      const inputRef = useRef<HTMLInputElement>(null)

      const handleAddTag = (tag: string) => {
        if (!value.includes(tag) && value.length < maxTags) {
          onChange([...value, tag])
          setInputValue('')
          setIsOpen(false)
        }
      }

      const handleRemoveTag = (tag: string) => {
        onChange(value.filter((t) => t !== tag))
      }

      const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value)
        setIsOpen(true)
      }

      return (
        <div className="space-y-2">
          {/* Selected tags */}
          <div className="flex flex-wrap gap-2">
            {value.map((tag) => (
              <Badge key={tag} variant="secondary" className="cursor-pointer">
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-xs"
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>

          {/* Input field */}
          {value.length < maxTags && (
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Add tags (type to search)..."
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
              />

              {/* Autocomplete dropdown */}
              {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full mt-1 w-full border rounded bg-white shadow-md z-10">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleAddTag(suggestion.name)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      {suggestion.name}
                      <span className="ml-2 text-gray-500">({suggestion.postCount})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Helper text */}
          {value.length >= maxTags && (
            <p className="text-sm text-gray-500">Maximum {maxTags} tags reached</p>
          )}
        </div>
      )
    }
    ```

    **File: `apps/web/app/components/TagFilter.tsx`**

    Tag filtering UI for feed:
    ```typescript
    'use client'

    import { useState } from 'react'
    import { Badge } from '@/components/ui/badge'
    import { useTags } from '@/hooks/useTags'

    interface TagFilterProps {
      selectedTags: string[]
      onTagsChange: (tags: string[]) => void
    }

    export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
      const { suggestions } = useTags()

      const handleToggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
          onTagsChange(selectedTags.filter((t) => t !== tag))
        } else {
          onTagsChange([...selectedTags, tag])
        }
      }

      return (
        <div className="space-y-2">
          <div className="text-sm font-semibold">Filter by Tags</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.slug) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleToggleTag(tag.slug)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )
    }
    ```

    **Key Implementation Details:**
    - TagInput handles multi-select with autocomplete
    - Dropdown shows suggestions from API with post counts
    - Max 5 tags per post (enforced in component and API)
    - Remove tag via × button
    - TagFilter displays trending tags (from useTags with no query)
    - Toggle tags on/off via click
    - Both components use TanStack Query for data fetching
    - Styled with Tailwind and existing UI components (@/components/ui/*)
    - Use 'use client' directive for client components

    **Accessibility:**
    - Semantic HTML (buttons, input elements)
    - Keyboard navigation support
    - ARIA labels where appropriate (future enhancement)

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && grep -l "TagInput\|TagFilter\|useTags" apps/web/app/components/*.tsx apps/web/app/hooks/*.ts 2>/dev/null | wc -l && echo "✓ Tag components created"</automated>
  </verify>
  <done>
    TagInput component created with multi-select and autocomplete. TagFilter component displays filterable tags. useTags hook handles API calls and caching. All components follow Next.js conventions (functional, hooks-based, 'use client' directives). Components are styled with Tailwind CSS.
  </done>
</task>

<task type="auto">
  <name>Task 11: Update OpenAPI Schema and Regenerate API Client</name>
  <files>
    openapi.json
  </files>
  <action>
    Update OpenAPI specification to include search and tag endpoints:

    **Run Swagger/OpenAPI generation:**
    ```bash
    cd /Users/saizayarhein/Desktop/unishare/apps/api
    pnpm run build
    # Swagger generation happens during build if configured
    ```

    **Manually verify openapi.json includes:**

    1. **Search endpoint:**
       ```json
       "GET /posts/search": {
         "summary": "Full-text search posts",
         "parameters": [
           { "name": "q", "in": "query", "required": true, "schema": { "type": "string" } },
           { "name": "page", "in": "query", "schema": { "type": "number" } },
           { "name": "limit", "in": "query", "schema": { "type": "number" } }
         ],
         "responses": {
           "200": {
             "description": "Search results",
             "content": {
               "application/json": {
                 "schema": {
                   "properties": {
                     "success": { "type": "boolean" },
                     "data": {
                       "properties": {
                         "results": { "type": "array", "items": { "$ref": "#/components/schemas/Post" } },
                         "total": { "type": "number" },
                         "page": { "type": "number" },
                         "limit": { "type": "number" }
                       }
                     }
                   }
                 }
               }
             }
           }
         }
       }
       ```

    2. **Tag autocomplete endpoint:**
       ```json
       "GET /tags/autocomplete": {
         "summary": "Get tag suggestions",
         "parameters": [
           { "name": "q", "in": "query", "required": true, "schema": { "type": "string" } }
         ],
         "responses": {
           "200": {
             "description": "Tag suggestions",
             "content": {
               "application/json": {
                 "schema": {
                   "type": "array",
                   "items": { "$ref": "#/components/schemas/Tag" }
                 }
               }
             }
           }
         }
       }
       ```

    3. **Tag a post endpoint:**
       ```json
       "POST /posts/{id}/tags": {
         "summary": "Add tags to post",
         "parameters": [{ "name": "id", "in": "path", "required": true }],
         "requestBody": {
           "content": {
             "application/json": {
               "schema": { "properties": { "tags": { "type": "array", "items": { "type": "string" } } } }
             }
           }
         },
         "responses": { "200": { "description": "Tags added" } }
       }
       ```

    **After updating OpenAPI:**

    ```bash
    cd /Users/saizayarhein/Desktop/unishare
    pnpm api:generate  # Uses Orval to regenerate API client from openapi.json
    ```

    This generates TypeScript types and React Query hooks in `apps/web/generated/api/`.

    **Key Points:**
    - Swagger decorators in controllers auto-generate schema
    - Build process creates openapi.json
    - Orval code generation creates type-safe API client
    - Frontend can now use generated hooks: usePostsControllerSearch(), useTagsControllerAutocomplete()

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && pnpm build && echo "✓ Build successful" 2>&1 | tail -1</automated>
  </verify>
  <done>
    OpenAPI schema (openapi.json) includes search and tag endpoints with proper definitions. API client regenerated via Orval with type-safe hooks for all new endpoints. Build completes successfully without errors.
  </done>
</task>

<task type="auto">
  <name>Task 12: Run Test Suite and Verify No Regressions</name>
  <files>
    .github/workflows/ci.yml
  </files>
  <action>
    Execute comprehensive test suite to verify Phase 3.1 implementation and detect any regressions:

    **Step 1: Run all unit tests**
    ```bash
    cd /Users/saizayarhein/Desktop/unishare
    pnpm test
    ```
    - Verify new tests (tags.service.spec.ts) pass
    - Verify existing tests still pass
    - Check coverage if reporter configured

    **Step 2: Run E2E tests**
    ```bash
    pnpm test:e2e
    ```
    - Execute search.e2e-spec.ts
    - Execute tags.e2e-spec.ts
    - All E2E tests must pass

    **Step 3: Run linter and formatter**
    ```bash
    pnpm lint
    pnpm format --check
    ```
    - No linting errors
    - Code matches Prettier formatting

    **Step 4: Build project**
    ```bash
    pnpm build
    ```
    - Both API and Web packages build without errors
    - No TypeScript compilation errors
    - OpenAPI schema generated correctly

    **Step 5: Verify no regressions**
    - All Phase 1-2 tests pass (existing tests in repo)
    - Check that new code doesn't break existing functionality
    - Search and tag endpoints work alongside existing posts endpoints

    **Step 6: Create/update CI/CD workflow (optional)**
    - Update `.github/workflows/ci.yml` to include test execution
    - Add step: `pnpm test --coverage` to collect coverage metrics
    - Add step: `pnpm test:e2e` to run E2E tests on push

    **Acceptance Criteria:**
    - All unit tests pass (pnpm test)
    - All E2E tests pass (pnpm test:e2e)
    - Linting passes (pnpm lint)
    - Code formatting correct (pnpm format --check)
    - Build succeeds (pnpm build)
    - No broken imports or type errors
    - Coverage report available (if configured)

    **If Tests Fail:**
    1. Check error messages for specific failures
    2. Fix test expectations or code
    3. Re-run tests until green
    4. Commit fixes atomically

  </action>
  <verify>
    <automated>cd /Users/saizayarhein/Desktop/unishare && pnpm build && pnpm lint && echo "✓ Build and lint passed" || echo "✗ Build or lint failed"</automated>
  </verify>
  <done>
    All unit tests pass. All E2E tests pass. Linting passes (no violations). Code formatting correct. Build succeeds without errors. No regressions detected in Phase 1-2 features. Test suite provides confidence in implementation quality.
  </done>
</task>

</tasks>

<verification>
## Acceptance Verification Checklist

**Database & ORM:**

- [ ] `pnpm prisma generate` succeeds
- [ ] Prisma schema includes Tag and PostTag models with proper indexes
- [ ] Migration file includes tsvector column and GIN index
- [ ] `pnpm prisma migrate status` shows no pending migrations

**Backend - Tags:**

- [ ] TagsService created with findOrCreate, autocomplete, getTrendingTags methods
- [ ] TagsController created with GET /tags/autocomplete, POST /posts/:id/tags endpoints
- [ ] TagsModule exported from app.module.ts
- [ ] TagsService properly injected into PostsService

**Backend - Search:**

- [ ] PostsService includes searchPosts method using plainto_tsquery and tsvector
- [ ] PostsController includes GET /posts/search endpoint
- [ ] Search handles empty queries (returns empty results)
- [ ] Search results include relevance ranking

**Backend - Testing:**

- [ ] apps/api/test/search.e2e-spec.ts exists with happy path + edge case tests
- [ ] apps/api/test/tags.e2e-spec.ts exists with happy path + edge case tests
- [ ] Unit tests for TagsService pass (autocomplete, validation, trending)
- [ ] `pnpm test:e2e` executes without errors

**Frontend - Search:**

- [ ] SearchBox component created with input and debouncing
- [ ] SearchResults component displays paginated results
- [ ] useSearch hook encapsulates search state and API calls
- [ ] Search integrates with feed or overlay UI

**Frontend - Tags:**

- [ ] TagInput component supports multi-select with autocomplete
- [ ] TagFilter component displays filterable tags on feed
- [ ] useTags hook handles autocomplete and trending tags
- [ ] Max 5 tags enforced in UI

**API Documentation:**

- [ ] openapi.json includes search and tag endpoint definitions
- [ ] `pnpm api:generate` regenerates TypeScript types without errors
- [ ] Generated hooks available in apps/web/generated/api/

**Build & Quality:**

- [ ] `pnpm build` succeeds (both apps/api and apps/web)
- [ ] `pnpm lint` passes with no violations
- [ ] `pnpm format --check` confirms code formatting
- [ ] `pnpm test` passes (all unit tests green)
- [ ] No TypeScript compilation errors
- [ ] All new code follows conventions (no semicolons, single quotes, 100-char width)

**Integration & Regression:**

- [ ] Phase 1-2 posts/comments/reactions still work
- [ ] Existing endpoints unchanged (no breaking changes)
- [ ] Search and tagging coexist with existing filtering
- [ ] No N+1 queries in search or tag operations
- [ ] Performance targets met: search <100ms, autocomplete <30ms

**Deployment Readiness:**

- [ ] Migration scripts handle schema changes
- [ ] No manual setup required (Prisma handles it)
- [ ] Database compatibility verified (PostgreSQL 12+)
- [ ] Rollback plan documented (just revert migration)
      </verification>

<success_criteria>

## Phase 3.1 Success Metrics

**Functional Completeness:**
✅ Students can search for posts by title and description
✅ Search results ranked by relevance (tsvector + ts_rank)
✅ Empty search shows no results (no default "show all")
✅ Students can add tags during post creation and editing
✅ Posts display all associated tags on feed and detail views
✅ Students can filter feed by selecting one or more tags
✅ Tag autocomplete suggests existing tags sorted by frequency
✅ Search is case-insensitive and handles special characters
✅ Phase 1-2 features remain fully functional (zero regression)

**Performance:**
✅ Search queries execute in <100ms (P95) on typical datasets (10k+ posts)
✅ Tag autocomplete returns suggestions in <30ms (P95)
✅ Feed load time not degraded by new search/tag indexes
✅ GIN index on search_vector queries efficiently

**Test Coverage:**
✅ 100% of E2E search scenarios passing (user can search, find results, paginate)
✅ 100% of E2E tag scenarios passing (user can tag post, filter by tag)
✅ Unit tests for search ranking and tag validation present
✅ Integration tests for database operations present
✅ No broken existing tests (Phase 1-2 test suite still 100% passing)

**Code Quality:**
✅ All code follows project conventions (no semicolons, single quotes, 100-char width)
✅ Proper TypeScript types throughout (no `any` in new code)
✅ NestJS patterns followed (services, controllers, DTOs, modules)
✅ React hooks pattern for frontend components ('use client' directives)
✅ Error handling via NestJS HTTP exceptions + global filter
✅ Swagger/OpenAPI documentation complete and accurate

**Deployment:**
✅ Prisma migration handles schema changes
✅ No downtime required (migration can be deployed progressively)
✅ Rollback possible via `prisma migrate resolve`
✅ Environment variables not required (search uses native PostgreSQL)
✅ No new external services required (PostgreSQL already in use)

**Documentation:**
✅ OpenAPI schema updated with search and tag endpoints
✅ API client regenerated with type-safe hooks
✅ Implementation follows research documents (SEARCH_SOLUTIONS.md, TAGGING_PATTERNS.md)
✅ Code comments explain complex logic (ranking algorithm, slug generation)
✅ E2E tests document expected user flows

**Readiness for Phase 3.2:**
✅ Tag infrastructure in place for trending calculations
✅ Search foundation ready to integrate with trending sort
✅ Post model extended (searchVector, tags) without breaking existing fields
✅ No technical debt blocking Phase 3.2 (trending + reporting)
</success_criteria>

<output>
After successful execution, create `.planning/phases/3-1-search-tagging/3-1-SUMMARY.md` with:

1. **Execution Summary**
   - All 12 tasks completed
   - Commit hashes for each feature
   - Total lines of code added
   - Test coverage achieved

2. **What Was Built**
   - Database schema changes (Tag, PostTag models)
   - Search API (GET /posts/search with FTS)
   - Tag API (CRUD + autocomplete)
   - Frontend search and tag components
   - E2E test coverage

3. **Performance Metrics**
   - Search latency (measure actual P95)
   - Autocomplete latency
   - Index sizes
   - Query explain plans

4. **Issues Encountered & Resolved**
   - Any blockers during implementation
   - Workarounds applied
   - Known limitations

5. **Next Phase (3.2) Dependencies**
   - What 3.2 can rely on
   - Any unfinished work
   - Recommendations for 3.2 implementation

6. **Testing Evidence**
   - Test execution results
   - Coverage report
   - E2E test screenshots (if applicable)

7. **Deployment Instructions**
   - How to apply migrations
   - Environment variables (if any)
   - Rollback procedure
   - Verification steps

8. **Code References**
   - Key files created/modified
   - Important patterns implemented
   - Links to documentation
     </output>

---

**Phase Ready for Execution**

This plan breaks Phase 3.1 into 12 focused, parallel-optimized tasks with clear dependencies and acceptance criteria. All tasks are executable by Claude with no human intervention required during implementation. Each task specifies exact file locations, implementation patterns, and verification methods.

**Execution Sequence:**

- **Wave 1** (Tasks 1-7): Database schema, services, controllers, DTOs — backend foundation
- **Wave 2** (Tasks 8-10): E2E tests, frontend components — testing and UI
- **Wave 3** (Task 11): OpenAPI regeneration — API contract update
- **Wave 4** (Task 12): Full test suite execution — quality verification

**Estimated Execution Time:** 4-6 hours for Claude (all tasks can be parallelized where specified)

**Go/No-Go Decision:** Ready for `/gsd-execute-phase 3-1-search-tagging` once approved.
