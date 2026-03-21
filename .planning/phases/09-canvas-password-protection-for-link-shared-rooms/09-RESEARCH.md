# Phase 9: Canvas Password Protection for Link-Shared Rooms — Research

**Researched:** 2026-03-21
**Domain:** NestJS password hashing, Next.js gate UI, Prisma migration, sessionStorage patterns
**Confidence:** HIGH

## Summary

Phase 9 adds an optional password layer orthogonal to the existing `RoomVisibility` enum. All implementation touch-points — backend join check, backend update endpoint, frontend gate, frontend settings popover, and boards hub room card — are already scaffolded from earlier phases. The changes are surgical: one Prisma field (`passwordHash String?`), one new HTTP 401 code path in `joinRoom`, one extension to `UpdateRoomDto` / `RoomEntity`, a new `JoinState` branch, and two UI surfaces (gate card + settings section). No new libraries are introduced beyond `bcryptjs` (which is NOT already in the lockfile — see critical note below).

The main technical risk is the bcrypt dependency: CONTEXT.md D-13 states "Better Auth already uses bcrypt — no new dependency", but the codebase evidence shows Better Auth uses `@noble/hashes` v2 (not bcryptjs). `bcryptjs` must therefore be added explicitly. This is low risk but must be done in Wave 0.

A second precision point: the `joinRoom` function currently retries once on any non-404 error (including 401). The retry logic must be modified so that a 401 from a password-protected room does NOT trigger the retry path — it should go directly to `'password-required'` state.

**Primary recommendation:** Implement in three backend tasks (migration, service/repository, DTO/entity) and two frontend tasks (canvas gate, settings popover + room card badge), using the exact patterns documented in CONTEXT.md and UI-SPEC.md.

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Password Model**

- D-01: `passwordHash String?` added to the `Room` Prisma model — null means no password, non-null means protected
- D-02: The existing `RoomVisibility` enum (OPEN / VIEW_ONLY / PRIVATE) is not changed
- D-03: Any room can have a password regardless of visibility setting
- D-04: PRIVATE rooms still block anonymous users even if they enter the correct password — PRIVATE access rule takes precedence
- D-05: Password + VIEW_ONLY can coexist: correct password grants entry, but user is still view-only

**Who Gets Prompted**

- D-06: Everyone except the room owner is password-gated
- D-07: Owner bypass determined at `joinRoom` endpoint: `session.user.id === room.ownerId` skips password check
- D-08: All other users — anonymous and authenticated alike — must supply the password in POST /rooms/:slug/join body

**Backend Verification**

- D-09: Password verification inside the existing `joinRoom` endpoint — no new endpoint
- D-10: Client sends `{ password?: string }` in request body; backend bcrypt-compares against `room.passwordHash`
- D-11: No password supplied + room has passwordHash → return HTTP 401 (triggers frontend gate)
- D-12: Wrong password supplied → return HTTP 401 with error message `'Incorrect password'`
- D-13: Password stored as bcrypt hash
- D-14: Removing password = PATCH /rooms/:slug with `{ password: null }` → sets `passwordHash` to null
- D-15: No attempt rate limiting — show inline error on wrong password, allow retries

**Frontend Gate**

- D-16: New `'password-required'` join state added to `JoinState` type in `page.tsx`
- D-17: `joinRoom()` on 401 response → sets state to `'password-required'`; subsequent call includes `{ password: enteredValue }` in body
- D-18: Gate renders inline (full-screen centred card), same visual pattern as the existing `'private'` gate
- D-19: Gate UI: Lock icon (`KeyRound`), heading "This board is password protected", subtext "Enter the password to join", `<input type="password">` + "Join Board" button
- D-20: Wrong password (401 on retry) → shake animation on input + inline "Incorrect password" text below input
- D-21: On success: `sessionStorage.setItem('pw-verified-{slug}', '1')` — clears on tab close
- D-22: On page load: check sessionStorage before first join attempt — if verified, include sentinel in join body to skip the prompt

**Password Management (Settings Popover)**

