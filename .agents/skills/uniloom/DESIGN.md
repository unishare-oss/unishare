# Writing a slice design

A slice's design is a `SPEC` document created from the slice (`save_document` with
`ticket`, and `sourceProposalId` for the feature's proposal). It comes after the
`PROPOSAL`: the proposal weighs the options, the SPEC builds the chosen one and does not
re-argue it. It says how the slice will be built, so the reviewer understands every function
before it exists. They read it on the website and move the slice to Ready when they agree.

## Sections

Use the SPEC headings, in order:

1. **Overview**: what the slice adds, in two or three sentences. Link the ADRs it follows
   (`follows ADR-3`).
2. **Behaviour**: the functions table, then the flows.
3. **Edge cases**: one `condition → result` per bullet, such as
   `Empty message → 400 invalid_input`.
4. **Acceptance**: the tests that prove it, one scenario per bullet with its result. They
   line up with the done-when items.

## Functions

One row per meaningful function:

| Function                                       | File                                             | What                                    | Why                                          |
| ---------------------------------------------- | ------------------------------------------------ | --------------------------------------- | -------------------------------------------- |
| `post_message(room_id, user, body) -> Message` | `apps/api/app/rooms.py`                          | Saves a message if the user is a member | Done-when 1: members can post to a room      |
| `MessageList`                                  | `apps/web/src/components/rooms/message-list.tsx` | Shows a room's messages, newest last    | The room page needs to show the conversation |

- **List only meaningful functions:** routes, exported functions, services, guards,
  components with logic. Not small private helpers.
- **Name and signature** as they will be written, in the project's language.
- **File**: the real path. Don't invent paths you are unsure of; read the code first.
- **What**: one line, what it does, not how.
- **Why**: which done-when item, rule or flow step needs it. "Needed for the feature" is
  not a reason.
- At least one function and one flow.

## Flows

Mermaid diagrams of how the functions, routes and services call each other. Follow
[MERMAID.md](MERMAID.md).

- **Sequence diagram** when the order of calls across parts matters: browser → API →
  service → database, and back.
- **Flowchart** for a decision: the checks a request passes and what each failure
  answers.
- One idea per diagram, up to about 15 nodes. Two small diagrams beat one big one.

## Changing a design

- Before Ready: update the SPEC with `save_document` and its `id`.
- After Ready: update it only with the user's agreement, and tell them it changed, so they
  can read it again.
- If the build drifts from the design, record it in the REFERENCE change document at the
  end (planned vs actual). Don't rewrite the SPEC to match what was built.
