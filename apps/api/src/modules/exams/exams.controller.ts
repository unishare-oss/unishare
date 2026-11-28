import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Roles, Session } from '@thallesp/nestjs-better-auth'
import { UserSession } from '@/auth/auth.config'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { GuestReadOnly } from '@/common/decorators/guest-read-only.decorator'
import { UniversityScopeParam } from '@/common/decorators/university-scope.decorator'
import type { UniversityScope } from '@/common/university-scope'
import { SUPPORTED_MIME_TYPES } from '@/modules/ai/extraction/document-extractor.service'
import { ExamsService } from './exams.service'
import { CreateExamDto } from './dto/create-exam.dto'
import { UpdateExamDto } from './dto/update-exam.dto'
import { ListExamsDto } from './dto/list-exams.dto'
import { ExamEntity } from './entities/exam.entity'
import { ExamBulkCreateEntity, ExamImportEntity } from './entities/exam-import.entity'
import { BulkCreateExamsDto } from './dto/bulk-create-exams.dto'
import { ParseExamImportDto } from './dto/parse-exam-import.dto'
import { ExamImportService } from './exam-import.service'
import { MAX_EXAM_TIMETABLE_FILE_SIZE } from './exam-import.constants'

@ApiTags('exams')
@GuestReadOnly()
@Controller('exams')
export class ExamsController {
  constructor(
    private readonly examsService: ExamsService,
    private readonly examImportService: ExamImportService,
  ) {}

  @Post('import/parse')
  @Roles(['ADMIN', 'MODERATOR'])
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_EXAM_TIMETABLE_FILE_SIZE },
      fileFilter: (_request, file, callback) => {
        if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
          callback(new BadRequestException('Only PDF and Word documents are supported'), false)
          return
        }
        callback(null, true)
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        universityId: { type: 'string' },
      },
    },
  })
  @ApiCreatedResponse({ type: ExamImportEntity })
  @ResponseMessage('Exam timetable parsed successfully')
  parseImport(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ParseExamImportDto,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.examImportService.parse(file, scope, dto.universityId)
  }

  @Post('bulk')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiCreatedResponse({ type: ExamBulkCreateEntity })
  @ResponseMessage('Exam timetable published successfully')
  bulkCreate(
    @Body() dto: BulkCreateExamsDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.examsService.bulkCreate(dto.exams, session.user.id, scope)
  }

  @Post()
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiCreatedResponse({ type: ExamEntity })
  @ResponseMessage('Exam created successfully')
  create(
    @Body() dto: CreateExamDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.examsService.create(dto, session.user.id, scope)
  }

  @Get()
  @ApiOkResponse({ type: [ExamEntity] })
  @ResponseMessage('Exams fetched successfully')
  findAll(
    @Query() query: ListExamsDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    // Mine means the final list only, so the profile department must not narrow it further.
    const departmentId = query.departmentId ?? (query.mine ? undefined : session.user.departmentId)
    return this.examsService.findInRange(query.from, query.to, scope, {
      departmentId: departmentId ?? undefined,
      courseId: query.courseId,
      studentId: query.mine ? session.user.id : undefined,
    })
  }

  @Patch(':id')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: ExamEntity })
  @ResponseMessage('Exam updated successfully')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.examsService.update(id, dto, scope)
  }

  @Delete(':id')
  @Roles(['ADMIN', 'MODERATOR'])
  @ResponseMessage('Exam deleted successfully')
  remove(@Param('id') id: string, @UniversityScopeParam() scope: UniversityScope) {
    return this.examsService.remove(id, scope)
  }
}
