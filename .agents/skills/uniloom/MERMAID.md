# Mermaid rules

Uniloom renders diagrams with Mermaid 12 on the website. A diagram that fails to parse
shows as an error box instead of the diagram. Follow these rules for every
` ```mermaid ` block in an item description or a document.

## Node ids

- Use plain ids: letters, digits and `_`. Examples: `api`, `store`, `roomPage`.
- Never use a reserved word as an id: `graph`, `flowchart`, `subgraph`, `end`, `style`,
  `class`, `classDef`, `click`, `default`, `direction`, `linkStyle`.
- Never start an id with `o` or `x` right after `--`. Mermaid reads `A --o B` and
  `A --x B` as arrow heads.

## Labels

- In a flowchart, put a label in double quotes when it has any of these:
  `/ \ : ; , ( ) [ ] { } < > # | + * ? ! & ' →`, a dot or a leading digit. Example:
  `api["GET /api/rooms/:id"]`.
- Quoting is always safe. When in doubt, quote.
- Inside a quoted label, write `#quot;` for `"`. Never put a raw `"` in a label.
- Don't use the parallelogram shape `[/text/]` when the text has `/`. Use
  `["/route: text"]`.
- No Markdown in labels: no backticks, `**` or `_`.
- Edge labels follow the same rule: `A -->|"POST /messages"| B`.

## Sequence diagrams

- **Do not use double quotes in a sequence diagram.** They print literally in participant
  names, messages and `loop`/`alt` titles. Quotes are for flowchart labels only.
- Write a message as `A->>B: text`. It needs the colon.
- Never put `;` in a message or a `Note`. Mermaid reads `;` as the end of a statement.
  Use `,` instead.
- Give a participant with spaces or symbols an alias, without quotes:
  `participant API as api/rooms`.
- Close every `alt`, `opt`, `loop`, `par` and `rect` with `end`.

## Before you save

- Keep a diagram small: one idea, up to about 15 nodes.
- Read it back once against these rules.
- After saving, open the URL the save returns and check the diagram renders.
