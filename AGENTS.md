# Monorepo Agent Guide

This repository is a monorepo with separate frontend and backend apps.

## App-Specific Guides

- Frontend rules live in `apps/web/AGENTS.md`
- Backend rules live in `apps/api/AGENTS.md`

When working inside one of those folders, follow the local guide first.

## Repo Structure

- `apps/web`
  Next.js frontend
- `apps/api`
  NestJS backend
- `packages`
  Shared workspace packages
- `docs`
  Project documentation, including API codegen notes

## Shared Rules

- Use `pnpm` for workspace commands.
- Treat generated code as read-only unless the task is specifically about generation.
- Keep frontend and backend boundaries clean:
  frontend should not patch generated API output by hand, and backend should expose correct Swagger metadata instead.
- Prefer app-local guidance over duplicating detailed rules here.
- Before making any file changes, first tell the user the plan, list which files will be modified or added, and wait for permission before proceeding.
- For implementation tasks that require multiple files, present the full file list as a numbered phase plan and ask the user which specific files to do now.
- Only edit the user-approved subset of files for the current phase.
- After finishing the approved subset, report exactly which files were changed and pause for user review/permission before editing any remaining files.

## Common Commands

```bash
pnpm --filter web dev
pnpm --filter api dev
pnpm --filter web api:generate
```
