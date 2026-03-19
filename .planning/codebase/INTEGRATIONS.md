# External Integrations

**Analysis Date:** 2025-01-17

## APIs & External Services

**Storage:**

- **S3-Compatible Storage** - File upload and storage
  - Supports: AWS S3, Cloudflare R2, MinIO, or any S3-compatible service
  - SDK: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - Environment vars: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL`
  - File path: `apps/api/src/modules/storage/storage.service.ts`
  - Features: Upload, download, delete, presigned URL generation
  - Supports document uploads (50MB max), image uploads (10MB max)

## Data Storage

**Databases:**

- **PostgreSQL** - Primary relational database
  - Version: Any PostgreSQL 10+ (no specific version pinned)
  - Connection: `DATABASE_URL` environment variable
  - Client: `pg` (8.13.0) + `@prisma/client` ORM
  - Adapter: `@prisma/adapter-pg` for connection pooling
  - Schema location: `apps/api/prisma/schema.prisma`
  - Migrations location: `apps/api/prisma/migrations/`
  - Models: User, Post, Comment, Course, Department, File, Notification, Follow, PostRequest, etc.
  - Management: Prisma Studio accessible via `pnpm --filter api db:studio`

**File Storage:**

- S3-compatible service (Cloudflare R2 recommended in documentation)
- Local filesystem NOT supported - S3 is required for file uploads

**Caching:**

- None configured - no Redis or Memcached integration detected

## Authentication & Identity

**Auth Provider:**

- **better-auth 1.4.19** - Custom self-hosted authentication
  - Framework integration: `@thallesp/nestjs-better-auth` (NestJS wrapper)
  - Database: Prisma adapter storing sessions in PostgreSQL
  - Database provider: PostgreSQL

**Authentication Methods:**

1. **Email & Password**
   - Native implementation via better-auth
   - Password hashing: Handled by better-auth
   - Enabled: `emailAndPassword.enabled: true`
   - File: `apps/api/src/auth/auth.config.ts`

2. **OAuth Social Providers**
   - **Microsoft (Azure AD)**
     - Environment vars: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`
     - Tenant: Defaults to 'common' for multi-tenant
   - **Google**
     - Environment vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Session Management:**

- Duration: 7 days (60 _ 60 _ 24 \* 7)
- Auto-update age: 60 minutes
- Storage: PostgreSQL (via Prisma)
- Access control: Role-based (STUDENT, ADMIN, etc.)

**Authorization:**

- **RBAC (Role-Based Access Control)** via better-auth plugins
  - Roles: STUDENT (default), ADMIN
  - Access control library: `better-auth/plugins/access`
  - Custom roles: Defined in `apps/api/src/lib/permissions.ts`
  - Admin plugin configured with access control

**Frontend Auth:**

- Cookie-based session management
- Environment vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_URL`
- Production requirement: `BETTER_AUTH_URL` must be set to API domain

**Security:**

- Helmet middleware for HTTP headers
- CORS trusted origins: `http://localhost:3000` + `FRONTEND_URL`
- Session validation on each request

## API Documentation & Codegen

**OpenAPI/Swagger:**

- **@nestjs/swagger 11.2.6** - Auto-generates OpenAPI spec
  - Endpoint: `GET /docs-json` (in development)
  - Frontend generates client from this spec via Orval

**Client Generation:**

- **Orval 8.4.2** - OpenAPI to React client generator
  - Config: `apps/web/orval.config.ts`
  - Output format: Tags-split (separate files per endpoint tag)
  - HTTP client: Fetch API
  - React integration: React Query (TanStack Query)
  - Custom fetcher: `apps/web/src/lib/api/fetcher.ts`
  - Output directory: `apps/web/src/lib/api/generated`
  - Sync command: `pnpm api:sync` (downloads spec and regenerates types)

## Monitoring & Observability

**Error Tracking:**

- Not configured - No Sentry, LogRocket, or similar integration detected

**Logs:**

- Console-based logging only
- Winston or structured logging not configured
- Application runs in Docker with stdout logging
- Health checks: HTTP GET endpoints
  - API: `GET /health` (port 3001)
  - Web: `GET /api/health` (port 3000)

