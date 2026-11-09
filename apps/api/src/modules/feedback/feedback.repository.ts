import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { FeedbackType, Prisma } from '@/generated/prisma/client'
import { UniversityScope, userInScope } from '@/common/university-scope'

@Injectable()
export class FeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { type: FeedbackType; message: string; userId?: string }) {
    return this.prisma.feedback.create({
      data: {
        type: data.type,
        message: data.message,
        userId: data.userId,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    })
  }

  async findAll(
    filters: { type?: FeedbackType; page: number; limit: number },
    scope: UniversityScope,
  ) {
    const { type, page, limit } = filters
    const skip = (page - 1) * limit

    const where: Prisma.FeedbackWhereInput = {
      // Feedback belongs to its sender's university; signed-out feedback is for admins only
      AND: [type ? { type } : {}, scope.kind === 'all' ? {} : { user: userInScope(scope) }],
    }

    const [items, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.feedback.count({ where }),
    ])

    return { items, total, page, limit }
  }
}
