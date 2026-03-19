# Codebase Structure

**Analysis Date:** 2025-03-19

## Directory Layout

```
unishare/                                          # Monorepo root
├── apps/
│   ├── api/                                       # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts                           # Application entry point
│   │   │   ├── app.module.ts                     # Root module
│   │   │   ├── app.controller.ts                 # Root controller (health, home)
│   │   │   ├── app.service.ts                    # Root service
│   │   │   ├── auth/                             # Authentication configuration
│   │   │   │   └── auth.config.ts                # Better Auth setup
│   │   │   ├── common/                           # Cross-cutting concerns
│   │   │   │   ├── dto/                          # Shared DTOs
│   │   │   │   ├── filters/                      # Exception filters
│   │   │   │   ├── interceptors/                 # Response interceptors
│   │   │   │   ├── middleware/                   # Request middleware
│   │   │   │   ├── decorators/                   # Custom decorators
│   │   │   │   └── utils/                        # Shared utilities
│   │   │   ├── modules/                          # Domain modules
│   │   │   │   ├── posts/                        # Posts module
│   │   │   │   │   ├── posts.module.ts           # Module definition
│   │   │   │   │   ├── posts.controller.ts       # HTTP endpoints
│   │   │   │   │   ├── posts.service.ts          # Business logic
│   │   │   │   │   ├── posts.repository.ts       # Database queries
│   │   │   │   │   ├── dto/                      # DTOs for posts
│   │   │   │   │   ├── entities/                 # Response entities
│   │   │   │   │   └── comments/                 # Nested comments module
│   │   │   │   ├── users/                        # Users module
│   │   │   │   ├── departments/                  # Departments module
│   │   │   │   ├── courses/                      # Courses module
│   │   │   │   ├── files/                        # Files module
│   │   │   │   ├── notifications/                # Notifications module
│   │   │   │   ├── follows/                      # Follow relationships
│   │   │   │   ├── post-requests/                # Post requests module
│   │   │   │   ├── stats/                        # Statistics module
│   │   │   │   ├── storage/                      # AWS S3 integration
│   │   │   │   └── tasks/                        # Scheduled tasks
│   │   │   ├── prisma/                           # Prisma service
│   │   │   │   └── prisma.service.ts             # Database client wrapper
│   │   │   ├── generated/                        # Prisma generated types
│   │   │   │   └── prisma/                       # Generated Prisma client
│   │   │   ├── lib/                              # Utilities
│   │   │   │   └── permissions.ts                # Permission definitions
│   │   │   └── types/                            # TypeScript definitions
│   │   ├── prisma/                               # Prisma configuration
│   │   │   ├── schema.prisma                     # Database schema
│   │   │   ├── migrations/                       # Database migrations
│   │   │   ├── seed.ts                           # Database seeding
│   │   │   └── seeds/                            # Seed data files
│   │   ├── test/                                 # Test files
│   │   ├── dist/                                 # Compiled output (generated)
│   │   ├── package.json                          # Dependencies
│   │   ├── tsconfig.json                         # TypeScript config
│   │   ├── nest-cli.json                         # NestJS CLI config
│   │   └── prisma.config.ts                      # Prisma config file
│   │
│   └── web/                                       # Next.js frontend
│       ├── app/                                   # Next.js App Router
│       │   ├── layout.tsx                         # Root layout
│       │   ├── (app)/                             # Main app routes (grouped)
│       │   │   ├── layout.tsx                     # App layout wrapper
│       │   │   ├── page.tsx                       # Feed/homepage
│       │   │   ├── (protected)/                   # Protected routes
│       │   │   │   ├── layout.tsx                 # Auth guard wrapper
│       │   │   │   ├── posts/
│       │   │   │   │   ├── new/page.tsx           # Create post page
│       │   │   │   │   └── [id]/edit/page.tsx     # Edit post page
│       │   │   │   ├── my-posts/page.tsx          # User's posts
│       │   │   │   ├── admin/                     # Admin panel routes
│       │   │   │   ├── profile/page.tsx           # User profile
│       │   │   │   ├── requests/page.tsx          # Post requests list
│       │   │   │   └── notifications/page.tsx     # Notifications page
│       │   │   ├── posts/[id]/page.tsx            # Post detail (public)
│       │   │   ├── departments/page.tsx           # Departments list
│       │   │   ├── departments/[id]/page.tsx      # Department detail
│       │   │   ├── saved/page.tsx                 # Saved posts
│       │   │   ├── users/[id]/page.tsx            # User profile (public)
│       │   │   ├── analytics/page.tsx             # Analytics page
│       │   │   └── s/[shortCode]/page.tsx         # Short link redirect
│       │   ├── (auth)/                            # Auth routes (grouped)
│       │   │   └── login/page.tsx                 # Login page
│       │   ├── api/                               # Server actions / API routes
│       │   │   ├── health/route.ts                # Health check endpoint
│       │   │   └── notifications/stream/route.ts  # SSE notifications
│       │   ├── privacy/page.tsx                   # Privacy policy
│       │   ├── terms/page.tsx                     # Terms of service
│       │   ├── not-found.tsx                      # 404 page
│       │   ├── globals.css                        # Global styles
│       │   └── themes.css                         # Theme variables
│       ├── components/                            # React components
│       │   ├── ui/                                # Base UI components
│       │   │   ├── button.tsx
│       │   │   ├── input.tsx
│       │   │   ├── card.tsx
│       │   │   └── ... (shadcn/ui components)
│       │   ├── shared/                            # Shared layout components
│       │   │   ├── page-header.tsx
│       │   │   ├── loading-spinner.tsx
│       │   │   └── ... (generic components)
│       │   ├── posts/                             # Post feature components
│       │   │   ├── post-card.tsx
│       │   │   ├── post-form.tsx
│       │   │   └── ... (post-related)
│       │   ├── post-detail/                       # Post detail components
│       │   │   ├── post-header.tsx
│       │   │   ├── post-files.tsx
│       │   │   ├── comment-section.tsx
│       │   │   └── ... (detail-specific)
│       │   ├── profile/                           # Profile feature components
│       │   ├── departments/                       # Department components
│       │   ├── admin/                             # Admin panel components
│       │   ├── feed/                              # Feed/timeline components
│       │   ├── notifications/                     # Notification components
│       │   ├── requests/                          # Request components
│       │   ├── app-shell.tsx                      # App layout wrapper
│       │   ├── app-sidebar.tsx                    # Sidebar navigation
│       │   ├── mobile-nav.tsx                     # Mobile navigation
│       │   ├── auth-guard.tsx                     # Authentication guard
│       │   ├── guest-guard.tsx                    # Unauthenticated guard
│       │   ├── theme-provider.tsx                 # Theme context provider
│       │   └── academic-profile-modal.tsx         # Profile setup modal
│       ├── contexts/                              # React contexts
│       │   └── auth-context.tsx                   # Authentication context
│       ├── hooks/                                 # Custom React hooks
│       │   ├── use-academic-year.ts
│       │   ├── use-notifications.ts
│       │   └── use-on-click-outside.ts
│       ├── lib/                                   # Utilities and helpers
│       │   ├── api-types.ts                       # API type exports
│       │   ├── constants.ts                       # App constants
│       │   ├── store.ts                           # Zustand store (UI state)
│       │   ├── utils.ts                           # Helper utilities
│       │   ├── mock-data.ts                       # Mock data for dev
│       │   ├── posts/                             # Post utilities
│       │   └── api/                               # API client
│       │       ├── fetcher.ts                     # Custom fetch wrapper
│       │       └── generated/                     # Generated API hooks
│       │           ├── posts/posts.ts
│       │           ├── users/users.ts
│       │           ├── departments/departments.ts
│       │           ├── files/files.ts
│       │           ├── comments/comments.ts
│       │           ├── notifications/notifications.ts
│       │           ├── post-requests/post-requests.ts
│       │           ├── follows/follows.ts
│       │           ├── courses/courses.ts
│       │           ├── stats/stats.ts
│       │           ├── app/app.ts
│       │           ├── storage/storage.ts
│       │           └── unishareAPI.schemas.ts     # Generated types
│       ├── src/                                   # Source code subfolder
│       │   ├── providers/                         # React context providers
│       │   │   ├── index.tsx                      # Provider composition
│       │   │   └── query-provider.tsx             # React Query setup
│       │   ├── lib/                               # Core libraries
│       │   │   ├── api/                           # API client setup
│       │   │   │   ├── fetcher.ts
│       │   │   │   └── generated/
│       │   │   ├── auth/                          # Auth client
│       │   │   │   └── client.ts                  # Better Auth initialization
│       │   │   └── permissions.ts                 # Access control list
│       │   ├── features/                          # Feature-specific logic
│       │   └── proxy.ts                           # API proxy configuration
│       ├── public/                                # Static assets
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts                         # Next.js configuration
│       ├── tailwind.config.ts                     # Tailwind CSS config
│       ├── components.json                        # Shadcn/ui config
│       └── orval.config.ts                        # API code generation config
│
├── packages/                                      # Shared packages
│   ├── types/                                     # Shared TypeScript types
│   │   ├── src/
│   │   └── tsconfig.json
│   └── tsconfig/                                  # Shared TypeScript configs
│       ├── base.json
│       ├── react.json
│       └── node.json
│
├── package.json                                   # Root workspace config
├── pnpm-workspace.yaml                            # Workspace definition
├── pnpm-lock.yaml                                 # Dependency lock file
├── turbo.json                                     # Turbo build config
├── tsconfig.json                                  # Root TypeScript config
├── prettier.json                                  # Code formatting config
├── .editorconfig                                  # Editor settings
└── .env.example                                   # Environment template

```

