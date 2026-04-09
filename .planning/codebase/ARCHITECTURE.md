# Architecture

**Analysis Date:** 2024-05-24

## Pattern Overview

**Overall:** Monorepo with separated Backend (NestJS) and Frontend (Next.js App Router).

**Key Characteristics:**
- **Modular Monorepo**: Managed with `pnpm` and `turbo` for efficient build and dependency management.
- **Layered Backend**: Domain-driven modules in NestJS with a Controller-Service-Repository pattern.
- **Feature-driven Frontend**: React features organized into specific directories for high cohesion.
- **Type Safety**: End-to-end type safety using shared TypeScript types and generated API hooks from OpenAPI.

## Layers

**API Presentation Layer (Controllers):**
- Purpose: Entry point for HTTP requests, routing, and request validation.
- Location: `apps/api/src/modules/*/posts.controller.ts`
- Contains: NestJS Controllers, decorators for routing and documentation.
- Depends on: Services, DTOs.
- Used by: Frontend applications via HTTP.

**API Business Logic Layer (Services):**
- Purpose: Core business logic and orchestration.
- Location: `apps/api/src/modules/*/posts.service.ts`
- Contains: Business rules, data transformation, and integration calls.
- Depends on: Repositories, other services.
- Used by: Controllers.

**API Data Access Layer (Repositories):**
- Purpose: Direct interaction with the database using Prisma.
- Location: `apps/api/src/modules/*/posts.repository.ts`
- Contains: Prisma queries and data mapping logic.
- Depends on: Prisma Service.
- Used by: Services.

**Frontend View Layer (Pages & Components):**
- Purpose: UI rendering and user interaction.
- Location: `apps/web/app/`, `apps/web/components/`, `apps/web/src/features/*/components/`
- Contains: React components, Next.js Pages/Layouts.
- Depends on: Custom hooks (React Query), UI state (Zustand), Utility functions.
- Used by: End users.

**Frontend State Layer (TanStack Query & Zustand):**
- Purpose: Managing server-side cache and client-side UI state.
- Location: `apps/web/src/lib/api/generated/`, `apps/web/lib/store.ts`
- Contains: Generated hooks, Zustand store definitions.
- Depends on: Fetcher, Orval-generated models.
- Used by: View Layer.

## Data Flow

**Standard Request Flow:**

1. **User Interaction**: User clicks a button or navigates in the Next.js app.
2. **Hook Trigger**: A React Query hook (e.g., `useGetPosts`) is triggered in `apps/web/src/features/posts/hooks/`.
3. **API Call**: The hook uses `customFetch` in `apps/web/src/lib/api/fetcher.ts` to send a request to the NestJS backend.
4. **Backend Routing**: The request hits a NestJS Controller (e.g., `PostsController` in `apps/api/src/modules/posts/posts.controller.ts`).
5. **Business Logic**: The controller delegates to a Service (e.g., `PostsService` in `apps/api/src/modules/posts/posts.service.ts`).
6. **Data Access**: The service calls a Repository (e.g., `PostsRepository` in `apps/api/src/modules/posts/posts.repository.ts`) which queries the DB via Prisma.
7. **Response**: Data flows back up through the layers and is returned as JSON to the frontend.
8. **UI Update**: TanStack Query caches the result and updates the React components.

**State Management:**
- **Server State**: Managed by TanStack Query in `apps/web`.
- **Global UI State**: Managed by Zustand in `apps/web/lib/store.ts`.
- **Authentication State**: Managed by `better-auth`.
- **Local State**: Standard React `useState` and `useReducer`.

## Key Abstractions

**NestJS Modules:**
- Purpose: Encapsulate related functionality (Users, Posts, Chat).
- Examples: `apps/api/src/modules/posts/posts.module.ts`, `apps/api/src/modules/chat/chat.module.ts`
- Pattern: NestJS Module pattern.

**Prisma Service:**
- Purpose: Centralized database client shared across all modules.
- Examples: `apps/api/src/prisma/prisma.service.ts`
- Pattern: Singleton Provider.

**Generated API Hooks:**
- Purpose: Automatically synchronized types and hooks for API calls.
- Examples: `apps/web/src/lib/api/generated/posts/posts.ts`
- Pattern: Generated Proxy Hooks (Orval).

## Entry Points

**API Main Entry:**
- Location: `apps/api/src/main.ts`
- Triggers: Node.js server start.
- Responsibilities: NestJS app initialization, global filters/interceptors setup, Swagger (OpenAPI) generation.

**Web Main Entry:**
- Location: `apps/web/app/layout.tsx`
- Triggers: Next.js application mount.
- Responsibilities: Root layout, global styles, context providers (TanStack Query, Theme).

## Error Handling

**Strategy:** Centralized exception filtering and standardized response format.

**Patterns:**
- **Backend**: Global Exception Filter (`apps/api/src/common/filters/http-exception.filter.ts`) that catches all NestJS exceptions and returns a consistent `ApiResponse` format.
- **Frontend**: Standardized error handling in `customFetch` (`apps/web/src/lib/api/fetcher.ts`) which throws errors that TanStack Query can catch.

## Cross-Cutting Concerns

**Logging:** Standard NestJS Logger in backend; client-side logging via console/custom utilities.
**Validation:** `class-validator` and `class-transformer` in the backend; Zod for form validation in the frontend.
**Authentication:** `better-auth` integration for both backend and frontend, providing session-based security.

---

*Architecture analysis: 2024-05-24*
