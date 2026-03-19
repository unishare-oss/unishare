# Code Conventions

This document captures the naming patterns, code style rules, architectural conventions, and design patterns used across the Unishare monorepo.

---

## Repository Structure

This is a **pnpm + Turborepo monorepo** with the following layout:

```
apps/
  api/     # NestJS backend
  web/     # Next.js 16 frontend
packages/
  types/   # Shared TypeScript types and constants (@unishare/types)
  tsconfig/ # Shared tsconfig presets (@unishare/tsconfig)
```

- Package manager: `pnpm@10.29.2`
- Node engine requirement: `>=20`
- Build orchestration: Turborepo (`turbo.json`)

---

## Formatting & Linting

### Prettier

Config lives at `/.prettierrc`:

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

Key rules:

- No semicolons
- Single quotes for strings
- Trailing commas everywhere (including function arguments)
- 100-character line width
- 2-space indentation

Prettier is run via `lint-staged` on all `*.{ts,tsx,js,mjs,cjs,json,md,yaml,yml,css}` files at commit time (configured in root `package.json`).

### ESLint — API (`apps/api/eslint.config.mjs`)

- Uses `typescript-eslint` recommended + `eslint-plugin-prettier/recommended`
- `@typescript-eslint/no-explicit-any` is **off** (any is allowed)
- `@typescript-eslint/no-unused-vars` is **error** with the pattern:
  - Prefix unused variables/args with `_` to suppress the error
  - `ignoreRestSiblings: true`
- Prettier errors are enforced as ESLint errors (`endOfLine: 'auto'`)
- Globals include `node` and `jest`

### ESLint — Web (`apps/web/eslint.config.mjs`)

- Uses `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- `@typescript-eslint/no-explicit-any` is **warn** (not an error, unlike the API)

---

## Commit Messages

Enforced by `commitlint` using `@commitlint/config-conventional` (`commitlint.config.mjs`).

Format: `<type>(<optional scope>): <description>`

Common types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`

Examples from git log:

```
feat(feed): add module number filter (backend + frontend)
fix(filter-strip.tsx): update div class to use sticky positioning
chore(package.json): add clean:cache script to remove .turbo dir
```

Commits use **one-liner messages only** — no body or footer.

---

## TypeScript

### Shared tsconfig presets (`packages/tsconfig/`)

- `base.json`: `strict: true`, `esModuleInterop`, `skipLibCheck`, `isolatedModules`
- `nestjs.json`: extends base, adds `emitDecoratorMetadata`, `experimentalDecorators`, `strictPropertyInitialization: false`, targets `ES2021`, module `commonjs`
- `nextjs.json`: extends base (Next.js handles its own compilation)

### Path Aliases

**API** (`apps/api/tsconfig.json`):

```json
"paths": { "@/*": ["src/*"] }
```

Everything inside `src/` is importable as `@/`. Example: `@/common/dto/pagination.dto`.

**Web** (`apps/web/tsconfig.json`): Uses Next.js default `@/` alias pointing to the app root.

---

## Naming Conventions

### Files & Directories

| Context             | Convention                | Example                                           |
| ------------------- | ------------------------- | ------------------------------------------------- |
| NestJS source files | `kebab-case.role.ts`      | `posts.controller.ts`, `http-exception.filter.ts` |
| NestJS DTOs         | `kebab-case.dto.ts`       | `create-post.dto.ts`, `list-posts.dto.ts`         |
| NestJS entities     | `kebab-case.entity.ts`    | `post.entity.ts`, `paginated-post.entity.ts`      |
| Next.js pages       | `page.tsx` / `layout.tsx` | `apps/web/app/(app)/page.tsx`                     |
| React components    | `kebab-case.tsx`          | `post-card.tsx`, `filter-strip.tsx`               |
| React hooks         | `use-*.ts`                | `use-notifications.ts`, `use-academic-year.ts`    |
| Utility files       | `kebab-case.ts`           | `paginate.ts`, `form-schema.ts`                   |

### Classes & Types

