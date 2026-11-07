import { UniversityScope } from '@/common/university-scope'
import { QuizzesRepository } from './quizzes.repository'

const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const NONE: UniversityScope = { kind: 'none' }
const COURSE_IN_U1 = { course: { department: { faculty: { universityId: 'u1' } } } }

describe('QuizzesRepository university scope', () => {
  let prisma: {
    quiz: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock }
    post: { findUnique: jest.Mock }
    quizSession: { findUnique: jest.Mock; findMany: jest.Mock }
    quizQuestion: { findUnique: jest.Mock }
  }
  let repository: QuizzesRepository

  beforeEach(() => {
    prisma = {
      quiz: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      post: { findUnique: jest.fn().mockResolvedValue(null) },
      quizSession: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      quizQuestion: { findUnique: jest.fn().mockResolvedValue(null) },
    }
    repository = new QuizzesRepository(prisma as any)
  })

  const whereOf = (mock: jest.Mock) => mock.mock.calls[0][0].where

  it('listQuizzes combines the filters and the scope in AND, for the page and the count', async () => {
    const filters = { isPublished: true, course: { departmentId: 'd1' } }
    await repository.listQuizzes({ where: filters, scope: U1, skip: 0, limit: 20 })
    const expected = { AND: [filters, COURSE_IN_U1] }
    expect(whereOf(prisma.quiz.findMany)).toEqual(expected)
    expect(whereOf(prisma.quiz.count)).toEqual(expected)
  })

  it('listQuizzes matches nothing for a member with no university', async () => {
    await repository.listQuizzes({ where: {}, scope: NONE, skip: 0, limit: 20 })
    expect(whereOf(prisma.quiz.findMany)).toEqual({
      AND: [{}, { course: { id: { in: [] } } }],
    })
  })

  it('findQuizById adds the scope to the id lookup', async () => {
    await expect(repository.findQuizById('q1', U1)).resolves.toBeNull()
    expect(whereOf(prisma.quiz.findUnique)).toEqual({ id: 'q1', AND: [COURSE_IN_U1] })
  })

  it("findPostForQuiz only finds a post in the requester's university", async () => {
    await repository.findPostForQuiz('p1', U1)
    expect(whereOf(prisma.post.findUnique)).toEqual({ id: 'p1', AND: [COURSE_IN_U1] })
  })

  it("findSessionById only finds a session whose quiz is in the requester's university", async () => {
    await repository.findSessionById('s1', U1)
    expect(whereOf(prisma.quizSession.findUnique)).toEqual({
      id: 's1',
      AND: [{ quiz: COURSE_IN_U1 }],
    })
  })

  it("findStudentSessions keeps only sessions on quizzes in the requester's university", async () => {
    await repository.findStudentSessions('student-1', U1, 'c1')
    expect(whereOf(prisma.quizSession.findMany)).toEqual({
      AND: [{ studentId: 'student-1', quiz: { courseId: 'c1' } }, { quiz: COURSE_IN_U1 }],
    })
  })

  it("findQuestionById only finds a question whose quiz is in the requester's university", async () => {
    await repository.findQuestionById('qq1', U1)
    expect(whereOf(prisma.quizQuestion.findUnique)).toEqual({
      id: 'qq1',
      AND: [{ quiz: COURSE_IN_U1 }],
    })
  })
})
