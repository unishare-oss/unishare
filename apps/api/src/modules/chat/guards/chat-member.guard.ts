import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { ChatService } from '../chat.service'
import { ChatRepository } from '../chat.repository'

@Injectable()
export class ChatMemberGuard implements CanActivate {
  private readonly logger = new Logger(ChatMemberGuard.name)

  constructor(
    private readonly chatService: ChatService,
    private readonly chatRepository: ChatRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const { id } = request.params
    const userId = request.user?.id || request.session?.user?.id

    if (!userId) {
      this.logger.warn(`Access denied: Missing userId`)
      return false
    }

    if (!id) {
      return true
    }

    const path = request.route.path

    if (path.includes('/rooms/:id')) {
      try {
        await this.chatService.getRoom(id, userId)
        return true
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new ForbiddenException('You are not a member of this room')
        }
        throw error
      }
    } else if (path.includes('/messages/:id')) {
      const message = await this.chatRepository.findMessageById(id)
      if (!message) {
        throw new NotFoundException('Message not found')
      }

      try {
        await this.chatService.getRoom(message.roomId, userId)
        return true
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new ForbiddenException('You are not a member of the room this message belongs to')
        }
        throw error
      }
    }

    return true
  }
}
