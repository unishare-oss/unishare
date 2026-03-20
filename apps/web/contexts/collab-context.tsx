'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as Y from 'yjs'
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

const CURSOR_THROTTLE_MS = 1000 / 30 // ~33ms, 30fps max

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

interface CollabContextValue {
  ydoc: Y.Doc
  yElements: Y.Array<unknown>
  connectionStatus: ConnectionStatus
  excalidrawAPI: ExcalidrawImperativeAPI | null
  setExcalidrawAPI: (api: ExcalidrawImperativeAPI | null) => void
  initialElements: unknown[] | null
  remoteCursors: Map<string, CursorData>
  participants: Participant[]
  socketId: string | null
  emitCursorMove: (e: React.PointerEvent<HTMLElement>) => void
}

interface CollabProviderProps {
  slug: string
  children: ReactNode
}

const CollabContext = createContext<CollabContextValue | null>(null)

export function CollabProvider({ slug, children }: CollabProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [initialElements, setInitialElements] = useState<unknown[] | null>(null)
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null)

  const [ydoc] = useState<Y.Doc>(() => new Y.Doc())
  const [yElements] = useState<Y.Array<unknown>>(() => ydoc.getArray('elements'))

  const [remoteCursors, setRemoteCursors] = useState<Map<string, CursorData>>(new Map())
  const [participants, setParticipants] = useState<Participant[]>([])
  const [socketId, setSocketId] = useState<string | null>(null)
  const socketRef = useRef<ReturnType<typeof io> | null>(null)
  const lastEmitTimeRef = useRef(0)

  useEffect(() => {
    const hasJoined = { current: false }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const socket = io(`${apiUrl}/collab`, {
      withCredentials: true,
      autoConnect: false,
      // Force WebSocket transport — avoids HTTP polling 413 errors on large Yjs payloads.
      // Polling has a body size limit; WebSocket does not.
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
      setInitialElements(yElements.toArray())
      setConnectionStatus('connected')
      hasJoined.current = true
      if (isReconnect) {
        // Show "Reconnected" only after room-joined confirms state is refreshed
        toast.dismiss('collab-status')
        toast.success('Reconnected', { duration: 2000 })
      }
    })

    socket.on('yjs-update', (data: ArrayBuffer) => {
      Y.applyUpdate(ydoc, new Uint8Array(data), 'remote')
    })

    socket.on('participant-list', (list: Participant[]) => {
      setParticipants(list)
      // Initialize cursor entries for others only (filter out self)
      const others = list.filter((p) => p.socketId !== socket.id)
      setRemoteCursors(
        new Map(
          others.map((p) => [p.socketId, { x: 0, y: 0, name: p.name, colorIndex: p.colorIndex }]),
        ),
      )
    })

    socket.on('participant-joined', (p: Participant) => {
      setParticipants((prev) => [...prev, p])
      // Only add cursor entry if it's not self (shouldn't be, but guard)
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

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected')
      // Clear presence state so reconnect gets a clean slate — stale cursors/participants
      // would otherwise persist until the next participant-list event arrives.
      setParticipants([])
      setRemoteCursors(new Map())
      toast.error('Connection lost — reconnecting...', { id: 'collab-status', duration: Infinity })
    })

    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'init') return
      socket.emit('yjs-update', update)
    })

    socket.connect()

    return () => {
      socketRef.current = null
      setSocketId(null)
      setParticipants([])
      setRemoteCursors(new Map())
      socket.disconnect()
      ydoc.destroy()
    }
  }, [slug, ydoc, yElements])

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

  const value: CollabContextValue = {
    ydoc,
    yElements,
    connectionStatus,
    excalidrawAPI,
    setExcalidrawAPI,
    initialElements,
    remoteCursors,
    participants,
    socketId,
    emitCursorMove,
  }

  return <CollabContext value={value}>{children}</CollabContext>
}

export function useCollab() {
  const context = useContext(CollabContext)
  if (!context) throw new Error('useCollab must be used within a CollabProvider')
  return context
}
