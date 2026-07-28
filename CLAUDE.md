# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

Turborepo + pnpm workspaces monorepo. Two apps, two internal packages:

| Path                | What it is                                                               |
| ------------------- | ------------------------------------------------------------------------ |
| `apps/api`          | NestJS 11 backend — Prisma 7 / PostgreSQL, Socket.IO, Better Auth, S3    |
| `apps/web`          | Next.js 16 App Router frontend — React 19, TanStack Query, Tailwind 4    |
| `packages/types`    | `@unishare/types` — shared TS types, consumed as source (no build step)  |
| `packages/tsconfig` | `@unishare/tsconfig` — `base.json`, `nestjs.json`, `nextjs.json` presets |

`turbo.json` only defines `build`, `dev`, `lint`, `format`. **There is no root `test` task** — tests are always run with `--filter`.

## Commands

```bash
pnpm install
pnpm dev                              # both apps (web :3000, api :3001, Swagger /docs)
pnpm build                            # turbo build
pnpm lint                             # turbo lint (depends on ^build)
pnpm --filter api dev                 # api only (nest start -b swc --watch)
pnpm --filter web dev                 # web only
```

### Database (run from `apps/api`, or with `--filter api`)

```bash
pnpm --filter api db:generate         # regenerate Prisma client into src/generated/prisma
pnpm --filter api db:migrate          # prisma migrate dev
pnpm --filter api db:push
pnpm --filter api db:studio
pnpm --filter api exec prisma db seed # seeds universities + departments/courses per faculty
```

Prisma is configured via `apps/api/prisma.config.ts` (not the datasource block) — the schema's `datasource db` has no `url`; it comes from `DATABASE_URL` through that config file. The client is generated to `apps/api/src/generated/prisma` and imported as `@/generated/prisma/client`, **not** `@prisma/client`. That directory is gitignored, so run `db:generate` after a fresh clone or any schema change or lint/build fails on missing types. (`apps/api/src/metadata.ts`, the Nest Swagger plugin output, is gitignored for the same reason.)

### API client codegen (Orval)

```bash
pnpm api:sync                         # curl :3001/docs-json > apps/web/openapi.json, then generate
pnpm --filter web api:generate        # regenerate from the existing openapi.json
```

The API must be running for `api:sync`. Everything under `apps/web/src/lib/api/generated/` is overwritten on each run — never hand-edit it. It's gitignored and excluded from `tsconfig.json`, so a fresh clone needs a generate pass before typecheck succeeds. `orval.config.ts` sets `useInfinite: true` globally with `page` as the param, with per-operation overrides (chat messages paginate by `cursor`; a few endpoints opt out of infinite entirely) — add an override there when a new endpoint isn't page-paginated. See `docs/api-codegen.md`.

### Tests

```bash
pnpm --filter api test                        # jest, rootDir=src, *.spec.ts
pnpm --filter api test -- chat.service        # single file by path regex
pnpm --filter api test -- -t "should get rooms"   # single case by name
pnpm --filter api test:e2e                    # jest --config test/jest-e2e.json (supertest)
pnpm --filter api test:cov

pnpm --filter web test                        # vitest run (jsdom)
pnpm --filter web test -- app-shell           # single file
pnpm --filter web test:watch
```

Web tests live next to their subjects (`components/app-shell.test.tsx`, `src/lib/presence.test.ts`) and use `@testing-library/react` with `vitest.setup.ts`.

## Backend architecture

`apps/api/src/modules/<domain>/` follows **controller → service → repository**:

- `*.controller.ts` — routing, `class-validator` DTO validation, Swagger decorators
- `*.service.ts` — business logic, cross-module orchestration, event emitting
- `*.repository.ts` — all Prisma access (shared `postInclude()`-style include builders live here)
- `dto/` — **inbound** request bodies (`class-validator`)
- `entities/` — **outbound** response shapes (`@ApiProperty`), the source of frontend types

Cross-cutting pieces in `src/common/`: `filters/http-exception.filter.ts`, `interceptors/response.interceptor.ts`, `decorators/response-message.decorator.ts`, `guards/`, `utils/paginate.ts`, `dto/pagination.dto.ts`.

