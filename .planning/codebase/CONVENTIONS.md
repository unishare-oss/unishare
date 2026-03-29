# Coding Conventions

This document outlines the coding conventions, naming patterns, and formatting standards used in the Unishare codebase.

## Formatting & Linting

### General
- **Prettier**: Configured in `.prettierrc`.
  - `semi`: `false` (no semicolons).
  - `singleQuote`: `true` (use single quotes).
  - `trailingComma`: `all`.
  - `printWidth`: `100`.
  - `tabWidth`: `2`.
- **TypeScript**: Used throughout the project for both API and Web.
- **ESLint**: Modern ESLint flat config (`eslint.config.mjs`) is used in each app.

### Unused Variables
- Unused variables are allowed if prefixed with an underscore `_`.
  - Rule: `['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true }]`.

---

## API (apps/api) - NestJS

### Naming Patterns
- **Files**: `kebab-case.type.ts`.
  - Controllers: `*.controller.ts`
  - Services: `*.service.ts`
  - Modules: `*.module.ts`
  - DTOs: `*.dto.ts` (e.g., `create-post.dto.ts`)
  - Entities: `*.entity.ts`
- **Classes**: `PascalCase` with a suffix corresponding to the type.
  - `PostsController`, `PostsService`, `CreatePostDto`.
- **Directories**: `kebab-case`.

### Architecture
- **Modules**: Feature-based modular structure in `src/modules/`.
- **Repositories**: Uses a Repository pattern (e.g., `PostsRepository`) to abstract Prisma calls.
- **Swagger**: Heavy use of `@nestjs/swagger` decorators (`@ApiTags`, `@ApiOkResponse`, etc.) for API documentation.
- **Validation**: Uses `class-validator` and `class-transformer` for DTO validation.

### Path Aliases
- `@/` points to `apps/api/src/`.

---

## Web (apps/web) - Next.js

### Naming Patterns
- **App Router**: Next.js conventions for files like `layout.tsx`, `page.tsx`, `not-found.tsx`.
- **Components**:
  - Files: A mix of `kebab-case.tsx` (e.g., `post-card.tsx`) and `PascalCase.tsx` (e.g., `FeedSortDropdown.tsx`).
  - Component Names: `PascalCase`.
- **Hooks**: `kebab-case` with `use-` prefix (e.g., `use-search.ts`). Some older hooks use `camelCase` (e.g., `useFeedSort.ts`).
- **Directories**: `kebab-case`.

### Styling & UI
- **Tailwind CSS**: Primary styling framework.
- **Utility**: `cn()` utility for conditional class merging (using `tailwind-merge` and `clsx`).
- **Icons**: `lucide-react`.
- **State Management**: `zustand` for client-side state.
- **Data Fetching**: `@tanstack/react-query` with generated hooks from Orval.

### Path Aliases
- `@/` points to `apps/web/`.

---

## Shared Packages

- **@unishare/types**: Shared TypeScript types in `packages/types`.
- **@unishare/tsconfig**: Shared TypeScript configuration in `packages/tsconfig`.
