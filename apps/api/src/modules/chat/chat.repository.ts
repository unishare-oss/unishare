import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { paginateWithCursor, CursorPaginationOptions } from '../../common/utils/paginate-cursor'
import { ChatMessageType, ChatRoomType } from '@/generated/prisma/enums'

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRoomsByUserId(userId: string) {
    return this.prisma.chatRoom.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            userId: true,
            roomId: true,
            lastReadAt: true,
            joinedAt: true,
            encryptedRoomKey: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                publicKey: true,
              },
            },
          },
        },
        messages: {
          where: {
            deletedAt: null,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
  }

  async findRoomById(id: string, userId?: string) {
    return this.prisma.chatRoom.findFirst({
      where: {
        id,
        participants: userId
          ? {
              some: {
                userId,
              },
            }
          : undefined,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                publicKey: true,
              },
            },
          },
        },
        messages: {
          where: {
            deletedAt: null,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    })
  }

  async findMessages(roomId: string, options: CursorPaginationOptions) {
    return paginateWithCursor(
      this.prisma.chatMessage,
      {
        where: { roomId, deletedAt: null },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
          parent: {
            include: {
              user: {
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
      },
      { ...options, cursorField: 'id' },
    )
  }

  async createRoom(
    type: ChatRoomType,
    participantIds: string[],
    name?: string,
    imageUrl?: string,
    encryptedRoomKeys?: { userId: string; encryptedKey: string }[],
  ) {
    return this.prisma.chatRoom.create({
      data: {
        type,
        name,
        imageUrl,
        participants: {
          create: participantIds.map((userId) => ({
            userId,
            encryptedRoomKey: encryptedRoomKeys?.find((k) => k.userId === userId)?.encryptedKey,
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    })
  }

  async findDirectMessageRoom(userId1: string, userId2: string) {
    return this.prisma.chatRoom.findFirst({
      where: {
        type: ChatRoomType.DM,
        AND: [
          { participants: { some: { userId: userId1 } } },
          { participants: { some: { userId: userId2 } } },
        ],
      },
    })
  }

  async createMessage(data: {
    roomId: string
    userId?: string
    content?: string
    type?: ChatMessageType
    imageUrl?: string
    fileUrl?: string
    fileName?: string
    linkUrl?: string
    parentId?: string
  }) {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          parent: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
        },
      })

      // Update room's updatedAt to bring it to top of list
      await tx.chatRoom.update({
        where: { id: data.roomId },
        data: { updatedAt: new Date() },
      })

      return message
    })
  }

  async findMessageById(id: string) {
    return this.prisma.chatMessage.findUnique({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    })
  }

  async updateMessage(id: string, content: string) {
    return this.prisma.chatMessage.update({
      where: { id },
      data: { content },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    })
  }

  async deleteMessage(id: string) {
    return this.prisma.chatMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async setFileDeleteAt(id: string, date: Date) {
    return this.prisma.chatMessage.update({
      where: { id },
      data: { fileDeleteAt: date },
    })
  }

  async findMessagesReadyForS3Cleanup() {
    return this.prisma.chatMessage.findMany({
      where: { deletedAt: { not: null }, fileDeleteAt: { lte: new Date() } },
      select: { id: true, fileUrl: true },
    })
  }

  async clearFileAfterCleanup(ids: string[]) {
    return this.prisma.chatMessage.updateMany({
      where: { id: { in: ids } },
      data: { fileDeleteAt: null, fileUrl: null, fileName: null },
    })
  }

  async removeParticipant(roomId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.chatRoomParticipant.delete({
        where: { roomId_userId: { roomId, userId } },
      })

      const remaining = await tx.chatRoomParticipant.count({ where: { roomId } })

      if (remaining === 0) {
        await tx.chatRoom.delete({ where: { id: roomId } })
        return { roomDeleted: true }
      }

      return { roomDeleted: false }
    })
  }

  async addParticipants(
    roomId: string,
    userIds: string[],
    encryptedRoomKeys?: { userId: string; encryptedKey: string }[],
  ) {
    await this.prisma.chatRoomParticipant.createMany({
      data: userIds.map((userId) => ({
        roomId,
        userId,
        encryptedRoomKey: encryptedRoomKeys?.find((k) => k.userId === userId)?.encryptedKey,
      })),
      skipDuplicates: true,
    })
    return this.findRoomById(roomId)
  }

  async upgradeEncryption(
    roomId: string,
    encryptedRoomKeys: { userId: string; encryptedKey: string }[],
  ) {
    await this.prisma.$transaction(
      encryptedRoomKeys.map(({ userId, encryptedKey }) =>
        this.prisma.chatRoomParticipant.update({
          where: { roomId_userId: { roomId, userId } },
          data: { encryptedRoomKey: encryptedKey },
        }),
      ),
    )
    return this.findRoomById(roomId)
  }

  async markAsRead(roomId: string, userId: string) {
    return this.prisma.chatRoomParticipant.update({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    })
  }

  findGroupRoomIds(userId: string) {
    return this.prisma.chatRoom.findMany({
      where: { type: 'GROUP', participants: { some: { userId } } },
      select: { id: true },
    })
  }

  async updateRoom(roomId: string, data: { name?: string; imageUrl?: string }) {
    return this.prisma.chatRoom.update({
      where: { id: roomId },
      data,
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, image: true, publicKey: true },
            },
          },
        },
      },
    })
  }

  async removeMember(roomId: string, userId: string) {
    return this.prisma.chatRoomParticipant.delete({
      where: { roomId_userId: { roomId, userId } },
    })
  }
}
