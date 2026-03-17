import { Injectable } from '@nestjs/common'
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

      this.prisma.user.findMany({
        orderBy: { posts: { _count: 'desc' } },
        take: 5,
        select: {
          id: true,
          name: true,
          image: true,
          _count: { select: { posts: { where: { deletedAt: null } } } },
          department: { select: { name: true } },
        },
      }),
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
        postCount: u._count.posts,
        departmentName: u.department?.name ?? null,
      })),
    }
  }
}
