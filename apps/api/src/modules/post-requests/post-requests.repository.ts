import { Injectable } from '@nestjs/common'
import { PostRequestStatus, Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { paginate } from '@/common/utils/paginate'
import { PaginationDto } from '@/common/dto/pagination.dto'

const requestInclude = (userId?: string) =>
  ({
    author: { select: { id: true, name: true, image: true } },
    course: { select: { id: true, code: true, name: true } },
    fulfilledByPost: { select: { id: true, title: true, shortCode: true } },
    upvotes: userId ? { where: { userId }, select: { userId: true } } : false,
    _count: { select: { upvotes: true } },
  }) satisfies Prisma.PostRequestInclude

function mapRequest(r: any, userId?: string) {
  const { _count, upvotes, authorId, courseId, ...rest } = r
  return {
    ...rest,
    upvoteCount: _count.upvotes,
    isUpvoted: userId ? (upvotes?.length ?? 0) > 0 : false,
  }
}

@Injectable()
export class PostRequestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(where: Prisma.PostRequestWhereInput, pagination: PaginationDto, userId?: string) {
    const result = await paginate(
      this.prisma.postRequest,
      {
        where,
        include: requestInclude(userId),
        orderBy: [{ createdAt: 'desc' }],
      },
      pagination,
    )
    return { ...result, items: result.items.map((r) => mapRequest(r, userId)) }
  }

  async findById(id: string, userId?: string) {
    const r = await this.prisma.postRequest.findUnique({
      where: { id },
      include: requestInclude(userId),
    })
    if (!r) return null
    return mapRequest(r, userId)
  }

  create(data: Prisma.PostRequestUncheckedCreateInput) {
    return this.prisma.postRequest
      .create({
        data,
        include: requestInclude(data.authorId),
      })
      .then((r) => mapRequest(r, data.authorId))
  }

  async toggleUpvote(requestId: string, userId: string) {
    const existing = await this.prisma.postRequestUpvote.findUnique({
      where: { userId_requestId: { userId, requestId } },
    })
    if (existing) {
      await this.prisma.postRequestUpvote.delete({
        where: { userId_requestId: { userId, requestId } },
      })
    } else {
      await this.prisma.postRequestUpvote.create({ data: { userId, requestId } })
    }
    return this.findById(requestId, userId)
  }

  fulfill(id: string, postId: string, userId: string) {
    return this.prisma.postRequest
      .update({
        where: { id },
        data: { status: PostRequestStatus.FULFILLED, fulfilledByPostId: postId },
        include: requestInclude(userId),
      })
      .then((r) => mapRequest(r, userId))
  }

  delete(id: string) {
    return this.prisma.postRequest.delete({ where: { id } })
  }
}
