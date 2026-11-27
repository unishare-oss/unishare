import { Body, Controller, Get, Put } from '@nestjs/common'
import { ApiBadRequestResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import type { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { MyCoursesService } from './my-courses.service'
import { MyCoursesEntity } from './entities/my-courses.entity'
import { SaveMyCoursesDto } from './dto/save-my-courses.dto'

@ApiTags('users')
@Controller('users/me/courses')
export class MyCoursesController {
  constructor(private readonly myCoursesService: MyCoursesService) {}

  @Get()
  @ApiOkResponse({ type: MyCoursesEntity })
  @ResponseMessage('Courses fetched successfully')
  getMine(@Session() session: UserSession) {
    return this.myCoursesService.getForStudent(session.user.id)
  }

  @Put()
  @ApiOkResponse({ type: MyCoursesEntity })
  @ApiBadRequestResponse({ description: 'Invalid course or missing academic profile' })
  @ResponseMessage('Courses saved successfully')
  saveMine(@Session() session: UserSession, @Body() dto: SaveMyCoursesDto) {
    return this.myCoursesService.save(session.user.id, dto.courseIds)
  }
}