| Construct          | Convention                              | Example                                                 |
| ------------------ | --------------------------------------- | ------------------------------------------------------- |
| NestJS classes     | `PascalCase` + role suffix              | `PostsController`, `PostsService`, `PostsRepository`    |
| DTOs               | `PascalCase` + `Dto` suffix             | `CreatePostDto`, `ListPostsDto`, `PaginationDto`        |
| Entities (Swagger) | `PascalCase` + `Entity` suffix          | `PostEntity`, `PostDetailEntity`, `PaginatedPostEntity` |
| React components   | `PascalCase` named exports              | `PostCard`, `FilterStrip`, `AuthGuard`                  |
| React hooks        | `camelCase` with `use` prefix           | `useAuth`, `useFeedStore`, `useNotificationStream`      |
| Zustand stores     | `camelCase` with `use` + `Store` suffix | `useFeedStore`, `useUIStore`, `usePdfAnnotationStore`   |
| Interfaces         | `PascalCase` (no `I` prefix)            | `AuthContextValue`, `FilterStripProps`, `SseEvent`      |
| Type aliases       | `PascalCase`                            | `ViewerContext`, `TypeFilter`, `ExceptionResponseBody`  |

### Variables & Functions

- `camelCase` for all variables and functions
- Boolean variables prefer descriptive names: `isLoading`, `isAuthenticated`, `isPrivileged`, `isOwner`, `canSeeAllStatuses`
- Event handlers are prefixed with `handle`: `handleSave`, `handleDeptChange`, `handleFilterChange`
- Unused function parameters prefixed with `_`: `_deletedAt`, `_courseId`, `_include`

### Constants

- `SCREAMING_SNAKE_CASE` for true constants and magic strings:
  ```ts
  export const PAGINATION_DEFAULT_LIMIT = 20
  export const PAGINATION_MAX_LIMIT = 100
  export const MAX_FILE_SIZE = 50 * 1024 * 1024
  export const RESPONSE_MESSAGE_KEY = 'response_message'
  ```
- Local sentinel values use `SCREAMING_SNAKE_CASE` too:
  ```ts
  const EMPTY_SELECT_VALUE = '__empty__'
  const ALL = '__all__'
  ```

### Enums (Prisma-generated)

Enums are PascalCase identifiers with SCREAMING_SNAKE_CASE values, mirroring the Prisma schema:

```ts
PostType.NOTE
PostStatus.APPROVED
UserRole.ADMIN
NotificationType.POST_APPROVED
```

---

## NestJS (API) Patterns

### Module Structure

Each domain feature follows the same layered structure inside `src/modules/<name>/`:

```
<name>.module.ts         # @Module decorator, wires providers/imports/exports
<name>.controller.ts     # HTTP routing, auth guards, Swagger decorators
<name>.service.ts        # Business logic, throws HTTP exceptions
<name>.repository.ts     # Prisma queries, data mapping
dto/
  create-<name>.dto.ts
  update-<name>.dto.ts
  list-<name>.dto.ts
entities/
  <name>.entity.ts       # Swagger response shape
```

Sub-resources (e.g., comments inside posts) follow the same pattern inside a subdirectory.

### Dependency Injection

- All injectable classes use `private readonly` for injected dependencies
- Constructor injection only — no property injection:
  ```ts
  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly followsService: FollowsService,
  ) {}
  ```

### Controllers

- Decorated with `@ApiTags('<resource>')` and `@Controller('<resource>')`
- Each action has a `@ResponseMessage('...')` decorator describing the success message
- Each action has an `@ApiOkResponse` or `@ApiCreatedResponse` with the entity type
- Auth is handled by `@Session()` from `@thallesp/nestjs-better-auth`; unauthenticated access uses `@OptionalAuth()`
- Role-based access uses `@Roles([...])`: `@Roles(['MODERATOR', 'ADMIN'])`
- DTO parameter names in handlers always use `dto` as the variable name

### Services

- Contain all business logic; repositories contain only DB queries
- Throw NestJS HTTP exceptions directly:
  ```ts
  throw new NotFoundException('Post not found')
  throw new ForbiddenException('You do not own this post')
  throw new BadRequestException('Please set your department before creating a post')
  ```
- Fire-and-forget async side effects (e.g., notifications) are prefixed with `void` and chained with `.then()`:
  ```ts
  void this.followsService
    .getFollowerIds(userId)
    .then((followerIds) => this.notificationsService.notifyFollowersNewPost(...))
  ```

### Repositories

