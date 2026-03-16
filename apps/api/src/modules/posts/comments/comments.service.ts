import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, UserRole } from '@/generated/prisma/client'
import { NotificationsService } from '../../notifications/notifications.service'
import { PostsService } from '../posts.service'
import { commentSelect, CommentsRepository } from './comments.repository'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'

type FlatCommentNode = Prisma.CommentGetPayload<{
  select: typeof commentSelect
}>

type CommentWithChildren = FlatCommentNode & {
  children: CommentTreeNode[]
}

type CommentTreeNode = FlatCommentNode & {
  children?: CommentTreeNode[]
}

type CommentResponseNode = CommentTreeNode

const DELETED_COMMENT_CONTENT = 'This comment was deleted.'
const DELETED_COMMENT_USER = {
  id: '',
  name: 'Deleted user',
  image: null,
} as const

@Injectable()
export class CommentsService {
  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly postsService: PostsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(postId: string) {
    await this.postsService.assertCommentTargetExists(postId)

    const comments = await this.commentsRepository.findAll(postId)
    return this.sanitizeCommentTree(this.buildCommentTree(comments))
  }

  async create(postId: string, dto: CreateCommentDto, userId: string) {
    const post = await this.postsService.getNotificationTarget(postId)

    if (dto.parentId) {
      const parentComment = await this.commentsRepository.findById(dto.parentId)
      if (!parentComment || parentComment.postId !== postId || parentComment.deletedAt) {
        throw new NotFoundException('Parent comment not found')
      }
    }

    const comment = await this.commentsRepository.create(postId, userId, dto)
    void this.notificationsService.notifyComment(
      postId,
      post.authorId,
      userId,
      post.title,
      comment.user.name,
    )
    return comment
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

    const deletedComment = await this.commentsRepository.softDelete(commentId)
    return this.sanitizeComment(deletedComment)
  }

  private buildCommentTree(comments: FlatCommentNode[]) {
    const nodes = new Map<string, CommentWithChildren>(
      comments.map((comment) => [comment.id, { ...comment, children: [] }]),
    )

    const roots: CommentTreeNode[] = []
    for (const comment of nodes.values()) {
      if (comment.parentId) {
        const parent = nodes.get(comment.parentId)
        if (parent) {
          parent.children.push(comment)
          continue
        }
      }

      roots.push(comment)
    }

    return roots
  }

  private sanitizeCommentTree(comments: CommentTreeNode[]): CommentResponseNode[] {
    return comments.map((comment) => this.sanitizeComment(comment))
  }

  private sanitizeComment(comment: CommentTreeNode): CommentResponseNode {
    const children = comment.children ? this.sanitizeCommentTree(comment.children) : undefined

    if (!comment.deletedAt) {
      return {
        ...comment,
        ...(children ? { children } : {}),
      }
    }

    return {
      ...comment,
      content: DELETED_COMMENT_CONTENT,
      userId: '',
      user: DELETED_COMMENT_USER,
      ...(children ? { children } : {}),
    }
  }
}