### The response envelope

`ResponseInterceptor` wraps every non-SSE response as `{ success, message, data }`, where `message` comes from `@ResponseMessage('...')` (default `'OK'`). Two consequences:

1. Every controller method needs `@ApiOkResponse({ type: SomeEntity })` — without it Orval generates `data: void`.
2. On the frontend, `customFetch` unwraps one level, so the payload sits at `res.data`. Always unwrap with TanStack Query's `select`:

```tsx
const { data: post } = usePostsControllerGetOne(id, { query: { select: (r) => r.data } })
```

### Bootstrap specifics (`src/main.ts`)

- Global prefix `api`, **excluding** `/health`, `/metrics`, and `api/(.*)` (Better Auth mounts its own `/api/*` routes)
- `bodyParser: false` — file uploads go through Multer/S3 presigning, not a global parser
- Swagger is only mounted when `NODE_ENV !== 'production'`
- `RedisIoAdapter` replaces the default WS adapter, so **Redis is required for websockets to work at all**, not just for scaling

### Auth

Better Auth is configured once server-side in `apps/api/src/auth/auth.config.ts` (Prisma adapter, email+password, Google, Microsoft Entra, `admin` and `anonymous` plugins, RBAC from `src/lib/permissions.ts`) and wired in via `@thallesp/nestjs-better-auth`'s `AuthModule.forRoot({ auth })`. Controllers use that package's `@Session()`, `@OptionalAuth()`, `@Roles()`.

The web side mirrors it in `apps/web/src/lib/auth/client.ts` with `inferAdditionalFields` — **when you add a custom user field on the server, add it there too**, plus to `apps/web/src/lib/permissions.ts` for role changes. `apps/web/src/proxy.ts` is a cookie-presence-only guard (`better-auth.session_token`) for redirects; real authorization is always server-side.

### Realtime

Two Socket.IO gateways, both authenticating by parsing the session cookie:

- `/chat` — `modules/chat/chat.gateway.ts`, with `presence.service.ts` (Redis Lua scripts in `presence.scripts.ts`) and `chat-cleanup.service.ts`
- `/collab` — `modules/collab/collab.gateway.ts`, a Yjs update relay for the Excalidraw canvas plus cursor presence (throttled to 16ms)

### End-to-end encrypted chat

Chat message bodies are encrypted in the browser; the server stores ciphertext and never has the plaintext or private keys.

- Crypto primitives: `apps/web/src/lib/crypto.ts` (ECDH P-256 + AES-GCM 256, PBKDF2 600k for the passphrase-wrapped backup)
- Private key lives in IndexedDB (`apps/web/src/lib/indexeddb.ts`, db `unishare-crypto`), keyed by user id — it is **device-local**
- `User.publicKey` and `User.keyBackup` on the server are opaque blobs; per-room AES keys are wrapped per participant
- Runtime surface: `contexts/crypto-context.tsx`, `hooks/use-crypto.ts`, `hooks/use-decrypted-chat-messages.ts`

Never add server-side logic that assumes readable chat content (search, moderation, summarization of DMs).

Because keys are device-local, a stale `User.publicKey` with no matching IndexedDB key makes chats permanently undecryptable. `pnpm --filter api db:reset-encryption` (`apps/api/scripts/reset-encryption.ts`) is the escape hatch for local testing — it **deletes all chat messages, participants, and rooms** and nulls every `publicKey`. Destructive; dev databases only.

## Frontend architecture

`apps/web` has an unusual split: **the `@/` alias points at the app root, not at `src/`**. So both of these are normal and appear side by side:

```
apps/web/
├── app/                  # App Router — route groups (app), (auth), plus /api routes
├── components/           # nearly all UI (feature subfolders + ui/ primitives)
├── hooks/                # use-*.ts
├── contexts/             # auth, chat-socket, crypto, collab providers
├── lib/                  # store.ts (Zustand), constants, utils
└── src/
    ├── lib/api/          # fetcher.ts + generated/
    ├── lib/auth/         # better-auth client
    ├── lib/crypto.ts, indexeddb.ts, presence.ts, cursor-coords.ts
    ├── components/canvas/
    ├── providers/        # QueryProvider + persist rehydration
    └── proxy.ts
```

