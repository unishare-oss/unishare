import { Injectable } from '@nestjs/common'
import { NotificationType } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { userId: string; type: NotificationType; message: string; postId?: string }) {
    return this.prisma.notification.create({ data })
  }

  findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } })
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
  }
}
