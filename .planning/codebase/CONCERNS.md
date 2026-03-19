# Codebase Concerns

**Analysis Date:** 2026-03-19

## Tech Debt

**`any` casts in data mapper functions:**

- Issue: Three repository-layer mapper functions cast input as `any`, bypassing compile-time type checking on the most sensitive data transformation path in the app.
- Files:
  - `apps/api/src/modules/posts/posts.repository.ts:69` — `post as any` inside `mapPost`
  - `apps/api/src/modules/post-requests/post-requests.repository.ts:38` — `mapRequest(r: any, ...)`
  - `apps/api/src/modules/courses/courses.repository.ts:8` — `mapCourse(course: any)`
- Impact: TypeScript cannot catch field renames, missing fields, or schema drifts in these mappers. A Prisma model change will compile cleanly but produce incorrect API responses.
- Fix approach: Replace `any` with the concrete Prisma `GetPayload` type (as already done for `commentSelect` in `comments.repository.ts`). Use `satisfies` or explicit generic constraints.

**`[key: string]: unknown` index signature in `UsersService.toProfileView`:**

- Issue: The `user` parameter type includes `[key: string]: unknown`, making the method accept any object without type safety.
- Files: `apps/api/src/modules/users/users.service.ts:52`
- Impact: Refactoring the user query shape will not produce a type error here.
- Fix approach: Replace with a typed intersection derived from the actual Prisma select shape.

**Hard-coded comment on type workaround:**

- Issue: `// fix this later pls maybe` comment on a complex type workaround for the PDF bookmark panel.
- Files: `apps/web/components/shared/pdf-viewer/pdf-bookmark-panel.tsx:11-14`
- Impact: Low functional risk; the type works, but the `embedpdf` SDK's bookmark type is not publicly exported, making the workaround fragile across SDK upgrades.
- Fix approach: Extract the `Bookmark` type into a shared type alias; file an upstream issue requesting a public export.

---

## Fire-and-Forget Operations Without Error Handling

**Notification calls discarding rejections:**

- Issue: All notification dispatches and the post-view recording use `void` to deliberately drop the returned promise, meaning any database failure in these paths is silently swallowed.
- Files:
  - `apps/api/src/modules/posts/posts.service.ts:46` — `void this.followsService.getFollowerIds(...).then(...)`
  - `apps/api/src/modules/posts/posts.service.ts:103` — `void this.postsRepository.recordView(...)`
  - `apps/api/src/modules/posts/posts.service.ts:152` — `void this.notificationsService.notifyPostStatus(...)`
  - `apps/api/src/modules/posts/posts.service.ts:154` — `void this.followsService.getFollowerIds(...).then(...)`
  - `apps/api/src/modules/posts/comments/comments.service.ts:56` — `void this.notificationsService.notifyComment(...)`
  - `apps/api/src/modules/post-requests/post-requests.service.ts:58` — `void this.notificationsService.notifyRequestSuggestion(...)`
  - `apps/api/src/modules/post-requests/post-requests.service.ts:94` — `void this.notificationsService.notifyRequestFulfilled(...)`
- Impact: Notification failures are invisible. A Postgres outage during notification creation will cause silent data loss — users never receive in-app notifications, and no error is surfaced or logged. `recordView` failures also cause view counters to drift silently.
- Fix approach: Wrap fire-and-forget calls in `.catch((err) => this.logger.error(...))` at minimum. For critical notifications, consider making them awaited within the request but handled in a background queue.

**PDF bookmark fetch silently ignored:**

- Issue: `.catch(() => {})` on the bookmark fetch in the PDF viewer discards all errors with no user feedback or logging.
- Files: `apps/web/components/shared/pdf-viewer/pdf-bookmark-panel.tsx:92`
- Impact: If bookmark loading fails (network error, malformed PDF, SDK issue), the panel silently shows "No bookmarks" with no indication that an error occurred.
- Fix approach: At minimum log the error to the console; ideally display a short error message in the panel.

