import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common'
import { Socket } from 'socket.io'
import { ChatService } from '../chat.service'
import { WsException } from '@nestjs/websockets'

@Injectable()
export class ChatRoomGuard implements CanActivate {
  private readonly logger = new Logger(ChatRoomGuard.name)

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient<Socket>()
    const data = context.switchToWs().getData()

    // Support both direct roomId string or object containing roomId
    const roomId = typeof data === 'string' ? data : data.roomId
    const userId = client.data.user?.id

    if (!roomId || !userId) {
      this.logger.warn(`Access denied: Missing roomId or userId`)
      return false
    }

    const room = await this.chatService.getRoom(roomId, userId)

    if (!room) {
      throw new WsException('You are not a member of this room')
    }

    client.data.room = room

    return true
  }
}
