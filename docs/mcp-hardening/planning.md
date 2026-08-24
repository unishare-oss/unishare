# MCP hardening + presigned uploads

## Overview

Follow-up to the architecture review done while building board MCP. Covers: moving
`create_post` file attachments off server-side buffering, scope-aware tool registration,
a couple of scope/config bugs, MCP rate limiting, and two smaller cleanups. Branch:
`refactor/mcp-hardening` (off `feat/board-mcp` post-merge with `dev`).

## 1. Presigned uploads for `create_post`

**Problem:** `McpRepository.createPost` decodes inline `base64Data`/`textData` and calls
`StorageService.uploadBuffer`, which skips the MIME allowlist that every other upload path
enforces, and the `MAX_FILE_SIZE = 10MB` check is unreachable dead code — `/mcp`'s body
parser is capped at 1MB (`main.ts:29`).

**Design:** reuse the same `getFolderForPurpose`/`generatePresignedUploadUrl` primitives the
`board-attachment` purpose already uses.

- New repository method `createUploadUrl(session, { mimeType, uploadType })`,
  `@RequireScope('posts:write')`. Folder is always `getFolderForPurpose('post-attachment',
{ userId: session.userId })` — never client-supplied, matching the existing
  `posts/${userId}/` ownership check in `FilesService.confirmUpload`.
- New tool `request_upload_url`. Description tells the agent: use this for real files, PUT
  the bytes to the returned URL yourself, then pass the returned `key` + the file's `size`
  into `create_post`.
- `McpPostFileInput` gains `key?: string` / `size?: number`. `createPost`'s file loop
  branches: `key` present → straight to `filesService.confirmUpload` (no buffer, no
  `uploadBuffer` call); otherwise keep the inline path for small attachments.
- Inline path gets a real cap: `.max(~680_000)` (base64 length, so real bytes ≈500KB) on
  `base64Data`/`textData` in the zod schema, so an oversized inline file fails as a clean
  tool-schema error instead of an opaque 413 from Express.
- Per-file error handling: wrap each file's upload+confirm in try/catch inside the loop;
  collect `{fileName, error}` for failures instead of throwing and abandoning a post that
  already has other files attached. Return `{post, attachedFiles, failedFiles}`.
- `uploadBuffer` itself is untouched — MCP clients with no HTTP capability still need it as
  the fallback, and it stays the only caller.

**Not doing:** a shared `McpFileInput` resolver for board image attachments. No MCP tool
attaches images to boards today, so building the abstraction now is speculative. Revisit
when that tool exists — the presigned-upload tool above is deliberately named/shaped so a
future `attach_board_image` could reuse `generatePresignedUploadUrl` the same way.

## 2. Scope-aware tool registration

**Problem:** `McpService.handleRequest` calls `server.registerTool` for all nine tools
unconditionally. A client that only consented to `boards:read` still sees `create_post`,
`delete_post`, etc. in `tools/list` and burns a turn on a guaranteed 403. Scope requirements
also currently live only inside `McpRepository` (`@RequireScope`), which `McpService` has no
way to read.

**Design — extend `RequireScope` to be introspectable instead of building a parallel tool
table:**

- `RequireScope` additionally does `Reflect.defineMetadata(MCP_SCOPES_KEY, requiredScopes,
wrappedMethod)` on the wrapper it already builds. Enforcement behavior (throw
  `ForbiddenException`) is unchanged — this only adds metadata, so all 567 lines of existing
  `mcp.repository.spec.ts` negative-scope tests keep working untouched.
- `McpService` gets a private `isToolAllowed(session, repoMethod)` that reads
  `Reflect.getMetadata(MCP_SCOPES_KEY, repoMethod)` and checks it against
  `session.scopes.split(/\s+/)`. Each `registerTool` call is skipped when this returns false.
- Net effect: scope stays declared in exactly one place (the `@RequireScope(...)` call site
  on the repository method) and both enforcement and `tools/list` filtering read from it.
  No parallel table to drift out of sync.
- `read_me` and `list_courses`'s new scope (see #3) have no side effects from this — tools
  with no `@RequireScope` are always registered.

Rejected alternative: a full `{name, scopes, handler}` dispatch table replacing per-tool
`registerTool` calls and deleting the decorator. Same outcome, but rewrites all nine tool
registrations and the repository's own scope tests for no behavioral gain over the metadata
approach above.

## 3. Scope/config correctness fixes

- **`list_courses` gated on `posts:read`** even though courses aren't posts and `posts:read`
  currently unlocks nothing else. Add `courses:read` to `mcpScopes`
  (`auth.config.ts:33`) and to the two OAuth `scopes` arrays there, and change
  `listCourses`'s decorator to `@RequireScope('courses:read')`.
