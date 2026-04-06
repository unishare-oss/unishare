# Testing Patterns

**Analysis Date:** 2025-05-24

## Test Framework

**Runner:**
- **API:** Jest (Version: `^29.x.x` implied) - Config: `apps/api/package.json` and `apps/api/test/jest-e2e.json`.
- **Web:** Vitest (Version: `latest`) - Config: `apps/web/vitest.config.ts`.

**Assertion Library:**
- **API:** Jest built-in.
- **Web:** Vitest built-in.

**Run Commands:**
```bash
pnpm --filter api test          # Run API unit tests
pnpm --filter api test:watch    # Watch mode for API
pnpm --filter api test:e2e      # Run API end-to-end tests
pnpm --filter web test          # Run Web unit tests
pnpm --filter web test:watch    # Watch mode for Web
```

## Test File Organization

**Location:**
- **Unit Tests:** Co-located with source files (e.g., `src/modules/chat/chat.service.spec.ts`).
- **E2E Tests (API):** Located in `apps/api/test/` directory (e.g., `apps/api/test/app.e2e-spec.ts`).

**Naming:**
- **API:** `*.spec.ts` for unit tests, `*.e2e-spec.ts` for end-to-end tests.
- **Web:** `*.test.ts` or `*.spec.ts`.

**Structure:**
```
apps/api/src/
├── modules/
│   └── chat/
│       ├── chat.service.ts
│       └── chat.service.spec.ts
apps/api/test/
├── app.e2e-spec.ts
└── jest-e2e.json
apps/web/src/
└── lib/
    ├── presence.ts
    └── presence.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
// Typical API Unit Test Pattern (NestJS/Jest)
describe('ChatService', () => {
  let service: ChatService
  let repository: jest.Mocked<ChatRepository>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ChatRepository,
          useValue: { /* mocks */ },
        },
      ],
    }).compile()

    service = module.get<ChatService>(ChatService)
    repository = module.get(ChatRepository)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should get rooms', async () => {
    // ... test logic
  })
})
```

**Patterns:**
- **Setup:** `beforeEach` used for dependency injection setup (NestJS `TestingModule`) and mock resetting.
- **Assertion:** standard Jest/Vitest assertions (`expect(val).toBe(expected)`, `expect(fn).toHaveBeenCalled()`).

## Mocking

**Framework:**
- **API:** Jest built-in mocking (`jest.fn()`, `jest.Mocked`).
- **Web:** Vitest built-in mocking.

**Patterns:**
```typescript
// Mocking a repository in NestJS
const repositoryMock = {
  findRoomsByUserId: jest.fn(),
  findRoomById: jest.fn(),
  // ... other methods
}

// In TestingModule setup
{
  provide: ChatRepository,
  useValue: repositoryMock,
}
```

**What to Mock:**
- External services (API calls, databases, message brokers).
- Repositories (to isolate service logic).
- Event emitters.

**What NOT to Mock:**
- Domain entities.
- Pure utility functions.

## Fixtures and Factories

**Test Data:**
- Often defined within `beforeEach` or at the top of the test file as constants.

**Location:**
- API E2E mocks are found in `apps/api/test/__mocks__/`.

## Coverage

**Requirements:**
- No hard threshold enforced in the project configuration files, but coverage reporting is available.

**View Coverage:**
```bash
pnpm --filter api test:cov
```

## Test Types

**Unit Tests:**
- Focus on individual services, controllers, and utility functions in `apps/api/src` and `apps/web/src`.

**Integration Tests:**
- API integration tests for gateway and repository interactions (e.g., `apps/api/src/modules/collab/collab.gateway.integration.spec.ts`).

**E2E Tests:**
- API end-to-end tests in `apps/api/test/` using `supertest`.
- Test real API endpoints with a running application instance.

## Common Patterns

**Async Testing:**
- Standard `async/await` in `it` blocks.
```typescript
it('should perform async action', async () => {
  const result = await service.doSomething()
  expect(result).toEqual(expected)
})
```

**Error Testing:**
- Testing for specific exceptions in API.
```typescript
it('should throw NotFoundException if room doesn't exist', async () => {
  repository.findRoomById.mockResolvedValue(null)
  await expect(service.getRoom('id', 'userId')).rejects.toThrow(NotFoundException)
})
```

---

*Testing analysis: 2025-05-24*
