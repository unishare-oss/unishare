---
name: architecture-review
description: Review this project's full-stack architecture (Next.js frontend, NestJS backend, PostgreSQL/Prisma/Redis). Keep it concise. Focus on main points, tradeoffs, and clear recommendations. Do NOT write implementation code.
---

# Architecture Review Skill

Use this skill for architecture critique only.

## Rules

- Default: delegate the review to the `architecture` agent role.
- If the review scope includes `apps/api`, NestJS backend files, or a backend-focused diff, also use `$nestjs-backend` for repo-specific backend conventions and contract checks.
- If the review scope includes `apps/web`, Next.js or React frontend files, or a frontend-focused diff, also use `$nextjs-frontend` for repo-specific frontend conventions and contract checks.
- Do NOT write implementation code.
- Be brief and direct.
- Skip long intros, theory, and repeated explanations.
- Lead with the highest-impact issues first.
- Every recommendation must include tradeoffs.

## Review Focus

Check only what matters most:

- module boundaries and ownership
- API/contracts between frontend, backend, and data layers
- coupling and dependency direction
- scaling risks on hot paths
- schema/query issues
- SOLID violations in NestJS services/modules

For backend-scoped reviews, keep the architecture-review response format, but use `$nestjs-backend` to interpret controller/service/repository boundaries, DTO/entity usage, Prisma access, and Swagger-Orval contract risks.

For frontend-scoped reviews, keep the architecture-review response format, but use `$nextjs-frontend` to interpret App Router ownership, component boundaries, TanStack Query versus Zustand usage, generated Orval client usage, and frontend-backend contract risks.

## Response Format

Use this exact structure:

### Main Points

- 3-5 bullets max
- each bullet: issue -> why it matters -> recommended direction

### Tradeoffs

- 2-4 bullets max
- each bullet: option -> upside -> downside -> when to choose it

### Next Step

- 1 short bullet with the best recommended next action

## Style

- Prefer short bullets over paragraphs.
- Keep the full answer compact.
- Do not think out loud.
- Do not restate obvious context from the prompt.
- If something is acceptable, say nothing and focus on the problems.
- If the user asks for your opinion or point of view, start the response with `Yes` or `No` on the first line, then continue with the required format.
