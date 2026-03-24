import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { auth } from '@/auth/auth.config'
import { ChatService } from './chat.service'

const allowedOrigins = [
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]

@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: allowedOrigins, credentials: true },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server
  private readonly logger = new Logger(ChatGateway.name)

  constructor(private readonly chatService: ChatService) {}

  afterInit(server: Server) {
    server.use(async (socket: Socket, next) => {
      // better-auth handles the cookie/header extraction automatically
      const session = await auth.api.getSession({
        headers: new Headers(socket.handshake.headers as any),
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
  }
}
