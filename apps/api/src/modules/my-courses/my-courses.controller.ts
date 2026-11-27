import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Session } from '@thallesp/nestjs-better-auth'
import type { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { MyCoursesService } from './my-courses.service'
import { MyCoursesEntity } from './entities/my-courses.entity'

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
}
