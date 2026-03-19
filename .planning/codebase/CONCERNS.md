# Codebase Concerns

**Analysis Date:** 2025-01-17

## Test Coverage Gaps

**Minimal test suite:**

- Files: `apps/api/src/app.controller.spec.ts` (only 1 test file)
- What's not tested: Almost all business logic (services, repositories, controllers)
  - No tests for posts module (create, list, update, delete, reactions)
  - No tests for user module (authentication, profile management)
  - No tests for notifications and real-time features
  - No tests for file uploads and storage operations
  - No tests for database transactions and cascading deletes
  - No tests for permission/authorization checks across endpoints
  - No integration tests for API endpoints
  - No tests for the web frontend components
- Risk: Critical features like post moderation, access control, and data deletion could regress unnoticed
- Priority: **High** — production app without service-level tests is fragile

**Running tests:**

- `pnpm --filter api test` — runs Jest but only finds one test
- `pnpm --filter api test:cov` — coverage will be near 0% on actual business logic

---

## Type Safety Issues

**Use of `any` types:**

- `apps/api/src/modules/posts/posts.repository.ts:69` — `const { ... } = post as any`
  - Breaking object destructuring pattern due to complex Prisma return types
  - Loses type safety on post mapping function
  - Risk: Silent failures if post schema changes
  - Fix: Create proper TypeScript interfaces matching the Prisma include pattern

- `apps/api/src/modules/post-requests/post-requests.repository.ts:38` — `function mapRequest(r: any, ...)`
  - Untyped mapping function for post request responses
  - Risk: Incorrect field names won't surface until runtime
  - Fix: Extract Prisma return type as a proper interface

- `apps/api/src/modules/courses/courses.repository.ts` — `function mapCourse(course: any)`
  - Same pattern as mapRequest
  - Fix: Type this function explicitly

**Recommendation:** Create type stubs for common Prisma return shapes or use TypeScript's `typeof` operator on actual queries to ensure type safety in mapper functions.

---

## Type Validation in DTOs

**Missing class-validator decorators:**

- Files: `apps/api/src/modules/*/dto/*` — DTOs exist but minimal validation
- Issue: HTTP requests pass through with incomplete validation
  - File uploads don't validate file size before upload attempt (size checked in storage service)
  - Post creation doesn't validate title length or description
  - Pagination limits not enforced on PaginationDto
  - Course/department creation DTOs lack unique constraint validation
- Risk: Invalid data stored, inflated file uploads, unexpected query results
- Fix approach: Add validators to all DTOs
  ```typescript
  // Example
  export class CreatePostDto {
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    title: string

    @IsInt()
    @Min(0)
    @Max(50 * 1024 * 1024)
    fileSize: number
  }
  ```

---

## Error Handling Patterns

**Missing error handling in async operations:**

- File: `apps/api/src/modules/tasks/tasks.service.ts:64`

  ```typescript
  await this.storage.deleteFile(file.key).catch((err) => {
    this.logger.warn(`Failed to delete S3 file ${file.key}: ${err.message}`)
  })
  ```

  - Silently ignores S3 deletion failures during soft-delete purge
  - Orphaned S3 files accumulate over time, wasting storage
  - Fix: Implement retry logic or dead-letter queue for failed deletions

- File: `apps/api/src/modules/posts/posts.service.ts:46-55`
  - Fire-and-forget notification to followers on post creation
  - If notification service crashes, followers never get notified, but post is already created
  - Fix: Use transaction or event queue to ensure consistency

**Missing error responses for edge cases:**

- Several endpoints don't handle race conditions (e.g., two simultaneous comment deletions)
- No timeout handling for slow S3 operations
- No circuit breaker for repeatedly failing S3 calls

---

## Database Performance Concerns

**Missing database indexes on frequently queried fields:**

