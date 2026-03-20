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

@WebSocketGateway({
  namespace: '/collab',
  cors: { origin: allowedOrigins, credentials: true },
})
export class CollabGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server

  private readonly logger = new Logger(CollabGateway.name)

  constructor(
    private readonly collabRoomService: CollabRoomService,
    private readonly collabRepository: CollabRepository,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket: Socket, next: (err?: Error) => void) => {
      const cookieHeader = socket.handshake.headers.cookie ?? ''
      const cookies = parse(cookieHeader)
      const sessionToken = cookies['better-auth.session']

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
    this.collabRoomService.removeSocket(client.id)
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

    await client.join(slug)
    this.collabRoomService.registerSocket(client.id, slug)

    const doc = this.collabRoomService.getOrCreate(slug)
    const state = Y.encodeStateAsUpdate(doc)

    client.emit('room-joined', { slug, state: Buffer.from(state) })
    this.logger.log(`Client ${client.id} joined room ${slug}`)
  }

  @SubscribeMessage('yjs-update')
  handleYjsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: Buffer | Uint8Array,
  ): void {
    const slug = this.collabRoomService.getRoomForSocket(client.id)
    if (!slug) return

    const update = Buffer.isBuffer(data) ? new Uint8Array(data) : new Uint8Array(data)
    const doc = this.collabRoomService.getOrCreate(slug)
    Y.applyUpdate(doc, update)

    client.to(slug).emit('yjs-update', data)
  }
}
