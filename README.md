# Unishare

An open-source academic content sharing platform for university students — share notes, past papers, and resources with your department.

Designed to be self-hosted and configurable for any university.

---

## Features

- **Post & share** — upload PDFs and academic files linked to a course and department
- **Feed** — browse posts filtered by department, course, and file type, with persistent filter state
- **Reactions & comments** — react to posts and leave threaded comments
- **Notifications** — real-time in-app notifications with unread badge
- **Saved posts** — bookmark posts to revisit later
- **View counter** — track how many times a post has been viewed
- **User profiles** — academic profile with department and year, profile image via OAuth avatar
- **Auth** — email/password sign-up (with confirm password) + OAuth (Google, Microsoft Entra ID)
- **Admin moderation** — approve or reject submitted posts
- **Admin analytics** — overview stats, top posts by views and reactions, most active users
- **Department & course management** — admin-managed departments and courses

## Tech Stack

| Layer        | Technology                                        |
| ------------ | ------------------------------------------------- |
| Frontend     | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend      | NestJS 11, Prisma, PostgreSQL                     |
| Auth         | Better Auth (email + OAuth)                       |
| State        | TanStack Query 5, Zustand                         |
| API contract | Orval (OpenAPI codegen)                           |
| Monorepo     | Turborepo, pnpm workspaces                        |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database (or [Neon](https://neon.tech) for serverless)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy and fill in env files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Key variables:

```env
# apps/api/.env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=your-secret

# apps/web/.env
NEXT_PUBLIC_API_URL=http://localhost:3001
BETTER_AUTH_SECRET=your-secret
```

### 3. Run database migrations & seed

```bash
pnpm --filter api db:migrate
pnpm --filter api db:seed
```

### 4. Start development servers

```bash
pnpm dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- API docs (Swagger): `http://localhost:3001/docs`

## Roadmap

See [`platform-phases.md`](./platform-phases.md) for the full build plan.

| Phase   | Description                                                            | Status  |
| ------- | ---------------------------------------------------------------------- | ------- |
| Phase 1 | Core loop — upload, browse, download                                   | ✅ Done |
| Phase 2 | Discovery & engagement — reactions, comments, notifications, bookmarks | ✅ Done |
| Phase 3 | Search, tagging, trending feed, content reporting                      | Planned |

## Self-Hosting

Unishare is built to be deployed by any university. Configure your identity provider and allowed email domain via environment variables — no code changes needed.

Supported auth providers:

- **Email/password** — restrict sign-up to a configured university email domain
- **Google** — Google Workspace OAuth
- **Microsoft** — Microsoft Entra ID (recommended for Microsoft 365 universities)

## Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and open an issue before submitting a pull request.

## License

MIT
