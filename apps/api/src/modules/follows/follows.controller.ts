import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { FollowsService } from './follows.service'

@ApiTags('follows')
@Controller('users')
export class FollowsController {
  constructor(private readonly followsService: FollowsService) {}

  @Post(':id/follow')
  @ApiOkResponse()
  @ResponseMessage('Followed successfully')
  follow(@Param('id') id: string, @Session() session: UserSession) {
    return this.followsService.follow(session.user.id, id)
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  unfollow(@Param('id') id: string, @Session() session: UserSession) {
    return this.followsService.unfollow(session.user.id, id)
  }

  @Get(':id/followers')
  @ResponseMessage('Followers fetched successfully')
  getFollowers(@Param('id') id: string) {
    return this.followsService.getFollowers(id)
  }

  @Get(':id/following')
  @ResponseMessage('Following list fetched successfully')
  getFollowing(@Param('id') id: string) {
    return this.followsService.getFollowing(id)
  }
}
