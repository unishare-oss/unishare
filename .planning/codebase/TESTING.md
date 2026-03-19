# Testing Patterns

**Analysis Date:** 2025-01-09

## Test Framework

**Runner:**

- Jest 30.0.0
- Config: `apps/api/package.json` (jest config section)

**Assertion Library:**

- Jest built-in assertions (`expect()`)
- Supertest for HTTP testing (e2e)

**Run Commands:**

```bash
pnpm test                  # Run all unit tests in API
pnpm test:watch           # Watch mode for tests
pnpm test:cov             # Generate coverage report
pnpm test:debug           # Debug tests with Node inspector
pnpm test:e2e             # Run e2e tests
```

**Coverage:**

- Output directory: `../coverage` (relative to API root)
- Coverage configuration: `collectCoverageFrom: ["**/*.(t|j)s"]`
- Requirements: Not enforced (no minimum coverage threshold configured)

## Test File Organization

**Location:**

- Unit tests: co-located with source files in `src/`
- E2e tests: separate `test/` directory at root level of API

**Naming:**

- Unit tests: `*.spec.ts` (e.g., `app.controller.spec.ts`)
- E2e tests: `*.e2e-spec.ts` (e.g., `app.e2e-spec.ts`)

**Structure:**

```
apps/api/
├── src/
│   ├── app.controller.ts
│   ├── app.controller.spec.ts      # Co-located unit test
│   ├── app.service.ts
│   ├── modules/
│   │   └── posts/
│   │       ├── posts.service.ts
│   │       ├── posts.controller.ts
│   │       └── (no .spec files currently)
│   └── ...
├── test/
│   ├── app.e2e-spec.ts             # E2e test
│   └── jest-e2e.json               # E2e config
└── package.json
```

## Test Structure

**Suite Organization:**

```typescript
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

**Patterns:**

- **Setup** (`beforeEach`): Create TestingModule with required controllers/providers
- **Test Cases** (`it('...', ...)`): Single assertion or related assertions
- **Teardown** (implicit): TestingModule disposed after each test automatically

**NestJS Testing Module:**

- Use `Test.createTestingModule()` to create isolated test environment
- Use `.compile()` to bootstrap module
- Use `.get<T>(Class)` to retrieve instances for testing
- Allows manual mocking of dependencies

## Mocking

**Framework:**

- Jest mocking (manual mock implementations)
- No dedicated mocking library (e.g., jest-mock-extended) currently in use

**Patterns:**

```typescript
// Manual mock service in test
const mockService = {
  getHello: jest.fn().mockReturnValue('Mocked response'),
}

// Provide mock to testing module
const app = await Test.createTestingModule({
  controllers: [AppController],
  providers: [
    {
      provide: AppService,
      useValue: mockService,
    },
  ],
}).compile()

// Or override existing provider
app.get(AppService).getHello = jest.fn().mockReturnValue('Test value')
```

**What to Mock:**

- External services (databases, APIs, third-party services)
- Repository layer for service tests
- Dependencies that are slow or have side effects

**What NOT to Mock:**

- The class under test (the SUT)
- Pure utility functions
- Value objects and DTOs
- For integration tests: don't mock the data layer

## Fixtures and Factories

**Test Data:**

- Currently not explicitly used in existing tests
- When needed, create factory functions or builder patterns:

```typescript
// Example pattern to follow:
function createMockPost(overrides?: Partial<Post>): Post {
  return {
    id: 'test-id',
    title: 'Test Post',
    description: 'Test Description',
    authorId: 'author-id',
    ...overrides,
  }
}

// Usage in test
const post = createMockPost({ title: 'Custom Title' })
```

**Recommended Location:**

- Create `test/fixtures/` directory for shared factories
- Or define factories at top of test file for isolated tests
- Use TypeScript for type safety in factories

## Test Types

**Unit Tests:**

- Scope: Individual service/controller method
- Approach: Test in isolation with mocked dependencies
- Example: `app.controller.spec.ts` tests AppController with mocked AppService
- Run with: `pnpm test`
- Location: `src/**/*.spec.ts`

**Integration Tests:**

- Scope: Multiple services working together
- Approach: Create TestingModule with real dependencies (not mocked)
- Currently not explicitly separated from unit tests (same file structure)
- When needed: Create `*.integration-spec.ts` files

**E2E Tests:**

- Framework: Jest with Supertest
- Scope: Full HTTP request cycle through entire application
- Approach: Start NestJS application, make real HTTP requests
- Example: `test/app.e2e-spec.ts`
- Run with: `pnpm test:e2e`
- Config file: `test/jest-e2e.json`

**E2E Example:**

```typescript
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

