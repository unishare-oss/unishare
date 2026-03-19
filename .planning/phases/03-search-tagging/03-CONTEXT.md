# Phase 3.1: Full-Text Search & Tagging Foundation - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning
**Source:** Project requirements and ecosystem research

---

## Phase Boundary

**Phase Goal:** Students can search for posts and tag content for discoverability.

**What Phase 3.1 Delivers:**

1. Full-text search backend integration (PostgreSQL FTS)
2. Search API endpoint (GET /posts/search)
3. Search UI component on feed with input handling and results
4. Tag data model in database (tag table + post_tag junction)
5. Tag CRUD API endpoints
6. Tag input component with autocomplete on post creation/edit
7. Tag filtering on feed UI

**What's NOT in Phase 3.1:**

- Trending feed sort (Phase 3.2)
- Content reporting (Phase 3.2)
- Advanced search syntax (Phase 4+)
- File content search (Phase 4+)

---

## Implementation Decisions

### Technology Stack

- **Search Backend:** PostgreSQL native FTS with tsvector
  - Already integrated (PostgreSQL is the database)
  - Sufficient for 1M+ posts
  - Migration path to Elasticsearch/Meilisearch in Phase 4 if needed
  - Performance target: <100ms queries with GIN index

- **Tagging Model:** Flat relational (tag table + post_tag junction)
  - Simple queries and efficient filtering
  - `tags` table: id, name, slug, created_at
  - `post_tags` table: id, post_id, tag_id, created_at
  - Future-proof for hierarchical tags (add parent_id column later)

- **Frontend State:** TanStack Query (already in use)
  - Cache search results and tag suggestions
  - Handle pagination for large result sets

### Database Schema Changes

- Add `tags` table with name and slug
- Add `post_tags` junction table
- Add tsvector column to posts for full-text search
- Add GIN indexes on tsvector and tags.slug for performance

### API Contract Changes

- Extend OpenAPI schema for search and tag endpoints
- Use Orval to codegen updated API client

### Search Behavior

- Search scans post titles and descriptions only (file content excluded)
- Results ranked by relevance (PostgreSQL native ranking)
- Case-insensitive, special characters handled gracefully
- Empty search shows all posts (no filter applied)
- Pagination: 20 results per page

### Tag Behavior

- Tags are lowercase, max 30 characters, alphanumeric + hyphens only
- Autocomplete on post creation/edit (suggests existing tags)
- Multiple tags per post (1-5 recommended, no hard limit)
- Tag suggestions sorted by frequency
- Admin can view tag list, merge duplicates, blacklist bad tags (Phase 3.3)

### Performance Targets

- Search queries: <100ms (P95) with GIN index
- Tag suggestions/autocomplete: <30ms (P95)
- Feed load: no degradation from Phase 2

### Testing Requirements

- Unit tests for search ranking algorithm
- Unit tests for tag validation
- Integration tests for database operations
- E2E test: "User can search for post by title" (end-to-end)
- E2E test: "User can add tags to post and filter by tag" (end-to-end)
- No regression in Phase 1-2 tests

---

## Implementation Specifics

### Search API Design

```
GET /posts/search?q=<query>&page=<page>&limit=<limit>
Response: { results: Post[], total: number, page: number, limit: number }
```

**Query Handling:**

- Trim and lowercase input
- Escape special PostgreSQL characters
- Split on spaces for multi-word queries
- Use `@@ to_tsquery()` for relevance ranking

### Tag API Design

```
GET /tags (list all tags, used for suggestions)
GET /tags/suggest?q=<prefix> (autocomplete)
POST /posts/:id/tags (add tag to post)
DELETE /posts/:id/tags/:tagId (remove tag from post)
```

### Frontend Components

- `SearchBox` — input field with debouncing
- `SearchResults` — paginated result list
- `TagInput` — multi-select with autocomplete
- `TagFilter` — chip-based tag filtering

### Migration & Deployment

- Prisma migration: create tags, post_tags tables, tsvector column
- Seed script: parse existing post titles/descriptions for tags (optional, Phase 3.3)
- No downtime: can be deployed progressively

---

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Phase Planning

- `.planning/PROJECT.md` — Overall Phase 3 mission and constraints
- `.planning/ROADMAP.md` — Phase 3.1-3.3 breakdown and dependencies
- `.planning/REQUIREMENTS.md` — Phase 3 functional and non-functional requirements

### Ecosystem Research

- `.planning/research/SEARCH_SOLUTIONS.md` — Full-text search analysis (PostgreSQL FTS chosen)
- `.planning/research/TAGGING_PATTERNS.md` — Tagging system design patterns
- `.planning/research/IMPLEMENTATION_GUIDE.md` — Code examples for search and tagging

### Codebase Architecture

- `.planning/codebase/ARCHITECTURE.md` — System patterns and data flow
- `.planning/codebase/STRUCTURE.md` — Directory layout (apps/api, apps/web, packages/)
- `.planning/codebase/CONVENTIONS.md` — Code style and NestJS/React patterns
- `.planning/codebase/TESTING.md` — Test framework (Jest, Supertest for e2e)

---

## Deferred Ideas (Phase 3.2+)

- Tag hierarchy and parent-child relationships (Phase 4)
- Tag-based access control or permissions (Phase 4)
- Trending sort by popularity (Phase 3.2)
- Advanced search syntax (AND, OR, NOT) (Phase 4+)
- File content search via indexing service (Phase 4+)
- Machine learning tag suggestions (Phase 5+)
- Tag analytics dashboard (Phase 4+)

---

**Phase:** 3.1 — Full-Text Search & Tagging Foundation
**Context prepared:** 2026-03-19
**Ready for:** Planning phase
