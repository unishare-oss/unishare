import { BadRequestException, Injectable } from '@nestjs/common'
import { FollowsRepository } from './follows.repository'

@Injectable()
export class FollowsService {
  constructor(private readonly followsRepository: FollowsRepository) {}

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself')
    }
    return this.followsRepository.follow(followerId, followingId)
  }

  unfollow(followerId: string, followingId: string) {
    return this.followsRepository.unfollow(followerId, followingId)
  }

  isFollowing(followerId: string, followingId: string) {
    return this.followsRepository.isFollowing(followerId, followingId)
  }

  getFollowerIds(followingId: string) {
    return this.followsRepository.getFollowerIds(followingId)
  }

  countFollowers(followingId: string) {
    return this.followsRepository.countFollowers(followingId)
  }
}
