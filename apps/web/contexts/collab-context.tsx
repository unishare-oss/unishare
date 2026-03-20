'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import * as Y from 'yjs'
import { io } from 'socket.io-client'
import { toast } from 'sonner'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface CollabContextValue {
  ydoc: Y.Doc
  yElements: Y.Array<unknown>
  connectionStatus: ConnectionStatus
  excalidrawAPI: ExcalidrawImperativeAPI | null
  setExcalidrawAPI: (api: ExcalidrawImperativeAPI | null) => void
  initialElements: unknown[] | null
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

  useEffect(() => {
    const hasJoined = { current: false }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const socket = io(`${apiUrl}/collab`, {
      withCredentials: true,
      autoConnect: false,
    })

    socket.on('connect', () => {
      if (hasJoined.current) {
        // Reconnect after disconnect
        toast.dismiss('collab-status')
        toast.success('Reconnected', { duration: 2000 })
        socket.emit('join-room', slug)
      } else {
        // First connect
        socket.emit('join-room', slug)
      }
    })

    socket.on('room-joined', ({ state }: { slug: string; state: ArrayBuffer }) => {
      Y.applyUpdate(ydoc, new Uint8Array(state), 'init')
      setInitialElements(yElements.toArray())
      setConnectionStatus('connected')
      hasJoined.current = true
    })

    socket.on('yjs-update', (data: ArrayBuffer) => {
      Y.applyUpdate(ydoc, new Uint8Array(data), 'remote')
    })

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected')
      toast.error('Connection lost — reconnecting...', { id: 'collab-status', duration: Infinity })
    })

    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'init') return
      socket.emit('yjs-update', update)
    })

    socket.connect()

    return () => {
      socket.disconnect()
      ydoc.destroy()
    }
  }, [slug, ydoc, yElements])

  const value: CollabContextValue = {
    ydoc,
    yElements,
    connectionStatus,
    excalidrawAPI,
    setExcalidrawAPI,
    initialElements,
  }

  return <CollabContext value={value}>{children}</CollabContext>
}

export function useCollab() {
  const context = useContext(CollabContext)
  if (!context) throw new Error('useCollab must be used within a CollabProvider')
  return context
}
