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
| `src/modules/chat/chat.controller.ts` | Added `DELETE /chat/rooms/:id/leave` endpoint behind `ChatMemberGuard`, returns `{ roomDeleted: boolean }`                                             |

### Frontend (`apps/web`)

| File                                          | Change                                                                                                                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/chat/chat-header.tsx`             | Rewritten as discriminated union: `mode="dm"` (existing behaviour) and `mode="group"` (group avatar, name, online/offline member counts, responsive)                                                                             |
| `components/chat/create-group-dialog.tsx`     | **New** — shadcn Dialog for creating a group room: group name input, member search by name, multi-select with chip badges, pre-fills name and selects current DM partner when opened from a DM, navigates to new room on success |
| `components/chat/chat-conversation-start.tsx` | **New** — extracted conversation-start banner from `unified-chat-window.tsx`; shows group-specific copy (member count, "Be the first to say something!") for GROUP rooms and existing DM copy otherwise                          |
| `components/chat/chat-info-pane/index.tsx`    | Added functional "Leave group" button in Settings tab (GROUP rooms only) — opens a `ConfirmDialog`, calls leave endpoint, invalidates rooms cache, redirects to `/chat`                                                          |
| `components/chat/unified-chat-window.tsx`     | Added `UsersRound` create-group button next to info-pane toggle; `ChatHeader` now branches on `room.type`; uses `ChatConversationStart` component                                                                                |
| `components/chat/chat-sidebar.tsx`            | Empty GROUP rooms (no messages yet) rendered in Network section so newly created groups appear immediately; uses `useNetworkUsers` hook                                                                                          |
| `hooks/use-chat-mutations.ts`                 | Added `useCreateGroup()` export                                                                                                                                                                                                  |
| `hooks/use-network-users.ts`                  | **New** — shared hook merging followers + following into a deduplicated network list; replaces duplicated logic in `chat-sidebar` and `create-group-dialog`                                                                      |

---

## Decisions made

- **`useNetworkUsers` hook** — followers and following were being merged in two places with identical logic; extracted into one hook with an `enabled` flag so it only fetches when needed (e.g. only when the dialog is open).
- **`useCreateGroup` as a separate export** — same underlying mutation as `useCreateDM` but exported separately for future divergence (group-specific optimistic updates, etc.).
- **No group image upload on create** — `CreateRoomDto` does not include `imageUrl`, so the dialog falls back to initials-based avatar. Can be added once the backend DTO is extended.
- **Leave = delete when last member** — handled in a single Prisma transaction in the repository; Prisma cascade deletes all messages and participants automatically when the room is deleted.
- **Empty groups in Network section** — newly created groups have no messages so they were invisible in the sidebar. They now appear in the Network section and move to Recent Chats once the first message is sent.
- **`ChatConversationStart` component** — the inline start banner was tightly coupled to DM logic; extracting it keeps `unified-chat-window.tsx` clean and makes group-specific copy easy to maintain.

---

## Known limitations / follow-ups

- Group image upload requires adding `imageUrl?: string` to `CreateRoomDto` on the backend.
- "Add member to existing group" is not yet implemented — needs a new backend endpoint (`POST /chat/rooms/:id/participants`) and frontend UI in the info pane Members tab.
- "Delete conversation" in the settings pane is still a placeholder (marked Soon).
- Leave button is only shown for GROUP rooms; DM "leave" is not implemented (would need separate UX consideration since it removes the conversation for the other person too).
