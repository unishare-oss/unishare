# Testing

This document describes the testing setup, conventions, and patterns used across the Unishare monorepo. Testing currently exists only in the **API** (`apps/api`). The **web** app has no test suite.

---

## Overview

| Layer            | Framework                            | Runner                               | Location                         |
| ---------------- | ------------------------------------ | ------------------------------------ | -------------------------------- |
| Unit tests (API) | Jest + `@nestjs/testing` + `ts-jest` | `jest`                               | `apps/api/src/**/*.spec.ts`      |
| E2E tests (API)  | Jest + `@nestjs/testing` + Supertest | `jest --config ./test/jest-e2e.json` | `apps/api/test/**/*.e2e-spec.ts` |
| Web              | None                                 | —                                    | —                                |

---

## Jest Configuration

### Unit tests

Defined inline in `apps/api/package.json` under the `"jest"` key:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

Key points:

- Root dir is `src/` — tests live alongside source files
- Test file pattern: `*.spec.ts`
- Transform: `ts-jest` (TypeScript compiled by ts-jest, not SWC, for tests)
- Coverage output goes to `apps/api/coverage/` (one level up from `src/`)
- Environment: `node`

### E2E tests

Defined in `apps/api/test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

Key points:

- Root dir is `apps/api/test/` (the `test/` directory at the package root)
- Test file pattern: `*.e2e-spec.ts`
- No `collectCoverageFrom` — coverage is not measured for e2e tests
- Uses the same `ts-jest` transform

---

## NPM Scripts

From `apps/api/package.json`:

```bash
pnpm test           # run unit tests once
pnpm test:watch     # run unit tests in watch mode
pnpm test:cov       # run unit tests with coverage report
pnpm test:debug     # run with Node inspector (--inspect-brk, --runInBand)
pnpm test:e2e       # run e2e tests using test/jest-e2e.json
```

---

## File Organization

### Unit tests

Unit test files live **next to the file they test**, inside `apps/api/src/`:

```
src/
  app.controller.ts
  app.controller.spec.ts      ← unit test for AppController
  modules/
    posts/
      posts.service.ts
      posts.service.spec.ts   ← (where unit tests would be added)
```

Currently only `src/app.controller.spec.ts` exists as a unit test. New unit tests should follow this co-location pattern.

### E2E tests

E2E tests live in `apps/api/test/`:

```
test/
  app.e2e-spec.ts    ← end-to-end test for the full app
  jest-e2e.json      ← Jest config for e2e
```

---

## Unit Test Patterns

### NestJS `Test.createTestingModule`

The standard pattern uses `@nestjs/testing`:

```ts
import { Test, TestingModule } from '@nestjs/testing'
import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!')
    })
  })
})
```

- `beforeEach` creates a fresh module for each test (no shared state)
- `app.get<T>(Token)` retrieves the instance from the DI container
- `describe` blocks are nested: outer for the class, inner for method groups

### Mocking Pattern

When testing a service or controller that has dependencies, replace real providers with mock objects in `providers`. The NestJS testing module supports passing plain objects as providers using `useValue`:

```ts
const mockPostsRepository = {
  findAll: jest.fn(),
  create: jest.fn(),
  // ...
}

const app: TestingModule = await Test.createTestingModule({
  providers: [PostsService, { provide: PostsRepository, useValue: mockPostsRepository }],
}).compile()
```

---

## E2E Test Patterns

### Full Application Bootstrap

E2E tests bootstrap the entire NestJS application:

```ts
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'

describe('AppController (e2e)', () => {
  let app: INestApplication<App>

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!')
  })
})
```

- Imports the full `AppModule` (real database connection required)
- Uses `supertest` for HTTP assertions
- `request(app.getHttpServer())` — passes the underlying HTTP server to supertest
- Returns the promise directly from `it()` — Jest waits for it to resolve

### Test Isolation

- `beforeEach` (not `beforeAll`) is used to create a fresh app instance per test
- The existing e2e suite does **not** clean the database between tests; for a real test database, seed/truncate logic would be needed in `beforeEach`/`afterEach`

---

## Globals Available in Tests

The ESLint config for the API includes `globals.jest`, so Jest globals (`describe`, `it`, `expect`, `beforeEach`, `afterEach`, `jest`, etc.) are available without import in `*.spec.ts` and `*.e2e-spec.ts` files.

---

## Current Test Coverage

The test suite is minimal and serves as a scaffold:

| File                         | Type | Tests                                              |
| ---------------------------- | ---- | -------------------------------------------------- |
| `src/app.controller.spec.ts` | Unit | 1 — verifies `getHello()` returns `'Hello World!'` |
| `test/app.e2e-spec.ts`       | E2E  | 1 — `GET /` returns 200 and `'Hello World!'`       |

No tests exist for the domain modules (posts, users, departments, etc.). Adding tests there should follow the patterns described above.

---

## Notes on Testability

The codebase's architecture makes it relatively straightforward to test in isolation:

- **Services** hold all business logic and depend on **Repositories** (injectable), making services easy to test by mocking repositories
- **Repositories** depend only on `PrismaService` (injectable), which can be replaced with a mock Prisma client
- **Controllers** depend only on Services, making them easy to test by mocking the service
- The `paginate()` utility (`src/common/utils/paginate.ts`) is a pure function and can be unit-tested directly
- Notification side effects in services are fire-and-forget (`void`), which simplifies unit testing — the test does not need to await them
