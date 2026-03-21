# Chat Collab Mode

## Overview

Chat Collab Mode is a chat-native collaboration feature that combines messaging with a shared visual workspace. Instead of sending users to Discord, Miro, or other external tools, a chat room can enable an integrated board for brainstorming, planning, and idea mapping.

The goal is to keep discussion, visual thinking, and shared context inside the product.

## Problem

Users often discuss ideas in chat but need an external tool for:

- whiteboarding
- mind mapping
- brainstorming
- planning flows
- sharing visual references

That creates a fragmented workflow:

- chat happens in one place
- visual collaboration happens elsewhere
- links get lost
- context is split across products

## Proposal

Add a `Collab Mode` that can be enabled at the chat-room level.

When enabled, the room gets a shared collaborative board that supports:

- `Mind Map` mode for structured idea trees
- `Freeform Board` mode for cards, notes, and spatial layout
- shared realtime editing
- chat-to-board references
- board activity visible inside chat

Users can work in:

- `Chat View`
- `Board View`
- `Split View`

## Product Goals

- Keep collaboration inside the app
- Reduce dependence on external messaging and whiteboard tools
- Preserve context between discussion and visual planning
- Make boards feel like a native part of a chat room
- Support both synchronous and asynchronous collaboration

## Core User Experience

### Room-Level Enablement

A room owner or admin can enable or disable `Collab Mode`.

Once enabled:

- the room gets a board tab
- board access follows room permissions
- users can open the board directly from the chat UI

### Chat and Board Integration

Chat and board should not feel like separate products. The connection should be explicit:

- users can create a board item from a chat message
- users can reference a board node/card inside chat
- users can insert a board snapshot into chat
- board updates can appear as lightweight activity messages
- messages can deep-link to a specific node or board region

### Views

The frontend can support three primary layouts:

- `Chat`: standard messaging view
- `Board`: full board workspace
- `Split`: chat and board side by side

`Split View` is especially useful for live meetings, planning, and study-group coordination.

## MVP Scope

The MVP should stay narrow and avoid trying to match Miro feature-for-feature.

### Included in MVP

- one shared board per chat room
- realtime collaborative editing
- draggable cards or nodes
- connectors or edges between items
- basic mind map support
- basic freeform board support
- board pan and zoom
- presence indicators
- chat references to board items
- room-level permission gating

### Explicitly Out of Scope for MVP

- complex templates
- advanced drawing tools
- sticky note reactions
- rich embeds from many third-party services
- full presentation mode
- export to every external board format
- enterprise-grade moderation workflows

## Suggested Modes

### Mind Map Mode

Best for:

- lecture notes
- project decomposition
- planning trees
- brainstorming with parent-child relationships

Recommended primitives:

- node
- edge
- hierarchy expansion
- quick-add child node

### Freeform Board Mode

Best for:

- rough planning
- idea clustering
- note grouping
- ad hoc workshops

Recommended primitives:

- text card
- colored note/card
- connector
- grouping or frame

## Realtime Collaboration Requirements

To feel useful, the board needs live collaboration.

Minimum requirements:

- live updates when items move or change
- presence indicators for active users
- user cursors or edit state indicators
- low-latency sync for common actions
- conflict-safe update handling

Implementation should favor event or patch-based syncing rather than replacing the entire board document on each update.

## Permissions

Board permissions should inherit from the room by default.

Suggested roles:

- `Owner`
- `Editor`
- `Viewer`

Suggested rules:

- only authorized users can edit
- room owner/admin can enable or disable collab mode
- board sharing should default to room membership, not public access

## Chat-Native Features

These are the features that make the board meaningfully different from just pasting a Miro link:

- attach a board reference to a message
- mention a node/card in conversation
- convert a message into a board item
- insert a board snapshot into chat history
- show recent board edits in the room activity stream
- open the board at the exact referenced item

## High-Level Architecture

## Frontend

Location:

- `apps/web`

Responsibilities:

- board canvas UI
- chat and board split layout
- room-level board controls
- realtime presence rendering
- message-to-board linking UX

Likely building blocks:

- React canvas/graph library for nodes and edges
- shared room state hooks
- WebSocket or realtime subscription client

## Backend

Location:

- `apps/api`

Responsibilities:

- room-level collab mode configuration
- board persistence
- realtime event broadcasting
- permission enforcement
- versioning or snapshot strategy

Likely backend features:

- WebSocket gateway for board events
- board service for CRUD and snapshots
- authorization tied to room membership

## Data Model Direction

Potential entities:

- `chat_rooms`
- `collab_boards`
- `board_nodes`
- `board_edges`
- `board_snapshots`
- `board_events`

Possible relationships:

- one room has one board in MVP
- one board has many nodes
- one board has many edges
- board events capture incremental changes

## Recommended MVP Architecture Choices

To keep complexity under control:

- use one board per room at first
- start with a limited node/card model
- store durable snapshots plus incremental events if needed
- keep permissions aligned with chat room membership
- avoid external board providers for the first version

This keeps the product coherent and avoids dependency on third-party sharing models.

## Rollout Plan

### Phase 1: Internal Spec and Data Model

- define product behavior
- define room-to-board relationship
- define node and edge schema
- define permission rules

### Phase 2: Backend Foundation

- add board entities and persistence
- add room-level collab mode flag
- add realtime event transport
- expose API contracts for board loading and saving

### Phase 3: Frontend MVP

- add board tab to chat room
- add board canvas with nodes and connectors
- add split view
- add basic presence indicators

### Phase 4: Chat Integration

- insert board links into messages
- deep-link to nodes
- convert messages to board items
- show board activity in chat

### Phase 5: Hardening

- improve conflict handling
- add snapshot/version recovery
- add performance tuning for larger boards
- add analytics and usage feedback

## Risks and Tradeoffs

### Scope Creep

If the team tries to build full Miro parity early, delivery will slow down and quality will drop. The first release should focus on a narrow set of collaboration primitives.

### Realtime Complexity

Collaborative editing introduces consistency, latency, and conflict concerns. The sync model should be intentionally simple in the first release.

### UX Complexity

If chat and board are loosely connected, users will treat the board as a side feature instead of a core collaboration workflow. Integration details matter.

### Performance

Large boards with many nodes and frequent updates can become expensive to render and sync. Performance constraints should be considered from the first implementation.

## Open Questions

- Should each room have exactly one board or support multiple boards later?
- Should a board belong only to a room, or also to a higher-level project/workspace object?
- Is realtime multiplayer required in v1, or can some workflows be async-first?
- Should board changes appear in message history by default or only when explicitly shared?
- Do users need board snapshots, board history, or rollback in the first release?
- Should mind map and freeform board be two modes of one board or two different board types?

## Recommendation

This feature is worth pursuing if chat is already the center of collaboration in the product.

The strongest version is:

- room-native
- chat-integrated
- realtime
- simple in scope

The MVP should focus on keeping visual collaboration in the same place as conversation, not on recreating every feature from external whiteboard products.
