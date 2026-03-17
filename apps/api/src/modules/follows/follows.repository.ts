import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class FollowsRepository {
  constructor(private readonly prisma: PrismaService) {}

  follow(followerId: string, followingId: string) {
    return this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    })
  }

  unfollow(followerId: string, followingId: string) {
    return this.prisma.follow.deleteMany({ where: { followerId, followingId } })
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const record = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
      select: { followerId: true },
    })
    return record !== null
  }

  async getFollowerIds(followingId: string): Promise<string[]> {
    const rows = await this.prisma.follow.findMany({
      where: { followingId },
      select: { followerId: true },
    })
    return rows.map((r) => r.followerId)
  }

  countFollowers(followingId: string) {
    return this.prisma.follow.count({ where: { followingId } })
  }
}
