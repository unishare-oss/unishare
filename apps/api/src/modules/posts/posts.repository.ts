import { Injectable } from '@nestjs/common'
import { PostStatus, PostType, Prisma } from '@/generated/prisma/client'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { paginate } from '@/common/utils/paginate'
import { PrismaService } from '@/prisma/prisma.service'

const POST_INCLUDE = {
  author: { select: { id: true, name: true, image: true } },
  course: { select: { id: true, code: true, name: true } },
  files: true,
  _count: { select: { comments: true, savedBy: true } },
} satisfies Prisma.PostInclude

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
    return this.prisma.post.create({ data, include: POST_INCLUDE })
  }

  findAll(where: Prisma.PostWhereInput, pagination: PaginationDto) {
    return paginate(
      this.prisma.post,
      { where, orderBy: { createdAt: 'desc' }, include: POST_INCLUDE },
      pagination,
    )
  }

  findById(id: string) {
    return this.prisma.post.findUnique({ where: { id, deletedAt: null }, include: POST_INCLUDE })
  }

  findByShortCode(shortCode: string) {
    return this.prisma.post.findUnique({
      where: { shortCode, deletedAt: null },
      include: POST_INCLUDE,
    })
  }

  update(id: string, data: Prisma.PostUpdateInput) {
    return this.prisma.post.update({ where: { id }, data, include: POST_INCLUDE })
  }

  softDelete(id: string) {
    return this.prisma.post.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  updateStatus(id: string, status: PostStatus) {
    return this.prisma.post.update({ where: { id }, data: { status }, include: POST_INCLUDE })
  }
}
