# Architecture

**Analysis Date:** 2025-03-19

## Pattern Overview

**Overall:** Monorepo-based microservice architecture with clear separation between API backend (NestJS) and frontend client (Next.js). The API follows a modular domain-driven design with controller-service-repository pattern. The frontend uses server-side rendering with client-side data fetching via generated API client.

**Key Characteristics:**

- NestJS backend with modular structure organized by domain (posts, users, departments, etc.)
- PostgreSQL with Prisma ORM for data persistence
- Next.js frontend with App Router and server components
- Generated API client using OpenAPI schema and Orval
- Authentication via Better Auth with custom role-based access control
- Pub/Sub pattern for real-time notifications using RxJS

## Layers

**API Layer (Backend):**

- Location: `apps/api/src`
- Purpose: HTTP endpoints, request validation, response formatting
- Contains: Controllers for each module
- Depends on: Services, Request DTOs
- Used by: Frontend web app, external clients
- Pattern: RESTful API with OpenAPI documentation

**Service Layer (Backend):**

- Location: `apps/api/src/modules/*/`
- Purpose: Business logic, domain operations, orchestration
- Contains: Service classes that handle core logic
- Depends on: Repositories, other Services, external libraries
- Used by: Controllers, other Services, Tasks
- Pattern: Dependency injection via NestJS

**Repository/Data Access Layer (Backend):**

- Location: `apps/api/src/modules/*/`
- Purpose: Database queries and data transformation
- Contains: Repository classes with Prisma queries
- Depends on: PrismaService
- Used by: Services
- Pattern: Single responsibility - each repository manages one entity's persistence

**Authentication Layer (Backend):**

- Location: `apps/api/src/auth/`
- Purpose: Authentication and authorization
- Contains: Better Auth configuration, session management
- Depends on: Better Auth library, Prisma
- Used by: Controllers (via decorators), Middleware
- Pattern: Decorator-based guards, session-based authentication

**Infrastructure Layer (Backend):**

- Location: `apps/api/src/common/`, `apps/api/src/prisma/`
- Purpose: Cross-cutting concerns, shared utilities
- Contains: Filters, interceptors, middleware, database service
- Depends on: NestJS, Prisma, external libraries
- Used by: All other layers
- Pattern: Middleware, interceptors, filters for standardized handling

**Frontend Page Layer:**

- Location: `apps/web/app/`
- Purpose: Server-side rendered pages and layouts
- Contains: Next.js page components, layout files
- Depends on: API client, Components, Contexts
- Used by: Browsers
- Pattern: File-based routing with dynamic segments

**Frontend Component Layer:**

- Location: `apps/web/components/`
- Purpose: Reusable UI components
- Contains: Feature components, shared UI components
- Depends on: React libraries, hooks, stores
- Used by: Pages, other components
- Pattern: Presentational components organized by feature

**Frontend API Client Layer:**

- Location: `apps/web/src/lib/api/generated/`
- Purpose: Type-safe API communication
- Contains: Auto-generated client hooks using Orval
- Depends on: React Query, custom fetch implementation
- Used by: Components, Pages, Server actions
- Pattern: Generated hooks from OpenAPI schema

**State Management Layer (Frontend):**

- Location: `apps/web/lib/store.ts`, `apps/web/contexts/`
- Purpose: Client-side state management
- Contains: Zustand stores, React contexts
- Depends on: React, Zustand
- Used by: Components, Pages, Hooks
- Pattern: Zustand for UI state, Context for auth state

## Data Flow

**User Creates a Post:**

