# University Branding Feature

## Overview

Add a `University` model so users can identify their institution at signup.
The chosen university's logo is shown beside the Unishare logo in the sidebar navbar.
Designed for multi-university expansion — currently seeded with KMUTT.

## Data Model

```prisma
model University {
  id        String   @id @default(cuid())
  name      String   @unique        // "King Mongkut's University of Technology Thonburi"
  shortName String                  // "KMUTT"
  logoUrl   String?                 // URL to university logo
  users     User[]
  @@map("university")
}

// User gets new optional field:
universityId  String?
university    University? @relation(fields: [universityId], references: [id])
```

## API Design

| Method | Path          | Auth   | Description                                          |
| ------ | ------------- | ------ | ---------------------------------------------------- |
| GET    | /universities | Public | List all universities (id, name, shortName, logoUrl) |

No create/update endpoints needed yet — universities are seeded by admins.

## Folder Structure

```
apps/api/src/modules/universities/
  universities.module.ts
  universities.controller.ts
  universities.service.ts
apps/api/prisma/seeds/
  universities.ts          ← KMUTT seed
```

## Trade-offs

- **Optional field**: University is not required at signup — users who skip it just see the plain Unishare logo. They can set it later in profile settings.
- **logoUrl as external URL**: Avoids file upload complexity; can point to a CDN or `/public` asset.
- **No department → university link**: Kept simple for now. Departments are not scoped to a university yet (future work).

## Step-by-Step Implementation Plan

### Step 1: Schema migration

- Add `University` model to `schema.prisma`
- Add `universityId String?` + relation to `User`
- Run `prisma migrate dev`

### Step 2: Seed KMUTT university

- Create `apps/api/prisma/seeds/universities.ts`
- Wire into `seed.ts`

### Step 3: Universities API module

- Create `universities.module.ts`, `universities.controller.ts`, `universities.service.ts`
- `GET /universities` returns `{ id, name, shortName, logoUrl }[]`
- Register in `app.module.ts`

### Step 4: Auth config — accept universityId at signup

- Add `universityId` to `user.additionalFields` in `auth.config.ts` with `input: true`

### Step 5: API sync

- Run `pnpm api:sync` to regenerate openapi.json + Orval client

### Step 6: Register form — university combobox

- Fetch universities list on mount
- Add searchable combobox between Name and Email in signup form
- Pass `universityId` to `authClient.signUp.email()`

### Step 7: Sidebar university logo

- Read `session.user.universityId`
- Fetch university by id (or include in session)
- Show `[Unishare] | [uni logo]` in sidebar logo row when set

### Step 8: Profile settings — change university

- Add university selector to profile settings page
- PATCH user via existing users API
