# Board E2E encryption + persisted images

## Problem

Pasting an image onto an Excalidraw board shows it immediately but it's gone on reload. Root
cause: `ExcalidrawWrapper`'s `onChange` only reads the `elements` argument
(`apps/web/src/components/canvas/excalidraw-wrapper.tsx:79-84`) — Excalidraw's binary file data
(the `files: BinaryFiles` map, keyed by `fileId`, holding each pasted image's `dataURL`) is never
captured. Only `elements` are synced over the collab socket
(`apps/web/contexts/collab-context.tsx:119`) and only `elements` are persisted server-side
(`collab.gateway.ts:165-178`, `collab.room.service.ts`). An image element's `fileId` reference
survives a reload; the binary it points to never existed outside that one browser tab.

While fixing this, the user wants board content end-to-end encrypted, matching the trust model
already established for chat (`User.publicKey`/`keyBackup` are opaque blobs; server never sees
plaintext — see root CLAUDE.md "End-to-end encrypted chat"). This doc covers both together since
the image-persistence fix and the encryption layer touch the same wire format.

## Key distribution model (this is the load-bearing decision)

Chat's E2E model wraps a per-room AES key individually for each `ChatParticipant` using ECDH
(`encryptRoomKey`/`decryptRoomKey` in `apps/web/src/lib/crypto.ts`). That requires a table of
known participants with public keys. **Boards have no such table** — `Room` has only `ownerId`
and an optional `passwordHash`.
Even `PRIVATE` visibility just means "any signed-in user with the slug," not an invite list.

So per-participant wrapping isn't available for any room visibility tier. Instead, boards follow
the same model Excalidraw's own hosted app uses: **a random symmetric AES-256-GCM key that never
touches the server, carried in the URL fragment** (`/canvas/{slug}#key=<base64>`). Browsers never
send the fragment in HTTP requests, so the server (and anyone who only sees the room slug) never
sees the key. Anyone with the full link can read/write; anyone without the fragment can join the
live session (if visibility allows) but sees nothing decryptable.

(`Room` model reference: `apps/api/prisma/schema.prisma:412-426`.)

Confirmed with the user:

- **Password stays separate from the encryption key.** `passwordHash` remains a pure server-side
  join gate (bcrypt-checked, unchanged). The content key is always the independent fragment key.
  This means changing/removing a room's password never breaks decryption of existing content.
- **No forced migration for existing rooms.** Add `Room.encrypted Boolean @default(false)`.
  Existing rows stay `false` and keep working exactly as today (plaintext elements, no fragment
  key expected). Only newly-created rooms are `encrypted: true`. The client checks this flag
  (returned on `room-joined` / `RoomEntity`) to decide whether to attempt decryption at all.

## What's encrypted, and what stays plaintext

The server's `collab.room.service.ts` does its own version-based last-write-wins merge
(`mergeElements`, keyed on `el.id`/`el.version`) so late joiners get a correctly merged snapshot
without replaying every historical delta. Fully encrypting each element as one opaque blob (like
Excalidraw's own socket-payload encryption) would break that — the server couldn't merge blobs it
can't compare. Instead, **hybrid field-level encryption**, per element:

```
// wire shape for an encrypted room
{ id, version, versionNonce, type, encryptedPayload: base64(iv + AES-GCM(rest-of-element-json)) }
```

`id`/`version`/`type` stay plaintext — that's all `mergeElements` and the client's
`reconcileElements` (`excalidraw-wrapper.tsx:95-99`) touch. Everything else (geometry, text
content, styling, bindings) goes inside `encryptedPayload`. Server-side merge logic in
`collab.room.service.ts` needs zero changes.

Images: the pasted file's bytes are AES-GCM-encrypted client-side before upload, so S3 only ever
holds ciphertext. `fileId` and `mimeType` stay plaintext metadata (same minor leakage profile as
chat, which reveals message existence/timestamps but not content) — needed so a client knows what
it's fetching before it can decrypt it.

## Storage path

Per the earlier discussion: board images are room-scoped, not user-scoped (rooms allow anonymous
authors via Better Auth's `anonymous` plugin — see `collab.gateway.ts:107-112` — and a room's
assets need to be deletable as a unit).

- New `purpose: 'board-attachment'` in `presigned-upload.dto.ts`, folder `boards/{roomSlug}`
  instead of `boards/{userId}`. Requires a `roomSlug` field on `PresignedUploadDto` and changing
  `getFolderForPurpose` to accept a scope key that isn't always `session.user.id`.
- New `uploadType: 'encrypted-blob'` in `storage.service.ts`'s `FILE_TYPE_CONFIG`. The existing
  `image` bucket validates `mimeType` against `['image/jpeg','image/png','image/webp']` — once
  encrypted, the object is opaque bytes, not a real image, so the real MIME type is irrelevant to
  what's uploaded (store it as `application/octet-stream` with just a size cap, e.g. 10MB).
- **New authorization check that doesn't exist today**: `storage.controller.ts` currently mints a
  presigned URL for any session with no ownership/membership check. For `board-attachment`, add a
  check that the caller can actually edit that room (same rule already enforced in the gateway:
  not `PRIVATE`+anonymous, not `VIEW_ONLY`+anonymous). Expose this as a small shared method (e.g.
  `CollabService.assertCanEdit(slug, session)`) so the gateway's `handleJoinRoom` and the storage
  controller don't duplicate the visibility logic.
- Deleting a room (`CollabService.deleteRoom`, `collab.service.ts:51-57`) currently only deletes
  the DB row. Add an S3 prefix delete (`ListObjectsV2` + `DeleteObjects` on `boards/{slug}/`) —
  no new DB table needed to track per-room files, since they all live under one prefix.

## Persisting the file manifest

`Room.snapshot` currently stores `JSON.stringify(elements)` as raw bytes
(`collab.room.service.ts:113-124`). Change the shape to `{ elements, files }` where `files` is
`[{ fileId, key, mimeType }]`. Parse defensively so legacy snapshots
(`Array.isArray(parsed) ? { elements: parsed, files: [] } : parsed`) keep loading unchanged.
`RoomEntry` in-memory gets a parallel `files: Map<fileId, FileMeta>`, mutated by a new
`registerFile()` method alongside the existing `mergeElements()`.

## New realtime event

`file-added` — client broadcasts `{ fileId, key, mimeType }` (never the bytes) after a successful
S3 upload. Gated by the same `client.data.isViewOnly` check already used for `scene-update`
(`collab.gateway.ts:170`). `room-joined` payload grows a `files` array alongside `elements` so a
newly-joining client can fetch+decrypt each image from S3 before/while Excalidraw hydrates.

## Files touched

**Schema / migration**

- `apps/api/prisma/schema.prisma` — `Room.encrypted Boolean @default(false)`

**Backend**

- `apps/api/src/modules/storage/dto/presigned-upload.dto.ts` — `board-attachment` purpose, room-scoped folder, `roomSlug` field
- `apps/api/src/modules/storage/storage.service.ts` — `encrypted-blob` upload type, S3 prefix delete helper
- `apps/api/src/modules/storage/storage.controller.ts` — room-edit-access check before minting board-attachment URLs
- `apps/api/src/modules/collab/collab.service.ts` — `assertCanEdit`, wire prefix delete into `deleteRoom`, set `encrypted: true` on create
- `apps/api/src/modules/collab/collab.gateway.ts` — `file-added` event, `files` in `room-joined`
- `apps/api/src/modules/collab/collab.room.service.ts` — `files` map on `RoomEntry`, `registerFile()`, snapshot shape change
- `apps/api/src/modules/collab/dto/create-room.dto.ts` — no change expected (encrypted flag is server-set, not client-supplied)
- `apps/api/src/modules/collab/entities/room.entity.ts` — expose `encrypted`

**Frontend**

- `apps/web/src/lib/crypto.ts` — raw-bytes encrypt/decrypt (images use ArrayBuffers, not strings like `encryptMessage`/`decryptMessage`), room-key raw export/import for the URL fragment
- `apps/web/contexts/collab-context.tsx` — hold the room key (from fragment or newly generated), encrypt before `emitSceneUpdate`, decrypt in `scene-update`/`room-joined` handlers, expose key + `encrypted` state
- `apps/web/src/components/canvas/excalidraw-wrapper.tsx` — capture `files` from `onChange`, track not-yet-uploaded fileIds (debounced, mirroring Excalidraw's own `FileManager` dirty-tracking), encrypt+upload new ones, `addFiles()` to hydrate on load
- `apps/web/components/boards/create-room-dialog.tsx` — generate room key on submit, navigate to `/canvas/{slug}#key=...`
- `apps/web/src/components/canvas/canvas-header.tsx` — include fragment when copying the share link
- `apps/web/components/boards/share-to-chat-popover.tsx`, `apps/web/components/boards/room-card.tsx` — same, wherever a room URL is built for sharing
- A small UX affordance for opening an encrypted room's `/canvas/{slug}` URL with no `#key` (e.g. pasted without the fragment) — show "you need the full link" instead of silently failing to decrypt

## Sequencing

1. Storage path + auth check + `encrypted-blob` upload type (backend, independent of crypto)
2. Room schema flag + snapshot shape change + `file-added` event (backend)
3. Crypto primitives (raw-bytes encrypt/decrypt, fragment key export/import)
4. Wire encryption into `collab-context.tsx` (elements) and `excalidraw-wrapper.tsx` (files/images)
5. Share-link fragment propagation across the three UI touchpoints
6. Manual verification: paste image → reload → still visible; open link without fragment → blocked; two-tab live collab still reconciles correctly; legacy (pre-flag) room still loads
