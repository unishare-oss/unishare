# Architecture

Unishare is a full-stack monorepo structured as a **modular layered architecture** on the backend and a **component-driven page architecture** on the frontend. The backend follows NestJS conventions (module / controller / service / repository), and the frontend uses Next.js App Router with React Query for server-state management.

---

## High-Level Overview

```
┌─────────────────────────────┐        HTTP / SSE
│        Browser (Next.js)    │ ◄──────────────────────► ┌──────────────────────────┐
│  App Router · React Query   │                           │   NestJS API (REST)      │
│  Zustand · better-auth/react│                           │   Port 3001              │
└─────────────────────────────┘                           └────────────┬─────────────┘
                                                                       │ Prisma ORM
                                                          ┌────────────▼─────────────┐
                                                          │    PostgreSQL database   │
                                                          └──────────────────────────┘
                                                                       │
                                                          ┌────────────▼─────────────┐
                                                          │  S3-compatible object    │
                                                          │  storage (file uploads)  │
                                                          └──────────────────────────┘
```

Both applications are orchestrated by **Turborepo** with `pnpm` workspaces. A shared `packages/types` package provides constants and the `PaginatedResult<T>` type used by both sides. A shared `packages/tsconfig` provides base TypeScript configurations.

---

## Backend — `apps/api`

### Pattern

**Modular layered architecture** with a strict four-layer dependency direction:

```
Controller → Service → Repository → PrismaService (database)
```

Each domain feature is encapsulated in its own NestJS module under `src/modules/`. Modules declare their own controllers, services, and repositories, and explicitly export services that other modules need.

### Entry Point

`apps/api/src/main.ts` bootstraps the NestJS application. It configures:

