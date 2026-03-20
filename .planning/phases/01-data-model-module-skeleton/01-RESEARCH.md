# Phase 1: Data Model & Module Skeleton — Research

**Researched:** 2026-03-20
**Domain:** NestJS module architecture, Prisma schema migration, slug generation
**Confidence:** HIGH

---

## Summary

Phase 1 introduces the Room entity to an existing, well-structured NestJS + Prisma monorepo. No new frameworks or infrastructure are needed — everything follows patterns already established in the codebase. The task is: add one Prisma model, run a migration, scaffold a `collab` module in the standard three-layer pattern (repository → service → controller), and wire two REST endpoints.

The codebase uses a strict controller/service/repository separation. DTOs are validated with `class-validator`. Swagger documentation is generated via `@nestjs/swagger` decorators. Auth is handled by `@thallesp/nestjs-better-auth` via `@Session()`. Slug generation uses the already-installed `nanoid` package (v5.1.6). No new packages are required for this phase.

**Primary recommendation:** Mirror the `posts` module structure exactly — it is the canonical, most complete example in the codebase.

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                    | Research Support                                                                                                                   |
| ------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| ROOM-01 | Authenticated users can create a standalone collaboration room | POST /api/rooms with `@Session()` guard; Room model with `ownerId → User` FK                                                       |
| ROOM-02 | Each room has a unique shareable link                          | `slug` field generated via `nanoid(10)` stored as `@unique` in Prisma schema                                                       |
| ROOM-03 | Board state persists after all participants leave              | Room row lives in PostgreSQL; `snapshot` column (`Bytes?`) reserved for Phase 6 — schema must include it now so migration is clean |

</phase_requirements>

---

## Standard Stack

### Core

| Library                        | Version | Purpose                                         | Why Standard                                  |
| ------------------------------ | ------- | ----------------------------------------------- | --------------------------------------------- |
| `@nestjs/common`               | ^11.0.1 | Controllers, services, guards, pipes            | Already present                               |
| `@prisma/client`               | ^7.4.1  | DB access, generated from schema                | Already present                               |
| `prisma` CLI                   | ^7.4.1  | `migrate dev`, `generate`                       | Already present                               |
| `nanoid`                       | ^5.1.6  | Slug generation (URL-safe, collision-resistant) | Already installed; used in `posts.service.ts` |
| `class-validator`              | ^0.14.3 | DTO validation                                  | Already present                               |
| `class-transformer`            | ^0.5.1  | DTO coercion                                    | Already present                               |
| `@nestjs/swagger`              | ^11.2.6 | Swagger decorators on controllers and entities  | Already present                               |
| `@thallesp/nestjs-better-auth` | ^2.4.0  | `@Session()` and `@OptionalAuth()` decorators   | Already present                               |

### No New Packages Required

All dependencies needed for Phase 1 are already installed. Do not add packages.

---

## Architecture Patterns

### Recommended Module Structure

```
apps/api/src/modules/collab/
├── dto/
│   ├── create-room.dto.ts
│   └── room-response.dto.ts      # (optional, entity covers this)
├── entities/
│   └── room.entity.ts
├── collab.controller.ts
├── collab.service.ts
├── collab.repository.ts
└── collab.module.ts
```

The module is named `collab` (not `rooms`) because it will grow to contain the WebSocket gateway, Yjs relay, and presence logic in later phases. Starting with the `collab` namespace avoids a rename later.

### Pattern 1: Prisma Model Definition

**What:** Add a `Room` model to `apps/api/prisma/schema.prisma`.
**When to use:** Any time a new persistent domain object is introduced.

```prisma
// Source: existing schema.prisma conventions in this codebase
model Room {
  id        String   @id @default(cuid())
  slug      String   @unique
  title     String?
  ownerId   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  snapshot  Bytes?
  owner     User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([ownerId])
  @@map("room")
}
```

Key decisions:

- `id` uses `cuid()` — matches every other model in this schema.
- `slug` is `@unique` and generated in the service layer using `nanoid(10)`, same as `shortCode` on `Post`.
- `title` is optional — requirement says "optional title".
- `ownerId` references `User.id` — ROOM-01 requires authenticated creator ownership.
- `snapshot Bytes?` is included now (null until Phase 6) so Phase 6 only needs `prisma migrate dev`, not a schema edit that touches the already-shipped module.
- `@@map("room")` follows the lowercase snake_case table naming convention used by every other model.
- `updatedAt @updatedAt` is standard for all models in this schema.

