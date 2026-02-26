import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { nanoid } from 'nanoid'
import { PostStatus, UserRole } from '@/generated/prisma/client'
import { PostsRepository } from './posts.repository'
import { CreatePostDto } from './dto/create-post.dto'
import { ListPostsDto } from './dto/list-posts.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { UpdatePostStatusDto } from './dto/update-post-status.dto'

@Injectable()
export class PostsService {
  constructor(private readonly postsRepository: PostsRepository) {}

  create(dto: CreatePostDto, userId: string) {
    const shortCode = nanoid(8)
    return this.postsRepository.create({ shortCode, authorId: userId, ...dto })
  }

  findAll(query: ListPostsDto, userRole?: UserRole) {
    const canSeeAll = userRole === UserRole.MODERATOR || userRole === UserRole.ADMIN
    const { courseId, type, status, ...pagination } = query

    const where = {
      deletedAt: null,
      ...(courseId && { courseId }),
      ...(type && { type }),
      status: canSeeAll && status ? status : PostStatus.APPROVED,
    }

    return this.postsRepository.findAll(where, pagination)
  }

  async findOne(id: string) {
    const post = await this.postsRepository.findById(id)
    if (!post) throw new NotFoundException('Post not found')
    return post
  }

  async findByShortCode(shortCode: string) {
    const post = await this.postsRepository.findByShortCode(shortCode)
    if (!post) throw new NotFoundException('Post not found')
    return post
  }

  async update(id: string, dto: UpdatePostDto, userId: string) {
    const post = await this.findOne(id)
    if (post.authorId !== userId) throw new ForbiddenException('You do not own this post')
    return this.postsRepository.update(id, dto)
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const post = await this.findOne(id)
    const isOwner = post.authorId === userId
    const isAdmin = userRole === UserRole.ADMIN
    if (!isOwner && !isAdmin) throw new ForbiddenException('You do not own this post')
    return this.postsRepository.softDelete(id)
  }

  async updateStatus(id: string, dto: UpdatePostStatusDto) {
    await this.findOne(id)
    return this.postsRepository.updateStatus(id, dto.status)
  }
}
