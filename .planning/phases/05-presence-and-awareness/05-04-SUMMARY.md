# Phase 05-04 Execution Summary

## Status: COMPLETE

## What was built

- `RemoteCursor.tsx` — SVG arrow cursor + pill name tag per remote participant
- `CursorOverlay.tsx` — absolute overlay (pointer-events:none), subscribes to Excalidraw scroll/zoom for correct repositioning
- `CanvasHeader.tsx` — extended with `ParticipantAvatars` (stacked initials + DropdownMenu listing participants)
- `page.tsx` — wires `onPointerMove` → `emitCursorMove`, renders `CursorOverlay`

## Bugs fixed during human verification

1. **Reconnection presence state** — cleared `remoteCursors`/`participants` on `disconnect`; moved "Reconnected" toast to `room-joined`
2. **413 Payload Too Large** — forced `transports: ['websocket']` + set `maxHttpBufferSize: 100MB`
3. **Browser freeze** — split `CollabContext` into core + presence contexts, both `useMemo`'d
4. **Yjs write storm** — added `versionNonce` fingerprint guard in `handleChange` (tracked against `lastWrittenFingerprintRef`, not `yElements`)
5. **Drawing not syncing** — wrapped `ExcalidrawWrapper` in `React.memo`; lifted `renderTopRightUI` and `UIOptions` to module-level constants to prevent Excalidraw re-renders from CanvasInner's 30fps presence re-renders

## Commits

- `3e4389d` feat(05-04): create RemoteCursor and CursorOverlay components
- `cf94abc` feat(05-04): add ParticipantAvatars to header and wire CursorOverlay
- `886ae86` fix(05): clear presence state on disconnect
- `008e531` fix(05): update payload limit
- `61384de` fix(collab): split context to prevent ExcalidrawWrapper re-renders
- `887d07e` fix(canvas): skip Yjs writes when elements unchanged
- `66e0c00` fix(canvas): memo ExcalidrawWrapper, fix unchanged guard, stable props
