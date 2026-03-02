import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { UserRole } from '@/generated/prisma/client'
import { PostsService } from '../posts.service'
import { CommentsRepository } from './comments.repository'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly postsService: PostsService,
  ) {}

  async findAll(postId: string) {
    await this.postsService.assertCommentTargetExists(postId)
    return this.commentsRepository.findAll(postId)
  }

  async create(postId: string, dto: CreateCommentDto, userId: string) {
    await this.postsService.assertCommentTargetExists(postId)
    return this.commentsRepository.create(postId, userId, dto)
  }

  async update(postId: string, commentId: string, dto: UpdateCommentDto, userId: string) {
    await this.postsService.assertCommentTargetExists(postId)

    const comment = await this.commentsRepository.findById(commentId)
    if (!comment || comment.postId !== postId || comment.deletedAt) {
      throw new NotFoundException('Comment not found')
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You do not own this comment')
    }

    return this.commentsRepository.update(commentId, dto)
  }

  async remove(postId: string, commentId: string, userId: string, userRole: UserRole) {
    await this.postsService.assertCommentTargetExists(postId)

    const comment = await this.commentsRepository.findById(commentId)
    if (!comment || comment.postId !== postId || comment.deletedAt) {
      throw new NotFoundException('Comment not found')
    }

    const isCommentOwner = comment.userId === userId
    const isPostOwner = comment.post.authorId === userId
    const isAdmin = userRole === UserRole.ADMIN

    // Comment deletion is shared across the comment owner, the parent post owner, and admins.
    if (!isCommentOwner && !isPostOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete this comment')
    }

    return this.commentsRepository.softDelete(commentId)
  }
}