---

## Database Concerns

**Soft-delete pattern with no DB-level enforcement:**

- Issue: Posts and comments use `deletedAt` timestamps for soft deletion, but there is no partial index, view, or row-level security enforcing that `deletedAt IS NULL` filters are applied. Every query that reads posts or comments must manually include the filter or risk returning deleted content.
- Files:
  - `apps/api/src/modules/posts/posts.repository.ts` — `where: { deletedAt: null }` repeated in every query
  - `apps/api/src/modules/posts/comments/comments.repository.ts` — soft-deleted comments returned in `findAll` (all comments for a post are fetched, including deleted, and filtered/sanitized in-memory in the service)
- Impact: Adding a new repository method that omits `deletedAt: null` will leak deleted content. The comment tree is built from all rows including deleted ones, relying entirely on the application-layer `sanitizeComment` to scrub content — deleted rows are intentionally included for tree structure, but this is an implicit contract.
- Fix approach: Document the comment fetch contract explicitly. For posts, add a linting rule or base repository wrapper that enforces the filter.

**No database transactions on multi-step writes:**

- Issue: Operations that require atomicity across multiple Prisma calls are not wrapped in `$transaction`. The entire codebase has zero uses of `prisma.$transaction`.
- Files:
  - `apps/api/src/modules/posts/posts.repository.ts:178-185` — `recordView` does a `findUnique` then `create` then `update` as three separate queries
  - `apps/api/src/modules/post-requests/post-requests.repository.ts:82-93` — `toggleUpvote` does a `findUnique` then `delete` or `create` as two separate queries
  - `apps/api/src/modules/posts/posts.repository.ts:188-203` — `toggleReaction` does `findUnique` then `delete` or `upsert`
  - `apps/api/src/modules/tasks/tasks.service.ts:57-73` — S3 file deletions happen before DB hard-delete; a partial failure leaves S3 and DB out of sync
- Impact: Under concurrent load, race conditions can create duplicate view records (two users opening the same post simultaneously could both pass the `findUnique` check and both insert). Toggle operations (upvote, reaction) are susceptible to TOCTOU races. If `purgeDeletedContent` crashes mid-loop, some S3 files will be deleted while their DB rows remain, and vice versa.
- Fix approach: Wrap `recordView` and `toggleReaction`/`toggleUpvote` in `prisma.$transaction` with serializable isolation or use database-level upsert patterns. For `purgeDeletedContent`, delete DB rows first, then clean S3; log S3 failures for a separate cleanup sweep.

**Orphaned S3 files from failed/abandoned uploads:**

- Issue: The upload flow issues a presigned URL (`/storage/upload-url`), and files are only registered in the database when the client calls the confirm endpoint (`/files/:postId/confirm`). If the client uploads to S3 but never calls confirm (tab closed, network error, etc.), the S3 object is permanently orphaned.
- Files:
  - `apps/api/src/modules/storage/storage.service.ts` — presigned URL generation
  - `apps/api/src/modules/files/files.service.ts` — confirm upload logic
- Impact: S3 storage grows unboundedly with orphaned objects. No cleanup mechanism exists for these.
- Fix approach: Add a scheduled task that lists S3 objects not referenced by any `file` DB row and deletes them after a grace period (e.g., 24h after object creation using S3 object metadata).

**Missing index on `post_view.userId`:**

- Issue: The `post_view` table has an index on `postId` but not on `userId`. The `recordView` query filters by both `userId` and `postId` via the composite primary key, so this is not currently a bottleneck, but queries like "all posts viewed by a user" would not benefit from an index.
- Files: `apps/api/prisma/migrations/20260312035006/migration.sql:219`
- Impact: Low current impact, but worth noting if view history queries are added.

---

## Performance Issues

**N+1 pattern in `notifyFollowersNewPost`:**

