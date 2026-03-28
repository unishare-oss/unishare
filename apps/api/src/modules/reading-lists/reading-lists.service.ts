import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateReadingListDto } from './dto/create-reading-list.dto'
import { UpdateReadingListDto } from './dto/update-reading-list.dto'

@Injectable()
export class ReadingListsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReadingListDto) {
    const list = await this.prisma.readingList.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        isPublic: dto.isPublic ?? false,
      },
      include: { _count: { select: { posts: true } } },
    })
    return this.mapList(list)
  }

  async findPublicForUser(userId: string) {
    const lists = await this.prisma.readingList.findMany({
      where: { userId, isPublic: true },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { posts: true } }, posts: { select: { postId: true } } },
    })
    return lists.map(this.mapList)
  }

  async findAllForUser(userId: string) {
    const lists = await this.prisma.readingList.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { posts: true } }, posts: { select: { postId: true } } },
    })
    return lists.map(this.mapList)
  }

  async findOne(id: string, requesterId?: string) {
    const list = await this.prisma.readingList.findUnique({
      where: { id },
      include: { _count: { select: { posts: true } } },
    })
    if (!list) throw new NotFoundException('Reading list not found')
    if (!list.isPublic && list.userId !== requesterId) {
      throw new ForbiddenException('This reading list is private')
    }
    return this.mapList(list)
  }

  async update(id: string, userId: string, dto: UpdateReadingListDto) {
    await this.assertOwner(id, userId)
    const list = await this.prisma.readingList.update({
      where: { id },
      data: dto,
      include: { _count: { select: { posts: true } } },
    })
    return this.mapList(list)
  }

  async remove(id: string, userId: string) {
    await this.assertOwner(id, userId)
    await this.prisma.readingList.delete({ where: { id } })
  }

  async addPost(id: string, postId: string, userId: string) {
    await this.assertOwner(id, userId)
    await this.prisma.readingListPost.upsert({
      where: { listId_postId: { listId: id, postId } },
      create: { listId: id, postId },
      update: {},
    })
    return this.findOne(id, userId)
  }

  async removePost(id: string, postId: string, userId: string) {
    await this.assertOwner(id, userId)
    await this.prisma.readingListPost.deleteMany({
      where: { listId: id, postId },
    })
    return this.findOne(id, userId)
  }

  private async assertOwner(id: string, userId: string) {
    const list = await this.prisma.readingList.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!list) throw new NotFoundException('Reading list not found')
    if (list.userId !== userId) throw new ForbiddenException('You do not own this reading list')
  }

  private mapList(list: any) {
    const { _count, posts, ...rest } = list
    return {
      ...rest,
      postCount: _count?.posts ?? 0,
      postIds: (posts ?? []).map((p: any) => p.postId),
    }
  }
}