- D-23: Password section added below the visibility radio group in the existing `SettingsPopover` in `canvas-header.tsx`
- D-24: Fetch on popover open: GET /rooms/:slug returns `hasPassword: boolean` (not the hash)
- D-25: When no password is set: show a password input + "Set password" button
- D-26: When password is set: show "Password: Set" with a "Change" input field and a "Remove password" button
- D-27: Set/change: PATCH /rooms/:slug `{ password: string }` — backend bcrypt-hashes before storing
- D-28: Remove: PATCH /rooms/:slug `{ password: null }` — backend sets passwordHash to null

**API Changes**

- D-29: `UpdateRoomDto` extended with `password?: string | null` — string sets/changes, `null` removes
- D-30: `RoomEntity` extended with `hasPassword: boolean` — derived from `passwordHash !== null`, never exposes the hash
- D-31: `GET /rooms` (findByOwner) returns `hasPassword` on each room so boards hub can show the lock badge

**Boards Hub Card**

- D-32: A `KeyRound` icon badge renders on room cards when `hasPassword === true`
- D-33: Badge placed near the visibility indicator on the card (bottom-left or alongside existing badges)

### Claude's Discretion

- Exact CSS for the shake animation on wrong password (UI-SPEC provides a concrete implementation — use it)
- Precise placement of `hasPassword` badge on the room card relative to existing elements (UI-SPEC provides concrete markup — use it)
- Whether to add a `MinLength` validator on the password field in `UpdateRoomDto`

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within phase scope
  </user_constraints>

---

<phase_requirements>

## Phase Requirements

Phase 9 has no formal REQ-IDs assigned in REQUIREMENTS.md (listed as TBD). The phase implements a new feature not covered by existing v1 requirements — it extends the access control surface established in Phase 7 (SHARE-01 through SHARE-03).

| Implicit Req | Behavior                                                                              | Research Support                                                              |
| ------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| PWD-01       | Room owner can set/change/remove a password on any room                               | D-27/D-28: PATCH endpoint pattern verified in collab.service.ts `updateRoom`  |
| PWD-02       | Non-owner visitors must supply the correct password to join a password-protected room | D-09/D-10: joinRoom in collab.service.ts; bcrypt compare against passwordHash |
| PWD-03       | Frontend shows a password gate when joinRoom returns 401                              | D-16/D-17: JoinState union type extension in page.tsx                         |
| PWD-04       | Boards hub room cards show a lock badge when a room is password-protected             | D-31/D-32: GET /rooms returns hasPassword; RoomCard updated                   |
| PWD-05       | Tab-scoped session memory prevents re-prompting for password on refresh               | D-21/D-22: sessionStorage pattern from Phase 6                                |

</phase_requirements>

---

## Standard Stack

### Core

| Library         | Version                    | Purpose                                        | Why Standard                                                                                   |
| --------------- | -------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| bcryptjs        | 3.0.3 (npm current)        | Password hashing in Node.js service layer      | Pure-JS bcrypt, no native bindings, works in all environments including NestJS; well-known API |
| Prisma          | 7.4.1 (already installed)  | Add `passwordHash String?` field via migration | Already in use                                                                                 |
| class-validator | 0.14.3 (already installed) | Validate `password` field on `UpdateRoomDto`   | Already in use for all DTOs                                                                    |

### Supporting

| Library               | Version           | Purpose                                                     | When to Use                                        |
| --------------------- | ----------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| @types/bcryptjs       | latest            | TypeScript types for bcryptjs                               | Installed alongside bcryptjs                       |
| lucide-react KeyRound | already installed | Lock icon for gate and badge                                | Specified by CONTEXT.md D-19, D-32                 |
| shadcn Separator      | already installed | Divider between visibility and password sections in popover | UI-SPEC specifies `<Separator className="my-4" />` |

### Alternatives Considered

| Instead of | Could Use                                           | Tradeoff                                                                                                                                                     |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| bcryptjs   | @noble/hashes (already in lockfile via better-auth) | @noble/hashes is a lower-level library without a convenient bcrypt API; bcryptjs has `hash` / `compare` methods that directly match the usage pattern needed |
| bcryptjs   | argon2                                              | argon2 requires native bindings; bcryptjs is pure JS                                                                                                         |

