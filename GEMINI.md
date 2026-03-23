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

## Shared Rules

- Use `pnpm` for workspace commands.
- Treat generated code as read-only unless the task is specifically about generation.
- Keep frontend and backend boundaries clean.
- Prefer app-local guidance over duplicating detailed rules here.

# Implementation Process

When asked to implement features or make changes:

## Phase 1: Planning

1. **Create/Update planning doc** - Create or update `docs/{feature-name}/planning.md` using these required sections:
   - Feature overview
   - API design
   - Data model
   - Folder structure
   - Trade-offs
   - Step-by-step implementation plan
2. **Show plan summary** - Present the plan to user
3. **Ask for approval** - Wait for confirmation before proceeding

## Phase 2: Step-by-Step Execution

For each step in the plan:

1. **Execute step** - Make the code changes for one task
2. **Show changes** - Display what files were modified and what changed
3. **Ask permission** - "Continue to next step?"
4. **Ask about commit** - "Commit these changes?"
   - If **Yes**: Create atomic commit with descriptive message
   - If **No**: Stage changes but don't commit, continue to next step

## Phase 3: Completion

1. **Report summary**:
   - All files changed
   - What was implemented
   - Test results (if applicable)
   - Any issues or considerations
2. **Suggest next steps** - Testing, documentation, or related features

## Agent Instructions

Agents reading this file should:

- Always load and follow the plan from `docs/{feature-name}/planning.md`
- Never skip the permission step between tasks
- Provide clear diffs or summaries of changes made
- Respect the commit preference for each step
- Stop immediately if user says "stop" or "pause"

## Common Commands

```bash
pnpm --filter web dev
pnpm --filter api dev
pnpm --filter web api:generate
```