1. User fills form in `apps/web/app/(app)/(protected)/posts/new/page.tsx`
2. Form submission calls `usePostsControllerCreate` hook (generated from `apps/web/src/lib/api/generated/posts/posts.ts`)
3. Hook sends POST request via `customFetch` to `POST /api/posts`
4. Request reaches `PostsController.create()` in `apps/api/src/modules/posts/posts.controller.ts`
5. Controller extracts user session, validates DTO, calls `PostsService.create()`
6. Service performs business logic: validates department, generates shortCode, calls repository
7. `PostsRepository.create()` executes Prisma query to insert Post record
8. Service triggers side effects: notifications to followers via `NotificationsService`
9. Response interceptor in `apps/api/src/common/interceptors/response.interceptor.ts` formats success response
10. Frontend receives typed response, updates React Query cache, displays confirmation toast

**User Fetches Feed:**

1. Page component `apps/web/app/(app)/page.tsx` renders
2. Component uses `usePostsControllerFindAll()` hook with query filters
3. Hook automatically fetches from `GET /api/posts?page=1&limit=20`
4. `PostsController.findAll()` receives request with optional auth session
5. Service queries posts with appropriate filters based on user role
6. `PostsRepository.findAll()` uses Prisma with include relations (author, course, files, reactions)
7. Repository applies pagination via `paginate()` utility
8. Response includes metadata and paginated array
9. React Query caches results keyed by query parameters
10. Component renders posts with files, reactions, and metadata

**Real-time Notifications:**

1. Server-Sent Events (SSE) connection established at `apps/web/app/api/notifications/stream/route.ts`
2. Frontend calls `/api/notifications/stream` with user ID
3. Backend `NotificationsService.streamForUser()` in `apps/api/src/modules/notifications/` returns RxJS Observable
4. Service emits events via Subject when notifications occur
5. Frontend receives MessageEvent updates, updates state via store
6. Page re-renders with notification badge count

**State Management:**

- **App State:** UI preferences (sidebar open, theme) stored in Zustand `apps/web/lib/store.ts`
- **Auth State:** User session and permissions managed via `apps/web/contexts/auth-context.tsx` and Better Auth client
- **Query State:** API responses cached by React Query with auto-revalidation
- **Transient State:** Form inputs stored in component state

## Key Abstractions

**Module:**

- Purpose: Self-contained domain with controller, service, repository, DTOs, entities
- Examples: `apps/api/src/modules/posts/`, `apps/api/src/modules/users/`
- Pattern: Each module can be independently tested and evolved

**Repository:**

- Purpose: Single class managing all queries for one entity
- Examples: `apps/api/src/modules/posts/posts.repository.ts`
- Pattern: Encapsulates Prisma queries, provides clean interface to services

**Service:**

- Purpose: Orchestrates business logic across repositories and other services
- Examples: `apps/api/src/modules/posts/posts.service.ts`
- Pattern: Contains domain logic, validation, coordination

**DTO (Data Transfer Object):**

- Purpose: Validates incoming request data
- Location: `apps/api/src/modules/*/dto/`
- Pattern: Class-based with class-validator decorators for validation

**Entity:**

- Purpose: Response data structures for API responses
- Location: `apps/api/src/modules/*/entities/`
- Pattern: TypeScript classes that define response shape and relationships

**Generated API Client:**

- Purpose: Type-safe React hooks for API communication
- Location: `apps/web/src/lib/api/generated/`
- Pattern: Generated from OpenAPI schema via Orval, provides useQuery/useMutation hooks

**Interceptors (Backend):**

- Location: `apps/api/src/common/interceptors/`
- Purpose: Transform responses into standardized format: `{ success: boolean, message: string, data: T }`
- Used by: All endpoints automatically via `ResponseInterceptor`

**Filters (Backend):**

- Location: `apps/api/src/common/filters/`
- Purpose: Catch exceptions and format error responses with logging
- Used by: All endpoints via `HttpExceptionFilter`

**Middleware:**

- Location: `apps/api/src/common/middleware/`
- Purpose: Request logging, CORS setup
- Used by: All requests

## Entry Points

**Backend Entry Point:**

