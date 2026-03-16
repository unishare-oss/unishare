import { Injectable } from '@nestjs/common'
import { PostRequestStatus, Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { paginate } from '@/common/utils/paginate'
import { PaginationDto } from '@/common/dto/pagination.dto'

const suggestionInclude = {
  user: { select: { id: true, name: true, image: true } },
  post: {
    select: {
      id: true,
      title: true,
      shortCode: true,
      type: true,
      author: { select: { id: true, name: true, image: true } },
    },
  },
} satisfies Prisma.PostRequestFulfillmentInclude

const requestInclude = (userId?: string) =>
  ({
    author: { select: { id: true, name: true, image: true } },
    course: { select: { id: true, code: true, name: true } },
    fulfilledByPost: { select: { id: true, title: true, shortCode: true } },
    upvotes: userId ? { where: { userId }, select: { userId: true } } : false,
    _count: { select: { upvotes: true } },
  }) satisfies Prisma.PostRequestInclude

const requestDetailInclude = (userId?: string) =>
  ({
    ...requestInclude(userId),
    suggestions: {
      include: suggestionInclude,
      orderBy: { createdAt: 'asc' as const },
    },
  }) satisfies Prisma.PostRequestInclude

function mapRequest(r: any, userId?: string) {
  const { _count, upvotes, authorId: _authorId, courseId: _courseId, ...rest } = r
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
      include: requestDetailInclude(userId),
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

  findSuggestion(id: string) {
    return this.prisma.postRequestFulfillment.findUnique({
      where: { id },
      include: suggestionInclude,
    })
  }

  findSuggestionByUser(requestId: string, userId: string) {
    return this.prisma.postRequestFulfillment.findUnique({
      where: { requestId_userId: { requestId, userId } },
    })
  }

  createSuggestion(requestId: string, postId: string, userId: string) {
    return this.prisma.postRequestFulfillment.create({
      data: { requestId, postId, userId },
      include: suggestionInclude,
    })
  }

  deleteSuggestion(id: string) {
    return this.prisma.postRequestFulfillment.delete({ where: { id } })
  }

  acceptSuggestion(requestId: string, postId: string, userId: string) {
    return this.prisma.postRequest
      .update({
        where: { id: requestId },
        data: { status: PostRequestStatus.FULFILLED, fulfilledByPostId: postId },
        include: requestDetailInclude(userId),
      })
      .then((r) => mapRequest(r, userId))
  }

  delete(id: string) {
    return this.prisma.postRequest.delete({ where: { id } })
  }
}
