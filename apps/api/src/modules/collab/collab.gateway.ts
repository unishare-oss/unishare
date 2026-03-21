import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import * as Y from 'yjs'
import { parse } from 'cookie'
import { auth } from '@/auth/auth.config'
import { CollabRoomService } from './collab.room.service'
import { CollabRepository } from './collab.repository'

const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]

const PRESENCE_COLORS_COUNT = 10
const CURSOR_THROTTLE_MS = 33 // ~30fps

@WebSocketGateway({
  namespace: '/collab',
  cors: { origin: allowedOrigins, credentials: true },
  // Large Yjs state snapshots can exceed socket.io's default 1MB polling limit.
  // Force WebSocket transport on the client side; this is a safety net for polling fallback.
  maxHttpBufferSize: 5 * 1024 * 1024, // 5MB — Yjs snapshots rarely exceed 1-2MB
})
export class CollabGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server

  private readonly logger = new Logger(CollabGateway.name)
  private readonly lastCursorEmit = new Map<string, number>()

  constructor(
    private readonly collabRoomService: CollabRoomService,
    private readonly collabRepository: CollabRepository,
  ) {}

  private hashToColorIndex(id: string): number {
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % PRESENCE_COLORS_COUNT
  }

  afterInit(server: Server) {
    server.use(async (socket: Socket, next: (err?: Error) => void) => {
      const cookieHeader = socket.handshake.headers.cookie ?? ''
      const cookies = parse(cookieHeader)
      const sessionToken =
        cookies['better-auth.session_token'] ??
        cookies['__Secure-better-auth.session_token'] ??
        (socket.handshake.auth as Record<string, string>)?.token

      if (!sessionToken) {
        return next(new Error('Unauthorized'))
      }

      const session = await auth.api.getSession({
        headers: new Headers({ cookie: cookieHeader }),
      })

      if (!session) {
        return next(new Error('Unauthorized'))
      }

      socket.data.user = session.user
      socket.data.session = session.session
      next()
    })
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id} (user: ${client.data.user?.id})`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
    const slug = this.collabRoomService.getRoomForSocket(client.id)
    this.collabRoomService.removeSocket(client.id)
    this.lastCursorEmit.delete(client.id)
    if (slug) {
      this.server.to(slug).emit('participant-left', { socketId: client.id })
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() slug: string,
  ): Promise<void> {
    const room = await this.collabRepository.findBySlug(slug)
    if (!room) {
      client.emit('error', { message: 'Room not found' })
      return
    }

    // Phase 5: assign presence metadata before joining room so fetchSockets() sees it
    const colorIndex = this.hashToColorIndex(client.data.user.id)
    client.data.colorIndex = colorIndex
    client.data.name = client.data.user.name

    // Phase 7: compute view-only status from room visibility + user anonymous status
    const isAnonymous = !!client.data.user.isAnonymous
    if (room.visibility === 'PRIVATE' && isAnonymous) {
      client.emit('error', { message: 'Room is private' })
      return
    }
    client.data.isViewOnly = room.visibility === 'VIEW_ONLY' && isAnonymous

    await client.join(slug)
    this.collabRoomService.registerSocket(client.id, slug)

    const doc = await this.collabRoomService.getOrCreate(slug)
    const state = Y.encodeStateAsUpdate(doc)

    client.emit('room-joined', { slug, state: Buffer.from(state) })
    this.logger.log(`Client ${client.id} joined room ${slug}`)

    // Phase 5: participant tracking
    const roomSockets = await this.server.in(slug).fetchSockets()
    const participants = roomSockets.map((s) => ({
      socketId: s.id,
      name: s.data.name as string,
      colorIndex: s.data.colorIndex as number,
    }))
    client.emit('participant-list', participants)
    client.to(slug).emit('participant-joined', {
      socketId: client.id,
      name: client.data.name,
      colorIndex,
    })
  }

  @SubscribeMessage('cursor-move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { x: number; y: number },
  ): void {
    const now = Date.now()
    const last = this.lastCursorEmit.get(client.id) ?? 0
    if (now - last < CURSOR_THROTTLE_MS) return
    this.lastCursorEmit.set(client.id, now)
    const slug = this.collabRoomService.getRoomForSocket(client.id)
    if (!slug) return
    client.to(slug).emit('cursor-move', { socketId: client.id, ...data })
  }

  @SubscribeMessage('yjs-update')
  handleYjsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: Buffer | Uint8Array,
  ): void {
    if (client.data.isViewOnly) return
    const slug = this.collabRoomService.getRoomForSocket(client.id)
    if (!slug) return

    const update = Buffer.isBuffer(data) ? new Uint8Array(data) : new Uint8Array(data)
    const doc = this.collabRoomService.getDoc(slug)
    if (!doc) return
    Y.applyUpdate(doc, update)
    this.collabRoomService.resetIdleTimer(slug)

    client.to(slug).emit('yjs-update', data)
  }
}
