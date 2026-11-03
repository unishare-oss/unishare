import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Roles, Session } from '@thallesp/nestjs-better-auth'
import { UserRole } from '@/generated/prisma/client'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { GuestReadOnly } from '@/common/decorators/guest-read-only.decorator'
import { UniversityScopeParam } from '@/common/decorators/university-scope.decorator'
import type { UniversityScope } from '@/common/university-scope'
import { UserSession } from '@/auth/auth.config'
import { QuizzesService } from './quizzes.service'
import {
  GenerateQuestionsDto,
  GenerateFromPostDto,
  GenerateBulkDto,
  ListQuizzesDto,
  SubmitQuizDto,
  UpdateQuestionDto,
} from './dto'
import {
  PaginatedQuizzesEntity,
  QuizSessionEntity,
  StudentProgressEntity,
  GenerateQuizResponseEntity,
  GenerateBulkResponseEntity,
  QuizEntity,
  SubmitQuizResponseEntity,
  QuizQuestionEntity,
} from './entities/quiz.entity'

@ApiTags('quizzes')
@GuestReadOnly()
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // Static routes BEFORE parameterized routes

  @Get()
  @ApiOkResponse({ type: PaginatedQuizzesEntity })
  @ResponseMessage('Quizzes fetched successfully')
  listQuizzes(@Query() query: ListQuizzesDto, @UniversityScopeParam() scope: UniversityScope) {
    return this.quizzesService.listQuizzes(query, scope)
  }

  @Get('student/:studentId/progress')
  @ApiOkResponse({ type: StudentProgressEntity })
  @ResponseMessage('Student progress fetched successfully')
  getStudentProgress(
    @Param('studentId') studentId: string,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    if (session.user.id !== studentId && session.user.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied')
    }
    return this.quizzesService.getStudentProgress(studentId, scope)
  }

  @Get('sessions/:sessionId')
  @ApiOkResponse({ type: QuizSessionEntity })
  @ResponseMessage('Session fetched successfully')
  getSession(
    @Param('sessionId') sessionId: string,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.quizzesService.getSession(sessionId, session.user.id, scope)
  }

  @Post('generate')
  @Roles(['ADMIN', 'MODERATOR'])
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['courseId', 'file'],
      properties: {
        courseId: { type: 'string' },
        questionCount: { type: 'integer', default: 20 },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ type: GenerateQuizResponseEntity })
  @ResponseMessage('Quiz generated successfully')
  generateQuestions(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GenerateQuestionsDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.quizzesService.generateQuizFromMaterial(
      dto.courseId,
      file,
      session.user.id,
      scope,
      dto.questionCount ?? 20,
    )
  }

  @Post('generate-from-post')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: GenerateQuizResponseEntity })
  @ResponseMessage('Quiz generated successfully')
  generateFromPost(
    @Body() dto: GenerateFromPostDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.quizzesService.generateQuizFromPost(
      dto.postId,
      session.user.id,
      scope,
      dto.questionCount ?? 20,
    )
  }

  @Post('generate-bulk')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: GenerateBulkResponseEntity })
  @ResponseMessage('Bulk quiz generation complete')
  generateBulk(
    @Body() dto: GenerateBulkDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.quizzesService.generateQuizzesFromOutline(dto.courseId, session.user.id, scope)
  }

  @Put('questions/:id')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: QuizQuestionEntity })
  @ResponseMessage('Question updated successfully')
  updateQuestion(
    @Param('id') questionId: string,
    @Body() dto: UpdateQuestionDto,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.quizzesService.updateQuestion(questionId, dto, scope)
  }

  // Parameterized routes AFTER static routes

  @Get(':id')
  @ApiOkResponse({ type: QuizEntity })
  @ResponseMessage('Quiz fetched successfully')
  getQuiz(@Param('id') quizId: string, @UniversityScopeParam() scope: UniversityScope) {
    return this.quizzesService.getQuiz(quizId, scope, true)
  }

  @Delete(':id')
  @Roles(['ADMIN', 'MODERATOR'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Quiz deleted successfully')
  deleteQuiz(@Param('id') quizId: string, @UniversityScopeParam() scope: UniversityScope) {
    return this.quizzesService.deleteQuiz(quizId, scope)
  }

  @Post(':id/submit')
  @ApiOkResponse({ type: SubmitQuizResponseEntity })
  @ResponseMessage('Quiz submitted successfully')
  submitQuiz(
    @Param('id') quizId: string,
    @Body() dto: SubmitQuizDto,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.quizzesService.submitQuizAttempt(
      quizId,
      session.user.id,
      dto.answers,
      scope,
      dto.timeSpentSec,
    )
  }

  @Post(':id/publish')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: QuizEntity })
  @ResponseMessage('Quiz published successfully')
  publishQuiz(
    @Param('id') quizId: string,
    @Session() session: UserSession,
    @UniversityScopeParam() scope: UniversityScope,
  ) {
    return this.quizzesService.publishQuiz(quizId, session.user.role as UserRole, scope)
  }
}
