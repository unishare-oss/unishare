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

  async saveSnapshot(slug: string, snapshot: Uint8Array): Promise<void> {
    await this.prisma.room.update({
      where: { slug },
      data: { snapshot: Buffer.from(snapshot) },
    })
  }

  async getSnapshot(slug: string): Promise<Uint8Array | null> {
    const room = await this.prisma.room.findUnique({
      where: { slug },
      select: { snapshot: true },
    })
    return room?.snapshot ? new Uint8Array(room.snapshot) : null
  }
}
