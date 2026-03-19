# External Integrations

**Analysis Date:** 2026-03-19

## APIs & External Services

**Authentication Providers:**

- Google OAuth 2.0 - Social login
  - SDK/Client: `better-auth` (built-in)
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Implementation: `apps/api/src/auth/auth.config.ts`

- Microsoft OAuth 2.0 - Social login (Entra ID)
  - SDK/Client: `better-auth` (built-in)
  - Auth: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`
  - Implementation: `apps/api/src/auth/auth.config.ts`
  - Default tenant: `common` (multi-tenant)

**PDF Viewer Integration:**

- EmbedPDF - PDF rendering and annotation
  - SDK/Client: `@embedpdf/*` packages (17 packages total)
  - Location: `apps/web` dependencies
  - Provides: PDF viewer, annotations, bookmarks, search, zoom, etc.

## Data Storage

**Databases:**

- PostgreSQL 12+
  - Connection: `DATABASE_URL` environment variable
  - Adapter: `@prisma/adapter-pg`
  - Client: Prisma ORM with `@prisma/client`
  - Configuration: `apps/api/prisma/schema.prisma`
  - Generation: Prisma client auto-generated to `apps/api/src/generated/prisma`

**File Storage:**

- S3-compatible object storage (supports AWS S3, Cloudflare R2, MinIO, etc.)
  - SDK/Client: `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
  - Configuration: `apps/api/src/modules/storage/storage.service.ts`
  - Environment variables:
    - `S3_ENDPOINT` - Storage endpoint URL (required)
    - `S3_REGION` - Region identifier (default: `auto`)
    - `S3_ACCESS_KEY_ID` - Access credentials (required)
    - `S3_SECRET_ACCESS_KEY` - Secret key (required)
    - `S3_BUCKET` - Bucket name (required)
    - `STORAGE_PUBLIC_URL` - Public URL for serving files (required)
  - Supported MIME types:
    - Documents: PDF, Word, Excel, PowerPoint, LibreOffice formats, EPUB, text files, archives
    - Images: JPEG, PNG, WebP
    - Size limits: Documents 50MB, Images 10MB
  - Features: Pre-signed URLs for secure uploads/downloads, file existence checks, secure key validation

**Caching:**

- Not detected - Redis or similar not used
- In-memory state via React Query and Zustand on frontend

## Authentication & Identity

**Auth Provider:**

- Better Auth - Modern authentication framework
  - Implementation: `apps/api/src/auth/auth.config.ts`
  - Approach:
    - Email/password enabled
    - Social providers: Google and Microsoft
    - Session-based with Prisma adapter
    - Access control plugin with role-based permissions
    - User roles: STUDENT, MODERATOR, ADMIN
    - Session expiry: 7 days
    - Session update age: 1 hour
  - NestJS Integration: `@thallesp/nestjs-better-auth` decorators
    - `@Session()` - Current user session
    - `@UserSession()` - Full user object with role
    - `@OptionalAuth()` - Optional authentication
    - `@Roles()` - Role-based access control
  - Additional Fields:
    - `role` - User role (default: STUDENT)
    - `departmentId` - Department affiliation
  - CORS Configuration:
    - Trusted origins: `http://localhost:3000` + `FRONTEND_URL`
    - Credentials enabled for cross-origin requests

## Monitoring & Observability

**Error Tracking:**

- Not detected - No error tracking service configured

**Logs:**

- Console logging via NestJS Logger
- Custom LoggerMiddleware for request logging (`apps/api/src/common/middleware`)
- Response interception for structured logging (`apps/api/src/common/interceptors/response.interceptor`)

**Health Checks:**

- API: GET `/health` returns 200 OK
- Web: GET `/api/health` returns 200 OK (proxied to API)
- Docker health checks: 30s interval, 10s timeout, 3 retries (API), 5s timeout (web)

## CI/CD & Deployment

**Hosting:**

- Docker containers (API and Web separately)
- Requires external PostgreSQL database
- Requires S3-compatible object storage

**CI Pipeline:**

- GitHub Actions (`.github/workflows/`)
  - `ci.yml` - Lint and build on push/PR to main
    - Node.js 24
    - pnpm caching
    - Steps: Install, generate Prisma, generate API client, lint, build
  - `docker.yml` - Build and push Docker images on push to main
    - Change detection for selective builds (API/web)
    - Manual trigger with force flags for rebuild
    - Docker image publishing (location not specified - likely Docker Hub or GHCR)

**Build Artifacts:**

- Docker images for both API and web applications
- Next.js standalone output (minimal)
- Prisma generated client

## Environment Configuration

**Required env vars (API):**

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Session signing key
- `BETTER_AUTH_URL` - Base URL for auth endpoints (e.g., `http://localhost:3001/api/auth`)
- `FRONTEND_URL` - Web app URL for CORS
- `S3_ENDPOINT` - Object storage endpoint
- `S3_ACCESS_KEY_ID` - S3 credentials
- `S3_SECRET_ACCESS_KEY` - S3 credentials
- `S3_BUCKET` - S3 bucket name
- `STORAGE_PUBLIC_URL` - Public storage URL for file links

**Optional env vars (API):**

- `NODE_ENV` - Environment (development/production)
- `S3_REGION` - S3 region (default: `auto`)
- `GOOGLE_CLIENT_ID` - Google OAuth credentials
- `GOOGLE_CLIENT_SECRET` - Google OAuth credentials
- `MICROSOFT_CLIENT_ID` - Microsoft OAuth credentials
- `MICROSOFT_CLIENT_SECRET` - Microsoft OAuth credentials
- `MICROSOFT_TENANT_ID` - Microsoft tenant (default: `common`)

**Required env vars (Web):**

- `API_URL` - Backend API base URL (e.g., `http://localhost:3001`)
- `NEXT_PUBLIC_APP_URL` - Frontend app URL for client-side navigation (e.g., `http://localhost:3000`)

**Secrets location:**

- Environment variables via hosting platform (not in repo)
- `.env` files listed in `.gitignore` (not committed)

## API Contract

**OpenAPI/Swagger:**

- Specification generated from NestJS controllers
- Location: `apps/web/openapi.json` (generated on demand via `npm run api:sync`)
- Swagger UI available in development at API `/api/docs`
- OpenAPI plugin disabled in production

**API Client Generation:**

- Tool: Orval 8.4.2
- Config: `apps/web/orval.config.ts`
- Input: `apps/web/openapi.json`
- Output: `apps/web/src/lib/api/generated/`
- Client: React Query with custom fetch mutator
- Custom Fetcher: `apps/web/src/lib/api/fetcher.ts` (handles authentication, error handling)
- Mode: Tags-split (separate files per endpoint tag)

**Frontend-Backend Communication:**

- Next.js API routes proxy to backend: `/api/:slug*` → `${API_URL}/api/:slug*`
- Custom fetch client with React Query hooks
- Type-safe generated hooks for all API operations

## Webhooks & Callbacks

**Incoming:**

- Not detected

**Outgoing:**

- Not detected

---

_Integration audit: 2026-03-19_
