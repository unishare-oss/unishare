# Chat Sidebar UI Improvement - Separators

## Feature Overview

Improve the visual hierarchy of the chat sidebar by adding separators and headers between different sections (Recent Chats vs. Network Users).

## API Design

N/A (Frontend only change)

## Data Model

N/A

## Folder Structure

No changes to folder structure.

## Trade-offs

- Adding more vertical space might reduce the number of visible items, but it improves readability.
- Using `Separator` vs. `border-b`: `Separator` is more semantic and consistent with the design system.

## Step-by-step implementation plan

1.  **Modify `apps/web/components/chat/chat-sidebar.tsx`**:
    - Add a `Separator` before the "New Conversations (Network)" section if there are existing rooms.
    - Add a header for the "Network" section (similar to "Recent Chats").
    - Add subtle bottom borders to chat items for better separation if they appear too crowded.

## Implementation Details

- Use the existing `Separator` component.
- Match the styling of the "Recent Chats" header for consistency.
