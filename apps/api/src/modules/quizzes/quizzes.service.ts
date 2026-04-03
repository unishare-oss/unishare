import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { UserRole } from '@/generated/prisma/client'
import { AiSummaryService } from '../ai-summary/ai-summary.service'
import { QuizzesRepository } from './quizzes.repository'

interface QuizQuestion {
  content: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'easy' | 'medium' | 'hard'
}

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name)

  constructor(
    private readonly quizzesRepository: QuizzesRepository,
    private readonly aiSummary: AiSummaryService,
  ) {}

  async listQuizzes(params: {
    courseId?: string
    departmentId?: string
    page?: number
    limit?: number
  }) {
    const { courseId, departmentId, page = 1, limit = 20 } = params
    const skip = (page - 1) * limit

    const where = {
      isPublished: true,
      ...(courseId ? { courseId } : {}),
      ...(departmentId ? { course: { departmentId } } : {}),
    }

    const [items, total] = await this.quizzesRepository.listQuizzes({ where, skip, limit })
    return { items, total, page, limit }
  }

  async generateQuizFromMaterial(
    courseId: string,
    file: Express.Multer.File,
    generatedBy: string,
    questionCount: number = 20,
  ): Promise<{ quizId: string; questions: QuizQuestion[] }> {
    if (!file) {
      throw new BadRequestException('Study material file is required')
    }

    if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF and Word documents are supported')
    }

    // Extract text from the uploaded file buffer
    let text: string
    try {
      text = await this.aiSummary.extractTextFromBuffer(file.buffer, file.mimetype)
    } catch (err) {
      this.logger.error(`Failed to extract text from file: ${(err as Error).message}`)
      throw new BadRequestException('Failed to read file content')
    }

    if (!text.trim()) {
      throw new BadRequestException('Could not extract text from the uploaded file')
    }

    // Generate questions from extracted text
    let questions: QuizQuestion[]
    try {
      questions = await this.aiSummary.generateQuizQuestions(text, questionCount)
    } catch (err) {
      this.logger.error(`Question generation failed: ${(err as Error).message}`)
      throw new BadRequestException('Failed to generate questions from material')
    }

    // Persist study material (store first 50k chars)
    const material = await this.quizzesRepository.createStudyMaterial({
      courseId,
      title: file.originalname.replace(/\.[^.]+$/, ''),
      content: text.slice(0, 50000),
      uploadedBy: generatedBy,
    })

    // Create published quiz (admin explicitly generates it for immediate use)
    const quiz = await this.quizzesRepository.createQuiz({
      courseId,
      studyMaterialId: material.id,
      title: `${material.title} — Quiz (${questions.length} Q)`,
      description: `Auto-generated quiz from: ${material.title}`,
      isPublished: true,
      createdBy: generatedBy,
      questionsCount: questions.length,
    })

    await this.quizzesRepository.createQuestions(
      questions.map((q) => ({
        quizId: quiz.id,
        content: q.content,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      })),
    )

    this.logger.log(`Created quiz ${quiz.id} with ${questions.length} questions`)

    return { quizId: quiz.id, questions }
  }

  async generateQuizFromPost(
    postId: string,
    generatedBy: string,
    questionCount: number = 20,
  ): Promise<{ quizId: string; questions: QuizQuestion[] }> {
    const post = await this.quizzesRepository.findPostForQuiz(postId)

    if (!post) throw new NotFoundException('Post not found')
    if (!post.summary?.trim()) {
      throw new BadRequestException('This post does not have an AI summary yet')
    }

    let questions: QuizQuestion[]
    try {
      questions = await this.aiSummary.generateQuizQuestions(post.summary, questionCount)
    } catch (err) {
      this.logger.error(`Question generation failed: ${(err as Error).message}`)
      throw new BadRequestException('Failed to generate questions from post summary')
    }

    const title = post.title ?? `Post ${post.id.slice(0, 8)}`

    const quiz = await this.quizzesRepository.createQuiz({
      courseId: post.courseId,
      title: `${title} — Quiz (${questions.length} Q)`,
      description: `Auto-generated quiz from post summary: ${title}`,
      isPublished: true,
      createdBy: generatedBy,
      questionsCount: questions.length,
    })

    await this.quizzesRepository.createQuestions(
      questions.map((q) => ({
        quizId: quiz.id,
        content: q.content,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      })),
    )

    this.logger.log(
      `Created quiz ${quiz.id} from post ${postId} with ${questions.length} questions`,
    )

    return { quizId: quiz.id, questions }
  }

  async getQuiz(quizId: string, publishedOnly?: boolean) {
    const quiz = await this.quizzesRepository.findQuizById(quizId)

    if (!quiz) {
      throw new NotFoundException('Quiz not found')
    }

    if (publishedOnly && !quiz.isPublished) {
      throw new BadRequestException('Quiz is not published yet')
    }

    return quiz
  }

  async submitQuizAttempt(
    quizId: string,
    studentId: string,
    answers: { questionId: string; answerIndex: number | null }[],
    timeSpentSec?: number,
  ) {
    const quiz = await this.getQuiz(quizId, true)

    const session = await this.quizzesRepository.createSession({ quizId, studentId })

    let score = 0
    const results = []

    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId)
      if (!question) continue

      const isCorrect = answer.answerIndex === question.correctAnswer

      await this.quizzesRepository.createAttempt({
        sessionId: session.id,
        questionId: answer.questionId,
        studentAnswer: answer.answerIndex,
        isCorrect,
      })

      if (isCorrect) score += 1

      results.push({
        questionId: question.id,
        isCorrect,
        explanation: question.explanation,
      })
    }

    await this.quizzesRepository.updateSession(session.id, {
      score,
      totalPoints: quiz.questions.length,
      completedAt: new Date(),
      timeSpentSec: timeSpentSec ?? null,
    })

    return {
      sessionId: session.id,
      score,
      totalPoints: quiz.questions.length,
      percentage: Math.round((score / quiz.questions.length) * 100),
      results,
    }
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.quizzesRepository.findSessionById(sessionId)

    if (!session) throw new NotFoundException('Session not found')
    if (session.studentId !== userId) throw new ForbiddenException('Access denied')

    return session
  }

  async getStudentProgress(studentId: string, courseId?: string) {
    const sessions = await this.quizzesRepository.findStudentSessions(studentId, courseId)

    const aggregatedStats = sessions.reduce(
      (acc: { totalAttempts: number; totalScore: number; bestScore: number }, s) => {
        if (!s.totalPoints) return acc
        const pct = (s.score / s.totalPoints) * 100
        return {
          totalAttempts: acc.totalAttempts + 1,
          totalScore: acc.totalScore + pct,
          bestScore: Math.max(acc.bestScore, pct),
        }
      },
      { totalAttempts: 0, totalScore: 0, bestScore: 0 },
    )
    const stats = {
      totalAttempts: aggregatedStats.totalAttempts,
      averageScore:
        aggregatedStats.totalAttempts > 0
          ? aggregatedStats.totalScore / aggregatedStats.totalAttempts
          : 0,
      bestScore: aggregatedStats.bestScore,
    }

    return { stats, recentSessions: sessions }
  }

  async deleteQuiz(quizId: string) {
    const quiz = await this.quizzesRepository.findQuizById(quizId)
    if (!quiz) throw new NotFoundException('Quiz not found')
    await this.quizzesRepository.deleteQuizCascade(quizId)
  }

  async publishQuiz(quizId: string, role: UserRole) {
    if (role !== UserRole.ADMIN && role !== UserRole.MODERATOR) {
      throw new ForbiddenException('Only admins and moderators can publish quizzes')
    }

    const quiz = await this.quizzesRepository.findQuizById(quizId)
    if (!quiz) throw new NotFoundException('Quiz not found')

    return this.quizzesRepository.publishQuiz(quizId)
  }

  async updateQuestion(questionId: string, data: Partial<QuizQuestion>) {
    const question = await this.quizzesRepository.findQuestionById(questionId)
    if (!question) throw new NotFoundException('Question not found')
    return this.quizzesRepository.updateQuestion(questionId, data)
  }
}