## Directory Purposes

### API App Structure

**`apps/api/src`:**

- Root source directory
- Entry point: `main.ts`
- Contains all application code organized by concern

**`apps/api/src/modules`:**

- Feature modules organized by domain
- Each module is self-contained with controller, service, repository, DTOs, entities
- Can be independently tested and evolved
- Export APIs for use by other modules

**`apps/api/src/modules/posts`:**

- Posts CRUD operations and comments
- Includes nested comments sub-module
- Responsible for posts, reactions, views, files
- Depends on: notifications, follows modules

**`apps/api/src/modules/users`:**

- User profile management
- User queries and updates
- Academic profile information
- Department association

**`apps/api/src/modules/departments`:**

- Department management
- Department listings and details
- Associated with courses and users

**`apps/api/src/modules/courses`:**

- Course management
- Course-department relationships
- Used for post categorization

**`apps/api/src/modules/files`:**

- File operations (upload, download, delete)
- AWS S3 integration
- File metadata storage

**`apps/api/src/modules/notifications`:**

- Notification creation and retrieval
- Server-sent events (SSE) streaming
- Real-time notification delivery

**`apps/api/src/modules/follows`:**

- Follow/unfollow operations
- User relationship tracking
- Used for feed algorithms and notifications

**`apps/api/src/modules/post-requests`:**

