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
        messages: {
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
              },
            },
          },
        },
        messages: {
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
        where: { roomId },
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
      },
      {
        ...options,
        cursorField: 'id', // Use id for cursor (guaranteed unique)
      },
    )
  }

  async createRoom(type: ChatRoomType, participantIds: string[], name?: string) {
    return this.prisma.chatRoom.create({
      data: {
        type,
        name,
        participants: {
          create: participantIds.map((userId) => ({
            userId,
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
      where: { id },
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
    return this.prisma.chatMessage.delete({
      where: { id },
    })
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
}
