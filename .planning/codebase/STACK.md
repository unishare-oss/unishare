# Technology Stack

**Analysis Date:** 2025-02-13

## Languages

**Primary:**
- TypeScript 6.0.2 - Used across the entire monorepo for type safety and modern features.

**Secondary:**
- SQL (via Prisma) - Used for database schema definitions in `apps/api/prisma/schema.prisma`.
- CSS (PostCSS/Tailwind) - Used for styling in the frontend application.

## Runtime

**Environment:**
- Node.js >=20 - Target runtime for both API and Web applications.
- Docker - Used for containerization and deployment (`Dockerfile.api`, `Dockerfile.web`, `docker-compose.yml`).

**Package Manager:**
- pnpm 10.29.2 - Used for workspace management and dependency resolution.
- Lockfile: `pnpm-lock.yaml` (Present)

## Frameworks

**Core:**
- Next.js 16.2.2 - React framework for the web frontend (`apps/web`).
- React 19.2.4 - UI library used in the frontend.
- NestJS 11.1.18 - Server-side framework for the backend API (`apps/api`).

**Testing:**
- Jest 30.3.0 - Used for API unit and E2E testing in `apps/api`.
- Vitest 4.1.2 - Used for frontend testing in `apps/web`.

**Build/Dev:**
- Turborepo - Monorepo build system for orchestration.
- SWC - Fast TypeScript/JavaScript compiler used in NestJS.
- Orval - API client generator from OpenAPI specs.

## Key Dependencies

**Critical:**
- Prisma 7.6.0 - ORM for database access and migrations in `apps/api`.
- Better Auth 1.5.6 - Authentication framework used in both API and Web.
- Tailwind CSS 4.2.2 - Utility-first CSS framework for styling.
- Radix UI - Primitive UI components for accessibility.
- TanStack Query 5.96.2 - Data fetching and caching in the frontend.
- Zustand 5.0.12 - State management in the frontend.

**Infrastructure:**
- PostgreSQL 17 - Primary database.
- AWS SDK (S3) 3.1024.0 - Used for file storage (S3-compatible).
- Socket.io 4.8.3 - Real-time communication for chat and collaboration.
- Yjs 13.6.30 - CRDT for real-time collaborative editing.

## Configuration

**Environment:**
- Configured using `.env` files and `dotenv`.
- Key configs include `DATABASE_URL`, `BETTER_AUTH_SECRET`, `FRONTEND_URL`, `API_URL`, and AI provider keys.

**Build:**
- `turbo.json`: Task orchestration for build, dev, lint, and format.
- `tsconfig.json`: TypeScript configuration, with base configs in `packages/tsconfig`.
- `next.config.ts`: Next.js configuration for the web app.
- `nest-cli.json`: NestJS CLI configuration for the API.

## Platform Requirements

**Development:**
- Node.js >=20
- pnpm >=10
- PostgreSQL (Local or Docker)
- S3-compatible storage (Cloudflare R2, Minio, etc.)

**Production:**
- Linux (Optimized for Oracle Cloud low-memory instances in `docker-compose.yml`)
- Docker & Docker Compose
- PostgreSQL 17

---

*Stack analysis: 2025-02-13*
