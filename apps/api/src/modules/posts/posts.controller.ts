import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common'
import {
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import { UserThrottlerGuard } from '@/common/guards/user-throttler.guard'
import { ThrottleBucket } from '@/common/decorators/throttle-bucket.decorator'
import { OptionalAuth, Roles, Session } from '@thallesp/nestjs-better-auth'
import { IsArray, IsString, MinLength, MaxLength, Matches, ArrayMaxSize } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '@/generated/prisma/client'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { formatSseEvent, SSE_HEADERS } from '@/common/utils/sse'
import { UserSession } from '@/auth/auth.config'
import { PostsService } from './posts.service'
import { TrendingService } from '@/modules/trending/trending.service'
import { CreatePostDto } from './dto/create-post.dto'
import { ListPostsDto } from './dto/list-posts.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { UpdatePostStatusDto } from './dto/update-post-status.dto'
import { ReactToPostDto } from './dto/react-to-post.dto'
import { AiChatDto, AiChatResponseDto } from './dto/ai-chat.dto'
import { AiIndexStatusDto } from './dto/ai-index-status.dto'
import { PostDetailEntity } from './entities/post.entity'
import { PaginatedPostEntity } from './entities/paginated-post.entity'

class TagPostDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(2, { each: true })
  @MaxLength(50, { each: true })
  @Matches(/^[a-z0-9\s\-&()]+$/i, { each: true, message: 'Invalid tag name' })
  tags: string[]
}

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  private readonly logger = new Logger(PostsController.name)

  constructor(
    private readonly postsService: PostsService,
    private readonly trendingService: TrendingService,
  ) {}

  @Post()
  @ApiCreatedResponse({ type: PostDetailEntity })
  @ResponseMessage('Post created successfully')
  create(@Body() dto: CreatePostDto, @Session() session: UserSession) {
    return this.postsService.create(dto, session.user.id, session.user.departmentId)
  }

  @Get()
  @OptionalAuth()
  @ApiOkResponse({ type: PaginatedPostEntity })
  @ResponseMessage('Posts fetched successfully')
  findAll(@Query() query: ListPostsDto, @Session() session: UserSession) {
    return this.postsService.findAll(query, {
      role: session?.user?.role as UserRole | undefined,
      id: session?.user?.id,
    })
  }

  @Get('saved')
  @ApiOkResponse({ type: PaginatedPostEntity })
  @ResponseMessage('Saved posts fetched successfully')
  getSavedPosts(@Query() query: PaginationDto, @Session() session: UserSession) {
    return this.postsService.getSavedPosts(session.user.id, query)
  }

  @Get('s/:shortCode')
  @OptionalAuth()
  @ApiOkResponse({ type: PostDetailEntity })
  @ResponseMessage('Post fetched successfully')
  findByShortCode(@Param('shortCode') shortCode: string, @Session() session: UserSession) {
    return this.postsService.findByShortCode(shortCode, {
      role: session?.user?.role as UserRole | undefined,
      id: session?.user?.id,
    })
  }

  @Get('search')
  @OptionalAuth()
  @ApiOkResponse({ description: 'Search results with pagination' })
  @ResponseMessage('Search completed successfully')
  search(
    @Query('q') q: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const pageNum = parseInt(page, 10) || 1
    const limitNum = parseInt(limit, 10) || 20
    return this.postsService.searchPosts(q, limitNum, pageNum)
  }

  @Get('trending')
  @OptionalAuth()
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (1-indexed)',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Results per page',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        success: true,
        data: {
          posts: [
            {
              id: 'post123',
              title: 'Linear Algebra Notes',
              trendingScore: 42.5,
              views: 150,
              createdAt: '2026-03-19T12:00:00Z',
            },
          ],
          total: 250,
          page: 1,
          limit: 20,
        },
      },
    },
  })
  @ResponseMessage('Trending posts fetched successfully')
  async getTrendingPosts(@Query('page') page: string = '1', @Query('limit') limit: string = '20') {
    const pageNum = parseInt(page, 10) || 1
    const limitNum = parseInt(limit, 10) || 20
    return this.trendingService.getTrendingPosts(limitNum, pageNum)
  }

  @Get(':id/ai-index-status')
  @OptionalAuth()
  @ApiOperation({ summary: 'Progress of document indexing for AI chat' })
  @ApiOkResponse({ type: AiIndexStatusDto })
  @ResponseMessage('AI index status fetched successfully')
  getAiIndexStatus(@Param('id') id: string) {
    return this.postsService.getAiIndexStatus(id)
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOkResponse({ type: PostDetailEntity })
  @ResponseMessage('Post fetched successfully')
  findOne(@Param('id') id: string, @Session() session: UserSession) {
    return this.postsService.findOne(id, {
      role: session?.user?.role as UserRole | undefined,
      id: session?.user?.id,
    })
  }

  @Post(':id/save')
  @ResponseMessage('Post saved successfully')
  savePost(@Param('id') id: string, @Session() session: UserSession) {
    return this.postsService.savePost(id, session.user.id)
  }

  @Delete(':id/save')
  @ResponseMessage('Post unsaved successfully')
  unsavePost(@Param('id') id: string, @Session() session: UserSession) {
    return this.postsService.unsavePost(id, session.user.id)
  }

  @Post(':id/react')
  @ApiOkResponse({ type: PostDetailEntity })
  @ResponseMessage('Reaction updated')
  react(@Param('id') id: string, @Body() dto: ReactToPostDto, @Session() session: UserSession) {
    return this.postsService.toggleReaction(id, dto, session.user.id, session.user.role as UserRole)
  }

  @Patch(':id/status')
  @Roles(['MODERATOR', 'ADMIN'])
  @ApiOkResponse({ type: PostDetailEntity })
  @ResponseMessage('Post status updated successfully')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePostStatusDto,
    @Session() session: UserSession,
  ) {
    return this.postsService.updateStatus(id, dto, {
      id: session.user.id,
      role: session.user.role as UserRole,
    })
  }

  @Patch(':id')
  @ApiOkResponse({ type: PostDetailEntity })
  @ResponseMessage('Post updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdatePostDto, @Session() session: UserSession) {
    return this.postsService.update(id, dto, session.user.id)
  }

  @Delete(':id')
  @ResponseMessage('Post deleted successfully')
  remove(@Param('id') id: string, @Session() session: UserSession) {
    return this.postsService.remove(id, session.user.id, session.user.role as UserRole)
  }

  @Post(':id/ai-chat')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ThrottleBucket('ai-chat')
  @ApiOperation({ summary: 'Chat with a post using AI' })
  @ApiOkResponse({ type: AiChatResponseDto, description: 'AI response to the user message' })
  @ResponseMessage('AI response generated')
  aiChat(@Param('id') id: string, @Body() dto: AiChatDto, @Session() session: UserSession) {
    return this.postsService.chatWithPost(id, dto, session.user.id)
  }

  /**
   * The same answer as `aiChat`, streamed.
   *
   * A POST rather than `@Sse()`, because EventSource can only issue GETs and the conversation
   * history — up to 20 messages of 4000 characters — does not belong in a query string. The
   * frames are therefore written by hand; `ResponseInterceptor` leaves them alone both because
   * `@Res()` takes the response out of Nest's hands and because it already skips
   * `accept: text/event-stream`.
   *
   * Hidden from Swagger with `@ApiExcludeEndpoint`. An SSE endpoint generates nothing useful
   * through Orval — the frontend calls it with `fetch` directly — and excluding it keeps
   * openapi.json, and every generated hook, byte-identical.
   *
   * Guarded and throttled exactly as `aiChat` is. Note the buckets are per-handler, so a user has
   * 20 streamed turns and 20 one-shot turns per minute rather than 20 shared; the frontend only
   * uses one path at a time.
   */
  @Post(':id/ai-chat/stream')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ThrottleBucket('ai-chat')
  @ApiExcludeEndpoint()
  async aiChatStream(
    @Param('id') id: string,
    @Body() dto: AiChatDto,
    @Session() session: UserSession,
    @Res() res: Response,
  ) {
    const stream = await this.postsService.chatWithPostStream(id, dto, session.user.id)
    const iterator = stream[Symbol.asyncIterator]()

    // The first event is pulled BEFORE a single header goes out, and that ordering is the whole
    // reason this handler is written by hand. Everything that can fail up front — an unconfigured
    // provider (503), a rate-limited first call (503), a post that cannot be read (404/403) —
    // fails here, while the response is still an ordinary one that HttpExceptionFilter can turn
    // into a real status code. The frontend's error copy is keyed on those codes.
    const first = await iterator.next()

    let clientGone = false
    res.on('close', () => {
      clientGone = true
    })

    res.writeHead(200, SSE_HEADERS)
    res.flushHeaders?.()

    try {
      for (let result = first; !result.done; result = await iterator.next()) {
        if (clientGone) break
        res.write(formatSseEvent(result.value))
      }
    } catch (err) {
      // Past this point the status line has been sent and cannot be changed, so a failure has to
      // travel as an event. It carries the status the client would otherwise have read off the
      // response, so a mid-stream 429 still renders as "the AI service is busy" rather than as an
      // answer that simply stopped mid-sentence.
      const status = err instanceof HttpException ? err.getStatus() : 500
      const message =
        err instanceof HttpException ? err.message : 'Something went wrong. Please try again.'
      this.logger.warn(`AI chat stream failed for post ${id} after opening: ${String(err)}`)
      if (!clientGone) res.write(formatSseEvent({ type: 'error', status, message }))
    } finally {
      // Runs on the client-disconnect break too, and `return()` is what propagates the abort down
      // to the provider so a browser tab closing stops the generation.
      await iterator.return?.()
      res.end()
    }
  }

  @Post(':id/summarize')
  @ApiOkResponse({ type: PostDetailEntity })
  @ResponseMessage('Summary generation started')
  summarize(@Param('id') id: string, @Session() session: UserSession) {
    return this.postsService.regenerateSummary(id, session.user.id, session.user.role as UserRole)
  }

  @Post(':id/tags')
  @ApiOkResponse({ type: PostDetailEntity })
  @ResponseMessage('Tags added successfully')
  addTags(@Param('id') id: string, @Body() dto: TagPostDto, @Session() session: UserSession) {
    return this.postsService.tagPost(id, dto.tags, session.user.id, session.user.role as UserRole)
  }

  @Delete(':id/tags/:tagId')
  @ResponseMessage('Tag removed successfully')
  removeTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Session() session: UserSession,
  ) {
    return this.postsService.untagPost(id, tagId, session.user.id, session.user.role as UserRole)
  }
}
