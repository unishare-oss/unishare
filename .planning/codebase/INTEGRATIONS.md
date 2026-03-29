# External Integrations

**Analysis Date:** 2025-03-24

## APIs & External Services

**Authentication:**
- Google - Social login provider integrated via Better-Auth.
  - SDK/Client: `better-auth`
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Microsoft - Social login provider integrated via Better-Auth (Entra ID).
  - SDK/Client: `better-auth`
  - Auth: `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`

**Collaboration:**
- Socket.io - Real-time synchronization for notifications and whiteboard collaboration.
  - Client: `socket.io-client`
  - Auth: `better-auth.session_token` cookie

## Data Storage

**Databases:**
- PostgreSQL - Primary relational database provider.
  - Connection: `DATABASE_URL`
  - Client: Prisma ORM (`@prisma/client`) with `@prisma/adapter-pg`

**File Storage:**
- S3 (compatible) - Used for storing documents, images, and other file uploads.
  - Client: `@aws-sdk/client-s3`
  - Service: Configured via `S3_ENDPOINT` and `S3_BUCKET`.

**Caching:**
- None detected (other than client-side `TanStack Query` and `Zustand` state management).

## Authentication & Identity

**Auth Provider:**
- Custom / Better-Auth - Comprehensive identity and session management.
  - Implementation: `apps/api/src/auth/auth.config.ts` (backend) and `apps/web/src/lib/auth/client.ts` (frontend).
  - Plugins: `admin` for role-based access, `anonymous` for guest sessions.

## Monitoring & Observability

**Error Tracking:**
- None detected.

**Logs:**
- Console-based logging via NestJS `Logger` and standard output for Next.js.

## CI/CD & Deployment

**Hosting:**
- Self-hosted via Coolify - Triggered via deployment webhooks.
- Image Registry: GitHub Container Registry (GHCR).

**CI Pipeline:**
- GitHub Actions - Defined in `.github/workflows/ci.yml` (build/lint) and `.github/workflows/docker.yml` (deploy).

## Environment Configuration

**Required env vars:**
- `DATABASE_URL`: PostgreSQL connection string.
- `BETTER_AUTH_SECRET`: Secret key for authentication.
- `BETTER_AUTH_URL`: Canonical URL for auth endpoints.
- `FRONTEND_URL`: URL of the frontend application for CORS/OAuth.
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`: Storage configuration.

**Secrets location:**
- Managed as environment variables in GitHub Secrets (for CI/CD) and locally via `.env` files.

## Webhooks & Callbacks

**Incoming:**
- `COOLIFY_WEBHOOK_API` / `COOLIFY_WEBHOOK_WEB`: Deployment triggers used by GitHub Actions to notify Coolify of new builds.

**Outgoing:**
- OAuth callbacks: Redirect URLs for Google and Microsoft authentication handled by Better-Auth.

---

*Integration audit: 2025-03-24*
