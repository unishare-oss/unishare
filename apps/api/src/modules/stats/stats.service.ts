import { Injectable } from '@nestjs/common'
import { StatsRepository } from './stats.repository'

@Injectable()
export class StatsService {
  constructor(private readonly statsRepository: StatsRepository) {}

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
      this.statsRepository.countUsers(),
      this.statsRepository.countPosts(),
      this.statsRepository.countComments(),
      this.statsRepository.countReactions(),
      this.statsRepository.findTopPostsByViews(),
      this.statsRepository.findTopPostsByReactions(),
      this.statsRepository.findTopUsersByPostCount(),
    ])

    return {
      overview: { totalUsers, totalPosts, totalComments, totalReactions },
      topPostsByViews: topPostsByViews.map((p) => ({
        id: p.id,
        title: p.title ?? '(Untitled)',
        shortCode: p.shortCode,
        views: p.views,
        reactionCount: p._count.reactions,
        authorName: p.isAnonymous ? null : p.author.name,
      })),
      topPostsByReactions: topPostsByReactions.map((p) => ({
        id: p.id,
        title: p.title ?? '(Untitled)',
        shortCode: p.shortCode,
        views: p.views,
        reactionCount: p._count.reactions,
        authorName: p.isAnonymous ? null : p.author.name,
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
