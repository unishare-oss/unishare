import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'

export const commentSelect = {
  id: true,
  content: true,
  userId: true,
  postId: true,
  parentId: true,
  mentionIds: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
} satisfies Prisma.CommentSelect

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      select: commentSelect,
    })
  }

  findUserNames(ids: string[]) {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    })
  }

  findById(id: string) {
    return this.prisma.comment.findUnique({
      where: { id },
      select: {
        ...commentSelect,
        postId: true,
        userId: true,
        deletedAt: true,
        post: {
          select: {
            authorId: true,
          },
        },
      },
    })
  }

  create(postId: string, userId: string, dto: CreateCommentDto, mentionIds: string[]) {
    return this.prisma.comment.create({
      data: {
        postId,
        userId,
        content: dto.content,
        mentionIds,
        ...(dto.parentId ? { parentId: dto.parentId } : {}),
      },
      select: commentSelect,
    })
  }

  update(id: string, dto: UpdateCommentDto, mentionIds?: string[]) {
    return this.prisma.comment.update({
      where: { id },
      data: {
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(mentionIds !== undefined ? { mentionIds } : {}),
      },
      select: commentSelect,
    })
  }

  softDelete(id: string) {
    return this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: commentSelect,
    })
  }
}