- Inject `PrismaService` directly
- Contain no business logic — only DB queries and data mapping
- Use a module-level `postInclude()` helper function (a factory returning a `Prisma.Include` object) to keep select/include definitions DRY
- Map raw Prisma results through a local `mapPost()` function to compute derived fields (`isOwner`, `savedByCurrentUser`, `reactionCounts`, `userReaction`) and strip internal fields (`deletedAt`, `courseId`, etc.)
- Use the shared `paginate()` utility for all paginated queries

### DTOs

- Use `class-validator` decorators for validation, `class-transformer` for coercion
- Query-string numbers must use `@Type(() => Number)` before `@IsInt()`
- Optional fields use both `@IsOptional()` and `@ApiPropertyOptional()`
- `ListPostsDto` extends `PaginationDto` for all list endpoints
- `UpdateXxxDto` typically extends `PartialType(CreateXxxDto)` pattern

### Entities (Swagger shapes)

- Plain classes with `@ApiProperty()` / `@ApiPropertyOptional()` decorators
- Nested entities are their own classes (e.g., `PostAuthorEntity`, `PostCourseEntity`)
- Nullable fields use `@ApiPropertyOptional({ nullable: true, type: ActualType })`
- Enum fields always include `enumName`: `@ApiProperty({ enum: PostType, enumName: 'PostType' })`

### Global Infrastructure

| Component                   | Location                                              | Purpose                                                                                   |
| --------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `HttpExceptionFilter`       | `src/common/filters/http-exception.filter.ts`         | Catches all exceptions; returns `{ success, message, error, path, timestamp }`            |
| `ResponseInterceptor`       | `src/common/interceptors/response.interceptor.ts`     | Wraps all non-SSE responses in `{ success: true, message, data }`                         |
| `LoggerMiddleware`          | `src/common/middleware/logger.middleware.ts`          | Logs `METHOD /path statusCode +Xms`; sets `Cache-Control: no-store`                       |
| `ResponseMessage` decorator | `src/common/decorators/response-message.decorator.ts` | Sets the `message` field in success responses                                             |
| `paginate()`                | `src/common/utils/paginate.ts`                        | Generic pagination over any Prisma model                                                  |
| `PrismaService`             | `src/prisma/prisma.service.ts`                        | Extends `PrismaClient`, manages connection lifecycle via `OnModuleInit`/`OnModuleDestroy` |

### Logging

Use NestJS's built-in `Logger`:

```ts
private readonly logger = new Logger(ClassName.name)
```

- `logger.log()` for normal informational messages
- `logger.error()` for errors (include stack trace as second argument)
- `logger.warn()` for recoverable non-critical issues

Log format in `HttpExceptionFilter`: `METHOD /path statusCode message | details=...`

### Scheduled Tasks

`TasksService` (`src/modules/tasks/tasks.service.ts`) uses `@nestjs/schedule` `@Cron()` decorators. Comments describe the schedule in plain English above each method.

---

## Next.js (Web) Patterns

### Directory Structure

```
app/
  (app)/              # Main authenticated + public app layout
    (protected)/      # Routes requiring auth (enforced by AuthGuard component)
    page.tsx          # Feed
    layout.tsx
  (auth)/             # Login/auth pages
  api/                # Next.js route handlers (SSE stream, health check)
components/
  ui/                 # shadcn/ui primitives
  feed/               # Feed-specific components
  post-detail/        # Post detail page components
  posts/              # Post creation wizard steps
  profile/            # Profile page components
  admin/              # Admin panel components
  shared/             # Reusable cross-feature components
contexts/             # React Context providers
hooks/                # Custom React hooks
lib/                  # Utilities, constants, Zustand stores, Zod schemas
src/
  lib/
    api/
      generated/      # Orval-generated React Query hooks (DO NOT EDIT)
      fetcher.ts      # Custom fetch wrapper
    auth/
      client.ts       # better-auth client
    permissions.ts    # RBAC definitions (mirrors API)
  providers/          # QueryProvider, Providers root
  proxy.ts            # Next.js middleware (route protection)
```

### Component Patterns

- All interactive client components begin with `'use client'`
- Components export named exports (not default), except for Next.js pages which use `export default function`
- Props interfaces are named `<ComponentName>Props` and defined inline above the component
- The `cn()` utility (from `lib/utils.ts`) is used for all conditional class merging:
  ```ts
  import { cn } from '@/lib/utils'
  className={cn('base-classes', condition && 'conditional-class')}
  ```
