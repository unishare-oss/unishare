# Coding Conventions

**Analysis Date:** 2025-01-09

## Naming Patterns

**Files:**

- Services: `*.service.ts` (e.g., `posts.service.ts`)
- Repositories: `*.repository.ts` (e.g., `comments.repository.ts`)
- Controllers: `*.controller.ts` (e.g., `posts.controller.ts`)
- DTOs: `*.dto.ts` in `dto/` directory (e.g., `create-post.dto.ts`, `list-posts.dto.ts`)
- Entities: `*.entity.ts` in `entities/` directory (e.g., `post.entity.ts`, `post-author.entity.ts`)
- Modules: `*.module.ts` (e.g., `posts.module.ts`)
- Middleware/Filters/Interceptors: `*.middleware.ts`, `*.filter.ts`, `*.interceptor.ts`
- React components: `PascalCase.tsx` (e.g., `AuthGuard.tsx`, `StepIndicator.tsx`)
- Hooks: `use[PascalCase].ts(x)` (e.g., `useNotifications.ts`, `useAuth()`)
- Utility files: `camelCase.ts` (e.g., `fetcher.ts`, `permissions.ts`)
- Test files: `*.spec.ts` for unit tests, `.e2e-spec.ts` for e2e tests

**Functions & Methods:**

- camelCase for all functions and methods
- Example: `findByShortCode()`, `getSavedPosts()`, `buildCommentTree()`
- Private utilities prefixed with underscore pattern not enforced; prefer clarity

**Variables & Constants:**

- camelCase for variables
- UPPER_SNAKE_CASE for exported constants (e.g., `const DELETED_COMMENT_CONTENT = 'This comment was deleted.'`)
- Avoid underscore prefix for unused parameters; use pattern `varsIgnorePattern: '^_'` in ESLint config to ignore them

**Types & Interfaces:**

- PascalCase for types and interfaces
- Prefix context/config types with purpose: `ExceptionResponseBody`, `FlatCommentNode`, `CommentWithChildren`
- Use descriptive names for mapped/derived types (e.g., `CommentResponseNode`)

## Code Style

**Formatting:**

- Prettier with strict configuration
- No semicolons (enabled via `.prettierrc`)
- Single quotes (enabled via `.prettierrc`)
- Print width: 100 characters
- Tab width: 2 spaces
- Trailing commas: all
- Run `pnpm format` to auto-format

**Linting:**

**API (NestJS):**

- ESLint with TypeScript support (`eslint.config.mjs`)
- ESLint rule: `@typescript-eslint/no-explicit-any: 'off'` (any is allowed)
- ESLint rule: `@typescript-eslint/no-unused-vars` with pattern ignoring underscore-prefixed vars
- Prettier integration via `eslint-plugin-prettier/recommended`

**Web (Next.js):**

- ESLint using Next.js config (`eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`)
- ESLint rule: `@typescript-eslint/no-explicit-any: 'warn'` (any generates warning)
- Run `pnpm lint` to check and auto-fix

**Editor Configuration:**

- `.editorconfig` enforced at repository root
- UTF-8 charset, LF line endings, 2-space indentation
- Makefiles use tab indentation (exception)
- Markdown files don't trim trailing whitespace

## Import Organization

**Order:**

1. External dependencies (npm packages)
2. Next.js/NestJS internal modules
3. Relative imports from application code
4. Type-only imports from external packages or app code

**Path Aliases:**

- API: `@/*` maps to `src/*` (defined in `apps/api/tsconfig.json`)
- Web: `@/*` maps to `./*` (defined in `apps/web/tsconfig.json`)
- Use `@/` prefix for absolute imports within each app

**Examples:**

```typescript
// API imports
import { Controller, Get } from '@nestjs/common'
import { OptionalAuth } from '@thallesp/nestjs-better-auth'
import { AppService } from './app.service'
import { PaginationDto } from '@/common/dto/pagination.dto'

// Web imports
import { createAuthClient } from 'better-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { useNotificationStream } from '@/hooks/use-notifications'
```

**No star imports** - Always import specific exports for clarity.

## Error Handling

**Strategy:**
NestJS HTTP exception hierarchy is used throughout the API. Exceptions are caught by global `HttpExceptionFilter` and formatted consistently.

**Patterns:**

```typescript
// Use specific NestJS HTTP exceptions
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'

// Throw with descriptive message
if (!departmentId) {
  throw new BadRequestException('Please set your department before creating a post')
}

// Forbidden for authorization failures
if (course.departmentId !== departmentId) {
  throw new ForbiddenException('You can only create posts in your department')
}

// NotFound for missing resources
if (!course) throw new NotFoundException('Course not found')

// Global filter normalizes all exceptions to:
// { success: false, message, error, path, timestamp }
```

**Common Exceptions:**

- `BadRequestException` - Input validation or business logic violation
- `ForbiddenException` - Authorization/permission denied
- `NotFoundException` - Resource not found
- `UnauthorizedException` - Authentication required

**Frontend Error Handling:**

- Errors from API calls handled via `@tanstack/react-query`
- Error state managed in component hooks and contexts
- User-facing errors displayed via `sonner` toast notifications

```typescript
try {
  const notification = JSON.parse(e.data) as NotificationEntity
  handleNewNotification(notification)
} catch {
  // Silently ignore malformed events (example from EventSource usage)
}
```

## Logging

**Framework:**

- Backend: NestJS built-in `Logger` from `@nestjs/common`
- Frontend: No structured logging; occasional `console` usage acceptable