## CI/CD & Deployment

**Hosting:**

- No specific hosting service locked in
- Deployment: Docker containers
- Platforms compatible: Any Docker-compatible host (AWS ECS, Railway, Fly.io, Vercel, etc.)

**CI Pipeline:**

- Not configured in codebase
- GitHub Actions workflows may exist (`.github/workflows/` directory present but contents not analyzed)

**Docker Builds:**

- Multi-stage builds for optimization
- API Dockerfile: `Dockerfile.api` - Exposes port 3001
- Web Dockerfile: `Dockerfile.web` - Exposes port 3000
- Base images: Node 22 Alpine
- Health checks: Built-in to both Dockerfiles

**Build Environment Variables:**

- Web: `API_URL` (passed at build time for API rewrites)
- Both: `NODE_ENV=production`
- Both: Telemetry disabled (`NEXT_TELEMETRY_DISABLED=1`)

## Environment Configuration

**Required Environment Variables (Production):**

- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Session encryption secret
- `BETTER_AUTH_URL` - Auth API base URL (e.g., https://api.example.com)
- `FRONTEND_URL` - Frontend domain for CORS/redirects

**Optional OAuth Variables:**

- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT_ID`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

**Optional Storage Variables (S3):**

- `S3_ENDPOINT` - S3 service endpoint
- `S3_REGION` - S3 region (or "auto" for Cloudflare R2)
- `S3_BUCKET` - Bucket name
- `S3_ACCESS_KEY_ID` - AWS/S3 access key
- `S3_SECRET_ACCESS_KEY` - AWS/S3 secret key
- `STORAGE_PUBLIC_URL` - Public URL for served files

**Optional Configuration:**

- `ACADEMIC_START_MONTH` - Month (1-12) when academic year starts (default: 8)
- `PORT` - API port (default: 3001)

**Frontend-Only Variables:**

- `API_URL` - Backend API URL (default: http://localhost:3001)
- `NEXT_PUBLIC_APP_URL` - Frontend domain (public, exposed to browser)

**Secrets Location:**

- Local development: `.env` file in `apps/api/` (not committed)
- Example template: `apps/api/.env.example`
- Production: Via environment or secret management system (not defined in code)

## Webhooks & Callbacks

**Incoming Webhooks:**

- Not detected - No webhook endpoints configured

**Outgoing Webhooks:**

- Not detected - No external service notifications configured

**Callbacks:**

- OAuth redirects: Handled by better-auth (internal)
- API rewrites: Next.js middleware rewrites `/api/*` to backend API

## Inter-App Communication

**Frontend to Backend:**

- REST API via fetch
- Base path rewriting: Next.js rewrites `/api/*` to `API_URL/api/*`
- Routes defined via Orval-generated React Query hooks

**API Ports:**

- Development: API on 3001, Frontend on 3000
- Production: Same (Docker compose or orchestration handles)

## Data Models & Relationships

**Core Entities:**

- `User` - Student/admin accounts with roles, departments, followers
- `Post` - Course materials (exams, notes, past papers) with file attachments
- `Comment` - Discussion threads on posts
- `File` - Uploaded documents/images linked to posts
- `Course` - University courses with department relations
- `Department` - University departments
- `Notification` - User notifications for posts, comments, follows
- `Follow` - User follow relationships
- `PostRequest` - Community requests for specific course materials
- `Reaction` - Emoji reactions on posts/comments

**Database Constraints:**

- Foreign keys: Cascade deletes not explicitly shown but Prisma schema uses relations
- Unique constraints: Email, course code per department, post short code
- Indexes: On frequently queried columns (authorId, courseId, etc.)

## Integration with Build Tools

**API Spec Sync:**

- Command: `pnpm api:sync`
- Action: Fetches OpenAPI spec from running API and regenerates client types
- Dependency: API must be running on port 3001

**Deployment Sync:**

- Web build requires `API_URL` environment variable
- Builds are separate but coordinated via monorepo (`turbo.json`)
- Turbo manages build order and caching

---

_Integration audit: 2025-01-17_
