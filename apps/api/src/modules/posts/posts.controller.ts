import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { UserThrottlerGuard } from '@/common/guards/user-throttler.guard'
import { OptionalAuth, Roles, Session } from '@thallesp/nestjs-better-auth'
import { IsArray, IsString, MinLength, MaxLength, Matches, ArrayMaxSize } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '@/generated/prisma/client'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UserSession } from '@/auth/auth.config'
import { PostsService } from './posts.service'
import { TrendingService } from '@/modules/trending/trending.service'
import { CreatePostDto } from './dto/create-post.dto'
import { ListPostsDto } from './dto/list-posts.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { UpdatePostStatusDto } from './dto/update-post-status.dto'
import { ReactToPostDto } from './dto/react-to-post.dto'
import { AiChatDto, AiChatResponseDto } from './dto/ai-chat.dto'
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
  constructor(
    private readonly postsService: PostsService,
    private readonly trendingService: TrendingService,
  ) {}

  @Post()
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
  @ApiOperation({ summary: 'Chat with a post using AI' })
  @ApiOkResponse({ type: AiChatResponseDto, description: 'AI response to the user message' })
  @ResponseMessage('AI response generated')
  aiChat(@Param('id') id: string, @Body() dto: AiChatDto, @Session() session: UserSession) {
    return this.postsService.chatWithPost(id, dto, session.user.id)
  }

  @Post(':id/summarize')
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
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