**After editing schema:** run `pnpm --filter api prisma migrate dev --name add-room-model` then `pnpm --filter api prisma generate`.

The `User` model must gain the back-relation:

```prisma
// Add inside model User { ... }
rooms Room[]
```

### Pattern 2: Repository Layer

**What:** Prisma queries only — no business logic.
**When to use:** Every database interaction goes through the repository.

```typescript
// Source: codebase convention from posts.repository.ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class CollabRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { slug: string; ownerId: string; title?: string }) {
    return this.prisma.room.create({ data })
  }

  async findBySlug(slug: string) {
    return this.prisma.room.findUnique({ where: { slug } })
  }
}
```

### Pattern 3: Service Layer

**What:** Business logic, throws HTTP exceptions, calls repository.
**When to use:** All logic that isn't a Prisma query lives here.

```typescript
// Source: codebase convention from posts.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { nanoid } from 'nanoid'
import { CollabRepository } from './collab.repository'
import { CreateRoomDto } from './dto/create-room.dto'

@Injectable()
export class CollabService {
  constructor(private readonly collabRepository: CollabRepository) {}

  async createRoom(dto: CreateRoomDto, ownerId: string) {
    const slug = nanoid(10)
    return this.collabRepository.create({ slug, ownerId, title: dto.title })
  }

  async getRoomBySlug(slug: string) {
    const room = await this.collabRepository.findBySlug(slug)
    if (!room) throw new NotFoundException('Room not found')
    return room
  }
}
```

Slug collision probability: `nanoid(10)` with 64-char alphabet gives ~1 in a billion chance of collision at 1 million rooms. No retry loop is needed at this scale, but one can be added later if desired.

### Pattern 4: Controller Layer

**What:** HTTP routing, auth guards, Swagger annotations.
**When to use:** All REST endpoint definitions live here.

```typescript
// Source: codebase convention from posts.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UserSession } from '@/auth/auth.config'
import { CollabService } from './collab.service'
import { CreateRoomDto } from './dto/create-room.dto'
import { RoomEntity } from './entities/room.entity'

@ApiTags('collab')
@Controller('rooms')
export class CollabController {
  constructor(private readonly collabService: CollabService) {}

  @Post()
  @ApiCreatedResponse({ type: RoomEntity })
  @ResponseMessage('Room created successfully')
  create(@Body() dto: CreateRoomDto, @Session() session: UserSession) {
    return this.collabService.createRoom(dto, session.user.id)
  }

  @Get(':slug')
  @ApiOkResponse({ type: RoomEntity })
  @ResponseMessage('Room fetched successfully')
  findBySlug(@Param('slug') slug: string) {
    return this.collabService.getRoomBySlug(slug)
  }
}
```

Note: `POST /rooms` uses `@Session()` (no `@OptionalAuth()`) because ROOM-01 restricts creation to authenticated users. `GET /rooms/:slug` does not need `@Session()` because guests need to look up room metadata before joining (Phase 2 handles the join auth).

### Pattern 5: DTO Definition

```typescript
// Source: codebase conventions (class-validator + class-transformer)
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateRoomDto {
  @ApiPropertyOptional({ description: 'Optional room title', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string
}
```

### Pattern 6: Entity (Swagger Response Shape)

```typescript
// Source: codebase conventions from post.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RoomEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  slug: string

  @ApiPropertyOptional({ nullable: true })
  title: string | null

  @ApiProperty()
  ownerId: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
```

Do not expose `snapshot` in the entity — it is an internal binary column.

### Pattern 7: Module Wiring

```typescript
// Source: codebase conventions from posts.module.ts
import { Module } from '@nestjs/common'
import { CollabController } from './collab.controller'
import { CollabService } from './collab.service'
import { CollabRepository } from './collab.repository'

@Module({
  controllers: [CollabController],
  providers: [CollabService, CollabRepository],
  exports: [CollabService],
})
export class CollabModule {}
```

Then register in `app.module.ts`:

```typescript
import { CollabModule } from './modules/collab/collab.module'
// add CollabModule to the imports array
```

### Anti-Patterns to Avoid

- **Putting Prisma queries in the service:** Business logic and DB queries must stay in separate layers. Repository = queries only.
- **Skipping `@@map("room")`:** Every model in this schema has a `@@map` directive. Omitting it creates a PascalCase table name that breaks the convention.
- **Using `uuid()` for IDs:** All existing IDs use `cuid()` — do not mix strategies.
- **Returning `snapshot` from the API:** The `snapshot` field is internal binary data. It must be excluded from entity shapes and Prisma `select` clauses returned to clients.
- **Slug generation in the controller:** Slug generation is a business rule → belongs in the service layer.

