# Contributing to Unishare

Thanks for your interest in contributing! This guide will help you get started.

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- PostgreSQL (local or Docker)

## Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy the environment file and fill in your values:
   ```bash
   cp .env.example .env
   ```
4. Push the database schema:
   ```bash
   pnpm --filter @unishare/database db:push
   ```
5. Start the development servers:
   ```bash
   pnpm dev
   ```

## Project Structure

```
unishare/
├── apps/
│   ├── api/        # NestJS backend
│   └── web/        # Next.js frontend
├── packages/
│   ├── database/   # Prisma schema and client
│   └── tsconfig/   # Shared TypeScript configs
```

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

## Submitting a PR

1. Create a branch from `main`
2. Make your changes
3. Run `pnpm lint` and `pnpm build` to verify everything passes
4. Open a pull request with a clear description
5. Fill in the PR template

## Reporting Issues

Use the GitHub issue templates for bug reports and feature requests.
Please search existing issues before opening a new one.
