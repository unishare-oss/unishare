# Phase 2: Guest Identity & Auth - Research

**Researched:** 2026-03-20
**Domain:** Better Auth anonymous plugin, NestJS session management, guest identity lifecycle
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Guest display name**

- Auto-generated adjective+animal name (e.g., "Purple Penguin") assigned at session creation — zero friction, user drops straight into room
- Name stored as a `displayName` field on the anonymous session record in the DB (single source of truth for Phase 5's presence UI)
- Guests CAN change their display name from inside the room — name-change UI is Phase 5's concern, but the session must store a mutable `displayName` field

**Session continuity**

- Anonymous session persists via cookie (7-day TTL, matching the existing Better Auth session config)
- If a guest returns to the same room URL with a valid cookie, they re-enter as the same identity — no new session created
- Canvas contributions stay attributed to the original session ID (not re-attributed on re-join)

**Session creation trigger**

- Anonymous session is created when the guest hits the room join endpoint: `POST /api/rooms/:slug/join`
- Behavior is idempotent: if a valid anonymous session cookie is already present, return the existing session — no new session created
- Session creation is NOT deferred to WebSocket connection time

**Guest permissions level**

- Guests have full editor access by default — same as authenticated users
- A room-level `isGuestEditingAllowed` boolean flag is added to the `Room` model in this phase (default: `true`)
- The join endpoint checks this flag: if `false`, guest session is created but flagged as view-only
- Room creator can toggle this flag (endpoint to be added in this phase or Phase 3 — planner decides)

**Cleanup**

- Anonymous sessions older than 7 days are cleaned up via a scheduled job (the `@nestjs/schedule` package is already installed)

### Claude's Discretion

None specified.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                           | Research Support                                                                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| COLB-04 | Anyone with the room link can join without creating a UniShare account (guest access) | Better Auth anonymous plugin creates a full session for unauthenticated users; the join endpoint creates the session server-side via `auth.api.signInAnonymous`; `@AllowAnonymous()` on the endpoint bypasses the global AuthGuard |

</phase_requirements>

---

## Summary

Better Auth ships a built-in `anonymous` plugin (confirmed in the installed `better-auth@1.4.19` source). The plugin adds a single boolean field `isAnonymous` to the `user` table and exposes a `POST /sign-in/anonymous` endpoint that creates a user + session pair, returning both a cookie and a bearer token. The `@thallesp/nestjs-better-auth@2.4.0` package (also installed) provides `AllowAnonymous()` and `OptionalAuth()` decorators that control whether the global `AuthGuard` enforces auth on a given route.

The join endpoint pattern for this phase is: unauthenticated guest hits `POST /api/rooms/:slug/join`, the service checks for an existing valid session cookie (session will be `null` on the `@OptionalAuth()` route), and if absent calls `auth.api.signInAnonymous({ returnHeaders: true })` to create one. The resulting `set-cookie` header is forwarded to the HTTP response before returning the join payload. The `displayName` field is NOT part of the anonymous plugin's schema — it must be stored as a `session.additionalFields` entry, because the user object for an anonymous user has no stable identity beyond the session.

The 7-day cleanup job follows the existing `TasksService` cron pattern: a `@Cron()` method that queries `prisma.user.deleteMany({ where: { isAnonymous: true, createdAt: { lt: cutoff } } })` with a 7-day cutoff. Deleting the user cascades to session and account rows via Prisma's `onDelete: Cascade`. The existing `TasksService` is the right place to add this job — no new module is needed.

**Primary recommendation:** Add `anonymous()` to the `plugins` array in `auth.config.ts`, add `isAnonymous Boolean?` to the Prisma `User` model, store `displayName` in `session.additionalFields`, implement `POST /rooms/:slug/join` with `@AllowAnonymous()`, and add a cleanup cron to `TasksService`.

---

## Standard Stack

### Core

| Library                          | Version            | Purpose                                                                  | Why Standard                                            |
| -------------------------------- | ------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| `better-auth` (anonymous plugin) | 1.4.19 (installed) | Anonymous user + session creation                                        | Built into the installed better-auth; no extra install  |
| `@thallesp/nestjs-better-auth`   | 2.4.0 (installed)  | `AllowAnonymous()`, `OptionalAuth()`, `AuthService`, `Session` decorator | Already integrated globally; provides AuthGuard control |
| `@nestjs/schedule`               | 6.1.1 (installed)  | Cron job for 7-day cleanup                                               | Already used in `TasksService` for other cleanup jobs   |
| `@prisma/client`                 | 7.4.1 (installed)  | Schema migration for `isAnonymous` + `session.additionalFields`          | Already the ORM for all models                          |

### Supporting

| Library  | Version           | Purpose                                                                   | When to Use                                           |
| -------- | ----------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| `nanoid` | 5.1.6 (installed) | Generate adjective+animal display names (or used directly for name parts) | Display name generation at anonymous session creation |

### Alternatives Considered

| Instead of                                          | Could Use                   | Tradeoff                                                                                                                                                                |
| --------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session.additionalFields` for `displayName`        | `user.additionalFields`     | `user.additionalFields` works but the user record is the anonymous identity; session is the right scope because guests may share a device. Decision is locked: session. |
| Storing `displayName` in `session.additionalFields` | Custom `GuestProfile` table | Far simpler to use the session record; custom table requires a join on every request                                                                                    |

**Installation:** No new packages needed. All required libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/
├── auth/
│   └── auth.config.ts          # Add anonymous() plugin here
├── modules/
│   ├── collab/
│   │   ├── collab.controller.ts    # Add POST /rooms/:slug/join
│   │   ├── collab.service.ts       # Add joinRoom() logic
│   │   ├── collab.repository.ts    # Add findBySlug with guestEditingAllowed
│   │   └── dto/
│   │       └── join-room.dto.ts    # Response DTO for join
│   └── tasks/
│       └── tasks.service.ts    # Add pruneAnonymousUsers() cron
└── prisma/
    └── schema.prisma           # Add isAnonymous to User, isGuestEditingAllowed to Room, displayName to Session
```

### Pattern 1: Anonymous Plugin Registration

**What:** Add `anonymous()` to the `plugins` array in `auth.config.ts`. The plugin automatically adds the `isAnonymous` field to the user schema and registers the `/sign-in/anonymous` and `/delete-anonymous-user` endpoints through the Better Auth handler.

**When to use:** Required before any anonymous session creation can happen.

**Example:**

```typescript
// Source: installed better-auth@1.4.19 /dist/plugins/anonymous/index.d.mts
import { anonymous } from 'better-auth/plugins'

export const auth = betterAuth({
  // ...existing config...
  plugins: [
    admin({ ... }),
    anonymous({
      emailDomainName: 'guest.unishare.app',
      generateName: async () => generateGuestDisplayName(), // adjective+animal
    }),
    ...(isProduction ? [] : [openAPI()]),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,        // 7 days — matches existing config
    updateAgeUnitInMilliseconds: 60 * 60 * 1000,
    additionalFields: {
      displayName: {
        type: 'string',
        required: false,
        input: false,
        returned: true,
      },
      isViewOnly: {
        type: 'boolean',
        required: false,
        defaultValue: false,
        input: false,
        returned: true,
      },
    },
  },
})
```

### Pattern 2: Server-Side Anonymous Session Creation

**What:** The join endpoint calls `auth.api.signInAnonymous` directly (server-side, no HTTP round-trip). The `returnHeaders: true` option captures the `set-cookie` header so it can be forwarded in the NestJS response.

**When to use:** On `POST /rooms/:slug/join` when no session is present.

**Example:**

```typescript
// Source: Better Auth docs (https://www.better-auth.com/docs/concepts/api)
// and installed better-auth@1.4.19 type definitions
import { fromNodeHeaders } from 'better-auth/node'
import type { Request, Response } from 'express'

// In the service or controller:
const { headers: authHeaders, response: authResponse } = await auth.api.signInAnonymous({
  returnHeaders: true,
  headers: fromNodeHeaders(req.headers),
})

// Forward the set-cookie header to the client:
const setCookie = authHeaders.get('set-cookie')
if (setCookie) res.setHeader('set-cookie', setCookie)
```

**Note (LOW confidence):** The exact `fromNodeHeaders` import path needs verification at implementation time — it may be `better-auth/node` or re-exported from `better-auth/api`. The NestJS controller may need to inject `@Req()` and `@Res({ passthrough: true })` to access raw Express req/res.

### Pattern 3: AllowAnonymous on the Join Endpoint

**What:** The global `AuthGuard` from `@thallesp/nestjs-better-auth` blocks all routes unless decorated. Use `@AllowAnonymous()` for routes that need zero auth, or `@OptionalAuth()` for routes that accept both authenticated and unauthenticated callers.

**When to use:** `@AllowAnonymous()` on `POST /rooms/:slug/join` since the whole point is to create a session. The existing `GET /rooms/:slug` (Phase 1) should also have `@AllowAnonymous()` added (confirmed public in Phase 1 decisions).

**Example:**

```typescript
// Source: installed @thallesp/nestjs-better-auth@2.4.0 dist/index.d.ts
import { AllowAnonymous, OptionalAuth, Session } from '@thallesp/nestjs-better-auth'

@Post(':slug/join')
@AllowAnonymous()
@ApiCreatedResponse({ type: JoinRoomResponseDto })
async joinRoom(
  @Param('slug') slug: string,
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
  @Session() session: UserSession | null,
) {
  return this.collabService.joinRoom(slug, session, req, res)
}
```

### Pattern 4: Session Idempotency Check

**What:** Before creating a new anonymous session, check if the incoming request already has a valid session (anonymous or authenticated). If session is non-null, skip `signInAnonymous` and return existing identity.

**When to use:** Every call to the join endpoint.

**Example:**

```typescript
async joinRoom(slug: string, session: UserSession | null, req: Request, res: Response) {
  const room = await this.collabRepository.findBySlug(slug)
  if (!room) throw new NotFoundException('Room not found')

  let activeSession = session

  if (!activeSession) {
    // No session — create anonymous one
    const { headers: authHeaders, response: anonSession } =
      await this.auth.api.signInAnonymous({ returnHeaders: true, headers: fromNodeHeaders(req.headers) })
    const setCookie = authHeaders.get('set-cookie')
    if (setCookie) res.setHeader('set-cookie', setCookie)
    activeSession = anonSession as unknown as UserSession
  }

  const isViewOnly = !room.isGuestEditingAllowed && activeSession.user.isAnonymous

  return {
    roomSlug: room.slug,
    sessionId: activeSession.session.id,
    userId: activeSession.user.id,
    displayName: (activeSession.session as any).displayName ?? activeSession.user.name,
    isViewOnly,
  }
}
```

### Pattern 5: Cleanup Cron (TasksService extension)

**What:** Add a `@Cron()` method to the existing `TasksService` that deletes anonymous users older than 7 days. Because `user` → `session` and `user` → `account` relations have `onDelete: Cascade` in the Prisma schema, deleting the user cleans up all related rows automatically.

**When to use:** The cron runs daily (e.g., `00:20`) to avoid colliding with existing jobs.

**Example:**

```typescript
// Source: existing apps/api/src/modules/tasks/tasks.service.ts pattern
@Cron('0 20 0 * * *') // 00:20 daily
async pruneAnonymousUsers() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const { count } = await this.prisma.user.deleteMany({
    where: { isAnonymous: true, createdAt: { lt: cutoff } },
  })
  if (count > 0) this.logger.log(`Pruned ${count} anonymous users older than 7 days`)
}
```

### Anti-Patterns to Avoid

- **Deferring session creation to WebSocket time:** The decision is locked — session is created at `POST /rooms/:slug/join`, not the WS handshake. Phase 3 will authenticate the WS using the cookie/token established here.
- **Storing `displayName` on the User record:** The anonymous `user.name` field is generated by `generateName` in the plugin. Overwriting it creates coupling with Better Auth internals. Use `session.additionalFields.displayName` as the canonical mutable field.
- **Using `@OptionalAuth()` instead of `@AllowAnonymous()` on the join endpoint:** `@OptionalAuth()` still runs the session lookup middleware; `@AllowAnonymous()` skips the guard entirely. For a public endpoint that creates the session, `@AllowAnonymous()` is correct.
- **Attempting to call `auth.api.signInAnonymous` if the user is already anonymous:** The plugin rejects this with `ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY`. Always check session presence first.

---

## Don't Hand-Roll

| Problem                                   | Don't Build                          | Use Instead                                  | Why                                                                                 |
| ----------------------------------------- | ------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------- |
| Anonymous user + session creation         | Custom user/session insert           | `auth.api.signInAnonymous`                   | Better Auth handles email uniqueness, token generation, cookie signing, session TTL |
| Identifying anonymous vs registered users | Custom flag in a separate table      | `user.isAnonymous` (plugin schema field)     | Directly on the user record, included in session response automatically             |
| Session cookie management                 | Manual cookie setting                | `returnHeaders: true` + forward `set-cookie` | Better Auth signs, encrypts, and expires the cookie correctly                       |
| Cron-based cleanup                        | Background queue, external scheduler | `@Cron()` from `@nestjs/schedule`            | Already in use in `TasksService`; no new infrastructure                             |

**Key insight:** The anonymous plugin handles the full identity lifecycle — creation, session linking, and deletion. The only custom work is calling `auth.api.signInAnonymous` at the right time and forwarding the cookie.

---

## Common Pitfalls

### Pitfall 1: isAnonymous Field Not in Prisma Schema

**What goes wrong:** The anonymous plugin adds `isAnonymous` to the Better Auth user schema, but if you don't add the matching field to `schema.prisma`, the Prisma adapter silently ignores it or throws a column-not-found error at runtime.

**Why it happens:** Better Auth declares schema fields at the ORM level; the actual DB column must be created separately via Prisma migration.

**How to avoid:** Add `isAnonymous Boolean? @default(false)` to the `User` model in `schema.prisma`, then run `prisma migrate dev`.

**Warning signs:** Anonymous sign-in returning 500 / "column isAnonymous does not exist" in Postgres logs.

### Pitfall 2: displayName Not Persisted to Session

**What goes wrong:** `generateName` in the plugin config generates a display name for the `user.name` field. But `user.name` is immutable from the session after creation, and Phase 5 needs a mutable `displayName`. If `session.additionalFields.displayName` is not configured, there is no mutable field.

**Why it happens:** The plugin only adds `isAnonymous` to user; it doesn't know about the project's display name requirement.

**How to avoid:** Configure `session.additionalFields.displayName` in `auth.config.ts`. After `signInAnonymous`, update the session's `displayName` field using the same name returned from `generateName`.

**Warning signs:** Phase 5 presence UI has no `displayName` field on the session object; guests all appear as "Anonymous".

### Pitfall 3: Cookie Not Forwarded from Server-Side auth.api Call

**What goes wrong:** Calling `auth.api.signInAnonymous` server-side creates the session but the `set-cookie` header never reaches the browser. The next request arrives with no cookie and a new anonymous user gets created on every join.

**Why it happens:** `auth.api.*` methods return headers in-memory; they don't automatically write to the outgoing HTTP response.

**How to avoid:** Use `returnHeaders: true` and explicitly call `res.setHeader('set-cookie', authHeaders.get('set-cookie'))` before returning from the NestJS endpoint. The NestJS controller must inject `@Res({ passthrough: true })`.

**Warning signs:** Every join call creates a new anonymous user; `isAnonymous` user count in DB grows unboundedly.

### Pitfall 4: Re-Entry Creates Duplicate Sessions

**What goes wrong:** A returning guest with a valid cookie hits the join endpoint; the service calls `signInAnonymous` again and gets rejected with `ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY`.

**Why it happens:** The idempotency check is missing — `session` is non-null on re-entry but the code tries to create a new anonymous session anyway.

**How to avoid:** Check `session !== null` before calling `signInAnonymous`. If session exists (anonymous or authenticated), skip creation and return the existing session identity.

**Warning signs:** `ANONYMOUS_USERS_CANNOT_SIGN_IN_AGAIN_ANONYMOUSLY` error logged on any returning guest join.

### Pitfall 5: AuthService Not Injected in CollabService

**What goes wrong:** Attempting to call `auth.api.signInAnonymous` by importing `auth` directly as a module-level constant. This works in tests mocked with the constant but breaks DI if the auth instance is not the same singleton as in `AuthModule`.

**Why it happens:** `auth` in `auth.config.ts` is exported as a plain constant, not as a NestJS provider. Calling it directly works but bypasses any middleware hooks the `AuthModule` may register.

**How to avoid:** Inject `AuthService` from `@thallesp/nestjs-better-auth` into `CollabService`. Alternatively, import the `auth` constant directly since it is a stable singleton — both approaches are valid in this codebase (confirmed: `auth.config.ts` exports `auth` as a module-level singleton). The simpler approach is importing `auth` directly given no DI lifecycle dependencies.

---

## Code Examples

Verified patterns from installed package source:

### Prisma Schema: User.isAnonymous

```prisma
// apps/api/prisma/schema.prisma
// Source: better-auth@1.4.19 dist/plugins/anonymous/schema.d.mts
model User {
  // ... existing fields ...
  isAnonymous     Boolean?  @default(false)
}
```

### Prisma Schema: Room.isGuestEditingAllowed

```prisma
// apps/api/prisma/schema.prisma
// Source: CONTEXT.md locked decision
model Room {
  id                   String   @id @default(cuid())
  slug                 String   @unique
  title                String?
  ownerId              String
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  snapshot             Bytes?
  isGuestEditingAllowed Boolean @default(true)
  owner                User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([ownerId])
  @@map("room")
}
```

### Prisma Schema: Session.displayName + isViewOnly

```prisma
// apps/api/prisma/schema.prisma
// These fields must match session.additionalFields in auth.config.ts
model Session {
  // ... existing fields ...
  displayName  String?
  isViewOnly   Boolean? @default(false)
}
```

### auth.config.ts — Anonymous Plugin Registration

```typescript
// Source: installed better-auth@1.4.19 dist/plugins/anonymous/types.d.mts (AnonymousOptions)
import { anonymous } from 'better-auth/plugins'

export const auth = betterAuth({
  // ...existing...
  plugins: [
    admin({ ... }),
    anonymous({
      emailDomainName: 'guest.unishare.app',
      generateName: async (_ctx) => generateGuestDisplayName(),
    }),
    ...(isProduction ? [] : [openAPI()]),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAgeUnitInMilliseconds: 60 * 60 * 1000,
    additionalFields: {
      displayName: { type: 'string', required: false, input: false, returned: true },
      isViewOnly:  { type: 'boolean', required: false, defaultValue: false, input: false, returned: true },
    },
  },
})
```

### AllowAnonymous + Session on Controller

```typescript
// Source: installed @thallesp/nestjs-better-auth@2.4.0 dist/index.d.ts
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth'

@Post(':slug/join')
@AllowAnonymous()
async joinRoom(
  @Param('slug') slug: string,
  @Session() session: UserSession | null,
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
) { ... }
```

### Display Name Generator (utility function)

```typescript
// Reuses nanoid (already installed) for entropy source; no additional deps
const ADJECTIVES = ['Purple', 'Golden', 'Silver', 'Cosmic', 'Fuzzy' /* ... */]
const ANIMALS = ['Penguin', 'Octopus', 'Capybara', 'Axolotl' /* ... */]

export function generateGuestDisplayName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return `${adj} ${animal}`
}
```

---

## State of the Art

| Old Approach                | Current Approach                                          | When Changed                        | Impact                                                                      |
| --------------------------- | --------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| Custom anonymous user table | `better-auth` anonymous plugin with `isAnonymous` on User | better-auth >= 1.0                  | No custom schema management; plugin handles user+session atomically         |
| Manual cookie parsing       | `fromNodeHeaders` + `returnHeaders: true`                 | better-auth >= 1.0                  | Standard pattern for server-side session creation in non-Next.js frameworks |
| `@Public()` decorator       | `@AllowAnonymous()` (renamed)                             | @thallesp/nestjs-better-auth >= 2.x | `@Public()` is deprecated in 2.4.0; use `@AllowAnonymous()`                 |
| `@Optional()` decorator     | `@OptionalAuth()` (renamed)                               | @thallesp/nestjs-better-auth >= 2.x | `@Optional()` is deprecated in 2.4.0; use `@OptionalAuth()`                 |

**Deprecated/outdated:**

- `@Public()`: deprecated alias for `@AllowAnonymous()` in `@thallesp/nestjs-better-auth@2.4.0`
- `@Optional()`: deprecated alias for `@OptionalAuth()` in `@thallesp/nestjs-better-auth@2.4.0`

---

## Open Questions

1. **`fromNodeHeaders` import path**
   - What we know: Better Auth provides this utility; the docs reference it for NestJS/Express integration
   - What's unclear: Whether the import is `from 'better-auth/node'` or re-exported elsewhere in 1.4.19
   - Recommendation: At implementation time, check `node_modules/better-auth/dist/` for the `node` export or use `import { fromNodeHeaders } from 'better-auth/node'` and fix if TS complains

2. **Session `displayName` update after anonymous sign-in**
   - What we know: `signInAnonymous` creates the user with `user.name` from `generateName`; the session record exists in DB
   - What's unclear: Whether `session.additionalFields` values can be set at creation time via `auth.api.signInAnonymous`, or if a separate `auth.api.updateSession` call is needed immediately after
   - Recommendation: Plan for a two-step flow: (1) `signInAnonymous` creates session; (2) `auth.api.updateSession` sets `displayName` on the new session. If `signInAnonymous` supports passing session field values, prefer the one-step approach.

3. **`isGuestEditingAllowed` toggle endpoint placement**
   - What we know: CONTEXT.md defers to the planner whether the toggle endpoint belongs in Phase 2 or Phase 3
   - What's unclear: Whether Phase 3 (WS gateway) has a hard dependency on this flag being toggleable at that point
   - Recommendation: Include the `PATCH /rooms/:slug/guest-editing` endpoint in Phase 2 since the flag is introduced here; it is a simple Room update that doesn't touch WebSockets

---

## Validation Architecture

### Test Framework

| Property           | Value                                                |
| ------------------ | ---------------------------------------------------- |
| Framework          | Jest 30.0.0 + ts-jest 29.2.5                         |
| Config file        | `apps/api/package.json` (`jest` key)                 |
| Quick run command  | `pnpm --filter api test -- --testPathPattern=collab` |
| Full suite command | `pnpm --filter api test`                             |

### Phase Requirements → Test Map

| Req ID  | Behavior                                                                 | Test Type | Automated Command                                            | File Exists?           |
| ------- | ------------------------------------------------------------------------ | --------- | ------------------------------------------------------------ | ---------------------- |
| COLB-04 | Unauthenticated user hitting join endpoint receives an anonymous session | unit      | `pnpm --filter api test -- --testPathPattern=collab.service` | ❌ Wave 0 (new method) |
| COLB-04 | Idempotency: second join with existing session returns same identity     | unit      | `pnpm --filter api test -- --testPathPattern=collab.service` | ❌ Wave 0              |
| COLB-04 | `isAnonymous: true` on guest user object                                 | unit      | `pnpm --filter api test -- --testPathPattern=collab.service` | ❌ Wave 0              |
| COLB-04 | `isViewOnly: true` when room.isGuestEditingAllowed is false              | unit      | `pnpm --filter api test -- --testPathPattern=collab.service` | ❌ Wave 0              |
| COLB-04 | Cleanup cron deletes users with `isAnonymous: true` older than 7 days    | unit      | `pnpm --filter api test -- --testPathPattern=tasks.service`  | ❌ Wave 0 (new method) |

### Sampling Rate

- **Per task commit:** `pnpm --filter api test -- --testPathPattern=collab.service --passWithNoTests`
- **Per wave merge:** `pnpm --filter api test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `collab.service.spec.ts` — extend existing file with `joinRoom()` tests; mock `auth.api.signInAnonymous`
- [ ] `tasks.service.spec.ts` — new spec file for `pruneAnonymousUsers()` cron; needs `PrismaService` mock
- [ ] No new test infrastructure needed — Jest + ts-jest already configured; `moduleNameMapper` covers `@/` paths

---

## Sources

### Primary (HIGH confidence)

- Installed `better-auth@1.4.19` source — `/dist/plugins/anonymous/index.d.mts`, `types.d.mts`, `schema.d.mts` — anonymous plugin endpoints, schema, options type (read directly from node_modules)
- Installed `@thallesp/nestjs-better-auth@2.4.0` source — `/dist/index.d.ts` — `AllowAnonymous`, `OptionalAuth`, `Session`, `AuthService` types (read directly from node_modules)
- `apps/api/src/auth/auth.config.ts` — existing auth config structure (read directly)
- `apps/api/src/modules/tasks/tasks.service.ts` — existing `@Cron()` pattern (read directly)
- `apps/api/prisma/schema.prisma` — existing model structure (read directly)
- Better Auth docs (https://www.better-auth.com/docs/plugins/anonymous) — plugin configuration
- Better Auth API docs (https://www.better-auth.com/docs/concepts/api) — `auth.api.*` server-side call pattern with `returnHeaders: true`

### Secondary (MEDIUM confidence)

- Better Auth blog post for 1.5 (https://better-auth.com/blog/1-5) — confirmed no breaking changes to anonymous plugin between 1.4.19 and 1.5.x
- DEV Community anonymous login guide (https://dev.to/daanish2003/anonymous-login-using-betterauth-nextjs-prisma-shadcn-5334) — verified Prisma schema pattern against installed types

### Tertiary (LOW confidence)

- WebSearch results on `fromNodeHeaders` import path — not authoritatively confirmed; needs verification at implementation

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages installed; types read from node_modules
- Architecture: HIGH — patterns derived from installed source + existing codebase conventions
- Pitfalls: HIGH for schema/cookie pitfalls (verified from types); MEDIUM for `fromNodeHeaders` import path
- Test map: HIGH — follows existing `collab.service.spec.ts` Jest pattern exactly

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (better-auth minor releases could change anonymous plugin behavior; re-verify if upgrading)