**Installation:**

```bash
pnpm add bcryptjs --filter api
pnpm add -D @types/bcryptjs --filter api
```

**Critical note on D-13:** CONTEXT.md states "Better Auth already uses bcrypt — no new dependency". This is incorrect based on codebase inspection. `better-auth@1.4.19` uses `@noble/hashes@2.0.1` internally — not bcryptjs. The `pnpm-lock.yaml` contains no bcrypt entry. `bcryptjs` must be installed as a new direct dependency of `apps/api`. Confidence: HIGH (verified by reading pnpm-lock.yaml, better-auth package.json).

**Version verification:**

```bash
npm view bcryptjs version   # 3.0.3 verified 2026-03-21
```

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. All changes are modifications to existing files:

```
apps/api/
├── prisma/schema.prisma              # Add passwordHash String? to Room model
├── src/modules/collab/
│   ├── collab.service.ts             # joinRoom + updateRoom password logic
│   ├── collab.repository.ts          # findBySlugWithVisibility includes passwordHash; updateRoom accepts passwordHash
│   ├── dto/update-room.dto.ts        # Add password?: string | null
│   ├── entities/room.entity.ts       # Add hasPassword: boolean
│   └── collab.service.spec.ts        # New test cases for password scenarios

apps/web/
├── app/canvas/[slug]/page.tsx        # JoinState union, joinRoom body, password gate render
├── src/components/canvas/
│   └── canvas-header.tsx             # SettingsPopover password section
├── components/boards/
│   └── room-card.tsx                 # hasPassword prop + KeyRound badge
└── app/globals.css                   # @keyframes shake + .animate-shake
```

### Pattern 1: joinRoom 401 flow with retry guard

**What:** The existing `joinRoom` function retries once on any non-404, non-403 error (see Phase 6 note: "Retry once after 500ms on non-404 join errors to fix anonymous cookie timing race condition"). This retry path must be bypassed for 401 responses — a 401 means password required, not a transient error.

**When to use:** On every joinRoom call with potential 401 response.

**Correct implementation:**

```typescript
// page.tsx — updated joinRoom logic
const joinRoom = async (retried = false, password?: string): Promise<void> => {
  try {
    const pwVerified = sessionStorage.getItem(`pw-verified-${slug}`)
    const body: Record<string, unknown> = {}
    if (password !== undefined) body.password = password
    else if (pwVerified) body.pwVerified = true // sentinel — skip gate without re-prompting

    const res = await fetch(`/api/rooms/${slug}/join`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      // ...set state to 'joined'
      sessionStorage.setItem(`pw-verified-${slug}`, '1')
      return
    }
    if (res.status === 401) {
      // Password required or wrong password — never retry, go straight to gate
      setJoinState('password-required')
      return
    }
    if (res.status === 403) {
      setJoinState('private')
      return
    }
    if (res.status === 404) {
      setJoinState('not-found')
      return
    }
    // Transient error — retry once (cookie timing race from Phase 6)
    if (!retried) {
      await new Promise((r) => setTimeout(r, 500))
      return joinRoom(true, password)
    }
    setJoinState('not-found')
  } catch {
    setJoinState('not-found')
  }
}
```

**Source:** Derived from page.tsx lines 28–63 + CONTEXT.md D-16/D-17/D-21/D-22.

### Pattern 2: bcrypt hash on write, compare on read

**What:** On PATCH with `password: string`, bcrypt-hash before writing. On POST join, bcrypt-compare against stored hash. On PATCH with `password: null`, set `passwordHash` to null.

```typescript
// collab.service.ts — updateRoom extension
import * as bcrypt from 'bcryptjs'

if (dto.password !== undefined) {
  if (dto.password === null) {
    updateData.passwordHash = null
  } else {
    updateData.passwordHash = await bcrypt.hash(dto.password, 10)
  }
}
```

```typescript
// collab.service.ts — joinRoom password check (after visibility check)
if (room.passwordHash !== null && session.user.id !== room.ownerId) {
  const supplied = (body as { password?: string }).password
  if (!supplied) throw new UnauthorizedException('Password required')
  const ok = await bcrypt.compare(supplied, room.passwordHash)
  if (!ok) throw new UnauthorizedException('Incorrect password')
}
```