## Async Testing

**Pattern:**

- Return promise from test or use `async/await`
- Jest waits for promise resolution before considering test complete

```typescript
// Pattern 1: Return promise
it('should handle async operation', () => {
  return request(app.getHttpServer()).get('/').expect(200)
})

// Pattern 2: Async/await
it('should handle async operation', async () => {
  const response = await request(app.getHttpServer()).get('/')
  expect(response.status).toBe(200)
})

// Pattern 3: For service methods
it('should create post', async () => {
  const post = await postsService.create(dto, userId, departmentId)
  expect(post).toBeDefined()
})
```

## Error Testing

**Pattern:**

- For exceptions, use Jest's `expect().rejects` or try/catch

```typescript
// Pattern 1: Using rejects
it('should throw NotFoundException', async () => {
  await expect(postsService.findById('nonexistent')).rejects.toThrow(NotFoundException)
})

// Pattern 2: Using try/catch
it('should throw ForbiddenException', async () => {
  try {
    await postsService.update(postId, dto, differentUserId)
    fail('Should have thrown')
  } catch (error) {
    expect(error).toBeInstanceOf(ForbiddenException)
  }
})

// Pattern 3: For HTTP error responses
it('should return 404 for missing post', async () => {
  const response = await request(app.getHttpServer()).get('/posts/nonexistent')
  expect(response.status).toBe(404)
})
```

## Coverage

**Viewing Coverage:**

```bash
pnpm test:cov
# Output in coverage/ directory
# Open coverage/lcov-report/index.html for visual report
```

## CI/CD Testing

**Test Execution:**

- GitHub Actions workflow (`.github/workflows/ci.yml`)
- Runs on: push to main, pull requests to main
- Steps:
  1. Install dependencies (`pnpm install`)
  2. Generate Prisma client (`pnpm db:generate`)
  3. Generate API client (`pnpm api:generate`)
  4. Run lint (`pnpm lint`)
  5. Run build (`pnpm build`)

**Note:** Tests are NOT currently run in CI/CD pipeline. Only linting and building are checked.

**To enable testing in CI:**
Add step to `.github/workflows/ci.yml`:

```yaml
- name: Run tests
  run: pnpm test
```

## Test Coverage Analysis

**Currently Tested:**

- ✅ App controller basic functionality (one unit test + one e2e test)
- ✅ App service methods
- ✅ HTTP status codes and response structure

**Untested Areas (High Priority):**

- ❌ Authentication/Authorization (all endpoints with `@Session()`, `@OptionalAuth()`)
- ❌ Repository layer (database queries, Prisma interactions)
- ❌ Service business logic (most service methods have no test coverage)
- ❌ Error handling (exception cases in services)
- ❌ Validation (DTO validators)
- ❌ Complex queries (pagination, filtering, complex where clauses)
- ❌ Data mutations (create, update, delete operations)
- ❌ Relations (nested includes, joined data)

**Untested Modules:**

- `posts/` (core feature - no tests)
- `comments/` (nested feature - no tests)
- `users/` (critical - no tests)
- `departments/` (core data - no tests)
- `notifications/` (background service - no tests)
- `tasks/` (background jobs - no tests)

## Recommended Testing Strategy

**Phase 1 (High Impact):**

1. Add tests for all repository methods (data access layer)
2. Test critical services: PostsService, UsersService, CommentsService
3. Test validation DTOs with class-validator

**Phase 2 (Core Features):**

1. E2e tests for POST/PUT/DELETE endpoints
2. Auth and permission testing
3. Error scenario e2e tests

**Phase 3 (Coverage):**

1. Integration tests for complex workflows
2. Edge case handling
3. Reach 80%+ coverage on core modules

## Frontend Testing (Web App)

**Current Status:**

- ❌ No test framework configured
- ❌ No test files present
- ❌ No testing commands in package.json

**Recommendation:**

- Add Jest + React Testing Library for component tests
- Add Vitest for faster feedback
- Structure: `components/**/*.test.tsx` for components
- Example setup would follow React/Next.js conventions

---

_Testing analysis: 2025-01-09_
