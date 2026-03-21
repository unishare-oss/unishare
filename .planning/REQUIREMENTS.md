# Requirements: UniShare Collaborative Canvas

**Defined:** 2026-03-20
**Core Value:** Multiple students can open a shared canvas and collaborate in real-time, inside UniShare — no platform switching, no re-sharing files across tools.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Canvas

- [x] **CANV-01**: User can pan and zoom an infinite canvas
- [x] **CANV-02**: User can draw freehand strokes on the canvas
- [x] **CANV-03**: User can add and edit geometric shapes (rectangle, circle, arrow, line)
- [x] **CANV-04**: User can add and edit text boxes on the canvas
- [x] **CANV-05**: User can add color-coded sticky notes to the canvas
- [x] **CANV-06**: User can select, move, resize, and delete canvas objects
- [x] **CANV-07**: User can undo and redo canvas actions

### Collaboration

- [x] **COLB-01**: Multiple users can edit the same canvas simultaneously with changes appearing in real-time for all participants
- [x] **COLB-02**: Users can see live named cursors of other participants (color-coded)
- [x] **COLB-03**: Users can see a list of who is currently in the room
- [x] **COLB-04**: Anyone with the room link can join without creating a UniShare account (guest access)

### Rooms

- [x] **ROOM-01**: Authenticated users can create a standalone collaboration room
- [x] **ROOM-02**: Each room has a unique shareable link
- [x] **ROOM-03**: Board state persists after all participants leave — room can be rejoined later
- [x] **ROOM-04**: User can export the board as a PNG image

### Export & Integration

- [x] **EXPO-01**: User can export the board as a PDF
- [x] **EXPO-02**: User can post an exported board directly to UniShare as a new post (image/PDF + title)

### Access Control

- [x] **SHARE-01**: Room owner can set room visibility to public (view-only for anyone with the link) or private (edit-only, current behaviour)
- [x] **SHARE-02**: A view-only link allows anyone to see the live board state without drawing or modifying it
- [x] **SHARE-03**: Room owner can revoke or regenerate the view-only link at any time

### Canvas Hub

- [x] **HUB-01**: Authenticated user can see a list of their owned boards on /boards
- [ ] **HUB-02**: User can create a new board from the boards page via a modal dialog
- [x] **HUB-03**: User can delete, rename, and change visibility of boards from the boards page
- [ ] **HUB-04**: Boards page is accessible from sidebar nav and mobile nav
- [ ] **HUB-05**: Empty state with hero illustration shown when user has no boards

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Room Context

- **ROOM-V2-01**: User can attach a collaboration room to an existing UniShare post (room link shown on post detail page)
- **ROOM-V2-02**: Rooms can be named and tied to a department/course, browsable within a course context

### Advanced Canvas

- **CANV-V2-01**: User can input math equations (LaTeX) rendered on the canvas
- **CANV-V2-02**: User can drag and drop PDF/image files onto the canvas for annotation
- **CANV-V2-03**: User can start from a pre-built study template (concept map, exam prep table, pros/cons, timeline)

### Session Intelligence

- **SESS-V2-01**: Users can see a history of who contributed to a session (authenticated users)
- **SESS-V2-02**: AI-generated summary of session exported as shareable notes

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                               | Reason                                                                            |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| Video/audio in rooms                  | Extremely high complexity (WebRTC, media servers); students use Discord for voice |
| Live quiz / Q&A sessions              | Separate product surface; deferred per PROJECT.md                                 |
| Shared study planner                  | Calendar/todo feature, not canvas feature — dilutes product identity              |
| Version history with per-commit diffs | CRDT history is deeply complex; Miro charges for this as a premium feature        |
| Presentation/slideshow mode           | Boards aren't slides; fights the tool's nature                                    |
| Voting / dot-voting on stickies       | Corporate facilitation feature; emoji reactions cover study needs                 |
| Per-object locking permissions        | Room-level permissions (viewer vs editor) are sufficient                          |
| Mobile native app                     | Web-first; canvas interaction on mobile is a separate UX investment               |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status   |
| ----------- | ----- | -------- |
| CANV-01     | 4     | Complete |
| CANV-02     | 4     | Complete |
| CANV-03     | 4     | Complete |
| CANV-04     | 4     | Complete |
| CANV-05     | 4     | Complete |
| CANV-06     | 4     | Complete |
| CANV-07     | 4     | Complete |
| COLB-01     | 3     | Complete |
| COLB-02     | 5     | Complete |
| COLB-03     | 5     | Complete |
| COLB-04     | 2     | Complete |
| ROOM-01     | 1     | Complete |
| ROOM-02     | 1     | Complete |
| ROOM-03     | 1, 6  | Complete |
| ROOM-04     | 6     | Complete |
| EXPO-01     | 6     | Complete |
| EXPO-02     | 6     | Complete |
| SHARE-01    | 7     | Complete |
| SHARE-02    | 7     | Complete |
| SHARE-03    | 7     | Complete |
| HUB-01      | 8     | Planned  |
| HUB-02      | 8     | Planned  |
| HUB-03      | 8     | Planned  |
| HUB-04      | 8     | Planned  |
| HUB-05      | 8     | Planned  |

**Coverage:**

- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---

_Requirements defined: 2026-03-20_
_Last updated: 2026-03-21 after Phase 8 planning_
