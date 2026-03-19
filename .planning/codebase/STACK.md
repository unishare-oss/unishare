# Technology Stack

**Analysis Date:** 2026-03-19

## Languages

**Primary:**

- TypeScript 5.4+ - Used across API and web applications
- JavaScript (Node.js) - Runtime for all applications

**Secondary:**

- Bash - Dockerfile scripts and CI/CD workflows
- Markdown - Documentation

## Runtime

**Environment:**

- Node.js 22.x (Alpine Linux in Docker)
- pnpm 10.29.2

**Package Manager:**

- pnpm 10.29.2
- Lockfile: `pnpm-lock.yaml` (present)
- Workspace: Multi-package monorepo (`pnpm-workspace.yaml`)

## Frameworks

**Backend:**

- NestJS 11.0.1 - Full-featured backend framework
  - Location: `apps/api/src`
  - Built with SWC compiler for fast builds
  - Express adapter for HTTP

**Frontend:**

- Next.js 16.1.6 - React framework with SSR/SSG
  - Location: `apps/web`
  - Output: Standalone for containerization
  - React 19.2.3

**Testing:**

- Jest 30.0.0 - Test runner for API
  - Config: `apps/api/package.json` (inline jest config)
  - Uses ts-jest transformer for TypeScript
  - No E2E testing framework configured

**Build/Dev:**

- Turbo (latest) - Monorepo build orchestration
- SWC 1.15.13 - Fast TypeScript compiler
- Prisma 7.4.1 - ORM and database toolkit
- Orval 8.4.2 - OpenAPI client generation (API contract-first approach)

## Key Dependencies

**Critical - Backend:**

- `@nestjs/common` 11.0.1 - Core NestJS framework
- `@nestjs/platform-express` 11.0.1 - Express integration
- `@nestjs/swagger` 11.2.6 - OpenAPI/Swagger documentation
- `@nestjs/config` 4.0.3 - Environment configuration management
- `@nestjs/schedule` 6.1.1 - Scheduled tasks/cron jobs
- `@prisma/client` 7.4.1 - Database ORM
- `@prisma/adapter-pg` 7.4.1 - PostgreSQL adapter for Prisma
- `pg` 8.13.0 - PostgreSQL driver
- `better-auth` 1.4.19 - Authentication framework
- `@thallesp/nestjs-better-auth` 2.4.0 - NestJS integration for better-auth
- `@aws-sdk/client-s3` 3.998.0 - S3 file storage client
- `@aws-sdk/s3-request-presigner` 3.998.0 - Pre-signed URL generation
- `helmet` 8.1.0 - Security headers middleware
- `class-validator` 0.14.3 - DTO validation
- `class-transformer` 0.5.1 - DTO serialization

**Critical - Frontend:**

- `next` 16.1.6 - React framework
- `react` 19.2.3 - UI library
- `react-dom` 19.2.3 - React rendering
- `@tanstack/react-query` 5.90.21 - Server state management
- `zustand` 5.0.11 - Client state management
- `react-hook-form` 7.66.0 - Form state management
- `better-auth` 1.4.19 - Authentication client
- `radix-ui` 1.4.3 - Headless UI components
- `tailwindcss` 4 - Utility-first CSS framework
- `react-markdown` 10.1.0 - Markdown rendering
- `zod` 4.3.6 - Runtime schema validation

**PDF Handling:**

- `@embedpdf/*` 2.7.0 (multiple packages) - PDF viewer with plugins
  - Core, engines, models, annotation, bookmark, document-manager, fullscreen, history, interaction-manager, render, scroll, search, selection, tiling, viewport, zoom

**Utilities:**

- `nanoid` 5.1.6 - URL-safe unique ID generation
- `dotenv` 17.3.1 - Environment variable loading
- `date-fns` 4.1.0 - Date utilities
- `clsx` 2.1.1 - Conditional className utility
- `lucide-react` 0.575.0 - Icon library
- `next-themes` 0.4.6 - Theme management
- `sonner` 2.0.7 - Toast notifications
- `tailwind-merge` 3.5.0 - Merge Tailwind classes
- `prismjs` 1.30.0 - Syntax highlighting

## Configuration

**Environment:**

- `.env.example` files present in root and `apps/web`
- Configuration via environment variables
- `@nestjs/config` for dynamic configuration loading
- Secrets required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_URL`
- Optional: Cloud provider credentials for S3, OAuth providers

**Build:**

- `tsconfig.json` files in each app and shared `packages/tsconfig`
- Prettier 3.3.0+ for code formatting (config: `.prettierrc`)
- ESLint 9.18.0+ for linting
- Husky 9.1.7 for git hooks
- lint-staged 16.2.7 for pre-commit linting
- commitlint 20.4.2 for conventional commit validation

## Platform Requirements

**Development:**

- Node.js >= 20 (specified in root `package.json`)
- pnpm >= 10
- PostgreSQL 12+ (for local development)
- Git with hooks support

**Production:**

- Docker with multi-stage builds
- Docker images based on node:22-alpine
- PostgreSQL 12+ database
- S3-compatible object storage (AWS S3, Cloudflare R2, or MinIO)
- Environment variables for auth providers (Google, Microsoft)

**Deployment:**

- Docker containers for both API and web
- Health checks configured for both services (HTTP endpoints)
- API: Port 3001, health check at `/health`
- Web: Port 3000, health check at `/api/health`
- Standalone Next.js output for reduced container size
- GitHub Actions for CI/CD (workflows in `.github/workflows/`)

---

_Stack analysis: 2026-03-19_
