import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Session, UserSession } from '@thallesp/nestjs-better-auth'
import { UserRole } from '@/generated/prisma/client'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { CommentsService } from './comments.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'
import { CommentEntity } from './entities/comment.entity'

@ApiTags('comments')
@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @OptionalAuth()
  @ApiOkResponse({ type: [CommentEntity] })
  @ResponseMessage('Comments fetched successfully')
  findAll(@Param('postId') postId: string) {
    return this.commentsService.findAll(postId)
  }

  @Post()
  @ApiOkResponse({ type: CommentEntity })
  @ResponseMessage('Comment created successfully')
  create(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @Session() session: UserSession,
  ) {
    return this.commentsService.create(postId, dto, session.user.id)
  }

  @Patch(':commentId')
  @ApiOkResponse({ type: CommentEntity })
  @ResponseMessage('Comment updated successfully')
  update(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @Session() session: UserSession,
  ) {
    return this.commentsService.update(postId, commentId, dto, session.user.id)
  }

  @Delete(':commentId')
  @ApiOkResponse({ type: CommentEntity })
  @ResponseMessage('Comment deleted successfully')
  remove(
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
    @Session() session: UserSession,
  ) {
    return this.commentsService.remove(
      postId,
      commentId,
      session.user.id,
      session.user.role as UserRole,
    )
  }
}
