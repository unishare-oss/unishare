# Contributing to Unishare

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- PostgreSQL (local or [Neon](https://neon.tech))

## Setup

1. Fork and clone the repository
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy the environment files and fill in your values:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

4. Run database migrations and seed:

   ```bash
   cd apps/api
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```

5. Start the development servers:

   ```bash
   pnpm dev
   ```

Frontend runs at `http://localhost:3000`, backend at `http://localhost:3001`.
Swagger API docs are available at `http://localhost:3001/docs`.

## Project Structure

```
unishare/
├── apps/
│   ├── api/        # NestJS backend (modules, Prisma, Swagger)
│   └── web/        # Next.js frontend (App Router, TanStack Query, Orval)
├── packages/
│   └── types/      # Shared TypeScript types
└── docs/           # Project documentation
```

## API Client Codegen

The frontend uses [Orval](https://orval.dev) to generate typed API hooks from the backend's Swagger spec.
After changing any backend endpoint, regenerate the client:

```bash
# Make sure the API dev server is running first
pnpm api:sync
```

Never edit files inside `apps/web/src/lib/api/generated/` by hand.

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).
Commit messages are enforced via commitlint on every commit.

| Prefix      | Use for                                    |
| ----------- | ------------------------------------------ |
| `feat:`     | New features                               |
| `fix:`      | Bug fixes                                  |
| `chore:`    | Tooling, config, dependencies              |
| `docs:`     | Documentation changes                      |
| `refactor:` | Code restructuring without behavior change |
| `test:`     | Adding or updating tests                   |

## Branch Naming

| Pattern            | Use for                       |
| ------------------ | ----------------------------- |
| `feat/short-name`  | New features                  |
| `fix/short-name`   | Bug fixes                     |
| `chore/short-name` | Tooling, config, dependencies |
| `docs/short-name`  | Documentation changes         |

For larger features, create sub-branches off the parent feature branch rather than off `main`:

```
main
└── feat/auth
    ├── feat/auth/microsoft
    └── feat/auth/google
```

## Submitting a PR

1. Create a branch from `main` (or from a parent feature branch for sub-tasks)
2. Make your changes
3. Run `pnpm lint` and `pnpm build` to verify everything passes
4. Open a pull request with a clear description
5. Fill in the PR template

## Reporting Issues

Use the GitHub issue templates for bug reports and feature requests.
Please search existing issues before opening a new one.
