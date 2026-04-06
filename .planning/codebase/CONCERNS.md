# Codebase Concerns

**Analysis Date:** 2025-05-22

## Tech Debt

**User Deletion Logic:**
- Issue: Critical TODO identified in user deletion function.
- Files: `apps/web/components/admin/users/users-table.tsx`
- Impact: Potential data inconsistency or failure to properly clean up user data.
- Fix approach: Verify the user removal logic and ensure all associated data is handled correctly.

**Database-Stored Text Extraction:**
- Issue: Full text extracted from study materials is stored in the PostgreSQL database.
- Files: `apps/api/prisma/schema.prisma` (`StudyMaterial` model)
- Impact: Rapid database growth and potential performance degradation of full-text search as content grows.
- Fix approach: Consider storing extracted text in a specialized search engine (e.g., Elasticsearch, Meilisearch) or as separate files in S3 if the volume is high.

## Test Coverage Gaps

**API Core Modules:**
- What's not tested: Key business logic in `posts`, `users`, `quizzes`, `notifications`, `storage`, and `reports`.
- Files: `apps/api/src/modules/posts/`, `apps/api/src/modules/users/`, `apps/api/src/modules/quizzes/`, etc.
- Risk: Regressions in critical user flows could go unnoticed.
- Priority: High

**Web Frontend:**
- What's not tested: Almost all UI components, hooks, and context providers. Only 3 test files exist in the entire web app.
- Files: `apps/web/`
- Risk: High fragility when refactoring or adding new features.
- Priority: High

## Performance Bottlenecks

**Trending Score Calculation:**
- Problem: `refreshTrendingScores` updates all published posts in a single database transaction.
- Files: `apps/api/src/modules/trending/trending.service.ts`
- Cause: The current implementation maps all posts and executes a transaction for the entire set of updates.
- Improvement path: Batch updates into smaller transactions or use a raw SQL bulk update for better performance.

**Multipart Upload Proxying:**
- Problem: Multipart file chunks are uploaded to the API server, which then proxies them to S3.
- Files: `apps/api/src/modules/storage/storage.service.ts`, `apps/web/lib/posts/upload-post-file.ts`
- Cause: The architecture uses the API as a relay for chunked uploads instead of direct-to-S3 part uploads.
- Improvement path: Implement presigned URLs for each part of the multipart upload to allow the client to upload directly to S3.

## Fragile Areas

**Multipart Upload State:**
- Files: `apps/api/src/modules/storage/storage.service.ts`
- Why fragile: `partEtagCache` is an in-memory `Map`. If the API server restarts during a large file upload, the ETag list is lost, and the upload will fail upon completion.
- Safe modification: Transition to a persistent storage (e.g., Redis or Database) for tracking multipart upload ETags.
- Test coverage: None detected for multipart upload state management.

**Search Vector Implementation:**
- Files: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`
- Why fragile: Uses `Unsupported("tsvector")` in Prisma, requiring manual maintenance of migrations for indices and triggers.
- Safe modification: Ensure all search-related changes are rigorously tested with raw SQL migrations.
- Test coverage: No automated tests for search vector generation.

## Observability & Error Handling

**Missing External Error Tracking:**
- Area: Global application monitoring.
- Problem: No Sentry or similar service integrated. Errors are only logged to the console/local logs.
- Blocks: Real-time visibility into production errors and performance issues.

**Silent Promise Failures:**
- Area: Background operations in `PostsService`.
- Files: `apps/api/src/modules/posts/posts.service.ts`
- Current mitigation: Using `void` with promises (e.g., `void this.followsService.getFollowers(...)`).
- Recommendations: Replace with proper error handling or use a robust background task queue (e.g., BullMQ) for tasks like notifications and content screening.

---

*Concerns audit: 2025-05-22*
