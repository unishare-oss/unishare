# Technology Stack

**Analysis Date:** 2025-03-24

## Languages

**Primary:**
- TypeScript 5.7+ - Used throughout the monorepo for type-safe development.

**Secondary:**
- SQL (via Prisma) - PostgreSQL dialect used for schema and migrations.

## Runtime

**Environment:**
- Node.js >=20 (CI uses v24) - Primary execution environment.
- Docker - Used for containerization and deployment.

**Package Manager:**
- pnpm >=10 - Workspace manager for the monorepo.
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Next.js 16.1.6 - Frontend framework (React 19).
- NestJS 11.0.1 - Backend framework (Express-based).

**Testing:**
- Vitest 4.1.0 - Used for frontend unit and integration tests.
- Jest 30.0.0 - Used for backend unit and e2e tests.

**Build/Dev:**
- Turborepo - Monorepo orchestration tool.
- Orval 8.4.2 - OpenAPI client generator for the frontend.
- SWC - Fast TypeScript/JavaScript compiler for development and build.

## Key Dependencies

**Critical:**
- Prisma 7.4.1 - ORM for PostgreSQL database management.
- Better-Auth 1.4.19 - Unified authentication library for both backend and frontend.
- Tailwind CSS 4 - Styling framework for the web application.
- Zustand 5.0.11 - Client-side state management.
- TanStack Query 5.90.21 - Server-side state fetching and caching.

**Infrastructure:**
- Socket.io 4.8.3 - Real-time bidirectional communication.
- Yjs 13.6.30 - CRDT framework for real-time collaboration features (whiteboards, editors).
- @aws-sdk/client-s3 3.998.0 - AWS S3 client for storage operations.

## Configuration

**Environment:**
- Configured via `.env` files and `ConfigModule` (NestJS) or `next.config.ts`.
- Required configs: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `S3_ENDPOINT`, `FRONTEND_URL`.

**Build:**
- `turbo.json`: Monorepo task pipeline.
- `apps/api/nest-cli.json`: NestJS build config.
- `apps/web/next.config.ts`: Next.js build config.

## Platform Requirements

**Development:**
- Node.js 20+
- pnpm 10+
- PostgreSQL (for Prisma)
- S3-compatible storage (localstack or MinIO for dev)

**Production:**
- Linux-based Docker containers.
- GHCR for image hosting.
- Coolify for deployment management.

---

*Stack analysis: 2025-03-24*
