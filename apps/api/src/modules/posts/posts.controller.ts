import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Roles, Session } from '@thallesp/nestjs-better-auth'
import { UserRole } from '@/generated/prisma/client'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UserSession } from '@/auth/auth.config'
import { PostsService } from './posts.service'
import { CreatePostDto } from './dto/create-post.dto'
import { ListPostsDto } from './dto/list-posts.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { UpdatePostStatusDto } from './dto/update-post-status.dto'
import { ReactToPostDto } from './dto/react-to-post.dto'
import { PostDetailEntity } from './entities/post.entity'
import { PaginatedPostEntity } from './entities/paginated-post.entity'

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

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
    return this.postsService.findByShortCode(shortCode, session?.user?.id)
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOkResponse({ type: PostDetailEntity })
  @ResponseMessage('Post fetched successfully')
  findOne(@Param('id') id: string, @Session() session: UserSession) {
    return this.postsService.findOne(id, session?.user?.id)
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
    return this.postsService.toggleReaction(id, dto, session.user.id)
  }

  @Patch(':id/status')
  @Roles(['MODERATOR', 'ADMIN'])
  @ApiOkResponse({ type: PostDetailEntity })
  @ResponseMessage('Post status updated successfully')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePostStatusDto) {
    return this.postsService.updateStatus(id, dto)
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
}
