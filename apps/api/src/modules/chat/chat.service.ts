import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { ChatRepository } from './chat.repository'
import { CursorPaginationOptions } from '../../common/utils/paginate-cursor'
import { ChatMessageType, ChatRoomType } from '@/generated/prisma/client'

@Injectable()
export class ChatService {
  constructor(private readonly repository: ChatRepository) {}

  async getRooms(userId: string) {
    return this.repository.findRoomsByUserId(userId)
  }

  async getRoom(id: string, userId: string) {
    const room = await this.repository.findRoomById(id, userId)
    if (!room) {
      throw new NotFoundException('Chat room not found or access denied')
    }
    return room
  }

  async getMessages(roomId: string, userId: string, options: CursorPaginationOptions) {
    // Verify user is participant
    const room = await this.repository.findRoomById(roomId, userId)
    if (!room) {
      throw new ForbiddenException('Not a participant of this chat room')
    }
    return this.repository.findMessages(roomId, options)
  }

  async createRoom(creatorId: string, participantIds: string[], type: ChatRoomType, name?: string) {
    const allParticipantIds = Array.from(new Set([creatorId, ...participantIds]))

    if (type === ChatRoomType.DM) {
      if (allParticipantIds.length !== 2) {
        throw new Error('DM must have exactly 2 participants')
      }

      const otherUserId = allParticipantIds.find((id) => id !== creatorId)
      const existingRoom = await this.repository.findDirectMessageRoom(creatorId, otherUserId!)
      if (existingRoom) {
        return this.repository.findRoomById(existingRoom.id)
      }
    }

    return this.repository.createRoom(type, allParticipantIds, name)
  }

  async sendMessage(
    roomId: string,
    userId: string,
    data: {
      content?: string
      type?: ChatMessageType
      imageUrl?: string
      linkUrl?: string
    },
  ) {
    // Verify participant
    const room = await this.repository.findRoomById(roomId, userId)
    if (!room) {
      throw new ForbiddenException('Not a participant of this chat room')
    }

    return this.repository.createMessage({
      roomId,
      userId,
      ...data,
    })
  }

  async markAsRead(roomId: string, userId: string) {
    return this.repository.markAsRead(roomId, userId)
  }
}