---

## Don't Hand-Roll

| Problem                    | Don't Build                  | Use Instead                                       | Why                                                           |
| -------------------------- | ---------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| URL-safe unique slugs      | Custom base62 encoder        | `nanoid(10)`                                      | Already installed, cryptographically random, correct alphabet |
| Request validation         | Manual type checks           | `class-validator` decorators on DTOs              | Pipe already registered globally in `main.ts`                 |
| Response envelope wrapping | Wrap manually in controllers | `ResponseInterceptor` + `@ResponseMessage()`      | Already applied globally                                      |
| HTTP error responses       | Custom error objects         | `throw new NotFoundException(...)`                | `HttpExceptionFilter` handles formatting globally             |
| Swagger docs               | Handwritten YAML             | `@ApiTags`, `@ApiCreatedResponse`, `@ApiProperty` | OpenAPI spec auto-generated at `/docs-json`                   |

---

## Common Pitfalls

### Pitfall 1: Missing Back-Relation on User Model

**What goes wrong:** Prisma migration fails or `prisma generate` emits a type error because `User` has no `rooms Room[]` relation.
**Why it happens:** Adding a foreign key (`ownerId → User`) without the corresponding back-relation on the owning side.
**How to avoid:** Any time a `@relation` is added to a new model, add the inverse relation field on the referenced model.
**Warning signs:** `prisma migrate dev` exits with "Error: Relation field must be present" or similar.

### Pitfall 2: Running `prisma generate` Before `migrate dev`

**What goes wrong:** The generated Prisma client (`src/generated/prisma/`) doesn't know about `Room`, causing TypeScript errors during development.
**Why it happens:** Developers edit the schema but only run `generate`, not `migrate dev`. `migrate dev` calls `generate` automatically.
**How to avoid:** Always run `pnpm --filter api prisma migrate dev --name <migration-name>` first. Never run `generate` alone when the schema has changed.

### Pitfall 3: Not Registering CollabModule in AppModule

**What goes wrong:** The `POST /rooms` and `GET /rooms/:slug` endpoints return 404 even though the controller is correctly implemented.
**Why it happens:** NestJS uses a module registry — a controller only handles requests if its module is imported into the application root.
**How to avoid:** After creating `collab.module.ts`, immediately add it to the `imports` array in `app.module.ts`.

### Pitfall 4: slug Uniqueness — No Retry Handling

**What goes wrong:** At very high room creation volumes, `nanoid(10)` could theoretically produce a duplicate slug, causing a Prisma unique constraint violation.
**Why it happens:** The service calls `create()` once and does not retry on `P2002` (unique constraint violation).
**How to avoid:** At current scale this is not a real risk. But document that if needed later, a retry loop (max 3 attempts) wrapping the `create()` call and catching Prisma error code `P2002` is the correct pattern.

### Pitfall 5: OpenAPI Spec Out of Sync

**What goes wrong:** The frontend's Orval-generated hooks (in `apps/web/src/lib/api/generated/`) don't include rooms endpoints.
**Why it happens:** After adding a new module, `pnpm api:sync` must be run from `apps/web` against a running API to regenerate the spec.
**How to avoid:** Phase completion should include running `pnpm api:sync` (requires the API to be running) or documenting this as a post-phase step.

---

## Code Examples

### Prisma `migrate dev` Commands

```bash
# From the repo root
pnpm --filter api prisma migrate dev --name add-room-model
# This also runs prisma generate automatically
```

### nanoid Usage (existing pattern from posts.service.ts)

```typescript
// Source: apps/api/src/modules/posts/posts.service.ts
import { nanoid } from 'nanoid'

const slug = nanoid(10) // 10 chars, URL-safe alphabet
```

### Accessing Session User in Controller

```typescript
// Source: apps/api/src/modules/posts/posts.controller.ts
import { Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'

create(@Body() dto: CreateRoomDto, @Session() session: UserSession) {
  return this.collabService.createRoom(dto, session.user.id)
}
```

`UserSession` is typed as `typeof auth.$Infer.Session` — it provides `session.user.id`, `session.user.role`, `session.user.departmentId`.

---

## State of the Art

| Old Approach                        | Current Approach                                    | When Changed     | Impact                                                                                                                           |
| ----------------------------------- | --------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Prisma v5 `datasource url` string   | Prisma v7 `@prisma/adapter-pg` (connection adapter) | Prisma 6+        | `schema.prisma` has no `url` in `datasource` block; connection is passed via adapter in `auth.config.ts` and `prisma.service.ts` |
| `@nestjs/platform-socket.io` for WS | `@nestjs/platform-ws` (pure `ws`)                   | Phase 3 decision | Phase 1 doesn't touch WebSockets, but note that Phase 3 will add this                                                            |

