import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common'
import { Socket } from 'socket.io'
import { ChatService } from '../chat.service'

@Injectable()
export class ChatRoomGuard implements CanActivate {
  private readonly logger = new Logger(ChatRoomGuard.name)

  constructor(private readonly chatService: ChatService) {}

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

    try {
      // ChatService.getRoom throws NotFound/Forbidden if user is not participant
      await this.chatService.getRoom(roomId, userId)
      return true
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Access denied for user ${userId} to room ${roomId}: ${message}`)
      return false
    }
  }
}
