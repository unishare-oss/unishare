# Testing Strategies

This document describes the testing frameworks, locations, and practices used in the Unishare project.

## API (apps/api) - Jest

### Framework
- **Jest**: The primary testing framework for the API.
- **ts-jest**: TypeScript support for Jest.
- **Supertest**: Used for E2E testing.

### Unit & Integration Tests
- **Location**: `apps/api/src/**/*.spec.ts` (alongside the source code).
- **Execution**: `pnpm --filter api test`.
- **Mocks**: Global mocks are stored in `apps/api/test/__mocks__`.

### E2E Tests
- **Location**: `apps/api/test/*.e2e-spec.ts`.
- **Configuration**: Uses `apps/api/test/jest-e2e.json`.
- **Execution**: `pnpm --filter api test:e2e`.

### Coverage
- Coverage reports are generated using Jest.
- **Execution**: `pnpm --filter api test:cov`.

---

## Web (apps/web) - Vitest

### Framework
- **Vitest**: The primary testing framework for the web app.
- **jsdom**: Provides a DOM environment for testing components.
- **@vitejs/plugin-react**: React support for Vitest.

### Test Files
- **Location**: `apps/web/**/*.test.ts` or `apps/web/**/*.test.tsx`.
- **Execution**: `pnpm --filter web test`.
- **Watch Mode**: `pnpm --filter web test:watch`.

### Configuration
- Defined in `apps/web/vitest.config.ts`.
- Path aliases: `@/` is correctly mapped to the project root.

---

## CI/CD - GitHub Actions

### Workflow
- **Location**: `.github/workflows/ci.yml`.
- **Trigger**: Runs on `push` to `main` and all `pull_request` to `main`.
- **Environment**: Node.js 24, pnpm.

### CI Steps
1. Checkout code.
2. Setup pnpm and Node.js.
3. Install dependencies.
4. Generate Prisma client (`pnpm --filter api db:generate`).
5. Generate Orval API client (`pnpm --filter web api:generate`).
6. Run `pnpm lint`.
7. Run `pnpm build`.
   - *Note: Tests are currently not run in CI according to the `ci.yml` but are available locally.*

---

## Local Development Workflow

- Run `pnpm test` from the root to execute all tests in all apps.
- For individual apps, use the `pnpm --filter <app-name> <script-name>` syntax.
- Ensure the database is running and Prisma client is generated before running API tests.