**Prisma v7 note (HIGH confidence):** The project already uses Prisma v7 with `@prisma/adapter-pg`. The `datasource db` block in `schema.prisma` intentionally has no `url` field — the connection string is passed via the adapter in `PrismaService` and `auth.config.ts`. This is correct and should not be "fixed."

---

## Open Questions

1. **GET /rooms/:slug — auth requirement**
   - What we know: ROOM-02 says "unique shareable link" with no auth requirement stated. Phase 2 handles guest join.
   - What's unclear: Should unauthenticated HTTP clients be able to hit `GET /rooms/:slug` to fetch metadata?
   - Recommendation: Leave `GET /rooms/:slug` unguarded (no `@Session()`, no `@OptionalAuth()`). Phase 2 will add the join endpoint that issues tokens. If the planner disagrees, `@OptionalAuth()` can be added with zero other changes.

2. **DELETE/PATCH room endpoints**
   - What we know: Success criteria only require POST and GET.
   - What's unclear: Should stubs for update/delete be included for completeness?
   - Recommendation: Do not add them in Phase 1. YAGNI — they are not required by any success criterion.

---

## Validation Architecture

### Test Framework

| Property           | Value                                                |
| ------------------ | ---------------------------------------------------- |
| Framework          | Jest 30.0.0 + `@nestjs/testing` + `ts-jest`          |
| Config file        | Inline in `apps/api/package.json` under `"jest"` key |
| Quick run command  | `pnpm --filter api test --testPathPattern="collab"`  |
| Full suite command | `pnpm --filter api test`                             |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                                         | Test Type | Automated Command                                           | File Exists? |
| ------- | -------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------- | ------------ |
| ROOM-01 | `CollabService.createRoom()` persists a room with the caller's userId as ownerId | unit      | `pnpm --filter api test --testPathPattern="collab.service"` | ❌ Wave 0    |
| ROOM-02 | `createRoom()` assigns a unique slug; two calls never return the same slug       | unit      | `pnpm --filter api test --testPathPattern="collab.service"` | ❌ Wave 0    |
| ROOM-03 | Room row exists in DB after create; `findBySlug` returns it                      | unit      | `pnpm --filter api test --testPathPattern="collab.service"` | ❌ Wave 0    |

Integration/E2E tests for the actual HTTP endpoints require a live database and are not required to pass as part of this phase's gate (the existing `test:e2e` suite bootstraps the real `AppModule`).

### Sampling Rate

- **Per task commit:** `pnpm --filter api test --testPathPattern="collab"`
- **Per wave merge:** `pnpm --filter api test`
- **Phase gate:** Full unit suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/modules/collab/collab.service.spec.ts` — covers ROOM-01, ROOM-02, ROOM-03
- [ ] No shared fixture changes needed (existing mock pattern uses inline `jest.fn()` objects)

---

## Sources

### Primary (HIGH confidence)

- `apps/api/prisma/schema.prisma` — all model conventions (cuid, @@map, @@index, back-relations)
- `apps/api/src/modules/posts/posts.controller.ts` — canonical controller pattern
- `apps/api/src/modules/posts/posts.service.ts` — canonical service pattern (nanoid usage)
- `apps/api/src/modules/posts/posts.repository.ts` — canonical repository pattern
- `apps/api/src/modules/posts/posts.module.ts` — canonical module wiring
- `apps/api/src/auth/auth.config.ts` — `UserSession` type definition
- `.planning/codebase/CONVENTIONS.md` — naming, DI, decorator patterns
- `.planning/codebase/STRUCTURE.md` — directory layout
- `.planning/codebase/TESTING.md` — Jest config and test patterns
- `.planning/codebase/STACK.md` — package versions
- `.planning/research/STACK.md` — Prisma v7 adapter note, overall architecture decisions

### Secondary (MEDIUM confidence)

- Prisma v7 adapter pattern verified against existing `schema.prisma` (no `url` in datasource)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages already installed; versions confirmed from `package.json`
- Architecture: HIGH — patterns read directly from existing module source code
- Pitfalls: HIGH — derived from direct inspection of existing code and schema conventions

**Research date:** 2026-03-20
**Valid until:** 2026-06-20 (stable patterns; only invalidated if Prisma or NestJS major version bumps)
