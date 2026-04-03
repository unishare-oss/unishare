import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { AiSummaryService } from '../ai-summary/ai-summary.service'

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
    private readonly prisma: PrismaService,
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

    const [items, total] = await Promise.all([
      this.prisma.quiz.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          courseId: true,
          questionsCount: true,
          createdAt: true,
          course: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quiz.count({ where }),
    ])

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
    const material = await this.prisma.studyMaterial.create({
      data: {
        courseId,
        title: file.originalname.replace(/\.[^.]+$/, ''),
        content: text.slice(0, 50000),
        uploadedBy: generatedBy,
      },
    })

    // Create published quiz (admin explicitly generates it for immediate use)
    const quiz = await this.prisma.quiz.create({
      data: {
        courseId,
        studyMaterialId: material.id,
        title: `${material.title} — Quiz (${questions.length} Q)`,
        description: `Auto-generated quiz from: ${material.title}`,
        isPublished: true,
        createdBy: generatedBy,
        questionsCount: questions.length,
      },
    })

    await this.prisma.quizQuestion.createMany({
      data: questions.map((q) => ({
        quizId: quiz.id,
        content: q.content,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      })),
    })

    this.logger.log(`Created quiz ${quiz.id} with ${questions.length} questions`)

    return { quizId: quiz.id, questions }
  }

  async getQuiz(quizId: string, publishedOnly?: boolean) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          select: {
            id: true,
            content: true,
            options: true,
            correctAnswer: true,
            difficulty: true,
            explanation: true,
          },
        },
      },
    })

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

    const session = await this.prisma.quizSession.create({
      data: { quizId, studentId },
    })

    let score = 0
    const results = []

    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId)
      if (!question) continue

      const isCorrect = answer.answerIndex === question.correctAnswer

      await this.prisma.questionAttempt.create({
        data: {
          sessionId: session.id,
          questionId: answer.questionId,
          studentAnswer: answer.answerIndex,
          isCorrect,
        },
      })

      if (isCorrect) score += 1

      results.push({
        questionId: question.id,
        isCorrect,
        explanation: question.explanation,
      })
    }

    await this.prisma.quizSession.update({
      where: { id: session.id },
      data: {
        score,
        totalPoints: quiz.questions.length,
        completedAt: new Date(),
        timeSpentSec: timeSpentSec ?? null,
      },
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
    const session = await this.prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: { questions: { orderBy: { createdAt: 'asc' } } },
        },
        questionAttempts: true,
      },
    })

    if (!session) throw new NotFoundException('Session not found')
    if (session.studentId !== userId) throw new ForbiddenException('Access denied')

    return session
  }

  async getStudentProgress(studentId: string, courseId?: string) {
    const sessions = await this.prisma.quizSession.findMany({
      where: {
        studentId,
        quiz: courseId ? { courseId } : undefined,
      },
      include: {
        quiz: {
          select: { id: true, title: true, courseId: true },
        },
      },
      orderBy: { attemptedAt: 'desc' },
    })

    const stats = sessions.reduce(
      (acc: { totalAttempts: number; averageScore: number; bestScore: number }, s) => {
        if (!s.totalPoints) return acc
        const pct = (s.score / s.totalPoints) * 100
        return {
          totalAttempts: acc.totalAttempts + 1,
          averageScore: acc.averageScore + pct / sessions.length,
          bestScore: Math.max(acc.bestScore, pct),
        }
      },
      { totalAttempts: 0, averageScore: 0, bestScore: 0 },
    )

    return { stats, recentSessions: sessions }
  }

  async publishQuiz(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } })

    if (!quiz) throw new NotFoundException('Quiz not found')

    return this.prisma.quiz.update({
      where: { id: quizId },
      data: { isPublished: true },
    })
  }

  async updateQuestion(questionId: string, data: Partial<QuizQuestion>) {
    const question = await this.prisma.quizQuestion.findUnique({ where: { id: questionId } })

    if (!question) throw new NotFoundException('Question not found')

    return this.prisma.quizQuestion.update({
      where: { id: questionId },
      data,
    })
  }
}
