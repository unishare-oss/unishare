import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ChatRepository } from './chat.repository'
import { ChatRoomType } from '@/generated/prisma/client'
import { CursorPaginationOptions } from '../../common/utils/paginate-cursor'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SendMessageDto } from './dto/send-message.dto'
import { UpdateMessageDto } from './dto/update-message.dto'

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getRooms(userId: string) {
    return this.chatRepository.findRoomsByUserId(userId)
  }

  async getRoom(id: string, userId: string) {
    const room = await this.chatRepository.findRoomById(id, userId)
    if (!room) {
      throw new NotFoundException('Chat room not found or access denied')
    }
    return room
  }

  async getMessages(roomId: string, userId: string, options: CursorPaginationOptions) {
    // Verify user is participant
    await this.getRoom(roomId, userId)
    return this.chatRepository.findMessages(roomId, options)
  }

  async createRoom(creatorId: string, participantIds: string[], type: ChatRoomType, name?: string) {
    const allParticipantIds = Array.from(new Set([creatorId, ...participantIds]))

    if (type === ChatRoomType.DM) {
      if (allParticipantIds.length !== 2) {
        throw new Error('DM must have exactly 2 participants')
      }

      const otherUserId = allParticipantIds.find((id) => id !== creatorId)
      const existingRoom = await this.chatRepository.findDirectMessageRoom(creatorId, otherUserId!)
      if (existingRoom) {
        return this.chatRepository.findRoomById(existingRoom.id)
      }
    }

    return this.chatRepository.createRoom(type, allParticipantIds, name)
  }

  async sendMessage(roomId: string, userId: string, data: SendMessageDto) {
    // Verify participant and get room details
    const room = await this.getRoom(roomId, userId)

    // 1. Persist to database
    const message = await this.chatRepository.createMessage({
      roomId,
      userId,
      ...data,
    })

    this.eventEmitter.emit('chat.message_sent', {
      roomId,
      message,
      participants: room.participants,
    })

    return message
  }

  async editMessage(id: string, userId: string, data: UpdateMessageDto) {
    const existingMessage = await this.chatRepository.findMessageById(id)
    if (!existingMessage) {
      throw new NotFoundException('Message not found')
    }

    if (existingMessage.userId !== userId) {
      throw new ForbiddenException('You can only edit your own messages')
    }

    const message = await this.chatRepository.updateMessage(id, data.content)
    const room = await this.getRoom(message.roomId, userId)

    this.eventEmitter.emit('chat.message_updated', {
      roomId: message.roomId,
      message,
      participants: room.participants,
    })

    return message
  }

  async deleteMessage(id: string, userId: string) {
    const existingMessage = await this.chatRepository.findMessageById(id)
    if (!existingMessage) {
      throw new NotFoundException('Message not found')
    }

    if (existingMessage.userId !== userId) {
      throw new ForbiddenException('You can only delete your own messages')
    }

    await this.chatRepository.deleteMessage(id)
    const room = await this.getRoom(existingMessage.roomId, userId)

    this.eventEmitter.emit('chat.message_deleted', {
      roomId: existingMessage.roomId,
      messageId: id,
      participants: room.participants,
    })

    return { success: true }
  }

  async markAsRead(roomId: string, userId: string) {
    return this.chatRepository.markAsRead(roomId, userId)
  }
}