Import as `@/components/...`, `@/hooks/...`, `@/src/lib/...`. Put new code where its neighbours already are rather than trying to normalize the layout.

### State boundaries

| State                          | Tool                                                    |
| ------------------------------ | ------------------------------------------------------- |
| Server data                    | TanStack Query (Orval hooks)                            |
| Session                        | Better Auth client / `contexts/auth-context`            |
| Shared UI state with no DB row | Zustand — `lib/store.ts`, `persist` under `unishare-ui` |
| Local component state          | `useState`                                              |

The Zustand store uses `skipHydration: true` and is rehydrated once in `src/providers/index.tsx`; don't add per-page `mounted` guards. Anything with a database table belongs in TanStack Query, not Zustand — see `docs/zustand.md`.

Form validation is Zod + `react-hook-form`; toasts are `sonner`; UI primitives are Radix-based in `components/ui`.

## Conventions

- Prettier (`.prettierrc`): no semicolons, single quotes, trailing commas, `printWidth: 100`. Enforced on commit via husky + lint-staged.
- Commits: Conventional Commits, enforced by commitlint (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- Branches: `feat/short-name`, `fix/...`, `chore/...`, `docs/...`. Large features use sub-branches off the parent feature branch, not off `main`.
- Files are kebab-case (`post-card.tsx`, `chat.service.ts`). Some older components are PascalCase (`SearchBox.tsx`, `TagFilter.tsx`) — match the directory you're in.
- Path alias is `@/*` in both apps (api → `src/`, web → app root).

## Working agreements (from `.github/copilot-instructions.md`)

- Read `.planning/**` before starting a task — it holds the phase plans, plus `codebase/{ARCHITECTURE,CONVENTIONS,STRUCTURE,TESTING,STACK,CONCERNS}.md`. It is gitignored (local-only), and the analyses carry 2024–2025 dates and have drifted; verify against the code. Don't commit `.planning/` docs or phase-completion artifacts.
- For feature work: present a plan and the list of files to be touched, and wait for explicit approval before writing. Larger features get a `docs/{feature-name}/planning.md` (overview, API design, data model, folder structure, trade-offs, step-by-step plan).
- Ask before staging or committing.
- Treat generated code (`src/generated/prisma`, `src/lib/api/generated`) as read-only unless the task is about generation itself.

## Deployment

`docker-compose.yml` runs Postgres 17, the API image, postgres-exporter, and Prometheus, with tight memory limits tuned for a 1GB Oracle box (API is capped at 300M with `--max-old-space-size=256`). `Dockerfile.api` / `Dockerfile.web`, `deploy.sh` pulls `ghcr.io/unishare-oss/unishare-api:latest` and health-checks `/health`. `.github/workflows/docker.yml` builds only the app whose paths changed; `release.yml` runs semantic-release on the `release` branch.

CI (`ci.yml`) order matters and mirrors what you need locally: install → `db:generate` → `api:generate` → `lint`. Prometheus scrape config is `prometheus.yml`; the API exposes `/metrics` via `@willsoto/nestjs-prometheus`.

## Environment

`apps/api/.env` is required (`apps/api/.env.example` documents it). `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_URL`, `COOKIE_DOMAIN` are hard-required in production — `auth.config.ts` throws at startup if any is missing. Optional blocks: OAuth providers, S3 (`S3_ENDPOINT`/`S3_BUCKET`/keys/`STORAGE_PUBLIC_URL`), `REDIS_URL`, `ACADEMIC_START_MONTH`, and AI summarization (`AI_SUMMARY_PROVIDER` = `groq` | `gemini` | `ollama`, empty to disable).

`apps/web/.env` needs `API_URL` (used by `next.config.ts` rewrites, so `/api/*` proxies to the backend), `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`. New external image hosts must be added to `next.config.ts` `remotePatterns`.
