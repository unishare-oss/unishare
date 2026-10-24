import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Prisma, UserRole } from '@/generated/prisma/client'
import { NotificationsService } from '../../notifications/notifications.service'
import { FollowsService } from '../../follows/follows.service'
import { PostsService } from '../posts.service'
import { AuditService } from '../../audit/audit.service'
import { AuditAction } from '../../audit/audit.actions'
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

type CommentResponseNode = Omit<CommentTreeNode, 'mentionIds' | 'children'> & {
  mentions: { id: string; name: string }[]
  children?: CommentResponseNode[]
}

const DELETED_COMMENT_CONTENT = 'This comment was deleted.'
const DELETED_COMMENT_USER = {
  id: '',
  name: 'Deleted user',
  image: null,
} as const

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name)

  constructor(
    private readonly commentsRepository: CommentsRepository,
    private readonly postsService: PostsService,
    private readonly notificationsService: NotificationsService,
    private readonly audit: AuditService,
    private readonly followsService: FollowsService,
  ) {}

  async findAll(postId: string) {
    await this.postsService.assertCommentTargetExists(postId)

    const comments = await this.commentsRepository.findAll(postId)
    return this.withMentions(this.sanitizeCommentTree(this.buildCommentTree(comments)))
  }

  async create(postId: string, dto: CreateCommentDto, userId: string) {
    const post = await this.postsService.getNotificationTarget(postId)

    if (dto.parentId) {
      const parentComment = await this.commentsRepository.findById(dto.parentId)
      if (!parentComment || parentComment.postId !== postId || parentComment.deletedAt) {
        throw new NotFoundException('Parent comment not found')
      }
    }

    const mentionIds = await this.followsService.keepConnected(userId, dto.mentions ?? [])
    const created = await this.commentsRepository.create(postId, userId, dto, mentionIds)
    const [comment] = await this.withMentions([created])
    // Fire-and-forget: the comment is already saved. There is no unhandledRejection handler in
    // this app, so an escaped rejection would take the process down; log it instead.
    void this.notificationsService
      .notifyMentions({
        postId,
        commentId: comment.id,
        actorName: comment.user.name,
        postTitle: post.title,
        recipientIds: mentionIds,
      })
      .catch((err: unknown) => this.logNotifyFailure('mention', comment.id, err))
    void this.notificationsService
      .notifyComment(postId, post.authorId, userId, post.title, comment.user.name, mentionIds)
      .catch((err: unknown) => this.logNotifyFailure('comment', comment.id, err))
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

    const updated = await this.commentsRepository.update(commentId, dto)
    const [result] = await this.withMentions([updated])
    return result
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
    this.audit.record({
      action: AuditAction.CommentDelete,
      actorId: userId,
      actorRole: userRole,
      targetType: 'comment',
      targetId: commentId,
      metadata: { postId, authorId: comment.userId, byOwner: isCommentOwner },
    })
    const [result] = await this.withMentions([this.sanitizeComment(deletedComment)])
    return result
  }

  async withMentions(comments: CommentTreeNode[]): Promise<CommentResponseNode[]> {
    const ids = new Set<string>()
    const collect = (nodes: CommentTreeNode[]) => {
      for (const node of nodes) {
        if (!node.deletedAt) node.mentionIds.forEach((id) => ids.add(id))
        if (node.children) collect(node.children)
      }
    }
    collect(comments)

    const users = ids.size > 0 ? await this.commentsRepository.findUserNames([...ids]) : []
    const names = new Map(users.map((user) => [user.id, user.name]))

    const attach = (nodes: CommentTreeNode[]): CommentResponseNode[] =>
      nodes.map(({ mentionIds, children, ...rest }) => ({
        ...rest,
        mentions: rest.deletedAt
          ? []
          : mentionIds.flatMap((id) => {
              const name = names.get(id)
              return name === undefined ? [] : [{ id, name }]
            }),
        ...(children ? { children: attach(children) } : {}),
      }))

    return attach(comments)
  }

  private logNotifyFailure(kind: 'mention' | 'comment', commentId: string, err: unknown) {
    const reason = err instanceof Error ? err.message : String(err)
    this.logger.warn(`Failed to send ${kind} notifications for comment ${commentId}: ${reason}`)
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

  private sanitizeCommentTree(comments: CommentTreeNode[]): CommentTreeNode[] {
    return comments.map((comment) => this.sanitizeComment(comment))
  }

  private sanitizeComment(comment: CommentTreeNode): CommentTreeNode {
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