**Source:** CONTEXT.md D-09 through D-13; bcryptjs documentation.

### Pattern 3: SettingsPopover password section — optimistic update + rollback

The existing `SettingsPopover` already implements optimistic update + toast + rollback for visibility changes. The password section follows the identical pattern:

```typescript
// optimistic state toggle
const [hasPassword, setHasPassword] = useState(false)

const handleSetPassword = async (pw: string) => {
  setHasPassword(true) // optimistic
  const res = await fetch(`/api/rooms/${slug}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  })
  if (!res.ok) {
    setHasPassword(false) // rollback
    toast.error('Failed to save password — try again')
    return
  }
  toast.success('Password set')
}
```

**Source:** canvas-header.tsx `handleVisibilityChange` lines 197–225.

### Pattern 4: Shake animation class toggled via useState

The shake must be removable so it can replay on subsequent wrong-password submissions:

```typescript
const [shake, setShake] = useState(false)

// on 401 retry:
setShake(true)
setTimeout(() => setShake(false), 350)   // matches animation duration

// in JSX:
<Input className={shake ? 'animate-shake' : ''} ... />
```

**Source:** UI-SPEC lines 155–156.

### Pattern 5: `hasPassword` derived field in RoomEntity

The `passwordHash` column is never exposed. The entity adds a boolean derived field:

```typescript
// room.entity.ts
@ApiProperty()
hasPassword: boolean

