import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class QuizListItemEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null

  @ApiProperty()
  courseId: string

  @ApiProperty()
  course: { code: string; name: string }

  @ApiProperty()
  questionsCount: number

  @ApiProperty()
  createdAt: Date
}

export class PaginatedQuizzesEntity {
  @ApiProperty({ type: [QuizListItemEntity] })
  items: QuizListItemEntity[]

  @ApiProperty()
  total: number

  @ApiProperty()
  page: number

  @ApiProperty()
  limit: number
}

export class QuizQuestionEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  content: string

  @ApiProperty({ type: [String] })
  options: string[]

  @ApiProperty()
  correctAnswer: number

  @ApiProperty({ enum: ['easy', 'medium', 'hard'] })
  difficulty: string

  @ApiPropertyOptional({ nullable: true, type: String })
  explanation: string | null
}

export class QuizEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiPropertyOptional({ nullable: true, type: String })
  description: string | null

  @ApiProperty()
  courseId: string

  @ApiProperty()
  isPublished: boolean

  @ApiProperty()
  questionsCount: number

  @ApiProperty({ type: [QuizQuestionEntity] })
  questions: QuizQuestionEntity[]

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}

export class QuizAttemptResultEntity {
  @ApiProperty()
  questionId: string

  @ApiProperty()
  isCorrect: boolean

  @ApiPropertyOptional({ nullable: true, type: String })
  explanation: string | null
}

export class SubmitQuizResponseEntity {
  @ApiProperty()
  sessionId: string

  @ApiProperty()
  score: number

  @ApiProperty()
  totalPoints: number

  @ApiProperty()
  percentage: number

  @ApiProperty({ type: [QuizAttemptResultEntity] })
  results: QuizAttemptResultEntity[]
}

export class GenerateQuizResponseEntity {
  @ApiProperty()
  quizId: string

  @ApiProperty({ type: [QuizQuestionEntity] })
  questions: QuizQuestionEntity[]
}

export class QuestionAttemptEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  questionId: string

  @ApiPropertyOptional({ nullable: true, type: Number })
  studentAnswer: number | null

  @ApiPropertyOptional({ nullable: true, type: Boolean })
  isCorrect: boolean | null
}

export class QuizSessionEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  score: number

  @ApiProperty()
  totalPoints: number

  @ApiPropertyOptional({ nullable: true, type: Number })
  timeSpentSec: number | null

  @ApiPropertyOptional({ nullable: true, type: String })
  completedAt: Date | null

  @ApiProperty({ type: () => QuizEntity })
  quiz: QuizEntity

  @ApiProperty({ type: [QuestionAttemptEntity] })
  questionAttempts: QuestionAttemptEntity[]
}

export class RecentSessionEntity {
  @ApiProperty()
  id: string

  @ApiProperty()
  score: number

  @ApiProperty()
  totalPoints: number

  @ApiPropertyOptional({ nullable: true, type: Number })
  timeSpentSec: number | null

  @ApiProperty()
  attemptedAt: Date

  @ApiPropertyOptional({ nullable: true, type: String })
  completedAt: Date | null

  @ApiProperty()
  quiz: { id: string; title: string; courseId: string }
}

export class StudentStatsEntity {
  @ApiProperty()
  totalAttempts: number

  @ApiProperty()
  averageScore: number

  @ApiProperty()
  bestScore: number
}

export class StudentProgressEntity {
  @ApiProperty({ type: StudentStatsEntity })
  stats: StudentStatsEntity

  @ApiProperty({ type: [RecentSessionEntity] })
  recentSessions: RecentSessionEntity[]
}
