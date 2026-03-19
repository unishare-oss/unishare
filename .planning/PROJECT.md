# UniShare

## What This Is

UniShare is a study material sharing platform for university students — a place to upload notes, past papers, and assignments organized by department and course. This milestone adds real-time collaborative workspaces directly inside the platform, so students can whiteboard, co-write structured docs, and brainstorm together without leaving UniShare or bouncing between Discord, Miro, and back again.

## Core Value

Multiple students can open a shared canvas and collaborate in real-time, inside UniShare — no platform switching, no re-sharing files across tools.

## Requirements

### Validated

- ✓ User authentication (email/password, Microsoft OAuth, Google OAuth) — existing
- ✓ Post creation and management (notes, past papers, assignments) — existing
- ✓ File uploads to S3 with presigned URLs — existing
- ✓ Department and course organization — existing
- ✓ Post reactions, comments, and saves — existing
- ✓ Real-time notifications via SSE — existing
- ✓ Follow system for users — existing
- ✓ Post moderation (approval/rejection workflow) — existing
- ✓ User profiles with academic information — existing
- ✓ Platform analytics and stats — existing
- ✓ Post requests (crowdsourced study material requests) — existing

### Active

- [ ] Real-time collaborative canvas (whiteboard, sticky notes, structured text docs)
- [ ] Standalone collaboration rooms shareable via link
- [ ] Collaboration rooms attachable to existing posts
- [ ] Guest access — anyone with the link can join without signing up
- [ ] Boards persist after all participants leave
- [ ] Export board as image or PDF
- [ ] Option to post an exported board directly to UniShare as a new post

### Out of Scope

- Flashcard maker — deferred to v2 (builds on canvas foundation)
- Live quiz / Q&A sessions — deferred to v2
- Shared study planner / deadline tracker — deferred to v2
- AI summaries of sessions — deferred to v2 (depends on LLM integration decision)
- Video/audio in rooms — high complexity, out of scope

## Context

- **Existing platform:** NestJS REST API + Next.js App Router frontend, PostgreSQL via Prisma, S3 for files, Better Auth for sessions
- **Pain point observed:** Students share notes on UniShare but switch to Miro/Canva to actually work together, then re-share results back in Discord — a 3-platform context switch
- **Inspiration:** Miro and Canva's collaborative canvas, but purpose-built for study workflows and embedded in the platform students already use for their course materials
- **Guest access rationale:** Study groups include people who may not have UniShare accounts; forcing signup creates friction at the moment of collaboration

## Constraints

- **Tech stack**: Must integrate with existing NestJS + Next.js monorepo — no separate service unless justified
- **Real-time**: Requires WebSocket or equivalent persistent connection infrastructure (not currently in the stack — SSE is one-way)
- **Guest access**: Sessions must work without Better Auth authentication for guests — need a separate identity model for room participants

## Key Decisions

| Decision                     | Rationale                                                                                                              | Outcome   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------- |
| Canvas-first v1              | Ship the real-time experience first; uni-specific tools (flashcards, quizzes) only matter if the canvas actually works | — Pending |
| Rooms as first-class objects | Rooms exist standalone AND attach to posts — more flexible, avoids post dependency                                     | — Pending |
| Guest join via link          | Study groups span people without accounts; friction at join kills adoption                                             | — Pending |

---

_Last updated: 2026-03-20 after initialization_