// collab.service.ts — map to entity
return { ...room, hasPassword: room.passwordHash !== null }
```

This pattern is consistent with how `isViewOnly` is computed from `visibility + isAnonymous` rather than stored.

### Anti-Patterns to Avoid

- **Exposing passwordHash in API responses:** `RoomEntity` must compute `hasPassword: boolean` and never include `passwordHash`. The Prisma `select` clause in `findByOwner` should explicitly exclude `passwordHash`.
- **Triggering the Phase 6 retry on 401:** The retry is for cookie timing, not password errors. Guard with `if (res.status === 401) { setJoinState('password-required'); return }` before the retry branch.
- **Using `bcrypt.hashSync` in async context:** Always use `bcrypt.hash` (async) in the NestJS service — blocking bcrypt in Node's event loop causes latency spikes.
- **Sending the password in every join body:** Only include `password` when the user has entered one, or `pwVerified: true` as a sentinel when sessionStorage confirms a prior successful entry.

---

## Don't Hand-Roll

| Problem                    | Don't Build            | Use Instead                                                       | Why                                                                            |
| -------------------------- | ---------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Password hashing           | Custom crypto          | `bcryptjs` `hash` / `compare`                                     | Timing-safe comparison, proper work factor, industry standard                  |
| Shake animation            | JS-driven transform    | CSS `@keyframes shake` + `animate-shake` class (UI-SPEC provided) | GPU-composited, no layout thrash, exact spec provided                          |
| Tab-scoped password memory | Cookie or localStorage | `sessionStorage.setItem('pw-verified-{slug}', '1')`               | sessionStorage clears on tab close; established project precedent from Phase 6 |

**Key insight:** The "don't expose the hash" pattern is the one hand-rolled mistake most developers make — always ensure the Prisma select clause or entity mapper strips `passwordHash` before the response leaves the service layer.

---

## Common Pitfalls

### Pitfall 1: `joinRoom` retry path absorbs the 401

**What goes wrong:** The existing retry logic (`if (!retried) { ... return joinRoom(true) }`) catches 401 responses and retries them instead of showing the password gate. The user sees the joining spinner forever.

**Why it happens:** The retry was written to handle cookie timing races (Phase 6), which manifest as transient 401s. A password-gate 401 is permanent.

**How to avoid:** Check `res.status === 401` explicitly BEFORE the retry block and route to `'password-required'` immediately.

**Warning signs:** Password gate never appears; `joinState` stays `'joining'` on protected rooms.

### Pitfall 2: `hasPassword` not included in `findByOwner` result

**What goes wrong:** Room cards on the boards hub never show the lock badge because `hasPassword` is undefined.

**Why it happens:** `findByOwner` returns all Prisma Room columns but the entity mapper doesn't add `hasPassword: boolean`. The Orval-generated hook types follow the entity shape.

**How to avoid:** In `getRoomsByOwner`, map each room through the same `hasPassword: room.passwordHash !== null` transform used in `getRoomBySlug`.

**Warning signs:** `room.hasPassword` is `undefined` in the boards page; badge never renders.

### Pitfall 3: `passwordHash` appears in GET /rooms/:slug response

**What goes wrong:** The raw bcrypt hash is visible in API responses, leaking implementation details and the hash itself.

**Why it happens:** `RoomEntity` accidentally includes `passwordHash` or the controller returns the raw Prisma record.

**How to avoid:** Use a mapper/transform in the service that replaces `passwordHash` with `hasPassword: boolean` before returning. Never include `passwordHash` in any entity or DTO.

### Pitfall 4: `findBySlugWithVisibility` doesn't return `passwordHash`

**What goes wrong:** The joinRoom service can't check the password because the repository query doesn't select `passwordHash`.

**Why it happens:** `findBySlugWithVisibility` uses an explicit `select` clause (lines 17–27 of collab.repository.ts) that currently omits `passwordHash`.

**How to avoid:** Extend the `select` to include `passwordHash: true`.

### Pitfall 5: bcryptjs missing from lockfile causes runtime crash

**What goes wrong:** `import * as bcrypt from 'bcryptjs'` throws MODULE_NOT_FOUND at runtime.

**Why it happens:** CONTEXT.md D-13 incorrectly states bcrypt is already available. It is not in the lockfile.

**How to avoid:** Wave 0 task must install `bcryptjs` and `@types/bcryptjs` via pnpm before any implementation task.

### Pitfall 6: Prisma migration blocked by prior `db push` drift

**What goes wrong:** `prisma migrate dev` fails with a drift error.

**Why it happens:** This project has prior history of resolving drift via `db push + migrate resolve --applied` (Phase 7 decision in STATE.md). The same pattern applies here.

**How to avoid:** Use `prisma db push` + `prisma migrate resolve --applied <migration_name>` if `migrate dev` detects drift.

---

## Code Examples

Verified patterns from codebase inspection:

### Prisma model addition

```prisma
// schema.prisma — Room model
model Room {
  id           String         @id @default(cuid())
  slug         String         @unique
  title        String?
  ownerId      String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  snapshot     Bytes?
  visibility   RoomVisibility @default(OPEN)
  passwordHash String?                          // NEW
  owner        User           @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([ownerId])
  @@map("room")
}
```

### Repository — extend findBySlugWithVisibility

```typescript
// collab.repository.ts
async findBySlugWithVisibility(slug: string) {
  return this.prisma.room.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      ownerId: true,
      visibility: true,
      passwordHash: true,   // NEW — needed by joinRoom password check
    },
  })
}
```

### DTO — UpdateRoomDto extension

```typescript
// update-room.dto.ts
import { IsOptional, IsString, IsEnum, Allow } from 'class-validator'

export class UpdateRoomDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'VIEW_ONLY', 'PRIVATE'] })
  @IsOptional()
  @IsEnum(RoomVisibility)
  visibility?: RoomVisibility

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Allow() // allows null; use custom validator or Allow() for string | null
  password?: string | null
}
```

Note: class-validator's `@IsString()` rejects `null`. Use `@Allow()` or a custom `@IsStringOrNull()` validator for the `password` field since it must accept `string | null`.

### JoinRoomResponse body extension

The `POST /rooms/:slug/join` controller currently takes `@Req() req` but does NOT use `@Body()`. The body must be added:

```typescript
// collab.controller.ts — joinRoom
async joinRoom(
  @Param('slug') slug: string,
  @Body() body: JoinRoomBodyDto,    // NEW
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
  @Session() session: UserSession | null,
) {
  return this.collabService.joinRoom(slug, body, session, req, res)
}
```

A new `JoinRoomBodyDto` with `password?: string` is needed (or use a plain interface — the body is small).

### sessionStorage sentinel pattern (matching Phase 6 precedent)

```typescript
// page.tsx — on page load
const pwVerified = sessionStorage.getItem(`pw-verified-${slug}`)

