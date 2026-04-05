import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { Logger, UseGuards, UseFilters } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { auth } from '@/auth/auth.config'
import { ChatService } from './chat.service'
import { ChatRoomGuard } from './guards/chat-room.guard'
import { ChatWsExceptionFilter } from './filters/ws-exception.filter'
import { OnEvent } from '@nestjs/event-emitter'
import { ChatMessageEntity } from './entities/chat-message.entity'
import { ChatRoomParticipantEntity } from './entities/chat-room.entity'

const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: allowedOrigins, credentials: true },
})
@UseFilters(ChatWsExceptionFilter)
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(ChatGateway.name)

  constructor(private readonly chatService: ChatService) {}

  afterInit(server: Server) {
    server.use(async (socket: Socket, next: (err?: Error) => void) => {
      const session = await auth.api.getSession({
        headers: new Headers(socket.handshake.headers as any),
      })

      if (!session) {
        this.logger.warn(`Handshake rejected: No valid session for ${socket.id}`)
        return next(new Error('Unauthorized'))
      }

      this.logger.log(`Handshake authorized for user: ${session.user.id}`)
      socket.data.user = session.user
      socket.data.session = session.session
      next()
    })
  }

  handleConnection(client: Socket) {
    this.logger.log(`Connection established! Socket ID: ${client.id}`)

    // Join personal room for global notifications
    const userId = client.data.user.id
    client.join(`user-${userId}`)
    this.logger.log(`User ${userId} joined personal room: user-${userId}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }

  @UseGuards(ChatRoomGuard)
  @SubscribeMessage('join-room')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    // Access is already verified by ChatRoomGuard
    await client.join(roomId)
    this.logger.log(`User ${client.data.user.id} joined chat room: ${roomId}`)

    // Notify client success
    client.emit('room-joined', { roomId })
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    const { roomId, isTyping } = data
    const userId = client.data.user.id

    // Emit globally to all connected clients
    this.server.emit('user-typing', {
      roomId,
      userId,
      isTyping,
    })

    // this.logger.log(`User ${userId} ${isTyping ? 'started' : 'stopped'} typing in room ${roomId}`)
  }

  @OnEvent('chat.message_sent')
  async handleMessageSentEvent(payload: {
    roomId: string
    message: ChatMessageEntity
    participants: ChatRoomParticipantEntity[]
  }) {
    const { roomId, message, participants } = payload

    this.server.to(roomId).emit('receive-message', message)

    participants.forEach((participant) => {
      this.server.to(`user-${participant.userId}`).emit('new-message-notification', {
        roomId,
        message,
      })
    })
  }

  @OnEvent('chat.message_updated')
  async handleMessageUpdatedEvent(payload: {
    roomId: string
    message: ChatMessageEntity
    participants: ChatRoomParticipantEntity[]
  }) {
    const { roomId, message } = payload
    this.server.to(roomId).emit('message-updated', message)
  }

  @OnEvent('chat.message_deleted')
  async handleMessageDeletedEvent(payload: {
    roomId: string
    messageId: string
    participants: ChatRoomParticipantEntity[]
  }) {
    const { roomId, messageId } = payload
    this.server.to(roomId).emit('message-deleted', { roomId, messageId })
  }
}