- **`FRONTEND_URL` fallback inconsistency**: `auth.config.ts:89` falls back to `:3000`,
  `auth.config.ts:90` (two lines down) falls back to `:3001`. `mcp.repository.ts:137,290`
  and `mcp.controller.ts`'s `toWebRequest` read `process.env.FRONTEND_URL` directly instead
  of via `ConfigService` like the rest of the app. Standardize on `ConfigService`, one
  fallback value (`http://localhost:3000`, matching the web app's actual default port).

## 4. Rate limiting on `/mcp`

**Problem:** no throttling at all on the one route that fans every tool call (including
`create_post`'s ingestion/summarization pipeline) through the API process.

**Constraint:** `McpController` uses `@OptionalAuth()` and fetches its own OAuth session
manually inside the handler body (`auth.api.getMcpSession(...)`) — `req.session` (what
`UserThrottlerGuard.getTracker` reads) is never populated for this route, so applying the
guard as-is would silently fall back to IP-based limiting instead of per-user.

**Design:**

- Extract the existing auth check into a small `McpAuthGuard` (`CanActivate`) that does
  exactly what `handle()` does today for the missing-session case (writes the same
  `WWW-Authenticate` 401 JSON-RPC body, returns `false`), and on success attaches
  `req.mcpSession = session`.
- `UserThrottlerGuard.getTracker` gains a second read: `req.mcpSession?.userId ??
req.session?.user?.id ?? req.ip`.
- `@UseGuards(McpAuthGuard, UserThrottlerGuard)` and `@Throttle({ default: { limit: 30, ttl:
60000 } })` on `@All('mcp')`. One throttle for the whole route is correct here — every
  tool call is the same JSON-RPC endpoint, so there's no per-tool route to key separately.
- `handle()` shrinks to just `mcpService.handleRequest(req, res, req.mcpSession, req.body)`
  plus its existing try/catch.
- No existing test exercises `McpController` end-to-end (`mcp-oauth.e2e-spec.ts` tests
  `better-auth`'s OAuth flow directly, not through Nest), so this is a net-new
  `mcp.controller.spec.ts` plus an extension of `user-throttler.guard.spec.ts` for the new
  tracker fallback, not a migration of existing tests.

## 5. Two smaller fixes

- **CORS**: `http://localhost:6274` (MCP Inspector) is in the allowlist unconditionally,
  including production (`main.ts:22`). Gate it behind `process.env.NODE_ENV !==
'production'`.
- **`draw_board` error surfacing**: keep the `elements: z.string()` JSON-blob wire format
  as-is (per the code's own note, a nested schema previously broke a real client — not
  reopening that without cause). Just change the generic `'Invalid elements: drawing rules
not satisfied'` (`mcp.repository.ts:181`) to include the actual zod issue path/message, so
  a retrying agent gets signal instead of a repeat of the same failing payload.

**Explicitly out of scope for this pass:** renaming/splitting `McpRepository` into an actual
repository + service per the controller→service→repository convention. It's a real
convention mismatch, but fixing it touches every method in a 300+ line class and its
567-line spec file for an organizational win with no behavioral upside. Worth doing if/when
the module needs to change shape for another reason, not as a drive-by here.

## Files touched

- `apps/api/src/modules/mcp/mcp.repository.ts` — `createUploadUrl`, `McpPostFileInput`,
  `createPost` file-loop rework, `listCourses` scope, `drawBoard` error message,
  `FRONTEND_URL` → `ConfigService`.
- `apps/api/src/modules/mcp/mcp.service.ts` — `request_upload_url` tool, `create_post`
  schema update, `isToolAllowed` filtering wired into every `registerTool` call.
- `apps/api/src/modules/mcp/mcp.controller.ts` — shrink `handle()`, add guards.
- `apps/api/src/modules/mcp/mcp-post-guide.ts` — document the two upload paths.
- `apps/api/src/common/decorators/require-scope.decorator.ts` — add metadata attachment.
- `apps/api/src/common/guards/mcp-auth.guard.ts` — new.
- `apps/api/src/common/guards/user-throttler.guard.ts` — second tracker fallback.
- `apps/api/src/auth/auth.config.ts` — `courses:read` scope, `FRONTEND_URL` fallback fix.
- `apps/api/src/main.ts` — CORS gate.
- Tests: `mcp.repository.spec.ts` (new cases, not migrations), `mcp.service.spec.ts`
  (`isToolAllowed` filtering), new `mcp.controller.spec.ts`,
  `user-throttler.guard.spec.ts` (new tracker case).

## Step-by-step

1. `require-scope.decorator.ts` metadata + `courses:read` scope plumbing (auth.config.ts).
2. `mcp.repository.ts`: `createUploadUrl`, `createPost` rework, `listCourses` scope,
   `drawBoard` message, `FRONTEND_URL` fix. Update/add repository specs.
3. `mcp.service.ts`: `isToolAllowed`, wire into all `registerTool` calls, add
   `request_upload_url`, update `create_post` schema. Extend service specs.
4. `mcp-auth.guard.ts` + `mcp.controller.ts` shrink + `user-throttler.guard.ts` fallback +
   throttle decorator. New controller spec, extend throttler spec.
5. `main.ts` CORS gate.
6. `mcp-post-guide.ts` doc update.
7. Full `pnpm --filter api test`, `pnpm --filter api lint`, manual smoke via MCP Inspector
   if available.