- Location: `apps/api/src/main.ts`
- Triggers: `npm run dev` or `npm start:prod`
- Responsibilities:
  - Bootstrap NestJS application
  - Configure security (Helmet, CORS)
  - Register global pipes, filters, interceptors
  - Setup Swagger documentation
  - Start HTTP server on port 3001
  - Configure database

**Frontend Entry Point:**

- Location: `apps/web/app/layout.tsx`
- Triggers: Next.js application load
- Responsibilities:
  - Load fonts (Geist)
  - Apply global styles and theme
  - Wrap app with providers (Auth, Query, Theme)
  - Set metadata and viewport

**Protected Routes Entry Point:**

- Location: `apps/web/app/(app)/(protected)/layout.tsx`
- Purpose: Verify authentication, redirect unauthenticated users
- Uses: `AuthGuard` component wrapper

## Frontend-Backend Communication

**API Client Generation:**

1. Backend generates OpenAPI schema at `openapi.json` (Swagger setup in main.ts)
2. Frontend runs `npm run api:generate` using Orval config at `orval.config.ts`
3. Orval reads schema and generates typed hooks in `src/lib/api/generated/`
4. Each module gets separate hook file (posts.ts, users.ts, etc.)
5. Hooks use custom fetcher at `src/lib/api/fetcher.ts`

**API Request/Response Pattern:**

Request format:

```
POST /api/posts
Content-Type: application/json
Cookie: auth-session=...

{ "courseId": "...", "title": "..." }
```

Response format:

```
200 OK
{
  "success": true,
  "message": "Post created successfully",
  "data": { "id": "...", "title": "..." }
}
```

Error response format:

```
400 Bad Request
{
  "success": false,
  "message": "Validation failed",
  "error": "BAD_REQUEST",
  "path": "/api/posts",
  "timestamp": "2025-03-19T..."
}
```

**Authentication Flow:**

1. Frontend uses Better Auth client at `src/lib/auth/client.ts`
2. Better Auth handles OAuth/session automatically
3. Session cookie automatically included in all requests via `credentials: 'include'`
4. Backend decorators check session: `@Session()`, `@OptionalAuth()`
5. User role and permissions enforced via `@Roles()` decorator
6. Access control via `AdminClient` plugin with access control list

**Role-Based Access Control:**

1. User model includes `role` field (STUDENT, MODERATOR, ADMIN)
2. Services check role before operations: `session.user.role`
3. Repositories apply row-level filtering based on role
4. Frontend uses `useAuthClient()` to check permissions before rendering UI
5. Unauthorized operations throw ForbiddenException caught by filter

## Cross-Cutting Concerns

**Logging:**

Backend:

- Middleware: `LoggerMiddleware` logs all requests with method, path, status
- Services: NestJS Logger injected per class
- Filters: Detailed error logging with stack traces

Frontend:

- Console logging for development
- React Query logging for data fetching (dev mode)

**Validation:**

Backend:

- DTOs use class-validator decorators: `@IsString()`, `@IsOptional()`, etc.
- Enabled globally via ValidationPipe with `whitelist: true` and `transform: true`
- Custom validators for domain logic (e.g., department check in posts)

Frontend:

- React Hook Form for form validation
- Zod schemas for form data
- API client validation via generated types

**Authentication:**

Backend:

- Better Auth handles session creation and validation
- Custom decorators expose session: `@Session() session: UserSession`
- Permission check middleware validates role

Frontend:

- Better Auth React client manages auth state
- AuthContext provides user to components
- AuthGuard component wraps protected routes

**Error Handling:**

Backend:

- All errors caught by HttpExceptionFilter
- Structured error responses with message, error code, path, timestamp
- Different HTTP status codes: 400 (validation), 401 (auth), 403 (permission), 404 (not found), 500 (server)
- Stack traces logged in development

Frontend:

- API errors caught by customFetch, re-thrown for React Query
- Form submission errors displayed via toast notifications
- Page-level errors caught by error boundary (if configured)

---

_Architecture analysis: 2025-03-19_
