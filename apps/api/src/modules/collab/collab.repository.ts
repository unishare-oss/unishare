import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class CollabRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { slug: string; ownerId: string; title?: string }) {
    return this.prisma.room.create({ data })
  }

  async findBySlug(slug: string) {
    return this.prisma.room.findUnique({ where: { slug } })
  }

  async findBySlugWithGuestFlag(slug: string) {
    return this.prisma.room.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        ownerId: true,
        isGuestEditingAllowed: true,
      },
    })
  }
}