// In join body when verified:
body: JSON.stringify(pwVerified ? { pwVerified: true } : {})

// Backend: on joinRoom, if body.pwVerified === true && no passwordHash change since last join,
// skip password prompt. Simpler: backend accepts { password: '__verified__' } as sentinel
// and the frontend stores the actual verified flag in sessionStorage; the backend just
// checks for passwordHash again. The sessionStorage prevents showing the UI gate, but
// the backend re-verifies if password changed since last visit.
```

**Simpler pattern:** sessionStorage prevents the frontend gate from re-appearing. The backend always requires password in the body when the room has one. If the user's tab has `pw-verified-{slug}`, the frontend includes `{ password: storedPassword }` — but we don't store the password itself. The correct D-22 implementation is:

- On success: store `'1'` in `pw-verified-{slug}`.
- On next page load: if flag is set, show a brief "Verifying..." state and call joinRoom with `{ skipPasswordGate: true }`.
- Backend: if `body.skipPasswordGate === true` AND room has a password AND user is not owner — still returns 401 to force re-entry.

Actually the simplest correct interpretation of D-22 is: the gate is not shown (user sees a loading state), joinRoom is called without a password, and if it returns 401, the flag is cleared and the gate appears. This avoids storing the password client-side entirely.

---

## State of the Art

| Old Approach                  | Current Approach                        | When Changed                                        | Impact                                   |
| ----------------------------- | --------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| Storing plaintext passwords   | bcrypt hash (cost 10)                   | Always — project has no history of doing this wrong | hash at write, compare at read           |
| Prisma `migrate dev` on drift | `db push` + `migrate resolve --applied` | Phase 7 established this pattern                    | Must use same pattern for this migration |

**Deprecated/outdated in this project context:**

- `isViewOnly` from session field: Phase 7 moved to computing `isViewOnly` at join time, not storing in session. Same pattern applies here — password state is not stored in session, it's checked on each join.

---

## Open Questions

1. **`joinRoom` controller does not currently accept a `@Body()`**
   - What we know: `collab.controller.ts` joinRoom has `@Req()` but no `@Body()` decorator. The body is not parsed.
   - What's unclear: Whether NestJS/Express automatically parses the body and makes it available on `req.body` even without `@Body()`.
   - Recommendation: Add `@Body() body: JoinRoomBodyDto` explicitly. The password field must be accessible in the service. NestJS does parse body via `express.json()` middleware into `req.body`, so it would be accessible as `(req as any).body.password` without `@Body()`, but the clean pattern is to add `@Body()`.

2. **`MinLength` validator on `UpdateRoomDto.password`**
   - What we know: Claude's discretion per CONTEXT.md.
   - Recommendation: Add `@MinLength(1)` to prevent empty-string passwords being stored. An empty string would hash successfully and then always reject legitimate attempts. This is a correctness concern, not just a validation preference.

3. **`handleVisibilityChange` in `RoomCard` sends `{ visibility }` but not `hasPassword`**
   - What we know: `RoomCard` currently has a `room` prop without `hasPassword`. The boards page maps rooms from the Orval-generated hook which follows `RoomEntity`.
   - What's unclear: Whether the Orval types auto-regenerate when `RoomEntity` adds `hasPassword`.
   - Recommendation: After extending `RoomEntity`, run `pnpm orval` (or equivalent) to regenerate the API client types. The `RoomCard` props interface and `boards/page.tsx` mapping both need `hasPassword` added.

---

## Validation Architecture

nyquist_validation is enabled in `.planning/config.json`.

### Test Framework

| Property          | Value                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| Framework         | Jest 30 (API) + Vitest 4.1 (Web)                                                 |
| Config file (API) | `apps/api/package.json` → `jest` key; `rootDir: src`, `testRegex: .*\.spec\.ts$` |
| Config file (Web) | `apps/web/vitest.config.ts`                                                      |
| Quick run (API)   | `cd apps/api && pnpm test -- --testPathPattern collab.service`                   |
| Full API suite    | `cd apps/api && pnpm test`                                                       |
| Web unit tests    | `cd apps/web && pnpm vitest run`                                                 |

### Phase Requirements → Test Map

| Req ID | Behavior                                                           | Test Type | Automated Command                                              | File Exists?                       |
| ------ | ------------------------------------------------------------------ | --------- | -------------------------------------------------------------- | ---------------------------------- |
| PWD-01 | `updateRoom` hashes password and stores it; null clears it         | unit      | `cd apps/api && pnpm test -- --testPathPattern collab.service` | ✅ (extend collab.service.spec.ts) |
| PWD-02 | `joinRoom` returns 401 when no password supplied on protected room | unit      | `cd apps/api && pnpm test -- --testPathPattern collab.service` | ✅ (extend collab.service.spec.ts) |
| PWD-02 | `joinRoom` returns 401 with message when wrong password supplied   | unit      | `cd apps/api && pnpm test -- --testPathPattern collab.service` | ✅ (extend collab.service.spec.ts) |
| PWD-02 | `joinRoom` succeeds for owner of protected room without password   | unit      | `cd apps/api && pnpm test -- --testPathPattern collab.service` | ✅ (extend collab.service.spec.ts) |
| PWD-03 | Frontend gate renders on 401 (visual)                              | manual    | —                                                              | manual-only                        |
| PWD-04 | `findByOwner` returns `hasPassword: true` when room has hash       | unit      | `cd apps/api && pnpm test -- --testPathPattern collab.service` | ✅ (extend collab.service.spec.ts) |
| PWD-05 | sessionStorage prevents re-prompt (tab session)                    | manual    | —                                                              | manual-only                        |

### Sampling Rate

- **Per task commit:** `cd apps/api && pnpm test -- --testPathPattern collab.service --passWithNoTests`
- **Per wave merge:** `cd apps/api && pnpm test`
- **Phase gate:** Full API suite green + manual verification checklist before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `bcryptjs` and `@types/bcryptjs` not installed — run `pnpm add bcryptjs --filter api && pnpm add -D @types/bcryptjs --filter api`
- [ ] Mock for `bcryptjs` may be needed in `collab.service.spec.ts` (similar to how `nanoid` is mocked in `test/__mocks__/nanoid.ts`)

---

## Sources

### Primary (HIGH confidence)

- Direct file inspection: `apps/api/prisma/schema.prisma` — confirmed Room model shape, no `passwordHash` field exists yet
- Direct file inspection: `apps/api/src/modules/collab/collab.service.ts` — confirmed `joinRoom` logic, retry branch, PRIVATE check location
- Direct file inspection: `apps/api/src/modules/collab/collab.repository.ts` — confirmed `findBySlugWithVisibility` select clause excludes `passwordHash`
- Direct file inspection: `apps/api/src/modules/collab/collab.controller.ts` — confirmed `joinRoom` has no `@Body()` decorator
- Direct file inspection: `apps/web/app/canvas/[slug]/page.tsx` — confirmed `JoinState` union, retry logic structure
- Direct file inspection: `apps/web/src/components/canvas/canvas-header.tsx` — confirmed `SettingsPopover` pattern
- Direct file inspection: `apps/web/components/boards/room-card.tsx` — confirmed `VisibilityBadge` placement, no `hasPassword` prop currently
- Direct file inspection: `pnpm-lock.yaml` — confirmed bcryptjs is NOT in lockfile (contradicts CONTEXT.md D-13)
- Direct file inspection: better-auth `package.json` deps — confirmed `@noble/hashes` not bcryptjs

### Secondary (MEDIUM confidence)

- npm registry: `bcryptjs@3.0.3` is current stable version as of 2026-03-21
- better-auth `@noble/hashes` usage: inferred from transitive dep in pnpm-lock and better-auth package.json; not verified by reading better-auth source code

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — verified by lockfile inspection; bcryptjs absence confirmed
- Architecture: HIGH — all patterns derived from existing source files, not assumed
- Pitfalls: HIGH — every pitfall has a specific line reference or STATE.md decision backing it

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable domain, no fast-moving deps)