- Resource request management
- Post request creation, fulfillment, voting
- Used for student-initiated requests

**`apps/api/src/modules/storage`:**

- AWS S3 client setup and configuration
- Pre-signed URL generation
- Storage service abstraction

**`apps/api/src/modules/stats`:**

- Analytics and statistics
- User activity metrics
- Platform-wide statistics

**`apps/api/src/modules/tasks`:**

- Scheduled background tasks
- Cron jobs (via @nestjs/schedule)
- Data cleanup and maintenance

**`apps/api/src/common`:**

- Global filters, interceptors, middleware
- Shared DTOs (pagination, etc.)
- Shared decorators and utilities
- Applied to all modules

**`apps/api/src/auth`:**

- Better Auth configuration
- Session management setup
- Authentication decorators and guards

**`apps/api/src/prisma`:**

- PrismaService wrapper
- Database abstraction
- Shared across all modules

**`apps/api/prisma`:**

- Prisma schema definition: `schema.prisma`
- Database migrations in `migrations/`
- Seeding scripts for development data

### Frontend App Structure

**`apps/web/app`:**

- Next.js App Router directory structure
- Server components by default (file-based routing)
- Group directories with parentheses for layout organization

**`apps/web/app/(app)`:**

- Main authenticated routes
- Grouped with layout wrapper
- Includes protected sub-group for auth-required pages

**`apps/web/app/(app)/(protected)`:**

- Routes requiring authentication
- Wrapped with AuthGuard component
- Admin routes and user-specific pages

**`apps/web/app/(auth)`:**

- Authentication-related routes
- Login, signup pages
- Grouped separately from main app

**`apps/web/components`:**

- All React components except pages
- Organized by feature area
- UI components in `ui/` subdirectory (shadcn/ui)
- Shared components in `shared/` subdirectory

**`apps/web/contexts`:**

- React Context providers
- Global state providers
- AuthContext for authentication state

**`apps/web/hooks`:**

- Custom React hooks
- Domain-specific hooks (useNotifications, useAcademicYear)
- Utility hooks (useOnClickOutside)

**`apps/web/lib`:**

