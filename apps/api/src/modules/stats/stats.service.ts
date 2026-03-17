import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      totalPosts,
      totalComments,
      totalReactions,
      topPostsByViews,
      topPostsByReactions,
      topUsers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.post.count({ where: { deletedAt: null } }),
      this.prisma.comment.count({ where: { deletedAt: null } }),
      this.prisma.reaction.count(),

      this.prisma.post.findMany({
        where: { deletedAt: null, status: 'APPROVED' },
        orderBy: { views: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          shortCode: true,
          views: true,
          _count: { select: { reactions: true } },
          author: { select: { name: true } },
        },
      }),

      this.prisma.post.findMany({
        where: { deletedAt: null, status: 'APPROVED' },
        orderBy: { reactions: { _count: 'desc' } },
        take: 5,
        select: {
          id: true,
          title: true,
          shortCode: true,
          views: true,
          _count: { select: { reactions: true } },
          author: { select: { name: true } },
        },
      }),

      this.prisma.$queryRaw<
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
      `),
    ])

    return {
      overview: { totalUsers, totalPosts, totalComments, totalReactions },
      topPostsByViews: topPostsByViews.map((p) => ({
        id: p.id,
        title: p.title ?? '(Untitled)',
        shortCode: p.shortCode,
        views: p.views,
        reactionCount: p._count.reactions,
        authorName: p.author.name,
      })),
      topPostsByReactions: topPostsByReactions.map((p) => ({
        id: p.id,
        title: p.title ?? '(Untitled)',
        shortCode: p.shortCode,
        views: p.views,
        reactionCount: p._count.reactions,
        authorName: p.author.name,
      })),
      topUsers: topUsers.map((u) => ({
        id: u.id,
        name: u.name,
        image: u.image,
        postCount: Number(u.postCount),
        departmentName: u.departmentName,
      })),
    }
  }
}