- Posts filtered by `status` and `type` both have individual indexes but could benefit from composite index for common filter combinations
- Notifications queried by `userId` and `read` status — no composite index
- Comments queried by `postId, parentId, createdAt` for threaded display — composite index exists but could be optimized
- Current indexes: See `apps/api/prisma/schema.prisma` lines 64-300

**N+1 query risk in posts listing:**

- File: `apps/api/src/modules/posts/posts.repository.ts:100+`
- Post listing includes nested `author`, `course`, `department` with full selects
- If listing 100 posts with author departments, this is a single query with joined relations (good)
- However, reactions/saved posts are queried separately per post for some views
- Risk grows if search/trending features are added without proper aggregation

**Large result sets unbounded:**

- Pagination is enforced but default limit isn't documented
- No max limit enforced (e.g., `limit: Math.min(req.limit, 100)`)
- Large requests could spike database load

---

## Authentication & Authorization

**OAuth provider credentials required at startup:**

- File: `apps/api/src/auth/auth.config.ts:41-49`
- If GOOGLE_CLIENT_ID or MICROSOFT_CLIENT_SECRET are not set, auth module fails at runtime (not startup)
- Production deployment won't block on missing credentials
- Risk: Silent auth failures if admin misconfigures environment
- Fix: Validate required env vars in `main.ts` before auth module initialization

**CORS origin hardcoded + env fallback:**

- File: `apps/api/src/main.ts:19-22`
- Hardcoded `http://localhost:3000` in allowed origins
- Admins can add FRONTEND_URL but can't override localhost without code change
- Risk: Localhost always trusted even in production if env var not set
- Fix: Only allow localhost in development, require explicit FRONTEND_URL in production

**Better Auth session expiration:**

- File: `apps/api/src/auth/auth.config.ts:61-64`
- Session expires in 7 days
- Session update age is 1 hour (refreshes expiration on activity)
- No explicit logout/session revocation mechanism tested
- Risk: Stolen session tokens valid for 7 days despite user password changes

---

## Security Considerations

**Missing rate limiting:**

- Files: All controller endpoints in `apps/api/src/modules`
- No rate limiting on login, file uploads, or post creation
- Attackers could spam post creation or drain storage quota
- Fix: Add throttler guard (`@nestjs/throttler`)
  ```typescript
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60 } })
  createPost() { ... }
  ```

**File upload validation gap:**

- File: `apps/api/src/modules/storage/storage.service.ts:20-56`
- MIME type whitelist is comprehensive but relies on client-sent MIME type
- Attackers could upload executable content (e.g., `.exe` renamed to `.pdf`)
- Fix: Validate file magic bytes (file signature) server-side using library like `file-type`

**Anonymous posting without audit trail:**

- File: `apps/api/src/modules/posts/posts.repository.ts:91-94`
- Anonymous posts hide author identity from regular users
- Admins can see real author but no audit trail of who created which posts
- Violates accountability for moderation edge cases
- Fix: Log all anonymous post creations separately

**S3 credential scope:**

- File: `apps/api/src/modules/storage/storage.service.ts:66-78`
- S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY used directly
- No mention of IAM policy limiting to specific bucket/prefix
- If credentials leak, entire S3 account compromised
- Fix: Require use of IAM role with least privilege (read/write to `unishare/*` only)

**Missing HTTPS enforcement in production:**

- File: `apps/api/src/main.ts`
- No check for `NODE_ENV === 'production'` to enforce HTTPS-only cookies
- Cookies sent over HTTP in production if admin doesn't configure reverse proxy
- Fix: Add cookie secure flag when `NODE_ENV === 'production'`

---

## Scalability Limitations

**In-memory notification streaming:**

- File: `apps/api/src/modules/notifications/notifications.service.ts:14`
- `Subject<SseEvent>` is in-memory RxJS observable
- Notifications only reach users connected to **same instance**
- In multi-instance deployment, notifications are lost
- Risk: Deployed with multiple API replicas = half of users don't get notifications
- Fix: Use Redis pub/sub or message queue instead of in-memory Subject

**SSE connections not managed:**

