# Chat Message Edit & Delete Planning

## Feature Overview

Allow users to edit and delete their own messages in chat rooms. Real-time updates will be handled via Socket.io events.

## API Design

### REST Endpoints

- `PATCH /chat/messages/:id`: Edit a message content. Only the author can edit.
- `DELETE /chat/messages/:id`: Delete a message. Only the author can delete.

### Real-time (Socket.io)

- `Event: message-updated`: Server broadcasts updated message to room participants.
- `Event: message-deleted`: Server broadcasts message deletion to room participants.

## Data Model (Prisma)

No changes required to `ChatMessage` model in `schema.prisma` as we are using hard deletes.

## Step-by-Step Implementation Plan

### Phase 1: Repository

1. Update `ChatRepository`:
   - `updateMessage(id: string, data: UpdateMessageDto)`
   - `deleteMessage(id: string)` (Hard delete using `prisma.chatMessage.delete`)
   - `findMessageById(id: string)` to help with authorship verification.

### Phase 2: DTOs & Entities

1. Create `UpdateMessageDto` in `apps/api/src/modules/chat/dto/update-message.dto.ts`.

### Phase 3: Service Logic

1. Implement `editMessage(id: string, userId: string, data: UpdateMessageDto)` in `ChatService`.
   - Verify authorship.
   - Update via repository.
   - Emit `chat.message_updated` event.
2. Implement `deleteMessage(id: string, userId: string)` in `ChatService`.
   - Verify authorship.
   - Delete via repository.
   - Emit `chat.message_deleted` event.

### Phase 4: Gateway (Real-time)

1. Listen for `chat.message_updated` and `chat.message_deleted` events in `ChatGateway`.
2. Broadcast to the room using `this.server.to(roomId).emit(...)`.

### Phase 5: Controller

1. Add `PATCH /chat/messages/:id` endpoint.
2. Add `DELETE /chat/messages/:id` endpoint.

## Validation

- Unit tests for `ChatService`.
- Manual verification with Socket.io.
