import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { courseInScope, postInScope, UniversityScope } from '@/common/university-scope'

@Injectable()
export class QuizzesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listQuizzes(params: {
    where: Prisma.QuizWhereInput
    scope: UniversityScope
    skip: number
    limit: number
  }) {
    const { skip, limit } = params
    const where = { AND: [params.where, { course: courseInScope(params.scope) }] }
    return Promise.all([
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
  }

  createStudyMaterial(data: {
    courseId: string
    title: string
    content: string
    uploadedBy: string
  }) {
    return this.prisma.studyMaterial.create({ data })
  }

  createQuiz(data: {
    courseId: string
    studyMaterialId?: string
    moduleNumber?: number
    title: string
    description: string
    isPublished: boolean
    createdBy: string
    questionsCount: number
  }) {
    return this.prisma.quiz.create({ data })
  }

  createQuestions(
    questions: {
      quizId: string
      content: string
      options: string[]
      correctAnswer: number
      explanation: string
      difficulty: string
    }[],
  ) {
    return this.prisma.quizQuestion.createMany({ data: questions })
  }

  findQuizById(quizId: string, scope: UniversityScope) {
    return this.prisma.quiz.findUnique({
      where: { id: quizId, AND: [{ course: courseInScope(scope) }] },
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
  }

  findPostForQuiz(postId: string, scope: UniversityScope) {
    return this.prisma.post.findUnique({
      where: { id: postId, AND: [postInScope(scope)] },
      select: { id: true, title: true, summary: true, courseId: true },
    })
  }

  createSession(data: { quizId: string; studentId: string }) {
    return this.prisma.quizSession.create({ data })
  }

  submitAttempts(
    sessionId: string,
    attempts: { questionId: string; studentAnswer: number | null; isCorrect: boolean }[],
    sessionUpdate: {
      score: number
      totalPoints: number
      completedAt: Date
      timeSpentSec: number | null
    },
  ) {
    return this.prisma.$transaction([
      this.prisma.questionAttempt.createMany({
        data: attempts.map((a) => ({ sessionId, ...a })),
      }),
      this.prisma.quizSession.update({
        where: { id: sessionId },
        data: sessionUpdate,
      }),
    ])
  }

  findSessionById(sessionId: string, scope: UniversityScope) {
    return this.prisma.quizSession.findUnique({
      where: { id: sessionId, AND: [{ quiz: { course: courseInScope(scope) } }] },
      include: {
        quiz: { include: { questions: { orderBy: { createdAt: 'asc' } } } },
        questionAttempts: true,
      },
    })
  }

  findStudentSessions(studentId: string, scope: UniversityScope, courseId?: string) {
    return this.prisma.quizSession.findMany({
      where: {
        AND: [
          { studentId, quiz: courseId ? { courseId } : undefined },
          { quiz: { course: courseInScope(scope) } },
        ],
      },
      include: {
        quiz: { select: { id: true, title: true, courseId: true } },
      },
      orderBy: { attemptedAt: 'desc' },
    })
  }

  deleteQuizCascade(quizId: string) {
    return this.prisma.$transaction([
      this.prisma.questionAttempt.deleteMany({
        where: { session: { quizId } },
      }),
      this.prisma.quizSession.deleteMany({ where: { quizId } }),
      this.prisma.quizQuestion.deleteMany({ where: { quizId } }),
      this.prisma.quiz.delete({ where: { id: quizId } }),
    ])
  }

  publishQuiz(quizId: string) {
    return this.prisma.quiz.update({
      where: { id: quizId },
      data: { isPublished: true },
    })
  }

  findQuestionById(questionId: string, scope: UniversityScope) {
    return this.prisma.quizQuestion.findUnique({
      where: { id: questionId, AND: [{ quiz: { course: courseInScope(scope) } }] },
    })
  }

  updateQuestion(questionId: string, data: object) {
    return this.prisma.quizQuestion.update({ where: { id: questionId }, data })
  }
}
