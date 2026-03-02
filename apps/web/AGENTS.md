# Frontend Agent Guide

This document explains how the frontend in `apps/web` is structured, which technologies it uses, and how API integration works with Orval.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- TanStack Query 5 for server state
- Better Auth for session/auth client
- Zustand for small client-only persisted UI state
- Orval for OpenAPI-based API client and hook generation

## Folder Ownership

- `app`
  Route groups, layouts, and page-level orchestration.
- `components`
  UI building blocks and feature UI. Some components currently also fetch or mutate data.
- `src/providers`
  App-wide providers such as TanStack Query.
- `src/lib/auth`
  Better Auth client setup.
- `src/lib/api`
  Shared API infrastructure.
- `src/lib/api/generated`
  Orval-generated schemas, request functions, query keys, and TanStack Query hooks. Never edit by hand.
- `lib`
  Local utilities and lightweight client state such as the Zustand store.

## Runtime Architecture

The frontend is mostly client-driven today. Many pages are `'use client'`, fetch data in the browser, and pass server data down into screen components.

The main runtime layers are:

1. Route and layout layer in `app/`
   Owns page composition, route grouping, and high-level screen orchestration.
2. UI layer in `components/`
   Renders screens and user interactions.
3. Server-state layer with TanStack Query
   Owns remote API data, caching, and invalidation.
4. Client-only state with Zustand
   Used only for local UI persistence such as read markers and guest saved posts.
5. Auth layer with Better Auth
   Used for session lookup in client components.
6. API contract layer with Orval
   Generated from the backend OpenAPI spec.

## Providers and App Shell

- Root layout: `app/layout.tsx`
  Mounts global providers.
- Providers entry: `src/providers/index.tsx`
  Rehydrates persisted Zustand state and mounts the query provider.
- Query provider: `src/providers/query-provider.tsx`
  Creates the app `QueryClient`.
- App shell layout: `app/(app)/layout.tsx`
  Wraps the main app pages with sidebar and mobile navigation.

## State Rules

Use TanStack Query for anything that comes from the backend.

Use Zustand only for local UI state that does not need backend ownership. In this repo that currently means:

- read post markers
- guest saved posts

Do not add backend-owned server state to Zustand just to avoid React Query.

## Auth Flow

There are two auth layers:

- Route protection in `src/proxy.ts`
  Redirects unauthenticated users away from protected paths.
- Session access in `src/lib/auth/client.ts`
  Used inside client components with `authClient.useSession()`.

Use the proxy for coarse route gating. Use the session hook for UI behavior such as showing buttons or user-specific actions.

## API Integration with Orval

This repo does not need a handwritten API layer for standard backend endpoints. Orval already generates:

- request functions
- response and request types
- query keys
- `useQuery` hooks
- `useMutation` hooks

### Config

The frontend Orval config lives at `orval.config.ts`.

Important settings:

- `client: 'react-query'`
  Generates TanStack Query hooks.
- `httpClient: 'fetch'`
  Uses fetch-based clients.
- `target: 'src/lib/api/generated'`
  Writes generated code there.
- `mutator: customFetch`
  Routes every request through the app’s fetch wrapper.

### Fetch Wrapper

`src/lib/api/fetcher.ts` is the shared HTTP mutator used by generated clients.

The backend response envelope is:

```json
{ "success": true, "message": "...", "data": ... }
```

`customFetch` unwraps that into an object shaped like:

```ts
{
  ;(data, message, status, headers)
}
```

Because of that, most reads should use the TanStack `select` option:

```ts
const { data: user } = useUsersControllerGetMe({
  query: {
    select: (res) => res.data,
  },
})
```

Without `select`, you will keep reading `result.data?.data`.

## Generated Code Rules

- Never edit anything inside `src/lib/api/generated`.
- Regeneration will overwrite generated files.
- Put app-specific logic outside generated files.
- If you need composition, create a small feature wrapper hook or controller component around generated hooks instead of editing generated output.

## Hook Organization with Orval/TanStack

When a component uses both local React state and generated Orval hooks, keep them visually separated so a reader can immediately tell which lines are local UI state and which lines are backend/server-state wiring.

- Group local `useState` hooks together first.
- Keep auth/session hooks in their own small block if present.
- Group Orval-generated hooks and TanStack Query utilities together in a clearly separate block.
- Do not interleave generated hooks between unrelated local state declarations.
- If the file starts to look mixed, add a short note such as `// Orval/TanStack server state` above the generated-hook block.

Preferred shape:

```ts
const [error, setError] = useState<string | null>(null)
const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
const [editText, setEditText] = useState('')

const { data: session } = authClient.useSession()

// Orval/TanStack server state
const queryClient = useQueryClient()
const { data: comments = [], isLoading } = useCommentsControllerFindAll(postId, {
  query: { select: (response) => response.data },
})
const { mutateAsync: createComment, isPending } = useCommentsControllerCreate()
const { mutateAsync: updateComment, isPending: isUpdating } = useCommentsControllerUpdate()
const { mutateAsync: removeComment, isPending: isRemoving } = useCommentsControllerRemove()
```

## How To Add or Change an API

### Backend requirements

For Orval to generate correct frontend types and hooks, the backend endpoint must be present in Swagger correctly.

That means:

1. Define response entities with `@ApiProperty` or `@ApiPropertyOptional`.
2. Annotate controller methods with `@ApiOkResponse`, `@ApiCreatedResponse`, or the correct Swagger response decorator.
3. Ensure the endpoint appears in the OpenAPI spec.

If the backend response metadata is missing, Orval may still generate a hook but with weak or `void` data typing.

### Generate frontend clients

Run the backend first because Orval depends on the API spec:

```bash
pnpm --filter api dev
pnpm --filter web api:generate
```

This updates:

- `src/lib/api/generated/unishareAPI.schemas.ts`
- `src/lib/api/generated/<tag>/<tag>.ts`

### Use the generated client

Read example:

```ts
const { data: comments = [] } = useCommentsControllerFindAll(postId, {
  query: {
    select: (res) => res.data,
  },
})
```

Mutation example:

```ts
const queryClient = useQueryClient()
const { mutateAsync: createComment } = useCommentsControllerCreate()

await createComment({ postId, data: { content } })
await queryClient.invalidateQueries({
  queryKey: getCommentsControllerFindAllQueryKey(postId),
})
```

## Current Architectural Convention

Today, this codebase commonly imports generated Orval hooks directly into pages and some feature components. That is acceptable for now and matches the current project style.

Preferred discipline:

- Pages own screen-level orchestration.
- Reusable presentational components should not know about backend endpoints unless they are explicitly feature-controller components.
- Use generated hooks directly for normal CRUD flows.
- Add a thin feature wrapper only when it improves reuse, readability, or invalidation consistency.

## When You Probably Do Not Need a Custom API Layer

You usually do not need a separate handwritten:

- API client layer
- hook layer

Orval already provides both.

Add a thin wrapper only when:

- multiple generated hooks must be coordinated
- invalidation logic is repeated in many places
- naming from generated hooks is too awkward for repeated use
- UI-specific mapping or optimistic updates are substantial

## Safe Working Rules for Frontend Changes

- Prefer generated Orval hooks over ad hoc fetch calls.
- Prefer TanStack Query for remote data.
- Keep generated Orval/TanStack hook blocks clearly separated from local component state.
- Keep server response transformations small and explicit.
- Do not persist large backend DTOs to local storage unless necessary.
- Do not edit generated files to fix types; fix the backend Swagger metadata and regenerate.
- If generated output looks wrong, inspect the backend controller and entity annotations first.
