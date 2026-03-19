# Feature Landscape

**Domain:** Real-time collaborative canvas — study-focused whiteboard embedded in UniShare
**Researched:** 2026-03-20

---

## Table Stakes

Features users expect from any collaborative canvas. Missing any of these and the product
feels like a prototype, not a tool — users will go back to Miro or a shared Google Doc.

| Feature                                         | Why Expected                                                          | Complexity | Notes                                                                          |
| ----------------------------------------------- | --------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| Infinite canvas (pan/zoom)                      | Every whiteboard since Miro has this; feels broken without it         | Med        | tldraw provides this out of the box                                            |
| Freehand drawing / pen tool                     | The core "whiteboard" verb — sketch, annotate, explain                | Low        | Pressure-sensitive strokes desirable but not required                          |
| Geometric shapes (rect, circle, arrow, line)    | Minimum viable diagram toolset                                        | Low        | Arrows with snap-to-shape are expected                                         |
| Text boxes                                      | Needed for labels, notes, explanations                                | Low        | Rich text (bold, italics, lists) now expected since tldraw ships it by default |
| Sticky notes                                    | Brainstorm primitive — distinct from plain text boxes                 | Low        | Color-coded stickies are standard                                              |
| Select, move, resize, delete objects            | Basic object manipulation                                             | Low        | Multi-select with marquee drag required                                        |
| Undo/redo                                       | Universal expectation across all editing tools                        | Low        | Per-user undo is non-trivial; board-global undo is acceptable                  |
| Live cursor presence                            | See where other participants are in real time                         | Med        | Named cursors with color assignment required; avatar optional                  |
| Participant awareness (who's in the room)       | Users need to know who is collaborating at this moment                | Low        | Avatar list in header — Figma/Miro pattern                                     |
| Real-time sync — edits appear instantly for all | Defining feature of "collaborative" — lag kills trust                 | High       | WebSocket-based; the core infrastructure bet                                   |
| Board persistence (survive everyone leaving)    | Users expect to return to their work                                  | Med        | Stored server-side; session-independent                                        |
| Share via link                                  | Entry point for all participants                                      | Low        | Unique room URL is the join mechanism                                          |
| Guest access (no account required)              | Study groups include people without accounts; friction kills adoption | Med        | Requires ephemeral identity model separate from Better Auth                    |
| Export as image (PNG)                           | Post-session capture for notes/revision guides                        | Low        | tldraw's SVG/PNG export covers this                                            |
| Export as PDF                                   | Students submit or archive; expected alongside image export           | Med        | Multi-page PDFs for large boards need viewport tiling                          |

---

## Differentiators

Features that are NOT expected from a generic whiteboard, but make strong sense specifically
for study workflows on UniShare. These are the features that justify building a custom canvas
instead of just linking out to Miro.

| Feature                                  | Value Proposition                                                                                       | Complexity | Notes                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| Export board → post directly to UniShare | The core "why bother being embedded" payoff — output flows back into the platform's content graph       | Med        | Reuses existing post creation pipeline; needs image/PDF + title metadata |
| Attach room to an existing post          | Students open the relevant notes and start working on them together — context is already there          | Med        | Room ↔ Post foreign key; room link shown on post detail page             |
| Standalone rooms with no post attachment | Study groups form before a post exists; don't force a post wrapper                                      | Low        | Rooms as first-class objects, created directly                           |
| Math/equation input (LaTeX or similar)   | STEM students need to write equations — a blank canvas without math is unusable for calculus or physics | High       | KaTeX or MathJax render; tldraw supports custom shape types              |
| PDF/image drop onto canvas               | Students screenshot or export their lecture slides and annotate directly on the board                   | Med        | Drag-and-drop upload; rendered as image objects on canvas                |
| Pre-built study templates                | "Concept map", "exam prep table", "pros/cons", "timeline" — removes blank canvas paralysis              | Low        | JSON template snapshots; no custom editor needed in v1                   |
| Named rooms tied to course/module        | Rooms discoverable within a course context, not just private links                                      | Med        | Requires room metadata (name, course, visibility) and a browse UI        |
| Session history / who-was-here log       | Students can see who contributed to a session — useful for group work accountability                    | Med        | Tracks authenticated users who joined; not required for guests           |

---

## Anti-Features

Features to deliberately NOT build for a study tool at this stage.

| Anti-Feature                             | Why Avoid                                                                                                                             | What to Do Instead                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Video/audio in rooms                     | Extremely high complexity (WebRTC, media servers, ICE/STUN/TURN), out of scope per PROJECT.md — students use Discord for voice anyway | Let Discord handle voice; focus on async-compatible canvas              |
| AI summarization of sessions             | Depends on an LLM integration decision not yet made; deferred to v2 per PROJECT.md                                                    | Build the export first — humans can summarize their own boards          |
| Flashcard maker inside the canvas        | Entirely separate product surface; building it now means building canvas AND flashcard UI simultaneously                              | Defer to v2; canvas foundation enables it later                         |
| Live Q&A / quiz sessions                 | Deferred per PROJECT.md                                                                                                               | Ship canvas; add quizzing after validation                              |
| Shared study planner / deadline tracker  | Calendar/todo feature, not canvas feature — dilutes product identity                                                                  | Out of scope per PROJECT.md                                             |
| Unlimited board template library         | Template curation is a content problem; a bloated library adds maintenance burden                                                     | Ship 5-8 study-specific templates and iterate                           |
| Version history with per-commit diffs    | Collaborative CRDT history is deeply complex; Miro charges for this as a premium feature                                              | Board-level undo and export-as-snapshot covers 95% of the need          |
| Presentation / slideshow mode            | Boards aren't slides; forcing linear flow fights the tool's nature                                                                    | Students use Google Slides — canvas is for messy thinking               |
| Voting / dot-voting on stickies          | A facilitation feature for corporate workshops, not study sessions                                                                    | Emoji reactions on stickies get 80% of the value with 10% of the effort |
| User-configurable permissions per object | Granular per-object locking adds UI complexity most students won't use                                                                | Room-level permission (viewer vs editor) is sufficient                  |

---

## Feature Dependencies

```
Guest access → Real-time sync
  (Need identity model for guests before WebSocket presence can assign cursors)

Real-time sync → Participant awareness
  (Who's in the room is derived from connection state, not a separate system)

Board persistence → Export (image/PDF)
  (Can only export what's stored; export presupposes server-side board state)

Board persistence → Attach room to post
  (Rooms must exist as persisted entities before they can be FK'd to a post)

Export as image → Export board → post to UniShare
  (The "post to UniShare" flow is: export image/PDF + open post creation modal)

PDF/image drop onto canvas → Math/equation input
  (Both require custom shape type support; foundation is shared)

Named rooms (course context) → Session history / who-was-here log
  (History is only useful if rooms have enough context to be discoverable later)
```

---

## MVP Recommendation

Prioritize in this order:

1. **Real-time sync + infinite canvas + basic shapes** — the skeleton everything else requires
2. **Guest access via link** — without this, study groups can't use the tool frictionlessly
3. **Board persistence** — without this, boards are ephemeral and untrusted
4. **Sticky notes + freehand + text** — the three highest-value drawing primitives
5. **Participant cursors + awareness** — makes it feel like a real collaborative tool
6. **Export as image/PDF** — immediate study value; students capture the board as notes
7. **Export board → post to UniShare** — the product-differentiation payoff

Defer:

- **Math/equation input**: High value for STEM but high complexity; leave a custom shape type slot in the architecture so it can be added cleanly in v2
- **Named rooms with course context**: Ship with standalone+link-only rooms first; room metadata and browse UI is a later milestone
- **Study templates**: Valuable but not blocking; launch with 3-4 templates post-MVP

---

## Sources

- [Miro vs Excalidraw — Miro](https://miro.com/compare/miro-vs-excalidraw/)
- [Excalidraw vs tldraw — OpenAlternative](https://openalternative.co/compare/excalidraw/vs/tldraw)
- [tldraw GitHub](https://github.com/tldraw/tldraw)
- [Best whiteboard software 2026 — ClickUp](https://clickup.com/blog/best-whiteboard-software/)
- [Best collaborative whiteboard — G2](https://www.g2.com/categories/collaborative-whiteboard)
- [Collaborative UX best practices — Ably](https://ably.com/blog/collaborative-ux-best-practices)
- [Whiteboard apps are dead — Allo.io](https://allo.io/blog/whiteboard-apps-are-dead-but-visual-collaboration-thrives-in-the-ai-era)
- [University of Melbourne digital whiteboard comparison guide](https://www.unimelb.edu.au/tli/learning-design-and-assessment/preparing-for-teaching/digital-whiteboard-and-collaboration-tool-comparison-guide)
- [tldraw — what's new March 2025](https://tldraw.dev/blog/product/whats-new-2025)
- [Collaboard — guest access without login](https://www.collaboard.app/online-whiteboard-without-login)
