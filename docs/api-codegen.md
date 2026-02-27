# API Codegen — Backend to Frontend Types

This guide explains how backend response types automatically become TypeScript types in the frontend, and how to keep them in sync.

---

## How it works

```
NestJS controller (@ApiOkResponse)
        ↓
Swagger JSON  (http://localhost:3001/api-json)
        ↓
orval  (pnpm --filter web api:generate)
        ↓
apps/web/src/lib/api/generated/
  ├── unishareAPI.schemas.ts   ← all types (interfaces, enums)
  └── <tag>/                   ← hooks per controller tag
        └── <tag>.ts            ← useQuery / useMutation hooks
```

Orval reads the OpenAPI spec from the running API and generates typed TanStack Query hooks. You never write these files by hand.

---

## When to regenerate

Run `pnpm --filter web api:generate` whenever:

- You add a new endpoint
- You change a response shape (add/remove/rename a field)
- You add or update `@ApiOkResponse` on a controller method

Always have the API running (`pnpm --filter api dev`) before regenerating — orval fetches the spec from the live server.

```bash
# Terminal 1
pnpm --filter api dev

# Terminal 2
pnpm --filter web api:generate
```

---

## Backend: annotating response types

### DTOs vs Entities

| Folder      | Purpose                                                    | Example             |
| ----------- | ---------------------------------------------------------- | ------------------- |
| `dto/`      | Incoming request bodies, validated with class-validator    | `UpdateProfileDto`  |
| `entities/` | Response shapes, annotated with `@ApiProperty` for Swagger | `UserProfileEntity` |

DTOs are for what the client sends _to_ the server. Entities are for what the server sends _back_.

### Creating an entity

```ts
// modules/users/entities/user-profile.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UserProfileEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiPropertyOptional({ nullable: true, type: Number })
  yearLevel: number | null
}
```

Use `@ApiProperty()` for required fields and `@ApiPropertyOptional({ nullable: true })` for optional or nullable ones.

### Annotating the controller

```ts
import { ApiOkResponse } from '@nestjs/swagger'
import { UserProfileEntity } from './entities/user-profile.entity'

@Get('me')
@ApiOkResponse({ type: UserProfileEntity })
@ResponseMessage('Profile fetched successfully')
getMe(@Session() session: UserSession) {
  return this.usersService.findById(session.user.id)
}
```

Without `@ApiOkResponse`, orval generates `data: void` for that endpoint — the hook exists but has no type information.

---

## Frontend: using generated hooks

### Finding the hook

After regenerating, hooks are in `src/lib/api/generated/<tag>/<tag>.ts`. The naming follows the controller method name:

```
GET  /users/me   →  useUsersControllerGetMe()
POST /posts      →  usePostsControllerCreate()
```

### The `select` pattern

All API responses are wrapped by the backend interceptor:

```json
{ "success": true, "message": "...", "data": <actual payload> }
```

`customFetch` unwraps this to `{ data, message }`. So the actual payload is one `.data` deep. Use the `select` option to unwrap it cleanly:

```tsx
const { data: user } = useUsersControllerGetMe({
  query: {
    select: (res) => res.data,
  },
})
// user is UserProfileEntity | undefined
```

Without `select`, you'd have to write `queryResult.data?.data` everywhere, which is confusing.

### Never edit generated files

Everything inside `src/lib/api/generated/` is overwritten on every `api:generate` run. Put any custom logic in a separate file and import from the generated code.

---

## Full example: adding a new endpoint

Say you add `GET /posts/:id` and want the frontend typed correctly.

**Step 1 — Create the response entity:**

```ts
// modules/posts/entities/post.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class PostEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null
}
```

**Step 2 — Annotate the controller:**

```ts
@Get(':id')
@ApiOkResponse({ type: PostEntity })
@ResponseMessage('Post fetched successfully')
getOne(@Param('id') id: string) {
  return this.postsService.findById(id)
}
```

**Step 3 — Regenerate:**

```bash
pnpm --filter web api:generate
```

**Step 4 — Use in the frontend:**

```tsx
import { usePostsControllerGetOne } from '@/lib/api/generated/posts/posts'

const { data: post } = usePostsControllerGetOne(id, {
  query: { select: (res) => res.data },
})
```

That's it — `post` is fully typed as `PostEntity`.
