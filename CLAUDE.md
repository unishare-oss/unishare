# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Before Starting Any Task

Always read the `.planning/` directory to get an up-to-date overview of the project before doing any work:

- `.planning/codebase/` — architecture, stack, conventions, structure, integrations, testing, and concerns docs
- `.planning/todos/pending/` — outstanding tasks and work in progress
- `.planning/todos/completed/` — finished work (useful for understanding recent changes)

These files are the authoritative source of project context and should be consulted before planning or implementing anything.

## Project Overview

**Unishare** is an open-source academic content sharing platform for university students — a self-hostable monorepo with a NestJS API and Next.js frontend.

## Commands

### Root (run from repo root)

```bash
pnpm dev              # Start both apps concurrently via Turborepo
pnpm build            # Build all workspaces
pnpm lint             # Lint all workspaces
pnpm format           # Format all files with Prettier
pnpm api:sync         # Pull OpenAPI spec from API and regenerate client types
```

### API (`apps/api`)

```bash
pnpm --filter api dev          # NestJS dev server (SWC, watch mode)
pnpm --filter api build        # Production build
pnpm --filter api test         # Jest unit tests
pnpm --filter api test:e2e     # E2E tests
pnpm --filter api test:watch   # Jest in watch mode
pnpm --filter api db:migrate   # Run Prisma migrations (dev)
pnpm --filter api db:push      # Push schema without migration
pnpm --filter api db:studio    # Open Prisma Studio
```

### Web (`apps/web`)

```bash
pnpm --filter web dev           # Next.js dev server
pnpm --filter web build         # Production build
pnpm --filter web test          # Vitest
pnpm --filter web test:watch    # Vitest watch mode
pnpm --filter web api:generate  # Regenerate API client from OpenAPI spec (orval)
```

## Architecture

### Monorepo Structure

```
apps/
  api/   — NestJS 11 backend (port 3001)
  web/   — Next.js 16 frontend (port 3000)
packages/
  types/    — Shared TypeScript types
  tsconfig/ — Shared TS configs
```

Turborepo orchestrates builds; pnpm workspaces manage dependencies.

### API Contract & Code Generation

The API generates an OpenAPI spec at `http://localhost:3001/docs`. `pnpm api:sync` fetches it and runs **Orval** to generate TanStack Query hooks into `apps/web/src/lib/api/generated/`. **Treat generated files as read-only.** To add a new endpoint: define it in NestJS → run `pnpm api:sync` → use the generated hook in the frontend.

### Backend (`apps/api`)

- **NestJS modules** live in `src/modules/` (posts, users, chat, quizzes, notifications, storage, etc.)
- **Auth** is handled by Better Auth (`src/auth/`) with Prisma adapter; supports email/password, Google OAuth, and Microsoft Entra ID
- **Database**: PostgreSQL via Prisma ORM (`prisma/schema.prisma`); generated client is in `src/generated/`
- **WebSockets**: Socket.io for real-time chat and notifications
- **File storage**: S3-compatible (Cloudflare R2, MinIO, or AWS S3) via the storage module
- **AI**: Optional integrations for Groq, Gemini, and Ollama (post summary generation)
- **Validation**: `class-validator` + `class-transformer` on DTOs; response envelope is `{ success, message, data }`

### Frontend (`apps/web`)

- **Next.js App Router** with two route groups: `(app)/` (authenticated) and `(auth)/` (unauthenticated)
- **Server state**: TanStack Query 5 using generated Orval hooks
- **UI state**: Zustand stores (settings, theme, sidebar, etc.)
- **Styling**: Tailwind CSS 4 with 12 built-in themes (Catppuccin, Nord, Tokyo Night, etc.) stored in Zustand and persisted to localStorage
- **Auth client**: Better Auth; `src/lib/auth/` exposes the auth instance; `src/contexts/auth-context.tsx` provides session to the tree
- **Permissions**: Role-based (`STUDENT` / `ADMIN`) checked via `src/lib/permissions.ts`
- **Real-time**: Socket.io client wired up in feature hooks

### Key Data Flow

1. User action → React Hook Form + Zod validation
2. Submit → generated TanStack Query mutation (wraps `fetch` with auth cookie)
3. NestJS controller → service → Prisma → PostgreSQL
4. Response → TanStack Query cache invalidation → UI update

### Post Lifecycle

Posts follow a moderation workflow: `DRAFT → PENDING_APPROVAL → PUBLISHED` (or `REJECTED`). Admins approve/reject via the admin panel.

## Planning Workflow

Before implementing any feature:

1. Check `docs/{feature-name}/planning.md` for existing plans and `platform-phases.md` for roadmap context.
2. Create or update `docs/{feature-name}/planning.md` with: feature overview, API design, data model, folder structure, trade-offs, and step-by-step plan.
3. Present the plan and wait for approval before writing any code.
4. After each step, show what changed and ask before continuing or committing.

After implementation, always ask before staging or committing changes.

## Implementation Log

After completing any implementation, write a log file at:

```
docs/{feature-name}/{YYYY-MM-DD}.md
```

The log should cover: what was implemented, files changed, any decisions made, and known limitations or follow-ups. Use today's date (ISO format) in the filename.

## Environment Setup

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Minimum required variables:

- `apps/api/.env`: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_URL`
- `apps/web/.env`: `NEXT_PUBLIC_API_URL`, `BETTER_AUTH_SECRET`

A Docker Compose file is included for local PostgreSQL (`docker-compose.yml`). After standing up the DB, run `pnpm --filter api db:migrate` then `pnpm --filter api db:push` and seed if needed.

## Conventions

- Use `pnpm` for all package management; never `npm` or `yarn`.
- Keep frontend/backend boundaries clean — no direct Prisma imports in `apps/web`.
- New API modules follow the NestJS module pattern: `module.ts`, `controller.ts`, `service.ts`, `dto/`.
- New frontend features go in `src/features/<feature>/` for hooks/logic and `src/components/` for shared UI.
- Swagger decorators (`@ApiOperation`, `@ApiResponse`) are required on all new controller endpoints so `api:sync` picks them up correctly.
