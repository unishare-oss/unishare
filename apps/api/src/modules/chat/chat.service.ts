import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { getLinkPreview } from 'link-preview-js'
import * as dns from 'dns'
import { ChatRepository } from './chat.repository'
import { ChatMessageType, ChatRoomType } from '@/generated/prisma/client'
import { CursorPaginationOptions } from '../../common/utils/paginate-cursor'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SendMessageDto } from './dto/send-message.dto'
import { UpdateMessageDto } from './dto/update-message.dto'
import { StorageService } from '../storage/storage.service'
import { NotificationsService } from '../notifications/notifications.service'

const FILE_DELETE_GRACE_DAYS = 7

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
    private readonly notificationsService: NotificationsService,
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
    await this.getRoom(roomId, userId)
    const result = await this.chatRepository.findMessages(roomId, options)
    // Sanitize deleted parents so reply quotes show "Message deleted"
    return {
      ...result,
      items: result.items.map((msg: any) => ({
        ...msg,
        parent: msg.parent ? this.sanitizeParent(msg.parent) : msg.parent,
      })),
    }
  }

  async createRoom(
    creatorId: string,
    participantIds: string[],
    type: ChatRoomType,
    name?: string,
    imageUrl?: string,
    encryptedRoomKeys?: { userId: string; encryptedKey: string }[],
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

    return this.chatRepository.createRoom(
      type,
      allParticipantIds,
      name,
      imageUrl,
      encryptedRoomKeys,
    )
  }

  async sendMessage(roomId: string, userId: string, data: SendMessageDto) {
    // Verify participant and get room details
    const room = await this.getRoom(roomId, userId)

    // Validate parentId if provided
    if (data.parentId) {
      const parentMessage = await this.chatRepository.findMessageById(data.parentId)
      if (!parentMessage || parentMessage.roomId !== roomId) {
        throw new NotFoundException('Parent message not found in this room')
      }
    }

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

    const sender = room.participants.find((p: any) => p.userId === userId)
    const _senderName = sender?.user?.name ?? 'Someone'
    const _recipientIds = room.participants
      .filter((p: any) => p.userId !== userId)
      .map((p: any) => p.userId)

    // Chat message notifications suppressed — unread count handled via Socket.io
    // await this.notificationsService.notifyChatMessage(
    //   roomId,
    //   senderName,
    //   room.name ?? null,
    //   room.type === ChatRoomType.DM,
    //   recipientIds,
    // )

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

    // Clean up S3 assets
    if (existingMessage.type === ChatMessageType.IMAGE && existingMessage.imageUrl) {
      const key = this.storageService.extractKeyFromUrl(existingMessage.imageUrl)
      this.storageService.deleteFile(key).catch(() => {})
    } else if (existingMessage.type === ChatMessageType.FILE && existingMessage.fileUrl) {
      const expiresAt = new Date(Date.now() + FILE_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000)
      await this.chatRepository.setFileDeleteAt(id, expiresAt)
    }

    const room = await this.getRoom(existingMessage.roomId, userId)

    this.eventEmitter.emit('chat.message_deleted', {
      roomId: existingMessage.roomId,
      messageId: id,
      participants: room.participants,
    })

    return { id }
  }

  async leaveRoom(roomId: string, userId: string) {
    const room = await this.getRoom(roomId, userId)
    const leavingParticipant = room.participants?.find((p: any) => p.userId === userId)
    const leavingName = leavingParticipant?.user?.name ?? 'Someone'

    const result = await this.chatRepository.removeParticipant(roomId, userId)

    if (result.roomDeleted && room.imageUrl) {
      const key = this.storageService.extractKeyFromUrl(room.imageUrl)
      await this.storageService.deleteFile(key)
    } else {
      const systemMessage = await this.chatRepository.createMessage({
        roomId,
        type: ChatMessageType.SYSTEM,
        content: `${leavingName} left the group`,
      })
      this.eventEmitter.emit('chat.message_sent', {
        roomId,
        message: systemMessage,
        participants: room.participants.filter((p: any) => p.userId !== userId),
      })
    }

    return result
  }

  async inviteMembers(
    roomId: string,
    inviterId: string,
    userIds: string[],
    encryptedRoomKeys?: { userId: string; encryptedKey: string }[],
  ) {
    const room = await this.getRoom(roomId, inviterId)
    if (room.type !== 'GROUP') {
      throw new ForbiddenException('Only group rooms support inviting members')
    }

    const updatedRoom = await this.chatRepository.addParticipants(
      roomId,
      userIds,
      encryptedRoomKeys,
    )

    for (const uid of userIds) {
      const participant = updatedRoom?.participants?.find((p: any) => p.userId === uid)
      const name = participant?.user?.name ?? 'Someone'
      const systemMessage = await this.chatRepository.createMessage({
        roomId,
        type: ChatMessageType.SYSTEM,
        content: `${name} joined the group`,
      })
      this.eventEmitter.emit('chat.message_sent', {
        roomId,
        message: systemMessage,
        participants: updatedRoom?.participants ?? [],
      })
    }

    return updatedRoom
  }

  async upgradeEncryption(
    roomId: string,
    userId: string,
    encryptedRoomKeys: { userId: string; encryptedKey: string }[],
  ) {
    const room = await this.getRoom(roomId, userId)

    const alreadyEncrypted = room.participants.some((p: any) => p.encryptedRoomKey)
    if (alreadyEncrypted) {
      throw new BadRequestException('Room is already encrypted')
    }

    const participantIds = new Set(room.participants.map((p: any) => p.userId))
    const providedUserIds = encryptedRoomKeys.map(({ userId: uid }) => uid)
    const providedUserIdSet = new Set(providedUserIds)

    if (providedUserIds.length !== providedUserIdSet.size) {
      throw new BadRequestException('Duplicate encrypted room keys are not allowed')
    }

    if (!providedUserIdSet.has(userId)) {
      throw new BadRequestException('Caller must include their own encrypted room key')
    }

    if (providedUserIdSet.size !== participantIds.size) {
      throw new BadRequestException(
        'Encrypted room keys must be provided for every participant in the room',
      )
    }

    for (const uid of providedUserIdSet) {
      if (!participantIds.has(uid)) {
        throw new BadRequestException(`User ${uid} is not a participant of this room`)
      }
    }

    return this.chatRepository.upgradeEncryption(roomId, encryptedRoomKeys)
  }

  async markAsRead(roomId: string, userId: string) {
    const participant = await this.chatRepository.markAsRead(roomId, userId)
    this.eventEmitter.emit('chat.room_read', {
      roomId,
      userId,
      lastReadAt: participant.lastReadAt,
    })
    return participant
  }

  async getLinkPreview(url: string) {
    if (!url) throw new BadRequestException('url is required')
    if (url.length > 2000) throw new BadRequestException('URL too long')

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new BadRequestException('Invalid URL')
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Only http and https URLs are allowed')
    }

    const hostname = parsed.hostname.toLowerCase()

    // Block private/loopback hostnames and IP literals
    const blockedHostnames = new Set(['localhost', '0.0.0.0'])
    const privateRanges = [
      /^127\./, // 127.0.0.0/8 loopback
      /^10\./, // 10.0.0.0/8 private
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 private
      /^192\.168\./, // 192.168.0.0/16 private
      /^169\.254\./, // 169.254.0.0/16 link-local (cloud metadata)
      /^::1$/, // IPv6 loopback
      /^fc00:/, // IPv6 unique local
      /^fe80:/, // IPv6 link-local
    ]

    const isPrivate = (host: string) =>
      blockedHostnames.has(host) || privateRanges.some((r) => r.test(host))

    if (isPrivate(hostname)) throw new BadRequestException('URL not allowed')

    // DNS resolution check to block hostnames that resolve to private IPs
    try {
      const { address } = await dns.promises.lookup(hostname)
      if (isPrivate(address)) throw new BadRequestException('URL not allowed')
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      throw new BadRequestException('Could not resolve host')
    }

    try {
      const data = await getLinkPreview(url, {
        timeout: 3000,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; Unishare/1.0)' },
      })
      return data
    } catch {
      throw new BadRequestException('Could not fetch link preview')
    }
  }

  private sanitizeParent<
    T extends {
      deletedAt?: Date | null
      content?: string | null
      imageUrl?: string | null
      fileUrl?: string | null
      fileName?: string | null
    },
  >(msg: T): T {
    if (!msg.deletedAt) return msg
    return { ...msg, content: null, imageUrl: null, fileUrl: null, fileName: null }
  }
}
