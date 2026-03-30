import { Injectable, NotFoundException } from '@nestjs/common'
import { ChatRepository } from './chat.repository'
import { ChatRoomType } from '@/generated/prisma/client'
import { CursorPaginationOptions } from '../../common/utils/paginate-cursor'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SendMessageDto } from './dto/send-message.dto'

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

  async createRoom(
    creatorId: string,
    participantIds: string[],
    type: ChatRoomType,
    name?: string,
    initialMessage?: string,
  ) {
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

    const room = await this.chatRepository.createRoom(type, allParticipantIds, name)

    // Send initial message if provided (for DM creation)
    if (initialMessage && type === ChatRoomType.DM) {
      const message = await this.chatRepository.createMessage({
        roomId: room.id,
        userId: creatorId,
        content: initialMessage,
        type: 'TEXT',
      })

      this.eventEmitter.emit('chat.message_sent', {
        roomId: room.id,
        message,
        participants: room.participants,
      })
    }

    return room
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

  async markAsRead(roomId: string, userId: string) {
    return this.chatRepository.markAsRead(roomId, userId)
  }
}
