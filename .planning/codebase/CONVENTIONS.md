# Coding Conventions

**Analysis Date:** 2025-05-24

## Naming Patterns

**Files:**
- **General:** `dash-case.ts` (e.g., `app.module.ts`, `chat.service.ts`)
- **React Components:** `PascalCase.tsx` (e.g., `PostCard.tsx`, `SearchBox.tsx`)
- **Next.js Pages:** `page.tsx`, `layout.tsx` (standard Next.js)
- **Tests:** `*.spec.ts` (API), `*.test.ts` or `*.spec.ts` (Web)

**Functions:**
- `camelCase` (e.g., `getRooms`, `createRoom`)

**Variables:**
- `camelCase` (e.g., `allowedOrigins`, `repositoryMock`)
- `UPPER_SNAKE_CASE` for constants (e.g., `BASE_URL`)

**Types:**
- `PascalCase` (e.g., `SendMessageDto`, `ChatRoomType`)
- **Interfaces:** `PascalCase` (e.g., `Metadata`, `Viewport`)

## Code Style

**Formatting:**
- **Prettier:** Managed via `.prettierrc`.
- **Key settings:**
  - `semi: false`
  - `singleQuote: true`
  - `trailingComma: "all"`
  - `printWidth: 100`
  - `tabWidth: 2`

**Linting:**
- **Tool:** ESLint (standardized across `apps/api/eslint.config.mjs` and `apps/web/eslint.config.mjs`).
- **Standard rules:** TypeScript-focused, React-focused for frontend.

## Import Organization

**Order (API):**
1. Standard modules (e.g., `import 'dotenv/config'`, `import helmet from 'helmet'`)
2. NestJS core and common (e.g., `import { NestFactory } from '@nestjs/core'`)
3. Internal app modules using relative paths or alias (e.g., `import { AppModule } from './app.module'`)

**Order (Web):**
1. Next.js and React imports (e.g., `import type { Metadata } from 'next'`)
2. UI components (e.g., `import { Toaster } from '@/components/ui/sonner'`)
3. Internal providers and hooks (e.g., `import { Providers } from '@/src/providers'`)
4. Styles (e.g., `import './globals.css'`)

**Path Aliases:**
- `@/*`: Points to the root of the respective application or shared logic (e.g., `import { ChatRoomType } from '@/generated/prisma/client'`).

## Error Handling

**Patterns (API):**
- Use built-in NestJS exceptions (e.g., `NotFoundException`, `UnauthorizedException`).
- Global filters: `HttpExceptionFilter` in `apps/api/src/common/filters/http-exception.filter`.
- Centralized response handling: `ResponseInterceptor` in `apps/api/src/common/interceptors/response.interceptor`.

**Patterns (Web):**
- Use of `sonner` for toast notifications: `import { toast } from 'sonner'`.
- Error boundaries where appropriate.

## Logging

**Framework:**
- **API:** `Logger` from `@nestjs/common`.
- **Web:** Standard `console`.

**Patterns:**
- Instantiate logger with context: `const logger = new Logger('Bootstrap')`.

## Comments

**When to Comment:**
- Complexity: Used to explain non-obvious logic or complex data flows.
- TODOs: Marked with `TODO:` for future tasks.

**JSDoc/TSDoc:**
- Used for public API methods and complex functions.

## Function Design

**Size:** Generally small, single-responsibility functions.

**Parameters:** Prefer object destructuring for multiple parameters to improve readability.

**Return Values:** Strongly typed return values, often involving `Promise<T>` for async operations.

## Module Design

**Exports:**
- **Named Exports:** Used for most services, controllers, and utility functions.
- **Default Exports:** Used for Next.js pages/layouts and the main `AppModule`.

**Barrel Files:**
- Used for exporting multiple entities from a directory (e.g., `apps/api/src/common/middleware/index.ts`).

---

*Convention analysis: 2025-05-24*
