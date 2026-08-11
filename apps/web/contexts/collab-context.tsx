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
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

const CURSOR_THROTTLE_MS = 1000 / 60
const SCENE_EMIT_THROTTLE_MS = 16

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

interface CollabContextValue {
  connectionStatus: ConnectionStatus
  excalidrawAPI: ExcalidrawImperativeAPI | null
  setExcalidrawAPI: (api: ExcalidrawImperativeAPI | null) => void
  initialElements: ExcalidrawElement[] | null
  isAnonymous: boolean
  isViewOnly: boolean
  ownerId: string | null
  userId: string | null
  broadcastedVersionsRef: React.MutableRefObject<Map<string, number>>
  emitSceneUpdate: (elements: readonly ExcalidrawElement[]) => void
  registerRemoteHandler: (handler: ((elements: ExcalidrawElement[]) => void) | null) => void
}

// ─── Presence context ────────────────────────────────────────────────────────

interface CollabPresenceContextValue {
  remoteCursors: Map<string, CursorData>
  participants: Participant[]
  socketId: string | null
  excalidrawAPI: ExcalidrawImperativeAPI | null
  emitCursorMove: (e: React.PointerEvent<HTMLElement>) => void
}

function isRenderableElement(element: unknown): element is ExcalidrawElement {
  if (!element || typeof element !== 'object') return false
  const candidate = element as Record<string, unknown>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.type !== 'string' ||
    typeof candidate.x !== 'number' ||
    typeof candidate.y !== 'number' ||
    typeof candidate.width !== 'number' ||
    typeof candidate.height !== 'number' ||
    typeof candidate.version !== 'number' ||
    !Array.isArray(candidate.groupIds)
  ) {
    return false
  }
  return (
    (candidate.type !== 'arrow' && candidate.type !== 'line') || Array.isArray(candidate.points)
  )
}

function renderableElements(elements: unknown[]): ExcalidrawElement[] {
  return elements.filter(isRenderableElement)
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
  const [initialElements, setInitialElements] = useState<ExcalidrawElement[] | null>(null)
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null)
  const [isViewOnly, setIsViewOnly] = useState(isViewOnlyProp)

  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorData>>(new Map())
  const [participants, setParticipants] = useState<Participant[]>([])
  const [socketId, setSocketId] = useState<string | null>(null)

  const socketRef = useRef<ReturnType<typeof io> | null>(null)
  const lastCursorEmitRef = useRef(0)
  const unmountingRef = useRef(false)
  const kickedRef = useRef(false)
  const onAccessRevokedRef = useRef(onAccessRevoked)
  useEffect(() => {
    onAccessRevokedRef.current = onAccessRevoked
  })

  // Tracks the version of each element we've last broadcast so we only send diffs.
  const broadcastedVersionsRef = useRef<Map<string, number>>(new Map())

  // Registered callback from ExcalidrawWrapper to handle incoming remote elements.
  const remoteHandlerRef = useRef<((elements: ExcalidrawElement[]) => void) | null>(null)

  // Pending elements accumulated between throttle ticks.
  const pendingElementsRef = useRef<Map<string, ExcalidrawElement>>(new Map())
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const registerRemoteHandler = useCallback(
    (handler: ((elements: ExcalidrawElement[]) => void) | null) => {
      remoteHandlerRef.current = handler
    },
    [],
  )

  const emitSceneUpdate = useCallback((elements: readonly ExcalidrawElement[]) => {
    const toSend = elements.filter((el) => {
      const lastVersion = broadcastedVersionsRef.current.get(el.id) ?? -1
      return el.version > lastVersion
    })
    if (toSend.length === 0) return

    for (const el of toSend) {
      broadcastedVersionsRef.current.set(el.id, el.version)
      pendingElementsRef.current.set(el.id, el)
    }

    if (!emitTimerRef.current) {
      emitTimerRef.current = setTimeout(() => {
        const batch = [...pendingElementsRef.current.values()]
        socketRef.current?.emit('scene-update', batch)
        pendingElementsRef.current.clear()
        emitTimerRef.current = null
      }, SCENE_EMIT_THROTTLE_MS)
    }
  }, [])

  useEffect(() => {
    unmountingRef.current = false
    const pendingElements = pendingElementsRef.current

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const socket = io(`${apiUrl}/collab`, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setSocketId(socket.id ?? null)
      socket.emit('join-room', slug)
    })

    socket.on('room-joined', ({ elements }: { slug: string; elements: ExcalidrawElement[] }) => {
      const validElements = renderableElements(elements)
      const isReconnect = broadcastedVersionsRef.current.size > 0
      setInitialElements(validElements)
      broadcastedVersionsRef.current = new Map(validElements.map((el) => [el.id, el.version]))
      setConnectionStatus('connected')
      if (isReconnect) {
        toast.dismiss('collab-status')
        toast.success('Reconnected', { duration: 2000 })
      }
    })

    socket.on('scene-update', (elements: ExcalidrawElement[]) => {
      remoteHandlerRef.current?.(renderableElements(elements))
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

    socket.connect()

    return () => {
      unmountingRef.current = true
      if (emitTimerRef.current) {
        clearTimeout(emitTimerRef.current)
        const batch = [...pendingElements.values()]
        if (batch.length > 0 && socket.connected) {
          socket.emit('scene-update', batch)
        }
        pendingElements.clear()
        emitTimerRef.current = null
      }
      socketRef.current = null
      setSocketId(null)
      setParticipants([])
      setRemoteCursors(new Map())
      toast.dismiss('collab-status')
      socket.disconnect()
    }
  }, [slug])

  const emitCursorMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const now = Date.now()
      if (now - lastCursorEmitRef.current < CURSOR_THROTTLE_MS) return
      lastCursorEmitRef.current = now

      const appState = excalidrawAPI?.getAppState()
      if (!appState || !socketRef.current) return

      const { scrollX, scrollY, zoom, offsetLeft, offsetTop } = appState
      const sceneX = (e.clientX - offsetLeft) / zoom.value - scrollX
      const sceneY = (e.clientY - offsetTop) / zoom.value - scrollY

      socketRef.current.emit('cursor-move', { x: sceneX, y: sceneY })
    },
    [excalidrawAPI],
  )

  const coreValue = useMemo<CollabContextValue>(
    () => ({
      connectionStatus,
      excalidrawAPI,
      setExcalidrawAPI,
      initialElements,
      isAnonymous,
      isViewOnly,
      ownerId,
      userId,
      broadcastedVersionsRef,
      emitSceneUpdate,
      registerRemoteHandler,
    }),
    [
      connectionStatus,
      excalidrawAPI,
      setExcalidrawAPI,
      initialElements,
      isAnonymous,
      isViewOnly,
      ownerId,
      userId,
      emitSceneUpdate,
      registerRemoteHandler,
    ],
  )

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

/** Core collab state: connection, Excalidraw API, scene emit. Used by ExcalidrawWrapper. */
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
