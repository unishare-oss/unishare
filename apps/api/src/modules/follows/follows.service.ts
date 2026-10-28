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

  getFollowers(followingId: string) {
    return this.followsRepository.getFollowers(followingId)
  }

  getFollowing(followerId: string) {
    return this.followsRepository.getFollowing(followerId)
  }

  getMentionable(userId: string, q = '') {
    return this.followsRepository.findMentionable(userId, q)
  }

  keepConnected(authorId: string, ids: string[]) {
    const unique = [...new Set(ids)].filter((id) => id !== authorId)
    return this.followsRepository.filterConnected(authorId, unique)
  }

  countFollowers(followingId: string) {
    return this.followsRepository.countFollowers(followingId)
  }

  countFollowing(followerId: string) {
    return this.followsRepository.countFollowing(followerId)
  }
}