- File: `apps/web/app/api/notifications/stream/route.ts`
- No maximum concurrent connections limit
- No ping/keepalive to detect stale connections
- Older browsers drop SSE after 30s without data
- Risk: Memory leak from accumulating dead connections; users think notifications are broken

**File cleanup tasks run on single instance:**

- File: `apps/api/src/modules/tasks/tasks.service.ts`
- Cron jobs scheduled locally with `@Cron()`
- In multi-instance setup, each instance runs cleanup (duplicate work) or only one runs (risk of stale data)
- Fix: Implement distributed task scheduling (e.g., Bull queue, RabbitMQ)

**No caching layer:**

- Departments, courses, user profiles queried repeatedly with no caching
- Feed endpoint queries same posts multiple times across requests
- Fix: Add Redis caching with appropriate TTLs

---

## Data Integrity & Consistency

**Soft delete but no hard delete confirmation:**

- File: `apps/api/src/modules/posts/posts.service.ts`
- Posts marked deleted but data remains in DB for 90 days
- If user immediately re-uploads same content, it collides with old data
- File downloads still work on soft-deleted posts (if user has direct link)

**Notification creation not transactional:**

- File: `apps/api/src/modules/posts/posts.service.ts:46-55`
- Post created, then followers fetched, then notifications created
- If followers query fails, post is orphaned (no notifications sent)
- Fix: Move to single transaction or use event-driven approach

**Comment threading orphaning risk:**

- Comments can reference parent comment in another post (broken relationship possible in edge cases)
- If parent comment deleted before child, threading breaks

---

## Missing Features / Gaps

**No email notifications:**

- Mentioned in backlog (`platform-phases.md` line 54)
- Users only get in-app notifications
- If they don't open the app, they miss notifications
- Fix: Integrate email service (SendGrid, Mailgun) for critical events

**No search functionality:**

- Planned for Phase 3 (`platform-phases.md` line 44)
- Users can only filter by department/course/type, not by content
- Currently all posts returned if no filters applied
- Large deployments will be unusable without full-text search

**No bulk moderation tools:**

- Backlog item (`platform-phases.md` line 57)
- Admins approve posts one at a time
- Scales poorly with high submission volume

**No content reporting/flagging:**

- Phase 3 planned (`platform-phases.md` line 47)
- Users cannot report inappropriate content
- Admins have no visibility into problematic posts

---

## Performance Bottlenecks

**Post view counter not optimized:**

- File: `apps/api/src/modules/posts/posts.service.ts` (view tracking)
- Every view increments DB counter
- High-traffic posts spike database writes
- Fix: Use Redis counter, flush to DB periodically

**PDF viewer may cause memory spikes:**

- File: `apps/web/components/shared/pdf-viewer/pdf-viewer.tsx:363`
- EmbedPDF library loads entire PDF into memory
- Large PDFs (50MB limit) could crash browser
- Fix: Implement server-side PDF rendering or chunked upload preview

**Large file uploads block progress:**

- 50MB file upload limit is reasonable but no multipart/chunked upload
- Slow connections experience timeout on large files
- Fix: Implement resumable upload with `tus` or similar

---

## Dependency Vulnerabilities & Outdated Packages

**Better Auth custom integration:**

- File: `apps/api/package.json` — uses `@thallesp/nestjs-better-auth@2.4.0`
- Non-standard wrapper around `better-auth@1.4.19`
- If upstream Better Auth releases security fix, wrapper may lag
- Fix: Monitor releases and maintain sync

**Prisma version:**

- `@prisma/client@7.4.1` is recent but check for breaking changes in next major
- No version pinning strategy mentioned

**React 19 bleeding edge:**

- Web app uses `react@19.2.3`
- Recent major version, potential stability issues
- Fix: Monitor GitHub issues and be prepared to downgrade if needed

---

## Missing Documentation

**No API documentation for public consumption:**

- Swagger docs exist at `/docs` but only in development
- Disabled in production: `apps/api/src/main.ts:43`
- Self-hosted admins can't generate fresh docs for their deployments

