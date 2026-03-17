import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countUsers() {
    return this.prisma.user.count()
  }

  countPosts() {
    return this.prisma.post.count({ where: { deletedAt: null } })
  }

  countComments() {
    return this.prisma.comment.count({ where: { deletedAt: null } })
  }

  countReactions() {
    return this.prisma.reaction.count()
  }

  findTopPostsByViews() {
    return this.prisma.post.findMany({
      where: { deletedAt: null, status: 'APPROVED' },
      orderBy: { views: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        shortCode: true,
        views: true,
        isAnonymous: true,
        _count: { select: { reactions: true } },
        author: { select: { name: true } },
      },
    })
  }

  findTopPostsByReactions() {
    return this.prisma.post.findMany({
      where: { deletedAt: null, status: 'APPROVED' },
      orderBy: { reactions: { _count: 'desc' } },
      take: 5,
      select: {
        id: true,
        title: true,
        shortCode: true,
        views: true,
        isAnonymous: true,
        _count: { select: { reactions: true } },
        author: { select: { name: true } },
      },
    })
  }

  findTopUsersByPostCount() {
    return this.prisma.$queryRaw<
      {
        id: string
        name: string
        image: string | null
        postCount: bigint
        departmentName: string | null
      }[]
    >(Prisma.sql`
      SELECT u.id, u.name, u.image,
             COUNT(p.id) AS "postCount",
             d.name AS "departmentName"
      FROM "user" u
      LEFT JOIN "post" p
        ON p."authorId" = u.id
        AND p."deletedAt" IS NULL
        AND p."isAnonymous" = false
      LEFT JOIN "department" d ON d.id = u."departmentId"
      GROUP BY u.id, u.name, u.image, d.name
      ORDER BY "postCount" DESC
      LIMIT 5
    `)
  }
}