- **Helmet** for HTTP security headers
- **CORS** — allows `localhost:3000` and the `FRONTEND_URL` environment variable
- Global prefix `/api` (excluding the `/health` route and Better Auth's own `/api/` routes)
- **ValidationPipe** — `whitelist: true, transform: true` applied globally
- **HttpExceptionFilter** — normalises all HTTP exceptions into a consistent JSON shape
- **ResponseInterceptor** — wraps every non-SSE response in `{ success, message, data }`
- **Swagger / OpenAPI** — mounted at `/docs` in non-production environments

### Root Module

`apps/api/src/app.module.ts` — imports all feature modules, `ConfigModule` (global), `ScheduleModule`, `PrismaModule`, `StorageModule`, and the Better Auth module.

### Layers in Detail

#### Controllers

Located at `src/modules/<feature>/<feature>.controller.ts`. Responsibilities:

- Parse route params, query strings, and request bodies into typed DTOs
- Extract the authenticated session with `@Session()` from `@thallesp/nestjs-better-auth`
- Delegate all logic to the corresponding service
- Annotate responses with Swagger decorators (`@ApiOkResponse`, `@ApiCreatedResponse`) and `@ResponseMessage`

Role-based access is enforced with `@Roles()` at the controller method level. Some routes use `@OptionalAuth()` to allow both authenticated and unauthenticated access.

#### Services

Located at `src/modules/<feature>/<feature>.service.ts`. Responsibilities:

- Enforce business rules and authorisation checks (ownership, role, domain constraints)
- Coordinate cross-module interactions — for example, `PostsService` calls `NotificationsService` and `FollowsService` after certain mutations
- Throw typed NestJS exceptions (`NotFoundException`, `ForbiddenException`, etc.)

Services never query the database directly; all persistence calls go through the repository.

#### Repositories

Located at `src/modules/<feature>/<feature>.repository.ts`. Responsibilities:

- Construct Prisma queries with full `include`/`select` shapes
- Apply viewer-aware data transformations (e.g., the `mapPost` function in `PostsRepository` strips anonymous author info for non-privileged users, computes `reactionCounts`, `userReaction`, `isOwner`, and `savedByCurrentUser`)
- Call the shared `paginate()` utility for all list operations

Repositories are `@Injectable()` providers registered inside each feature module and never imported across module boundaries. Only services are exported.

#### PrismaService

`apps/api/src/prisma/prisma.service.ts` — extends `PrismaClient` and implements `OnModuleInit` / `OnModuleDestroy` for connection lifecycle management. Uses the `@prisma/adapter-pg` driver adapter for native PostgreSQL support.

### Authentication

Authentication is handled entirely by **Better Auth** (`better-auth` package) via its NestJS integration (`@thallesp/nestjs-better-auth`). Configuration lives in `apps/api/src/auth/auth.config.ts`.

Supported strategies:

- Email/password
- Microsoft OAuth (MSAL / Azure AD)
- Google OAuth

Better Auth mounts its own route handler at `/api/auth/*` (excluded from NestJS's global `/api` prefix). Sessions are cookie-based (`better-auth.session_token`), with a 7-day TTL and sliding expiry.

An **access-control model** is defined in `apps/api/src/lib/permissions.ts` using `createAccessControl` from `better-auth/plugins/access`. Three roles are defined:

| Role        | Permissions                                   |
| ----------- | --------------------------------------------- |
| `STUDENT`   | Create/view posts and comments                |
| `MODERATOR` | + Delete posts/comments, approve/reject posts |
| `ADMIN`     | + List/ban users, set roles                   |

### Feature Modules

| Module                | Path                         | Purpose                                                                                                                                                                                                              |
| --------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PostsModule`         | `src/modules/posts/`         | Core post CRUD, reactions, saves, short-code lookup, view tracking. Embeds `CommentsModule` (nested controller/service/repository). Exports `PostsService`.                                                          |
| `FilesModule`         | `src/modules/files/`         | Attaches files to posts after S3 upload, generates presigned download URLs, tracks download counts.                                                                                                                  |
| `StorageModule`       | `src/modules/storage/`       | Wraps AWS SDK v3 S3 client. Generates presigned upload and download URLs, validates MIME types, manages file lifecycle.                                                                                              |
| `UsersModule`         | `src/modules/users/`         | User profile reads and updates (bio, academic profile).                                                                                                                                                              |
| `CoursesModule`       | `src/modules/courses/`       | Department-scoped course management.                                                                                                                                                                                 |
| `DepartmentsModule`   | `src/modules/departments/`   | Department CRUD (admin).                                                                                                                                                                                             |
| `NotificationsModule` | `src/modules/notifications/` | In-process SSE event stream using RxJS `Subject`. Persists notifications to the database and pushes live events to connected clients.                                                                                |
| `FollowsModule`       | `src/modules/follows/`       | Follow/unfollow users; retrieve follower IDs for fan-out notifications.                                                                                                                                              |
| `PostRequestsModule`  | `src/modules/post-requests/` | Crowdsourced study material requests with upvoting and fulfillment suggestions.                                                                                                                                      |
| `StatsModule`         | `src/modules/stats/`         | Aggregated platform analytics (user/post/comment/reaction counts, top posts, top users).                                                                                                                             |
| `TasksModule`         | `src/modules/tasks/`         | Scheduled background tasks using `@nestjs/schedule`. Runs daily/hourly cron jobs to prune old notifications, expire sessions, lift expired bans, and hard-delete soft-deleted content from both the database and S3. |

### Cross-Cutting Concerns

| Concern             | Implementation                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Request logging     | `LoggerMiddleware` (`src/common/middleware/logger.middleware.ts`) applied globally                                                                     |
| Response envelope   | `ResponseInterceptor` wraps all non-SSE responses in `{ success, message, data }`                                                                      |
| Error normalisation | `HttpExceptionFilter` converts NestJS HTTP exceptions to the same envelope shape                                                                       |
| Pagination          | `paginate()` utility in `src/common/utils/paginate.ts` — accepts any Prisma model, runs `findMany` + `count` in parallel, returns `PaginatedResult<T>` |
| Swagger metadata    | `@ApiTags`, `@ApiOkResponse`, `@ApiCreatedResponse`, and `@ResponseMessage` decorators used consistently across all controllers                        |
| DTO validation      | Class-validator decorators on all DTOs; the global `ValidationPipe` strips unknown properties                                                          |

### Database Schema

The Prisma schema lives at `apps/api/prisma/schema.prisma`. Key models:

- **User** — roles (`STUDENT`, `MODERATOR`, `ADMIN`), optional `departmentId`, ban fields, bio, `enrollmentYear`
- **Post** — `type` (`NOTE`, `OLD_QUESTION`, `ASSIGNMENT`), `status` (`PENDING`, `APPROVED`, `REJECTED`), `shortCode` (nanoid, 8 chars), soft-delete via `deletedAt`, `views` counter
- **File** — S3 `key`, `mimeType`, `size`, `downloads` counter; belongs to Post (cascade delete)
- **Comment** — self-referencing tree (nested replies via `parentId`)
- **Reaction** — per-user, per-post enum (`HELPFUL`, `LOVE`, `FIRE`, `WOW`, `SALUTE`, `FUNNY`)
- **SavedPost**, **PostView**, **Follow** — join tables
- **PostRequest** / **PostRequestFulfillment** / **PostRequestUpvote** — crowdsourced request system
- **Notification** — typed events linked to either a Post or PostRequest
- **Session**, **Account**, **Verification** — owned by Better Auth

### File Upload Flow

1. Client calls `POST /api/storage/presigned-upload` → API returns a presigned S3 PUT URL and object `key`
2. Client uploads the file directly to S3 using the presigned URL (browser-to-S3, no traffic through the API)
3. Client calls `POST /api/posts/:id/files/confirm` with the `key` → `FilesService` verifies the key prefix matches `posts/<userId>/`, confirms the object exists in S3 via `HeadObject`, then persists the `File` record to the database

### Real-Time Notifications (SSE)

`NotificationsService` holds an in-process RxJS `Subject<SseEvent>`. When a notification is created (post approved/rejected, comment added, new follower post, request fulfilled), the service:

1. Persists a `Notification` row to the database
2. Emits to the `Subject`

`NotificationsController` exposes `GET /api/notifications/stream` as a Server-Sent Events endpoint (`@Sse`). The observable filters by `userId`, so each connected client only receives their own events.

On the frontend, a Next.js route handler at `app/api/notifications/stream/route.ts` proxies this SSE stream (forwarding the session cookie) so browser requests stay on the same origin.

---

## Frontend — `apps/web`

### Pattern

**Next.js App Router** with route-group-based layout nesting. UI state is managed by **Zustand** (with `persist` middleware for feed filters and PDF annotations). Server state is managed by **TanStack React Query** via auto-generated hooks.

### Entry Point

`apps/web/app/layout.tsx` — root layout that mounts fonts, ThemeProvider (12 named themes), and the `Providers` tree (`QueryProvider` → `AuthProvider`).

### Route Groups

| Group               | Path                     | Purpose                                                     |
| ------------------- | ------------------------ | ----------------------------------------------------------- |
| `(app)`             | `app/(app)/`             | Main application shell with sidebar and mobile nav          |
| `(app)/(protected)` | `app/(app)/(protected)/` | Routes that require authentication — wrapped in `AuthGuard` |
| `(auth)`            | `app/(auth)/`            | Unauthenticated flows (login)                               |

### Route Inventory

| Route                | File                                               | Auth                  |
| -------------------- | -------------------------------------------------- | --------------------- |
| `/` (feed)           | `app/(app)/page.tsx`                               | Optional              |
| `/posts/[id]`        | `app/(app)/posts/[id]/page.tsx`                    | Optional              |
| `/s/[shortCode]`     | `app/(app)/s/[shortCode]/page.tsx`                 | Optional              |
| `/departments`       | `app/(app)/departments/page.tsx`                   | Optional              |
| `/departments/[id]`  | `app/(app)/departments/[id]/page.tsx`              | Optional              |
| `/saved`             | `app/(app)/saved/page.tsx`                         | Optional              |
| `/analytics`         | `app/(app)/analytics/page.tsx`                     | Optional              |
| `/users/[id]`        | `app/(app)/users/[id]/page.tsx`                    | Optional              |
| `/posts/new`         | `app/(app)/(protected)/posts/new/page.tsx`         | Required              |
| `/posts/[id]/edit`   | `app/(app)/(protected)/posts/[id]/edit/page.tsx`   | Required              |
| `/my-posts`          | `app/(app)/(protected)/my-posts/page.tsx`          | Required              |
| `/profile`           | `app/(app)/(protected)/profile/page.tsx`           | Required              |
| `/notifications`     | `app/(app)/(protected)/notifications/page.tsx`     | Required              |
| `/requests`          | `app/(app)/(protected)/requests/page.tsx`          | Required              |
| `/requests/[id]`     | `app/(app)/(protected)/requests/[id]/page.tsx`     | Required              |
| `/admin/departments` | `app/(app)/(protected)/admin/departments/page.tsx` | Required (ADMIN)      |
| `/admin/moderation`  | `app/(app)/(protected)/admin/moderation/page.tsx`  | Required (MODERATOR+) |
| `/admin/users`       | `app/(app)/(protected)/admin/users/page.tsx`       | Required (ADMIN)      |
| `/login`             | `app/(auth)/login/page.tsx`                        | Guest only            |
| `/privacy`, `/terms` | `app/privacy/page.tsx`, `app/terms/page.tsx`       | Public                |

### Middleware

`apps/web/src/proxy.ts` — Next.js middleware that runs on every request (excluding static assets). It checks for the `better-auth.session_token` cookie and:

- Redirects unauthenticated users away from protected paths
- Redirects authenticated users away from `/login`

### API Client Generation

The OpenAPI spec is exported from the running API server (`GET /docs-json`) and saved as `apps/web/openapi.json`. **Orval** (`apps/web/orval.config.ts`) reads this spec and generates typed React Query hooks and types into `apps/web/src/lib/api/generated/`, split by tag into separate files (e.g., `posts/posts.ts`, `users/users.ts`).

All generated hooks use a custom fetcher (`apps/web/src/lib/api/fetcher.ts`) that:

- Sends `credentials: 'include'` on every request (cookie-based auth)
- Unwraps the `{ success, message, data }` API envelope
- Throws with the API's `message` field on non-OK responses

The sync command is:

```
pnpm api:sync
# Fetches /docs-json → openapi.json, then runs orval
```

### Authentication (Frontend)

`apps/web/src/lib/auth/client.ts` — creates a `better-auth` React client (`createAuthClient`) with the `inferAdditionalFields` and `adminClient` plugins.

`apps/web/contexts/auth-context.tsx` — `AuthProvider` merges the Better Auth session (from `authClient.useSession()`) with the full user profile (from `useUsersControllerGetMe`) into a single `useAuth()` hook that exposes `{ session, user, isLoading, isAuthenticated }`.

### State Management

| Store                   | File                    | Purpose                                                                                                                              |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `useFeedStore`          | `apps/web/lib/store.ts` | Active type filter, selected dept/year/course/module, pending filter (set from department detail pages), persisted in `localStorage` |
| `useUIStore`            | `apps/web/lib/store.ts` | Read post IDs, optimistic saved-post list (client-side cache), persisted in `localStorage` with `skipHydration: true`                |
| `usePdfAnnotationStore` | `apps/web/lib/store.ts` | Per-file PDF annotations keyed by S3 object key, persisted in `localStorage`                                                         |

### Application Shell

`AppShell` (`apps/web/components/app-shell.tsx`) renders the top-level layout for the `(app)` group:

- `AppSidebar` (desktop navigation)
- `MobileNav` (bottom navigation bar)
- `AcademicProfileModal` — prompts users who haven't set their department
- Connects the SSE notification stream via `useNotificationStream`
- Shows a full-screen loading spinner until the auth context resolves and a 1-second minimum display time elapses

### Component Organisation

Components are co-located by feature domain under `apps/web/components/`:

| Directory                   | Contents                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `components/feed/`          | Feed header, filter strip, post feed list, skeleton loaders                                                                        |
| `components/post-detail/`   | Post header, reactions, comments section, comment editor, file list, related posts                                                 |
| `components/posts/`         | Multi-step post creation form steps (type, course, details, files)                                                                 |
| `components/profile/`       | Profile header, edit form, academic profile modal, appearance/password/danger-zone cards                                           |
| `components/admin/`         | Department management panels, moderation row/header, user table                                                                    |
| `components/departments/`   | Department and course list views                                                                                                   |
| `components/notifications/` | Notification bell with unread count badge                                                                                          |
| `components/requests/`      | Post request creation and fulfillment dialogs                                                                                      |
| `components/shared/`        | Generic reusable components: confirm dialog, empty state, loading spinner, markdown renderer, page header, user avatar, PDF viewer |
| `components/ui/`            | shadcn/ui primitives (button, dialog, select, form, etc.)                                                                          |

---

## Frontend-Backend Communication

### Regular API Requests

All data fetching flows through the generated React Query hooks in `src/lib/api/generated/`. These call the custom fetcher, which forwards session cookies and unwraps the response envelope. The API base URL defaults to relative paths in the browser (same origin in production) and is configured via the `API_URL` environment variable only at the server/build level.

### Server-Sent Events (Notifications)

```
Browser → EventSource('/api/notifications/stream')
       → Next.js route handler (apps/web/app/api/notifications/stream/route.ts)
       → fetch(API_URL + '/api/notifications/stream', { headers: { cookie } })
       → NestJS @Sse endpoint
       → RxJS Subject filtered by userId
```

The Next.js route handler acts as a transparent proxy, forwarding the session cookie so the NestJS SSE endpoint can authenticate the user without the browser needing direct access to the API server.

New notifications are injected into the React Query cache by `useNotificationStream` hook, so the notifications bell updates without a page reload.

### File Uploads

Files bypass the API server entirely. The browser obtains a presigned S3 URL from the API and then uploads directly to S3. Only the confirmation step (verifying the object exists and creating the database record) goes through the API.

---

## Deployment

Both applications ship as Docker containers:

- **`Dockerfile.api`** — multi-stage build; runs `prisma generate` during build, produces a Node.js production server on port 3001
- **`Dockerfile.web`** — multi-stage build; runs `api:generate` (orval) during build, produces a Next.js standalone output on port 3000

Health checks are defined in both Dockerfiles:

- API: `GET /health`
- Web: `GET /api/health`