- Issue: When a post is created or approved, the service fetches all follower IDs, then issues one `INSERT` per follower inside a `Promise.all`. For a user with many followers, this creates N+1 database roundtrips in a fire-and-forget context.
- Files: `apps/api/src/modules/notifications/notifications.service.ts:110-129`
- Impact: For users with 100+ followers, post approval triggers 100+ sequential-or-parallel inserts. Under load, this can spike connection pool usage. Since the whole chain is `void`, failures also go unlogged.
- Fix approach: Use `prisma.notification.createMany` with a single bulk insert. Map the SSE events separately after the bulk write.

**Sequential S3 deletions in `purgeDeletedContent`:**

- Issue: The purge task iterates posts and files in a nested `for` loop, awaiting each `deleteFile` call sequentially.
- Files: `apps/api/src/modules/tasks/tasks.service.ts:62-68`
- Impact: For large purge batches, this task runs much longer than necessary. Each S3 `DeleteObjectCommand` adds latency serially.
- Fix approach: Collect all file keys first, then use `Promise.all` or batch S3 delete with `DeleteObjectsCommand` (up to 1000 keys per request).

**In-memory comment tree assembly — no depth limit:**

- Issue: `CommentsService.buildCommentTree` loads all comments for a post into memory and assembles a tree client-side. There is no limit on comment depth or total count.
- Files: `apps/api/src/modules/posts/comments/comments.service.ts:102-121`
- Impact: A post with thousands of deeply nested comments would load all rows in one query and build the tree entirely in-memory, potentially exhausting heap on busy posts. There is also no pagination for comments.
- Fix approach: Add a hard depth limit (e.g., 3 levels) enforced at write time, and paginate the root-level comment fetch.

**Notification inbox capped at 50 with no pagination:**

- Issue: `findByUser` always takes the latest 50 notifications. Users who generate more cannot retrieve older ones.
- Files: `apps/api/src/modules/notifications/notifications.repository.ts:20-34`
- Impact: Minor UX limitation today; becomes a real gap as notification volume grows.
- Fix approach: Add cursor-based or offset pagination to the notifications endpoint.

---

## Permission Model

**Coarse-grained role model with no resource-level granularity:**

- Issue: The permission system in `apps/api/src/lib/permissions.ts` defines three static roles (STUDENT, MODERATOR, ADMIN) with actions that apply globally to resource types. There is no way to express "moderator can only manage posts in their assigned department" or "user can only edit their own profile."
- Files: `apps/api/src/lib/permissions.ts`
- Impact: Ownership checks (isOwner, isAdmin) are scattered ad-hoc throughout service methods rather than centralized. Adding a new privileged action requires touching multiple service files.
- Fix approach: Add resource-level ownership checks to the permission statement, or centralize ownership guard logic into a shared authorization service.

**No audit logging for privileged actions:**

- Issue: Admin and moderator actions (role changes via better-auth admin plugin, post approval/rejection, user bans) produce no audit trail. There is no log of who approved what and when.
- Files:
  - `apps/api/src/modules/posts/posts.service.ts:147-165` — `updateStatus`
  - `apps/api/src/auth/auth.config.ts` — admin plugin handles role/ban operations
- Impact: No accountability for moderation decisions. Cannot audit "who banned this user" or "who approved this post" without reading raw server logs.
- Fix approach: Add a database `audit_log` table with entries for status changes, role changes, and bans. Hook into the NestJS interceptor layer to record these automatically.

**Moderator role has no department scope:**

- Issue: A MODERATOR can approve or reject any post across all departments with no departmental restriction enforced at the API layer.
- Files: `apps/api/src/modules/posts/posts.service.ts:65`, `apps/api/src/lib/permissions.ts`
- Impact: A moderator intended for one department can moderate posts across the entire platform.

---

## Async Operation Ordering (Race Conditions)

**Notification fired before `updateStatus` response returns:**