**No runbook for common operations:**

- Database backup strategy not documented
- S3 credential rotation process unclear
- Session pruning behavior not explained
- Admin moderation workflows unclear

---

## Fragile Areas

**Anonymous posting toggle:**

- File: `apps/api/src/modules/posts/posts.repository.ts:64`
- `isAnonymous` field optional but critical for permission logic
- If null, defaults to false (handled by `isAnonymousValue ?? false`)
- Risk: Uninitialized posts could be visible to wrong users

**Course uniqueness constraint:**

- File: `apps/api/prisma/schema.prisma:64` — `@@unique([code, departmentId])`
- Prevents duplicate course codes within a department
- If two departments have same course code (common for gen-ed courses), conflict
- Fix: Allow same code across departments or namespace by institution

**Post filter persistence in UI:**

- File: `apps/web/lib/store.ts`
- Filter state stored in Zustand
- SSR can cause hydration mismatch if filters not serialized
- Fix: Use next/navigation searchParams for persistent filter state

---

## Deployment & Operations

**No health check endpoint standardization:**

- File: `apps/web/app/api/health/route.ts` (web) and `apps/api/src/app.controller.ts` (API)
- Health checks may not be in consistent format
- Kubernetes/load balancers expecting standard format may fail

**Database migrations must be manual:**

- `pnpm --filter api prisma db push` or `pnpm prisma migrate dev`
- No automated migration on deployment
- Risk of deployment waiting for manual intervention

**Environment variable sprawl:**

- `apps/api/.env.example` has 20+ variables
- No clear which are critical vs. optional
- Admins may miss required config
- Fix: Document each variable with examples and dependencies

**No secrets rotation documented:**

- `BETTER_AUTH_SECRET` valid forever
- `S3_ACCESS_KEY_ID/SECRET` never rotated by default
- Fix: Document rotation procedure and timeline

---

## Known Limitations

**Single-region deployment assumed:**

- No multi-region replication of database
- S3 storage region fixed at configuration time
- Suitable for single university but not multi-campus deployments

**No user federation/SSO beyond OAuth:**

- Microsoft Entra ID + Google are the only OAuth options
- SAML or OpenID Connect not supported
- Limits deployment at institutions with custom identity providers

**File retention limited to 50MB per document:**

- Suitable for lecture notes but not for video recordings
- Archives/dissertations may exceed limit

---

## Test Coverage Priority Matrix

| Component                            | Coverage | Impact   | Priority   |
| ------------------------------------ | -------- | -------- | ---------- |
| Auth flows (login, logout, session)  | 0%       | Critical | **High**   |
| Post CRUD + moderation               | 0%       | Critical | **High**   |
| Permission checks                    | 0%       | Critical | **High**   |
| File uploads + S3 ops                | 0%       | High     | **High**   |
| Notifications (DB + streaming)       | 0%       | High     | **Medium** |
| Comments + reactions                 | 0%       | Medium   | **Medium** |
| Web components (pagination, filters) | 0%       | Medium   | **Medium** |
| Error handling (edges, timeouts)     | 0%       | High     | **High**   |

---

## Recommended Immediate Actions

1. **Add comprehensive API tests** (2-3 days)
   - Test post creation, approval, deletion flows
   - Test permission boundaries (who can delete what)
   - Test file operations and S3 failures

2. **Fix type safety** (1 day)
   - Remove `any` types in repositories
   - Type all mapper functions explicitly

3. **Add rate limiting** (4 hours)
   - Throttle post creation, login, file uploads
   - Prevent spam and DoS vectors

4. **Fix CORS hardcoding** (2 hours)
   - Remove localhost from production defaults
   - Require explicit FRONTEND_URL

5. **Implement distributed notifications** (2-3 days)
   - Replace in-memory Subject with Redis pub/sub
   - Makes multi-instance deployment viable

---

_Concerns audit: 2025-01-17_
