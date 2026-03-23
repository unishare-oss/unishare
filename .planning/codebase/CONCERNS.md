# Codebase Concerns

**Analysis Date:** 2025-03-20

## Tech Debt

**Mock Data Dependency:**
- Issue: Extensive use of hardcoded mock data in the frontend for core features. Components and pages import directly from `mock-data.ts` instead of exclusively using API hooks.
- Files: `apps/web/lib/mock-data.ts`, `apps/web/app/(app)/posts/[id]/page.tsx`, `apps/web/components/post-card.tsx`
- Impact: Risk of mock data leaking into production or making the transition to real API data fragmented and error-prone.
- Fix approach: Transition to using generated API clients (Orval/OpenAPI) and ensure all components consume data from hooks or a centralized store.

**Large Component/Service Logic:**
- Issue: Several files are exceeding 400-500 lines of code, combining multiple responsibilities.
- Files: `apps/web/components/boards/room-card.tsx` (549 lines), `apps/api/src/modules/posts/posts.service.ts` (461 lines), `apps/web/components/post-detail/post-files.tsx` (467 lines)
- Impact: High cognitive load for maintainers and increased risk of bugs during modification.
- Fix approach: Break down large components into smaller, focused sub-components. Refactor services into smaller helper classes or utility modules.

## Security Considerations

**Custom Auth Decorators:**
- Issue: Reliance on `@OptionalAuth()`, `@Roles()`, and `@Session()` from `nestjs-better-auth`.
- Files: `apps/api/src/modules/posts/posts.controller.ts`
- Current mitigation: Global guards and pipes are configured in `main.ts`.
- Recommendations: Ensure rigorous integration testing for these decorators to prevent unauthorized access, especially for `@OptionalAuth()` routes where logic forks based on session existence.

## Performance Bottlenecks

**Database Search Implementation:**
- Issue: Using `Unsupported("tsvector")` in Prisma for full-text search.
- Files: `apps/api/prisma/schema.prisma`
- Cause: This is a Postgres-specific feature. While performant, it bypasses standard Prisma types and requires raw SQL for certain operations.
- Improvement path: Ensure GIN indexes are properly maintained and consider a dedicated search engine (e.g., Meilisearch) if search complexity or data volume grows significantly.

## Fragile Areas

**Generated Code Bloat:**
- Files: `apps/api/src/generated/prisma/`
- Why fragile: Generated files for Prisma models are extremely large (e.g., `User.ts` is 5.7k lines).
- Safe modification: Never modify files in `generated/` manually.
- Test coverage: Ensure unit tests cover the services that consume these models, as the models themselves are too large to audit manually.

---

*Concerns audit: 2025-03-20*
