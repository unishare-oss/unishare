# Backend Agent Guide

This document explains how the backend in `apps/api` is structured and how it must expose API contracts for the frontend Orval flow.

## Stack

- NestJS 11
- TypeScript
- Prisma
- PostgreSQL
- Better Auth integration for session handling
- Swagger for OpenAPI generation

## Folder Ownership

- `src/modules`
  Feature modules such as users, posts, comments, files, storage, departments, and courses.
- `src/prisma`
  Prisma module and shared `PrismaService`.
- `src/common`
  Shared decorators, interceptors, filters, DTO helpers, and utilities.
- `src/auth`
  Better Auth configuration.
- `src/generated`
  Generated Prisma client output. Do not edit by hand.

## Application Structure

The backend follows a module-based NestJS structure with a clear controller, service, repository split.

- Controller
  HTTP transport only. Validate input, bind params, apply decorators, and delegate.
- Service
  Business rules, orchestration, authorization checks, and response shaping.
- Repository
  Prisma data access only. Repositories should not own HTTP concerns.

This pattern is already visible across modules like `users`, `posts`, `comments`, `departments`, and `courses`.

## Layering Rules

- Keep controllers thin.
- Keep domain logic in services.
- Keep repositories focused on persistence access.
- Do not move request-specific logic into repositories.
- Prefer feature module ownership over dumping logic into `common`.

## Validation and Response Conventions

Global app behavior is configured in `src/main.ts`:

- `ValidationPipe` with `whitelist` and `transform`
- global exception filter
- global response interceptor
- Swagger document setup in non-production

Because of the response interceptor, responses are wrapped in a common envelope with `success`, `message`, and `data`.

Use `@ResponseMessage(...)` consistently on controller methods so the response envelope stays descriptive.

## Prisma Rules

- Use `PrismaService` from `src/prisma/prisma.service.ts` for DB access.
- Keep Prisma queries in repositories.
- Keep business invariants out of raw Prisma calls when they belong in services.
- Return only the fields needed by the feature.
- If frontend typing depends on a field, make sure repository includes and service mapping preserve it.

## DTO vs Entity Rules

Use DTOs for request payloads and validation.

- Request DTOs belong in `dto/`
- Response entities belong in `entities/`

Do not treat Prisma models as the external API contract. The API contract should be expressed intentionally through response entities.

## Swagger and Orval Contract Rules

The frontend Orval client depends on correct Swagger metadata from this backend.

Whenever you add or change an endpoint:

1. Make sure the controller method is exposed in Swagger.
2. Add the correct response decorator such as `@ApiOkResponse` or `@ApiCreatedResponse`.
3. Point the response decorator at an explicit entity class.
4. Mark entity fields with `@ApiProperty` or `@ApiPropertyOptional`.

If you skip response metadata, the frontend may still get a generated hook, but the generated data type can become `void` or incomplete.

## Orval Integration Contract

Frontend codegen depends on the backend OpenAPI spec served by this app.

The workflow is:

1. Backend exposes Swagger JSON
2. Frontend runs `pnpm --filter web api:generate`
3. Orval generates typed TanStack Query hooks from the backend contract

That means backend API changes are not complete until Swagger metadata is correct.

## Safe Working Rules for Backend Changes

- Do not edit generated Prisma output in `src/generated`.
- Prefer fixing API typing at the Swagger/entity level instead of forcing frontend workarounds.
- Keep controllers transport-focused.
- Keep services responsible for business rules and authorization.
- Keep repositories responsible for DB access.
- When changing response shapes, update the entity and Swagger annotations in the same change.
- If a frontend hook looks wrong after regeneration, inspect the controller response decorators and entity metadata first.

## Common Commands

```bash
pnpm --filter api dev
pnpm --filter api lint
pnpm --filter api test
```
