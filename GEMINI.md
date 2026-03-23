# Monorepo Agent Guide

This repository is a monorepo with separate frontend and backend apps.

## Planning & Context

- **Always** read all files in `.planning/**` before starting any task to understand the current phase, roadmap, and project state.

## Implementation Workflow

- Whenever asked to implement a feature, fix, or change:
  1. First, provide a plan and list the names of all files that will be modified or added.
  2. **Wait for explicit permission** before writing to any files.
  3. After the approved changes are implemented, report back with a summary of the modifications.

## Source Control

- After completing implementation and reporting back, **always ask for permission** before staging or committing changes to GitHub.

## App-Specific Guides

- Frontend rules live in `apps/web/GEMINI.md`
- Backend rules live in `apps/api/GEMINI.md`
- When working inside those folders, follow the local guide first.

## Shared Rules

- Use `pnpm` for workspace commands.
- Treat generated code as read-only unless the task is specifically about generation.
- Keep frontend and backend boundaries clean.
- Prefer app-local guidance over duplicating detailed rules here.

## Common Commands

```bash
pnpm --filter web dev
pnpm --filter api dev
pnpm --filter web api:generate
```
