# External Integrations

**Analysis Date:** 2025-02-13

## APIs & External Services

**AI Services:**
- Groq - Used for fast AI summarization of posts.
  - SDK: `groq-sdk`
  - Auth: `AI_SUMMARY_API_KEY`
- Google Gemini - Alternative AI provider for post summarization.
  - SDK: `@google/generative-ai`
  - Auth: `AI_SUMMARY_API_KEY`
- Ollama - Self-hosted AI provider option.
  - Auth: `AI_SUMMARY_ENDPOINT` (Local/Self-hosted)

**Analytics:**
- Custom Analytics Service - Track user interactions and site visits.
  - Implementation: `apps/web/app/layout.tsx` (Script injection)
  - Endpoint: `https://analytics.psstee.dev/script.js`

## Data Storage

**Databases:**
- PostgreSQL 17 - Primary data storage.
  - Connection: `DATABASE_URL`
  - Client: Prisma ORM (`@prisma/client`)

**File Storage:**
- S3-Compatible Storage - Used for storing uploaded files (e.g., lecture notes, past papers).
  - Providers Supported: Cloudflare R2, MinIO, AWS S3.
  - SDK: `@aws-sdk/client-s3`
  - Auth: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`

**Caching:**
- None detected - Prisma and TanStack Query handle data caching.

## Authentication & Identity

**Auth Provider:**
- Better Auth - Integrated authentication solution.
  - Implementation: `apps/api/src/auth/auth.config.ts`, `apps/web/contexts/auth-context.tsx`
  - Social Providers: Google (`GOOGLE_CLIENT_ID`), Microsoft (`MICROSOFT_CLIENT_ID`)

## Monitoring & Observability

**Error Tracking:**
- None detected.

**Logs:**
- NestJS Logger - API logs in development and production.
- Custom Logger Middleware - Request/Response logging in NestJS (`apps/api/src/common/middleware/logger.middleware.ts`).

## CI/CD & Deployment

**Hosting:**
- Dockerized deployment (Self-hosted or Cloud platform).
- `docker-compose.yml` optimized for Oracle Cloud instances.

**CI Pipeline:**
- GitHub Actions - CI/CD workflow defined in `.github/workflows/`.
  - `ci.yml`: Standard CI for linting and testing.
  - `docker.yml`: Build and push Docker images.
  - `release.yml`: Automated release with Semantic Release and Changesets.

## Environment Configuration

**Required env vars:**
- `DATABASE_URL`: PostgreSQL connection string.
- `BETTER_AUTH_SECRET`: Secret for auth token signing.
- `BETTER_AUTH_URL`: API URL for auth callback.
- `FRONTEND_URL`: URL of the web frontend.

**Secrets location:**
- Stored in `.env` (development) and passed via Docker environments or CI/CD secrets (production).

## Webhooks & Callbacks

**Incoming:**
- Better Auth callbacks: `/api/auth/callback/[provider]`
- OAuth redirects: Handle responses from Google and Microsoft.

**Outgoing:**
- AI API calls: Summarization requests to Groq or Gemini.

---

*Integration audit: 2025-02-13*
