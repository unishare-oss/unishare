import { Injectable } from '@nestjs/common'
import { PostStatus, PostType, Prisma } from '@/generated/prisma/client'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { paginate } from '@/common/utils/paginate'
import { PrismaService } from '@/prisma/prisma.service'

const postInclude = (userId?: string): Prisma.PostInclude => ({
  author: {
    select: {
      id: true,
      name: true,
      image: true,
      enrollmentYear: true,
      department: { select: { id: true, name: true } },
    },
  },
  course: {
    select: {
      id: true,
      code: true,
      name: true,
      department: { select: { id: true, name: true } },
    },
  },
  files: true,
  _count: {
    select: {
      comments: { where: { deletedAt: null } },
      savedBy: true,
    },
  },
  ...(userId ? { savedBy: { where: { userId }, select: { userId: true } } } : {}),
})

function mapPost<T>(post: T): Omit<T, 'savedBy'> & { savedByCurrentUser: boolean } {
  const { savedBy, ...rest } = post as any
  return { ...rest, savedByCurrentUser: Array.isArray(savedBy) && savedBy.length > 0 }
}

@Injectable()
export class PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    shortCode: string
    authorId: string
    courseId: string
    type: PostType
    title?: string
    description?: string
    externalUrl?: string
    examYear?: number
    moduleNumber?: number
    year?: number
    semester?: number
  }) {
    return this.prisma.post.create({ data, include: postInclude() })
  }

  async findAll(where: Prisma.PostWhereInput, pagination: PaginationDto, userId?: string) {
    const result = await paginate(
      this.prisma.post,
      { where, orderBy: { createdAt: 'desc' }, include: postInclude(userId) },
      pagination,
    )
    return { ...result, items: result.items.map((p) => mapPost(p)) }
  }

  async findById(id: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id, deletedAt: null },
      include: postInclude(userId),
    })
    return post ? mapPost(post) : null
  }

  async findByShortCode(shortCode: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { shortCode, deletedAt: null },
      include: postInclude(userId),
    })
    return post ? mapPost(post) : null
  }

  findCommentTarget(id: string) {
    return this.prisma.post.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    })
  }

  update(id: string, data: Prisma.PostUpdateInput) {
    return this.prisma.post.update({ where: { id }, data, include: postInclude() })
  }

  softDelete(id: string) {
    return this.prisma.post.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  updateStatus(id: string, status: PostStatus) {
    return this.prisma.post.update({ where: { id }, data: { status }, include: postInclude() })
  }

  savePost(postId: string, userId: string) {
    return this.prisma.savedPost.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    })
  }

  unsavePost(postId: string, userId: string) {
    return this.prisma.savedPost.delete({
      where: { userId_postId: { userId, postId } },
    })
  }

  async findSaved(userId: string, pagination: PaginationDto) {
    const result = await paginate(
      this.prisma.post,
      {
        where: { savedBy: { some: { userId } }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: postInclude(userId),
      },
      pagination,
    )
    return { ...result, items: result.items.map((p) => mapPost(p)) }
  }
}
