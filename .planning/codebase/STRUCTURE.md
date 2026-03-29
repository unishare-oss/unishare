# Codebase Structure

**Analysis Date:** 2026-03-23

## Directory Layout

```
unishare/
├── apps/
│   ├── api/            # NestJS Backend
│   │   ├── prisma/     # Database schema and migrations
│   │   └── src/        # Backend source code
│   └── web/            # Next.js Frontend
│       ├── app/        # App Router pages and routes
│       ├── components/ # React components (shadcn/ui + custom)
│       └── src/        # Generated API clients and providers
├── packages/
│   ├── tsconfig/       # Shared TypeScript configurations
│   └── types/          # Shared TypeScript types
└── docs/               # Project documentation
```

## Directory Purposes

**apps/api/src/modules:**
- Purpose: Domain-driven modules containing backend logic.
- Key files: `posts/`, `users/`, `auth/`, `notifications/`.

**apps/web/app:**
- Purpose: Routing and layout for the frontend.
- Contains: Route groups like `(app)` for the main application and `(auth)` for authentication.

**apps/web/components:**
- Purpose: Reusable UI components.
- Key files: `ui/` (shadcn components), `posts/`, `shared/`.

## Key File Locations

**Entry Points:**
- `apps/api/src/main.ts`: Backend entry point.
- `apps/web/app/layout.tsx`: Frontend root layout.

**Configuration:**
- `apps/api/prisma/schema.prisma`: Database schema definition.
- `apps/web/next.config.ts`: Next.js configuration and API rewrites.
- `turbo.json`: Monorepo build pipeline config.

**Core Logic:**
- `apps/api/src/modules/*/`: Domain logic per module.
- `apps/web/lib/store.ts`: Zustand global state.

## Naming Conventions

**Files:**
- Backend: `name.controller.ts`, `name.service.ts`, `name.repository.ts`.
- Frontend: `kebab-case.tsx` for components and hooks.

**Directories:**
- Kebab-case for all directories.

## Where to Add New Code

**New Feature (Full-stack):**
1. Define DB schema in `apps/api/prisma/schema.prisma`.
2. Create a new module in `apps/api/src/modules/`.
3. Update `openapi.json` or let Swagger generate it to update frontend API hooks via Orval.
4. Add pages in `apps/web/app/` and components in `apps/web/components/`.

**Utilities:**
- Backend: `apps/api/src/common/utils/`.
- Frontend: `apps/web/lib/utils.ts`.
