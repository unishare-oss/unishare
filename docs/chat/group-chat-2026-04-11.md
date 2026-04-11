# Group Chat Feature — 2026-04-11

## What was implemented

Full group chat support across the frontend and a leave-room endpoint on the backend. No schema changes were required — the `ChatRoom` model already had `type`, `name`, `imageUrl`, and `GROUP` enum value.

---

## Files changed

### Backend (`apps/api`)

| File                                  | Change                                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/modules/chat/chat.repository.ts` | Added `removeParticipant(roomId, userId)` — removes participant in a transaction; deletes the room if no members remain (cascade removes all messages) |
| `src/modules/chat/chat.service.ts`    | Added `leaveRoom(roomId, userId)` — verifies membership then delegates to repository                                                                   |
| `src/modules/chat/chat.controller.ts` | Added `DELETE /chat/rooms/:id/leave` behind `ChatMemberGuard`, returns `{ roomDeleted: boolean }`                                                      |

### Frontend (`apps/web`)

| File                                          | Change                                                                                                                                                                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/chat/chat-header.tsx`             | Rewritten as discriminated union: `mode="dm"` (existing behaviour) and `mode="group"` (group avatar, name, online/offline member counts, responsive)                                                                                                           |
| `components/chat/create-group-dialog.tsx`     | **New** — shadcn Dialog: group name input, member search by name, multi-select with chip badges, pre-fills name and selects current DM partner when opened from a DM, scrollable user list (`max-h-[260px] overflow-y-auto`), navigates to new room on success |
| `components/chat/chat-conversation-start.tsx` | **New** — extracted conversation-start banner; shows group-specific copy (member count, "Be the first to say something!") for GROUP rooms, DM copy otherwise                                                                                                   |
| `components/chat/chat-info-pane/index.tsx`    | Added functional "Leave group" button in Settings tab (GROUP rooms only) — `ConfirmDialog` with `isPending` wired, calls leave endpoint, invalidates rooms, redirects to `/chat`                                                                               |
| `components/chat/unified-chat-window.tsx`     | Added `UsersRound` create-group button next to info-pane toggle; `ChatHeader` branches on `room.type`; uses `ChatConversationStart`                                                                                                                            |
| `components/chat/chat-sidebar.tsx`            | Empty GROUP rooms rendered in Network section immediately after creation; move to Recent Chats on first message; uses `useNetworkUsers` hook                                                                                                                   |
| `components/shared/confirm-dialog.tsx`        | `isPending` state now shows `Loader2` spinner + "Deleting…" instead of plain text — applies to all confirm dialogs across the app                                                                                                                              |
| `hooks/use-chat-mutations.ts`                 | Added `useCreateGroup()` export                                                                                                                                                                                                                                |
| `hooks/use-network-users.ts`                  | **New** — shared hook merging followers + following into a deduplicated network list with an `enabled` flag; replaces duplicated logic in `chat-sidebar` and `create-group-dialog`                                                                             |

---

## Decisions made

- **`useNetworkUsers` hook** — followers and following were being merged with identical logic in two places; extracted into one hook so both consumers stay in sync.
- **`useCreateGroup` as a separate export** — same underlying mutation as `useCreateDM` but exported separately for future divergence (group-specific optimistic updates, etc.).
- **No group image upload on create** — `CreateRoomDto` does not include `imageUrl`, so the dialog falls back to initials-based avatar. Can be added once the backend DTO is extended.
- **Leave = delete when last member** — handled in a single Prisma transaction; cascade deletes all messages and participants automatically.
- **Empty groups in Network section** — newly created groups had no messages and were invisible in the sidebar. They now show in Network and move to Recent Chats once the first message is sent.
- **`ChatConversationStart` component** — the inline start banner was tightly coupled to DM logic; extracting it keeps `unified-chat-window.tsx` clean and makes group-specific copy easy to maintain.
- **Scrollable user list via native scroll** — nested Radix `ScrollArea` inside a `DialogContent` (which uses `display: grid`) caused conflicts; switched to `overflow-y-auto` directly on the list div.
- **`ConfirmDialog` spinner** — updated the shared component so all confirm dialogs across the app get the animation for free; no per-callsite changes needed.

---

## Known limitations / follow-ups

- Group image upload requires adding `imageUrl?: string` to `CreateRoomDto` on the backend.
- "Add member to existing group" not yet implemented — needs `POST /chat/rooms/:id/participants` endpoint and frontend UI in the info pane Members tab.
- "Delete conversation" in the settings pane is still a placeholder (marked Soon).
- Leave button is only shown for GROUP rooms; DM leave is not implemented (removing a DM affects the other participant too — needs separate UX consideration).