- UI components from `components/ui/` are shadcn/ui-style: CVA variants, `Slot` from radix-ui, `data-slot` attributes

### API Integration

API calls are **never written by hand**. The workflow is:

1. NestJS generates an OpenAPI spec at `/docs-json`
2. `pnpm api:sync` fetches the spec to `apps/web/openapi.json` and runs Orval
3. Orval generates typed React Query hooks into `src/lib/api/generated/` (split by tag)
4. All API calls go through `src/lib/api/fetcher.ts` (`customFetch`), which:
   - Sends credentials (`credentials: 'include'`)
   - Sets `Content-Type: application/json`
   - Unwraps `{ success, message, data }` envelope
   - Throws `new Error(json.message)` on non-OK responses

Generated hooks follow the naming pattern:

- Queries: `usePostsControllerFindAll(params, options)`
- Mutations: `usePostsControllerSavePost(options)`
- Query key factories: `getPostsControllerFindAllQueryKey(params)`

Re-exports for common API types are in `lib/api-types.ts`:

```ts
export type { PostEntity as ApiPost } from '@/src/lib/api/generated/unishareAPI.schemas'
```

### State Management

Zustand stores are defined in `lib/store.ts` with `create<Interface>()(persist(...))`. All stores use the `persist` middleware with a `name` key:

| Store                   | Name key                     | Purpose                                        |
| ----------------------- | ---------------------------- | ---------------------------------------------- |
| `useFeedStore`          | `'unishare-feed'`            | Feed filters, selected dept/year/course/module |
| `useUIStore`            | `'unishare-ui'`              | Read post IDs, guest saved posts               |
| `usePdfAnnotationStore` | `'unishare-pdf-annotations'` | PDF annotations by S3 key                      |

`useUIStore` uses `skipHydration: true` and is manually rehydrated inside `Providers` (`useUIStore.persist.rehydrate()`).

### Forms

- All forms use `react-hook-form` with validation rules (not Zod resolver; validation is inline `rules.validate` functions)
- Validation constants are `SCREAMING_SNAKE_CASE` strings at module level
- Zod schemas are defined separately in `lib/posts/form-schema.ts` for reusable validation logic
- Form field types use string values even for numeric inputs, coerced at submission time

### Authentication & Authorization

- `AuthProvider` (context) + `useAuth()` hook provide `session`, `user`, `isLoading`, `isAuthenticated`
- Route-level protection uses two mechanisms:
  1. `src/proxy.ts` middleware: redirects unauthenticated users away from protected paths (cookie check only, no DB call)
  2. `AuthGuard` component: client-side redirect with loading spinner for in-app protected routes
- `GuestGuard` redirects authenticated users away from auth pages

### Error Handling (Frontend)

- API errors surface through React Query's error state; components render error UI or fall back to empty state
- User-facing feedback uses `sonner` toasts: `toast.success(...)`, `toast.error(...)`
- SSE error handler is a no-op (EventSource auto-reconnects): `es.onerror = () => {}`
- Malformed SSE data is silently swallowed: `try { ... } catch { // ignore malformed events }`

---

## Shared Package (`@unishare/types`)

Located at `packages/types/src/index.ts`. Exports:

- Role/status enums as `const` objects with `as const` (not TypeScript `enum`):
  ```ts
  export const UserRole = { Student: 'STUDENT', ... } as const
  export type UserRole = (typeof UserRole)[keyof typeof UserRole]
  ```
- File constants: `MAX_FILE_SIZE`, `SUPPORTED_FILE_TYPES`, `PAGINATION_DEFAULT_LIMIT`, `PAGINATION_MAX_LIMIT`
- `PaginatedResult<T>` interface

---

## Comments

- Comments are used to explain **why**, not **what**
- Inline comments appear above the relevant code, not at end of line
- Cron job methods have a comment above the `@Cron` decorator describing the schedule in plain English:
  ```ts
  // Prune read notifications older than 30 days
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async pruneOldNotifications() { ... }
  ```
- Short clarifying comments appear for non-obvious behavior:
  ```ts
  // prevent Cloudflare and browsers from caching API responses
  // ignore malformed events
  // EventSource will auto-reconnect on error
  ```
- No JSDoc comments on non-public APIs
