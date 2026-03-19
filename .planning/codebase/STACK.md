# Technology Stack

**Analysis Date:** 2025-01-17

## Languages

**Primary:**

- TypeScript 5.4+ - Used throughout both web and API applications
- JavaScript/Node.js - Runtime for build tools and dependencies

**Secondary:**

- SQL - PostgreSQL database queries via Prisma ORM

## Runtime

**Environment:**

- Node.js 22 (Alpine Linux in Docker)
- Minimum Node version: >=20 (specified in `package.json`)

**Package Manager:**

- pnpm 10.29.2 - Monorepo package manager
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**

- **Next.js 16.1.6** - Frontend framework (`apps/web`)
  - Output: Standalone (optimized Docker builds)
  - Image optimization: Configured for remote patterns
- **NestJS 11.0.1** - Backend framework (`apps/api`)
  - SWC compiler for fast builds
  - Modular architecture with feature modules

**Authentication:**

- **better-auth 1.4.19** - Authentication library
  - Adapters: Prisma adapter
  - Plugins: Admin/RBAC, OpenAPI documentation
  - Methods: Email/password + OAuth social providers

**Database & ORM:**

- **Prisma 7.4.1** - Database ORM and migrations
  - Adapter: `@prisma/adapter-pg` for PostgreSQL
  - Generator: Custom output to `src/generated/prisma`
  - Client module format: CJS (common JS)

**API & HTTP:**

- **React Query (@tanstack/react-query) 5.90.21** - Data fetching (frontend)
- **Orval 8.4.2** - OpenAPI client generator
  - Config: `apps/web/orval.config.ts`
  - Output: React Query hooks in `src/lib/api/generated`
  - Custom fetcher: `src/lib/api/fetcher.ts`

**UI/Styling:**

- **Tailwind CSS 4** - Utility-first CSS framework
- **Radix UI 1.4.3** - Headless component library
- **Lucide React 0.575.0** - Icon library
- **next-themes 0.4.6** - Dark mode support
- **Sonner 2.0.7** - Toast notifications
- **class-variance-authority 0.7.1** - Component variants
- **clsx 2.1.1** - Conditional CSS classes
- **tailwind-merge 3.5.0** - Tailwind CSS merging

**Forms & Validation:**

- **React Hook Form 7.66.0** - Form state management
- **@hookform/resolvers 5.2.2** - Form validation resolvers
- **Zod 4.3.6** - TypeScript-first schema validation
- **class-validator 0.14.3** - Decorator-based validation (API)
- **class-transformer 0.5.1** - DTO transformation (API)

**PDF Handling:**