**Backend Patterns:**

```typescript
import { Logger } from '@nestjs/common'

@Injectable()
export class SomeService {
  private readonly logger = new Logger(SomeService.name)

  async someMethod() {
    this.logger.log('Operation started')
    this.logger.error('Error message', stack)
    this.logger.warn('Warning message')
  }
}

// Middleware logging example
private readonly logger = new Logger(LoggerMiddleware.name)

use(request: Request, response: Response, next: NextFunction) {
  const { method, originalUrl } = request
  const startedAt = Date.now()

  response.once('finish', () => {
    const responseTime = Date.now() - startedAt
    this.logger.log(`${method} ${originalUrl} ${response.statusCode} +${responseTime}ms`)
  })

  next()
}
```

**What to Log:**

- Application startup/shutdown
- HTTP request/response lifecycle (method, path, status, duration)
- Errors with full stack trace
- Important business logic transitions
- Warning conditions

**What NOT to Log:**

- Sensitive data (passwords, tokens, emails in production)
- Request/response bodies unless explicitly needed
- Repeated identical messages (spam prevention)

## Comments

**When to Comment:**

- Complex algorithm logic that isn't obvious from code
- Why (not what) - the code shows what; comments explain why a choice was made
- Edge cases or workarounds with references to issues/tickets
- Public API behavior that isn't obvious from types

**JSDoc/TSDoc:**

- Use JSDoc for public functions in services and utilities
- Use for DTO and Entity classes to describe API contracts
- Swagger decorators (`@ApiProperty`, `@ApiPropertyOptional`) replace detailed JSDoc in DTOs

```typescript
/**
 * Build hierarchical tree structure from flat comment list.
 * Handles deleted comments by preserving tree structure.
 * @param comments - Flat list of comments from database
 * @returns Hierarchical comment tree for API response
 */
private buildCommentTree(comments: FlatCommentNode[]): CommentTreeNode[] {
  // Implementation...
}
```

**Avoid:**

- Obvious comments ("set x to 5", "loop through items")
- Commented-out code (delete it)
- @author or @version tags

## Function Design

**Size:**

- Aim for functions <30 lines
- If function approaches 50+ lines, consider breaking into smaller helpers
- Single responsibility principle: one function = one reason to change

**Parameters:**

- Limit to 3-4 parameters; use object for more
- Always type parameters explicitly
- Use optional chaining with null safety when appropriate

```typescript
// Good: single responsibility, clear parameters
async findByShortCode(shortCode: string, viewer?: ViewerContext): Promise<PostDetail> {
  // 10-15 lines
}

// Good: uses object pattern for many parameters
async create(
  dto: CreatePostDto,
  userId: string,
  departmentId?: string | null,
): Promise<Post> {
  // 20 lines
}
```

**Return Values:**

- Always explicit return type annotation
- Async functions return `Promise<T>`
- Use `void` only when side-effect only
- Return early for error/validation cases

```typescript
async create(dto: CreatePostDto, userId: string): Promise<PostDetail> {
  if (!departmentId) {
    throw new BadRequestException('...')
  }

  const post = await this.postsRepository.create({ ...dto })
  return post
}
```

## Module Design

**Exports:**

- Each module exports exactly what's needed for consumers
- Services exported via NestJS module providers
- DTOs and Entities exported as barrel exports

```typescript
// Module barrel export pattern
// posts/index.ts would export:
export * from './posts.service'
export * from './posts.controller'
export * from './dto'
export * from './entities'
```

**Barrel Files:**

- Used in `dto/` and `entities/` directories
- Example: `apps/api/src/modules/posts/dto/index.ts` exports all DTOs

**Dependency Injection:**

- NestJS constructor injection used throughout
- Dependencies explicitly listed in constructor
- Private readonly pattern for all injected dependencies

```typescript
export class PostsService {
  constructor(
    private readonly postsRepository: PostsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly followsService: FollowsService,
  ) {}
}
```

## React Component Conventions (Web)

**Component Structure:**

- Functional components only (no class components)
- `'use client'` directive at top for client-side components
- Props destructured with explicit types

```typescript
interface AuthGuardProps {
  children: ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  // Implementation
}
```

**Hooks Usage:**

- Custom hooks use `use` prefix
- Query hooks from generated API client: `use[ResourceName]Controller[Operation]`
- Example: `usePostsControllerCreate`, `useNotificationsControllerFindAll`

**State Management:**

- Context API for auth and global state
- React Query (TanStack Query) for server state and caching
- Zustand available but not currently used (in dependencies)

## Type Safety

**TypeScript Strictness:**

- `tsconfig.json` extends from workspace shared configs
- Strong typing throughout; `any` minimized (off in API, warn in web)
- Generated types from Prisma and Swagger/Orval
- Use union types for discriminated options

```typescript
// Good: discriminated union
type CommentTreeNode = FlatCommentNode & {
  children?: CommentTreeNode[]
}

// Use specific types from generated Prisma client
import { PostStatus, PostType, UserRole } from '@/generated/prisma/client'
```

## DTO & Validation Pattern

All DTOs follow consistent pattern with class-validator and class-transformer:

```typescript
import { IsString, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string
}
```

**Rules:**

- All public fields have both validation and Swagger decorators
- Order: `@ApiProperty` then validation decorators
- Use `@Type()` from class-transformer for type coercion
- DTOs are the contract between API and clients

---

_Convention analysis: 2025-01-09_
