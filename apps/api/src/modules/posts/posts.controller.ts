import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Roles, Session, UserSession } from '@thallesp/nestjs-better-auth'
import { UserRole } from '@/generated/prisma/client'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { PostsService } from './posts.service'
import { CreatePostDto } from './dto/create-post.dto'
import { ListPostsDto } from './dto/list-posts.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { UpdatePostStatusDto } from './dto/update-post-status.dto'

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ResponseMessage('Post created successfully')
  create(@Body() dto: CreatePostDto, @Session() session: UserSession) {
    return this.postsService.create(dto, session.user.id)
  }

  @Get()
  @OptionalAuth()
  @ResponseMessage('Posts fetched successfully')
  findAll(@Query() query: ListPostsDto, @Session() session: UserSession) {
    return this.postsService.findAll(query, session?.user?.role as UserRole | undefined)
  }

  @Get('s/:shortCode')
  @OptionalAuth()
  @ResponseMessage('Post fetched successfully')
  findByShortCode(@Param('shortCode') shortCode: string) {
    return this.postsService.findByShortCode(shortCode)
  }

  @Get(':id')
  @OptionalAuth()
  @ResponseMessage('Post fetched successfully')
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(id)
  }

  @Patch(':id/status')
  @Roles(['MODERATOR', 'ADMIN'])
  @ResponseMessage('Post status updated successfully')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePostStatusDto) {
    return this.postsService.updateStatus(id, dto)
  }

  @Patch(':id')
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