- **@embedpdf/** suite 2.7.0 - Complete PDF viewer library
  - Includes: core, engines, models, plugins for annotation, bookmarks, search, zoom, fullscreen, etc.

**State Management:**

- **Zustand 5.0.11** - Lightweight state management library

**Content & Markdown:**

- **react-markdown 10.1.0** - Markdown rendering for React
- **prismjs 1.30.0** - Syntax highlighting
- **date-fns 4.1.0** - Date utilities

**File Handling (Frontend):**

- **sharp** - Image optimization (built dependency)

## Testing

**Framework:**

- **Jest 30.0.0** - Unit and integration testing (API)
  - Config: Inline in `apps/api/package.json`
  - Preset: `ts-jest` for TypeScript support
  - Coverage output: `../coverage`

**Testing Utilities:**

- **@nestjs/testing 11.0.1** - NestJS testing module
- **supertest 7.0.0** - HTTP assertion library
- **@types/jest 30.0.0** - Jest type definitions

**TypeScript:**

- **ts-jest 29.2.5** - Jest TypeScript preprocessor
- **ts-loader 9.5.2** - Webpack TypeScript loader
- **ts-node 10.9.2** - TypeScript execution

## Build Tools

**Development:**

- **swc (@swc/core, @swc/cli) 1.15.13** - Fast TypeScript compiler
  - Used in: `nest start -b swc --watch` for API dev

**Bundling:**

- Next.js built-in bundling (webpack)
- NestJS built-in compilation

**Schemas:**

- **@nestjs/swagger 11.2.6** - OpenAPI/Swagger documentation
- **@nestjs/cli 11.0.0** - NestJS CLI for scaffolding

**Linting & Formatting:**

- **ESLint 9.18.0** - Code linting
  - Config: `eslint.config.mjs` in both apps
  - Plugins: eslint-config-next (web), prettier integration (api)
- **Prettier 3.3.0+ / 3.4.2** - Code formatter
  - Config: `.prettierrc` at root
  - Settings: semicolons: false, single quotes, trailing commas, print width 100

**Commit Linting:**

- **commitlint 20.4.2** - Conventional commit validation
- **husky 9.1.7** - Git hooks manager
- **lint-staged 16.2.7** - Run linters on staged files

## Key Dependencies

**Critical:**

- **@aws-sdk/client-s3 3.998.0** - AWS S3 API client (file uploads)
- **@aws-sdk/s3-request-presigner 3.998.0** - Generate presigned URLs
- **pg 8.13.0** - PostgreSQL driver
- **helmet 8.1.0** - Security headers middleware
- **nanoid 5.1.6** - Unique ID generation
- **dotenv 17.3.1** - Environment variable loading
- **reflect-metadata 0.2.2** - Required by NestJS and TypeScript decorators
- **rxjs 7.8.1** - Reactive extensions (NestJS foundation)
- **@nestjs/config 4.0.3** - Configuration management
- **@nestjs/schedule 6.1.1** - Task scheduling and cron jobs
- **@nestjs/platform-express 11.0.1** - Express server integration

**Infrastructure:**

- **tsconfig-paths 4.2.0** - Path alias resolution at runtime
- **@thallesp/nestjs-better-auth 2.4.0** - NestJS integration for better-auth
- **@unishare/types** - Shared type definitions (workspace package)
- **@unishare/tsconfig** - Shared TypeScript config (workspace packages)

## Configuration

**Environment:**

- Database: PostgreSQL URL via `DATABASE_URL`
- Auth secrets: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- Storage: S3-compatible (endpoint, credentials) via `S3_*` variables
- Social auth: Google and Microsoft OAuth via `GOOGLE_*` and `MICROSOFT_*`
- Deployment: `FRONTEND_URL` and `NODE_ENV`
- See `apps/api/.env.example` for production-required variables

**Build:**

- `tsconfig.json` - Per-app TypeScript config (extends shared tsconfig)
- `turbo.json` - Build orchestration and task dependencies
- `next.config.ts` - Next.js configuration with image remote patterns
- `nest-cli.json` - NestJS CLI configuration
- `.npmrc` - Built dependencies: `@prisma/engines`, `prisma`, `@swc/core`, `esbuild`, `sharp`

**Package Manager:**

- Monorepo: `pnpm-workspace.yaml` defines workspaces: `apps/*`, `packages/*`
- Ignored built dependencies: `sharp`, `unrs-resolver`

## Platform Requirements

**Development:**

- Node.js >= 20
- pnpm >= 10
- OpenSSL (for database connections)
- Docker (for containerized development)

**Production:**

- Node.js 22 Alpine
- PostgreSQL 10+
- S3-compatible storage (AWS S3, Cloudflare R2, or compatible)
- Docker container runtime

**Deployment Targets:**

- Docker (multi-stage builds defined)
- Any Node.js 22 compatible hosting (Vercel, Railway, AWS ECS, etc.)

## Special Build Considerations

**Prisma:**

- Engines built as binary: `onlyBuiltDependencies` in root `package.json`
- Generator output: CJS format to `src/generated/prisma`
- Migrations stored in: `apps/api/prisma/migrations`

**Docker Images:**

- API: Node 22 Alpine, exposes port 3001, includes health check
- Web: Node 22 Alpine, exposes port 3000, includes health check
- Both include OpenSSL for SSL/TLS connections

**TypeScript:**

- Strict mode enabled across all projects
- Path aliases: `@/*` in both apps
- Shared base configs: `@unishare/tsconfig/nextjs.json` and `@unishare/tsconfig/nestjs.json`

---

_Stack analysis: 2025-01-17_
