import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { GuestReadOnly } from '@/common/decorators/guest-read-only.decorator'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { UniversityScopeParam } from '@/common/decorators/university-scope.decorator'
import type { UniversityScope } from '@/common/university-scope'
import { ReadingListsService } from './reading-lists.service'
import { CreateReadingListDto } from './dto/create-reading-list.dto'
import { UpdateReadingListDto } from './dto/update-reading-list.dto'
import { ReadingListEntity } from './entities/reading-list.entity'
import { PostsService } from '../posts/posts.service'
import { UserRole } from '@/generated/prisma/enums'

@ApiTags('reading-lists')
@GuestReadOnly()
@Controller('reading-lists')
export class ReadingListsController {
  constructor(
    private readonly readingListsService: ReadingListsService,
    private readonly postsService: PostsService,
  ) {}

  @Post()
  @ApiOkResponse({ type: ReadingListEntity })
  @ResponseMessage('Reading list created')
  create(@Body() dto: CreateReadingListDto, @Session() session: UserSession) {
    return this.readingListsService.create(session.user.id, dto)
  }

  @Get()
  @ApiOkResponse({ type: [ReadingListEntity] })
  @ResponseMessage('Reading lists fetched')
  findAll(@Session() session: UserSession, @UniversityScopeParam() scope: UniversityScope) {
    return this.readingListsService.findAllForUser(session.user.id, scope)
  }

  @Get('user/:userId/public')
  @ApiOkResponse({ type: [ReadingListEntity] })
  @ResponseMessage('Public reading lists fetched')
  findPublicByUser(
    @Param('userId') userId: string,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.readingListsService.findPublicForUser(userId, scope)
  }

  @Get(':id')
  @ApiOkResponse({ type: ReadingListEntity })
  @ResponseMessage('Reading list fetched')
  findOne(
    @Param('id') id: string,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.readingListsService.findOne(id, scope, session?.user?.id)
  }

  @Get(':id/posts')
  @ResponseMessage('Reading list posts fetched')
  async getListPosts(
    @Param('id') id: string,
    @Query() query: PaginationDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    await this.readingListsService.findOne(id, scope, session?.user?.id) // access check
    return this.postsService.getReadingListPosts(id, scope, query, {
      id: session?.user?.id,
      role: session?.user?.role as UserRole,
    })
  }

  @Put(':id')
  @ApiOkResponse({ type: ReadingListEntity })
  @ResponseMessage('Reading list updated')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReadingListDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.readingListsService.update(id, session.user.id, dto, scope)
  }

  @Delete(':id')
  @ResponseMessage('Reading list deleted')
  remove(@Param('id') id: string, @Session() session: UserSession) {
    return this.readingListsService.remove(id, session.user.id)
  }

  @Post(':id/posts/:postId')
  @ApiOkResponse({ type: ReadingListEntity })
  @ResponseMessage('Post added to reading list')
  async addPost(
    @Param('id') id: string,
    @Param('postId') postId: string,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.readingListsService.addPost(id, postId, session.user.id, scope)
  }

  @Delete(':id/posts/:postId')
  @ResponseMessage('Post removed from reading list')
  removePost(
    @Param('id') id: string,
    @Param('postId') postId: string,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.readingListsService.removePost(id, postId, session.user.id, scope)
  }
}
