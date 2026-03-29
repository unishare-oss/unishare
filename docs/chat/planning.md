# Chat Feature Planning

## Feature Overview

Implementing a persistent chat system for 1:1 DMs and Group chats. This includes message history with cursor-based pagination for smooth infinite scrolling and real-time updates via Socket.io.

## API Design

### REST Endpoints

- `GET /chat/rooms`: Get list of chat rooms for the current user.
- `GET /chat/rooms/:id`: Get chat room details.
- `GET /chat/rooms/:id/messages`: Get cursor-paginated messages for a room.
- `POST /chat/rooms`: Create a new DM or Group chat.
- `POST /chat/rooms/:id/read`: Mark a room as read.

### Real-time (Socket.io)

- `Namespace: /chat`
- `Event: send-message`: Client sends a message to a room.
- `Event: receive-message`: Server broadcasts message to participants.
- `Event: typing`: Client indicates typing status.
- `Event: user-typing`: Broadcast typing status.

## Data Model (Prisma)

Referencing existing models: `ChatRoom`, `ChatRoomParticipant`, `ChatMessage`.

## Folder Structure

```
apps/api/src/modules/chat/
├── chat.controller.ts
├── chat.module.ts
├── chat.service.ts
├── chat.repository.ts
├── chat.gateway.ts
├── dto/
│   ├── create-room.dto.ts
│   ├── send-message.dto.ts
│   └── list-messages-query.dto.ts
└── entities/
    ├── chat-room.entity.ts
    ├── chat-message.entity.ts
    └── paginated-messages.entity.ts
```

## Trade-offs

- **Cursor Pagination vs Offset:** Cursor is more performant for chat and avoids duplicate/missing items when new messages arrive.
- **WebSocket vs REST for history:** Using REST for history (more cacheable) and WebSocket for real-time delivery.

## Step-by-Step Implementation Plan

1. **Phase 1: Chat Module Setup**
   - Create `chat.module.ts`, `chat.repository.ts`, `chat.service.ts`, and `chat.controller.ts`.
   - Register the module in `app.module.ts`.

2. **Phase 2: Core Repository & Service Logic**
   - Implement `chat.repository.ts` with basic CRUD for rooms, participants, and messages.
   - Use `paginateWithCursor` in `chat.repository.ts` for `findMessages`.

3. **Phase 3: REST Endpoints Implementation**
   - Implement `GET /chat/rooms`.
   - Implement `GET /chat/rooms/:id/messages` with cursor query params.
   - Implement `POST /chat/rooms` (DM and Group logic).

4. **Phase 4: Real-time Gateway Implementation**
   - Create `chat.gateway.ts` with authentication (session-based).
   - Implement `join-room` and `send-message` events.
   - Emit `receive-message` to all participants in the room.

5. **Phase 5: Refinement & Validation**
   - Add "mark as read" logic.
   - Add typing indicators.
   - Basic E2E tests for chat flow.
