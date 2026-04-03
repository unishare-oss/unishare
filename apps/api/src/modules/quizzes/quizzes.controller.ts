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
import { ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { OptionalAuth, Roles, Session } from '@thallesp/nestjs-better-auth'
import { UserRole } from '@/generated/prisma/client'
import { ResponseMessage } from '@/common/decorators/response-message.decorator'
import { UserSession } from '@/auth/auth.config'
import { QuizzesService } from './quizzes.service'
import {
  GenerateQuestionsDto,
  GenerateFromPostDto,
  ListQuizzesDto,
  SubmitQuizDto,
  UpdateQuestionDto,
} from './dto'
import {
  PaginatedQuizzesEntity,
  QuizSessionEntity,
  StudentProgressEntity,
  GenerateQuizResponseEntity,
  QuizEntity,
  SubmitQuizResponseEntity,
  QuizQuestionEntity,
} from './entities/quiz.entity'

@ApiTags('quizzes')
@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  // Static routes BEFORE parameterized routes

  @Get()
  @OptionalAuth()
  @ApiOkResponse({ type: PaginatedQuizzesEntity })
  @ResponseMessage('Quizzes fetched successfully')
  listQuizzes(@Query() query: ListQuizzesDto) {
    return this.quizzesService.listQuizzes(query)
  }

  @Get('student/:studentId/progress')
  @ApiOkResponse({ type: StudentProgressEntity })
  @ResponseMessage('Student progress fetched successfully')
  getStudentProgress(@Param('studentId') studentId: string, @Session() session: UserSession) {
    if (session.user.id !== studentId && session.user.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied')
    }
    return this.quizzesService.getStudentProgress(studentId)
  }

  @Get('sessions/:sessionId')
  @ApiOkResponse({ type: QuizSessionEntity })
  @ResponseMessage('Session fetched successfully')
  getSession(@Param('sessionId') sessionId: string, @Session() session: UserSession) {
    return this.quizzesService.getSession(sessionId, session.user.id)
  }

  @Post('generate')
  @Roles(['ADMIN', 'MODERATOR'])
  @UseInterceptors(FileInterceptor('file'))
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
  ) {
    return this.quizzesService.generateQuizFromMaterial(
      dto.courseId,
      file,
      session.user.id,
      dto.questionCount ?? 20,
    )
  }

  @Post('generate-from-post')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: GenerateQuizResponseEntity })
  @ResponseMessage('Quiz generated successfully')
  generateFromPost(@Body() dto: GenerateFromPostDto, @Session() session: UserSession) {
    return this.quizzesService.generateQuizFromPost(
      dto.postId,
      session.user.id,
      dto.questionCount ?? 20,
    )
  }

  @Put('questions/:id')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: QuizQuestionEntity })
  @ResponseMessage('Question updated successfully')
  updateQuestion(@Param('id') questionId: string, @Body() dto: UpdateQuestionDto) {
    return this.quizzesService.updateQuestion(questionId, dto)
  }

  // Parameterized routes AFTER static routes

  @Get(':id')
  @OptionalAuth()
  @ApiOkResponse({ type: QuizEntity })
  @ResponseMessage('Quiz fetched successfully')
  getQuiz(@Param('id') quizId: string) {
    return this.quizzesService.getQuiz(quizId, true)
  }

  @Delete(':id')
  @Roles(['ADMIN', 'MODERATOR'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ResponseMessage('Quiz deleted successfully')
  deleteQuiz(@Param('id') quizId: string) {
    return this.quizzesService.deleteQuiz(quizId)
  }

  @Post(':id/submit')
  @ApiOkResponse({ type: SubmitQuizResponseEntity })
  @ResponseMessage('Quiz submitted successfully')
  submitQuiz(
    @Param('id') quizId: string,
    @Body() dto: SubmitQuizDto,
    @Session() session: UserSession,
  ) {
    return this.quizzesService.submitQuizAttempt(
      quizId,
      session.user.id,
      dto.answers,
      dto.timeSpentSec,
    )
  }

  @Post(':id/publish')
  @Roles(['ADMIN', 'MODERATOR'])
  @ApiOkResponse({ type: QuizEntity })
  @ResponseMessage('Quiz published successfully')
  publishQuiz(@Param('id') quizId: string, @Session() session: UserSession) {
    return this.quizzesService.publishQuiz(quizId, session.user.role as UserRole)
  }
}
