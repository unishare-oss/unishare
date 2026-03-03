import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'

const commentInclude = {
  user: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
} satisfies Prisma.CommentInclude

@Injectable()
export class CommentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: commentInclude,
    })
  }

  findById(id: string) {
    return this.prisma.comment.findUnique({
      where: { id },
      include: {
        ...commentInclude,
        post: {
          select: {
            authorId: true,
          },
        },
      },
    })
  }

  create(postId: string, userId: string, dto: CreateCommentDto) {
    return this.prisma.comment.create({
      data: {
        postId,
        userId,
        content: dto.content,
      },
      include: commentInclude,
    })
  }

  update(id: string, dto: UpdateCommentDto) {
    return this.prisma.comment.update({
      where: { id },
      data: {
        ...(dto.content !== undefined ? { content: dto.content } : {}),
      },
      include: commentInclude,
    })
  }

  softDelete(id: string) {
    return this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: commentInclude,
    })
  }
}