- Utilities and helpers
- Store definitions (Zustand)
- Constants and mock data
- **NOT** API client (that's in `src/lib/api`)

**`apps/web/src/lib/api`:**

- API client code
- Generated hooks from Orval
- Custom fetch implementation
- API type definitions

**`apps/web/src/providers`:**

- React context providers composition
- Query provider (React Query)
- Auth provider setup

## Key File Locations

**Backend Entry Points:**

- `apps/api/src/main.ts` - Application bootstrap
- `apps/api/src/app.module.ts` - Root module with all imports

**Frontend Entry Points:**

- `apps/web/app/layout.tsx` - Root layout and providers
- `apps/web/app/(app)/page.tsx` - Homepage/feed

**Configuration:**

- `apps/api/src/auth/auth.config.ts` - Authentication setup
- `apps/web/orval.config.ts` - API client generation config
- `apps/web/next.config.ts` - Next.js configuration

**Core Logic:**

- `apps/api/src/modules/*/` - Feature modules
- `apps/api/src/modules/*/posts.service.ts` - Business logic example
- `apps/api/src/modules/*/posts.repository.ts` - Database queries example

**Database:**

- `apps/api/prisma/schema.prisma` - Data model definition
- `apps/api/prisma/seed.ts` - Development data seeding

**Testing:**

- `apps/api/test/` - E2E tests
- `apps/api/src/**/*.spec.ts` - Unit tests

**API Client:**

- `apps/web/src/lib/api/generated/` - Generated hooks
- `apps/web/src/lib/api/fetcher.ts` - Request implementation

## Naming Conventions

**Files:**

- Controllers: `*.controller.ts` (e.g., `posts.controller.ts`)
- Services: `*.service.ts` (e.g., `posts.service.ts`)
- Repositories: `*.repository.ts` (e.g., `posts.repository.ts`)
- Modules: `*.module.ts` (e.g., `posts.module.ts`)
- DTOs: `*.dto.ts` in `dto/` directory (e.g., `create-post.dto.ts`)
- Entities: `*.entity.ts` in `entities/` directory
- Filters: `*.filter.ts` in `common/filters/`
- Interceptors: `*.interceptor.ts` in `common/interceptors/`
- Middleware: `*.middleware.ts` in `common/middleware/`
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- Components: `*.tsx` with PascalCase names

**Directories:**

- Feature modules: kebab-case (e.g., `post-requests`)
- Components: kebab-case (e.g., `post-detail`)
- Routes: kebab-case with square brackets for dynamics (e.g., `[id]`)
- Grouped routes: parentheses (e.g., `(protected)`, `(app)`)

**URL Routes (API):**

- RESTful patterns: `GET /api/posts`, `POST /api/posts`, `PATCH /api/posts/:id`
- Global prefix: `/api` (except health check and auth routes)
- Nested routes: `GET /api/posts/:id/comments`

## Where to Add New Code

### New Feature/Module:

1. Create directory in `apps/api/src/modules/{feature-name}/`
2. Create `{feature-name}.module.ts` with imports and exports
3. Create `{feature-name}.controller.ts` with REST endpoints
4. Create `{feature-name}.service.ts` with business logic
5. Create `{feature-name}.repository.ts` with database queries
6. Create `dto/` subdirectory with request DTOs
7. Create `entities/` subdirectory with response entities
8. Import module in `apps/api/src/app.module.ts`
9. Update `apps/api/prisma/schema.prisma` if adding new database tables
10. Run `npm run db:generate` to generate Prisma types
11. Create pages/components in `apps/web` as needed
12. Run `npm run api:generate` in web app to regenerate API client

### New Page/Route (Frontend):

1. Create directory structure in `apps/web/app` following Next.js conventions
2. Create `page.tsx` with React component
3. Create `layout.tsx` if nested layouts needed
4. Wrap with `(group)` if grouping related pages
5. Use `AuthGuard` for protected pages
6. Import generated API hooks from `@/src/lib/api/generated/`

### New Component:

1. Create in `apps/web/components/{feature}/` directory
2. Name with PascalCase: `FeatureName.tsx` or `feature-name.tsx`
3. Export as default or named export
4. Use TypeScript for type safety
5. Keep components small and focused

### New Utility/Helper:

**Backend:**

- Add to `apps/api/src/common/utils/` for cross-module usage
- Or in module-specific utils if only used by that module

**Frontend:**

- Add to `apps/web/lib/` for general utilities
- Or in `apps/web/src/lib/` for code organization
- Add to `apps/web/hooks/` for custom React hooks

### New Database Model:

1. Add model to `apps/api/prisma/schema.prisma`
2. Run `npm run db:migrate` to create migration
3. Run `npm run db:generate` to generate Prisma types
4. Create module with controller, service, repository for the new model

## Special Directories

**`apps/api/src/generated`:**

- Purpose: Prisma-generated types and client
- Generated: Yes (automatically by Prisma)
- Committed: Yes (generated code committed to repo)
- Do not edit: All files auto-generated

**`apps/web/src/lib/api/generated`:**

- Purpose: Orval-generated API client hooks
- Generated: Yes (by running `npm run api:generate`)
- Committed: Yes (generated code committed to repo)
- Do not edit: All files auto-generated
- Regenerate when: Backend API changes

**`apps/web/.next`:**

- Purpose: Next.js build cache and development output
- Generated: Yes (by Next.js during build/dev)
- Committed: No (in .gitignore)
- Delete: Safe to delete, will regenerate

**`apps/api/dist`:**

- Purpose: Compiled JavaScript output from TypeScript
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)
- Delete: Safe to delete, will regenerate

**`apps/api/prisma/migrations`:**

- Purpose: Database migration history
- Generated: Partially (created by `npm run db:migrate`)
- Committed: Yes (essential for database versioning)
- Do not delete: Migration history needed

---

_Structure analysis: 2025-03-19_
