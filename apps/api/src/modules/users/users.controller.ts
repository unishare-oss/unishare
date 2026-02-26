import { Body, Controller, Get, Patch } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Session, UserSession } from '@thallesp/nestjs-better-auth'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UsersService } from './users.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ResponseMessage('Profile fetched successfully')
  getMe(@Session() session: UserSession) {
    return this.usersService.findById(session.user.id)
  }

  @Patch('me')
  @ResponseMessage('Profile updated successfully')
  updateMe(@Session() session: UserSession, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(session.user.id, dto)
  }

  @Patch('me/academic-profile')
  @ResponseMessage('Academic profile updated successfully')
  updateAcademicProfile(@Session() session: UserSession, @Body() dto: UpdateAcademicProfileDto) {
    return this.usersService.updateAcademicProfile(session.user.id, dto)
  }
}
