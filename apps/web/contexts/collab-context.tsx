'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as Y from 'yjs'
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

const CURSOR_THROTTLE_MS = 1000 / 60 // ~16ms, 60fps max
const YJS_EMIT_THROTTLE_MS = 16 // merge rapid drag updates before emitting

export interface Participant {
  socketId: string
  name: string
  colorIndex: number
}

export interface CursorData {
  x: number
  y: number
  name: string
  colorIndex: number
}

// ─── Core context ────────────────────────────────────────────────────────────
// Stable values: Y.Doc, Excalidraw API, connection status.
// ExcalidrawWrapper consumes ONLY this context so it is never re-rendered by
// cursor-move events (which update CollabPresenceContext at 30fps).

interface CollabContextValue {
  ydoc: Y.Doc
  yElementsMap: Y.Map<unknown>
  connectionStatus: ConnectionStatus
  excalidrawAPI: ExcalidrawImperativeAPI | null
  setExcalidrawAPI: (api: ExcalidrawImperativeAPI | null) => void
  initialElements: unknown[] | null
  isAnonymous: boolean
  isViewOnly: boolean
  ownerId: string | null
  userId: string | null
}

// ─── Presence context ────────────────────────────────────────────────────────
// High-frequency values: cursors (30fps), participants, cursor emit.
// Only CursorOverlay, CanvasHeader, and the pointer-move handler consume this.

interface CollabPresenceContextValue {
  remoteCursors: Map<string, CursorData>
  participants: Participant[]
  socketId: string | null
  excalidrawAPI: ExcalidrawImperativeAPI | null
  emitCursorMove: (e: React.PointerEvent<HTMLElement>) => void
}

interface CollabProviderProps {
  slug: string
  isAnonymous: boolean
  isViewOnly: boolean
  ownerId: string | null
  userId: string | null
  onAccessRevoked?: () => void
  children: ReactNode
}

const CollabContext = createContext<CollabContextValue | null>(null)
const CollabPresenceContext = createContext<CollabPresenceContextValue | null>(null)

