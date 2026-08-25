import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Roles, Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { ExamsService } from './exams.service'
import { CreateExamDto } from './dto/create-exam.dto'
import { UpdateExamDto } from './dto/update-exam.dto'
import { ListExamsDto } from './dto/list-exams.dto'
import { ExamEntity } from './entities/exam.entity'

@ApiTags('exams')
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiCreatedResponse({ type: ExamEntity })
  @ResponseMessage('Exam created successfully')
  create(@Body() dto: CreateExamDto, @Session() session: UserSession) {
    return this.examsService.create(dto, session.user.id)
  }

  @Get()
  @ApiOkResponse({ type: [ExamEntity] })
  @ResponseMessage('Exams fetched successfully')
  findAll(@Query() query: ListExamsDto, @Session() session: UserSession) {
    const departmentId = query.departmentId ?? session.user.departmentId ?? undefined
    return this.examsService.findInRange(query.from, query.to, departmentId, query.courseId)
  }

  @Patch(':id')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: ExamEntity })
  @ResponseMessage('Exam updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.examsService.update(id, dto)
  }

  @Delete(':id')
  @Roles(['ADMIN', 'MODERATOR'])
  @ResponseMessage('Exam deleted successfully')
  remove(@Param('id') id: string) {
    return this.examsService.remove(id)
  }
}