- Issue: In `updateStatus`, the notification is fired with `void` immediately after `postsRepository.updateStatus` resolves. The follower notification chain is fired in a second separate `void` block. These two fire-and-forget chains are not guaranteed to run in order or complete before the response returns.
- Files: `apps/api/src/modules/posts/posts.service.ts:151-165`
- Impact: Under high load, it is possible for the SSE event (`this.events$.next`) to fire before the DB write is visible to other connections (in a future multi-instance deployment). Currently single-instance, so the Subject push is synchronous after the DB write — but this assumption breaks the moment the app scales horizontally.

**Race condition in `recordView`:**

- Issue: The view recording sequence is: `findUnique` → if not exists → `create` → `update`. Two concurrent requests for the same post by the same user can both pass the `findUnique` check before either inserts, resulting in a duplicate `create` constraint violation (caught by Prisma as a P2002) that is never handled because the call is `void`.
- Files: `apps/api/src/modules/posts/posts.repository.ts:178-185`, `apps/api/src/modules/posts/posts.service.ts:103`
- Impact: Under concurrent access (e.g., React Strict Mode double-invoke, or multiple tabs), unhandled P2002 errors are silently discarded. The view count may be incremented twice before the duplicate is rejected at the constraint level.
- Fix approach: Use `prisma.postView.upsert` with `update: {}` (same pattern used for `savePost`), then always increment the view counter — or accept that the P2002 means the view was already recorded and skip the increment.

---

## Test Coverage Gaps

**Effectively zero automated test coverage:**

- Issue: The entire codebase — 275 TypeScript/TSX source files across API and web — has exactly one test file: `apps/api/test/app.e2e-spec.ts`. This single test checks that `GET /` returns `200 "Hello World!"`, which is not even a real endpoint in the application (the API root is not defined in any controller).
- Files: `apps/api/test/app.e2e-spec.ts`
- Risk: Every service method, repository query, permission check, data mapper, and notification dispatch is entirely untested. Regressions in any of the following are invisible:
  - `mapPost` anonymous/privileged branch logic in `apps/api/src/modules/posts/posts.repository.ts`
  - Soft-delete filter correctness across all repository queries
  - Comment tree assembly and sanitization in `apps/api/src/modules/posts/comments/comments.service.ts`
  - Permission boundary between STUDENT/MODERATOR/ADMIN
  - `purgeDeletedContent` task behavior
- Priority: Critical. The codebase has no safety net for refactoring.
- Fix approach: Add unit tests for all service and repository methods using Jest with Prisma mocked (e.g., `jest-mock-extended`). Add integration tests for critical flows (post creation, moderation, notification dispatch) against a test database. The existing `jest-e2e.json` config is already in place.

---

## Scaling Limits

**SSE event bus is in-process only:**

- Issue: `NotificationsService` uses an RxJS `Subject` (`private readonly events$`) as the event bus for SSE streams. This is a singleton within the NestJS process.
- Files: `apps/api/src/modules/notifications/notifications.service.ts:14`
- Impact: If the API is scaled to multiple instances (e.g., behind a load balancer), a notification event emitted on instance A will never reach a client connected to instance B. SSE connections are also held in-memory, so a pod restart silently drops all active streams.
- Fix approach: Replace the in-process `Subject` with a Redis Pub/Sub adapter. Clients reconnect via the existing EventSource retry mechanism, which handles pod restarts gracefully.

**No rate limiting on write endpoints:**

- Issue: No rate limiting middleware is visible on any endpoint. Comment creation, reaction toggling, follow/unfollow, and notification reads all hit the database on every request with no throttling.
- Files: No `ThrottlerModule` import found in any module file.
- Impact: A single authenticated user can spam the database with reactions, views, or comments without any API-level protection.
- Fix approach: Add `@nestjs/throttler` with per-user rate limits on write endpoints.

---

_Concerns audit: 2026-03-19_