export function CollabProvider({
  slug,
  isAnonymous,
  isViewOnly: isViewOnlyProp,
  ownerId,
  userId,
  onAccessRevoked,
  children,
}: CollabProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [initialElements, setInitialElements] = useState<unknown[] | null>(null)
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null)
  const [isViewOnly, setIsViewOnly] = useState(isViewOnlyProp)

  const [ydoc] = useState<Y.Doc>(() => new Y.Doc())
  const [yElementsMap] = useState<Y.Map<unknown>>(() => ydoc.getMap('elementsMap'))

  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorData>>(new Map())
  const [participants, setParticipants] = useState<Participant[]>([])
  const [socketId, setSocketId] = useState<string | null>(null)
  const socketRef = useRef<ReturnType<typeof io> | null>(null)
  const lastEmitTimeRef = useRef(0)
  const unmountingRef = useRef(false)
  const kickedRef = useRef(false)
  const onAccessRevokedRef = useRef(onAccessRevoked)
  useEffect(() => {
    onAccessRevokedRef.current = onAccessRevoked
  })

  useEffect(() => {
    unmountingRef.current = false
    const hasJoined = { current: false }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const socket = io(`${apiUrl}/collab`, {
      withCredentials: true,
      autoConnect: false,
      // Force WebSocket transport — avoids HTTP polling 413 errors on large Yjs payloads.
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setSocketId(socket.id ?? null)
      socket.emit('join-room', slug)
    })

    socket.on('room-joined', ({ state }: { slug: string; state: ArrayBuffer }) => {
      const isReconnect = hasJoined.current
      Y.applyUpdate(ydoc, new Uint8Array(state), 'init')
      const elements = [...yElementsMap.values()].filter(Boolean)
      setInitialElements(elements)
      setConnectionStatus('connected')
      hasJoined.current = true
      if (isReconnect) {
        toast.dismiss('collab-status')
        toast.success('Reconnected', { duration: 2000 })
      }
    })

    socket.on('yjs-update', (data: ArrayBuffer) => {
      Y.applyUpdate(ydoc, new Uint8Array(data), 'remote')
    })

    socket.on('participant-list', (list: Participant[]) => {
      setParticipants(list)
      const others = list.filter((p) => p.socketId !== socket.id)
      setRemoteCursors(
        new Map(
          others.map((p) => [p.socketId, { x: 0, y: 0, name: p.name, colorIndex: p.colorIndex }]),
        ),
      )
    })

    socket.on('participant-joined', (p: Participant) => {
      setParticipants((prev) => [...prev, p])
      if (p.socketId !== socket.id) {
        setRemoteCursors((prev) =>
          new Map(prev).set(p.socketId, { x: 0, y: 0, name: p.name, colorIndex: p.colorIndex }),
        )
      }
    })

    socket.on('participant-left', ({ socketId: leftId }: { socketId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.socketId !== leftId))
      setRemoteCursors((prev) => {
        const next = new Map(prev)
        next.delete(leftId)
        return next
      })
    })

    socket.on(
      'cursor-move',
      ({ socketId: cursorId, x, y }: { socketId: string; x: number; y: number }) => {
        setRemoteCursors((prev) => {
          const existing = prev.get(cursorId)
          if (!existing) return prev
          return new Map(prev).set(cursorId, { ...existing, x, y })
        })
      },
    )

    socket.on(
      'room-settings-changed',
      ({ isViewOnly: newIsViewOnly }: { visibility: string; isViewOnly: boolean }) => {
        setIsViewOnly(newIsViewOnly)
      },
    )

    socket.on('room-access-revoked', () => {
      kickedRef.current = true
      toast.dismiss('collab-status')
      onAccessRevokedRef.current?.()
    })

    socket.on('disconnect', () => {
      if (unmountingRef.current || kickedRef.current) return
      setConnectionStatus('disconnected')
      setParticipants([])
      setRemoteCursors(new Map())
      toast.error('Connection lost — reconnecting...', { id: 'collab-status', duration: Infinity })
    })

    let pendingUpdates: Uint8Array[] = []
    let emitTimer: ReturnType<typeof setTimeout> | null = null

    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'init') return
      pendingUpdates.push(update)
      if (!emitTimer) {
        emitTimer = setTimeout(() => {
          const merged =
            pendingUpdates.length === 1 ? pendingUpdates[0] : Y.mergeUpdates(pendingUpdates)
          socket.emit('yjs-update', merged)
          pendingUpdates = []
          emitTimer = null
        }, YJS_EMIT_THROTTLE_MS)
      }
    })

    socket.connect()

    return () => {
      unmountingRef.current = true
      // Flush any buffered Yjs updates before disconnecting so that an in-progress
      // drawing is synced to the server. Without this, navigating away mid-stroke
      // cancels the 16ms timer and leaves other users with a permanent "dot".
      if (emitTimer) clearTimeout(emitTimer)
      if (pendingUpdates.length > 0 && socket.connected) {
        const merged =
          pendingUpdates.length === 1 ? pendingUpdates[0] : Y.mergeUpdates(pendingUpdates)
        socket.emit('yjs-update', merged)
      }
      socketRef.current = null
      setSocketId(null)
      setParticipants([])
      setRemoteCursors(new Map())
      toast.dismiss('collab-status')
      socket.disconnect()
      ydoc.destroy()
    }
  }, [slug, ydoc, yElementsMap])

  const emitCursorMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const now = Date.now()
      if (now - lastEmitTimeRef.current < CURSOR_THROTTLE_MS) return
      lastEmitTimeRef.current = now

      const appState = excalidrawAPI?.getAppState()
      if (!appState || !socketRef.current) return

      const { scrollX, scrollY, zoom, offsetLeft, offsetTop } = appState
      const sceneX = (e.clientX - offsetLeft) / zoom.value - scrollX
      const sceneY = (e.clientY - offsetTop) / zoom.value - scrollY

      socketRef.current.emit('cursor-move', { x: sceneX, y: sceneY })
    },
    [excalidrawAPI],
  )

  // Core value: stable fields only. useMemo ensures ExcalidrawWrapper's context
  // subscription never triggers from presence updates.
  const coreValue = useMemo<CollabContextValue>(
    () => ({
      ydoc,
      yElementsMap,
      connectionStatus,
      excalidrawAPI,
      setExcalidrawAPI,
      initialElements,
      isAnonymous,
      isViewOnly,
      ownerId,
      userId,
    }),
    [
      ydoc,
      yElementsMap,
      connectionStatus,
      excalidrawAPI,
      setExcalidrawAPI,
      initialElements,
      isAnonymous,
      isViewOnly,
      ownerId,
      userId,
    ],
  )

  // Presence value: high-frequency fields. CursorOverlay and CanvasHeader only.
  const presenceValue = useMemo<CollabPresenceContextValue>(
    () => ({ remoteCursors, participants, socketId, excalidrawAPI, emitCursorMove }),
    [remoteCursors, participants, socketId, excalidrawAPI, emitCursorMove],
  )

  return (
    <CollabContext value={coreValue}>
      <CollabPresenceContext value={presenceValue}>{children}</CollabPresenceContext>
    </CollabContext>
  )
}

/** Core collab state: Y.Doc, connection, Excalidraw API. Used by ExcalidrawWrapper. */
export function useCollab() {
  const context = useContext(CollabContext)
  if (!context) throw new Error('useCollab must be used within a CollabProvider')
  return context
}

/** Presence state: cursors, participants, cursor emit. Used by CursorOverlay, CanvasHeader, page. */
export function useCollabPresence() {
  const context = useContext(CollabPresenceContext)
  if (!context) throw new Error('useCollabPresence must be used within a CollabProvider')
  return context
}
