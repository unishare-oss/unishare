import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { UserRole } from '@/generated/prisma/client'
import { UniversityScope } from '@/common/university-scope'
import { QuizzesService } from './quizzes.service'
import { QuizzesRepository } from './quizzes.repository'
import { AiSummaryService } from '../ai-summary/ai-summary.service'
import { CoursesService } from '../courses/courses.service'

/**
 * The first spec in this module — it had none, which is why the plan's Task 12 Step 6 ("run
 * `pnpm --filter api test -- quizzes` and expect passes") was verification theatre: the command
 * matched zero tests and exited green regardless.
 *
 * Scope is deliberately narrow: how quiz generation reports an AI provider that is switched off.
 * Both generate paths wrap everything they catch in a BadRequestException, so an unconfigured
 * provider reached the user as a 400 blaming their material. Broader coverage of this service is
 * worth having but is not what this change touched.
 */
describe('QuizzesService — AI availability', () => {
  let service: QuizzesService
  let repo: { findPostForQuiz: jest.Mock }
  let aiSummary: { generateQuizQuestions: jest.Mock }

  beforeEach(async () => {
    repo = { findPostForQuiz: jest.fn() }
    aiSummary = { generateQuizQuestions: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: QuizzesRepository, useValue: repo },
        { provide: AiSummaryService, useValue: aiSummary },
        { provide: CoursesService, useValue: {} },
      ],
    }).compile()

    service = module.get(QuizzesService)
  })

  describe('generateQuizFromPost', () => {
    beforeEach(() => {
      repo.findPostForQuiz.mockResolvedValue({
        id: 'p1',
        courseId: 'c1',
        title: 'Linear algebra',
        summary: 'A summary of the post.',
      })
    })

    it('passes a ServiceUnavailableException through instead of blaming the request', async () => {
      aiSummary.generateQuizQuestions.mockRejectedValue(
        new ServiceUnavailableException('AI service not configured'),
      )

      // 503, not 400. The distinction is the whole point: a 400 tells the user their post is at
      // fault, when the deployment simply has no AI provider configured.
      await expect(
        service.generateQuizFromPost('p1', 'u1', { kind: 'all' }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException)
      await expect(
        service.generateQuizFromPost('p1', 'u1', { kind: 'all' }),
      ).rejects.not.toBeInstanceOf(BadRequestException)
    })

    it('still reports a genuine generation failure as a bad request', async () => {
      // The passthrough must be narrow. A malformed AI response IS a failure of this request and
      // should keep its 400 — widening the re-throw to every error would hide real faults behind
      // "service unavailable".
      aiSummary.generateQuizQuestions.mockRejectedValue(new Error('Invalid response format'))

      await expect(
        service.generateQuizFromPost('p1', 'u1', { kind: 'all' }),
      ).rejects.toBeInstanceOf(BadRequestException)
    })
  })
})

describe('QuizzesService — bulk generation from outline', () => {
  let service: QuizzesService
  let repo: { createQuiz: jest.Mock; createQuestions: jest.Mock }
  let aiSummary: { generateQuizQuestions: jest.Mock }
  let coursesService: { findOne: jest.Mock; getOutline: jest.Mock }

  const question = {
    content: 'Q?',
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 0,
    explanation: 'because',
    difficulty: 'medium' as const,
  }

  beforeEach(async () => {
    repo = {
      createQuiz: jest
        .fn()
        .mockImplementation((data) => Promise.resolve({ id: 'quiz-1', ...data })),
      createQuestions: jest.fn().mockResolvedValue(undefined),
    }
    aiSummary = { generateQuizQuestions: jest.fn().mockResolvedValue([question]) }
    coursesService = {
      findOne: jest.fn().mockResolvedValue({ id: 'c1', code: 'CS101', name: 'Intro to CS' }),
      getOutline: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: QuizzesRepository, useValue: repo },
        { provide: AiSummaryService, useValue: aiSummary },
        { provide: CoursesService, useValue: coursesService },
      ],
    }).compile()

    service = module.get(QuizzesService)
  })

  it('rejects a course with no outline at all', async () => {
    coursesService.getOutline.mockResolvedValue([])
    await expect(
      service.generateQuizzesFromOutline('c1', 'u1', { kind: 'all' }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('creates one quiz per outlined module, scaling question count with topic count', async () => {
    coursesService.getOutline.mockResolvedValue([
      { moduleNumber: 1, topics: ['a', 'b'] }, // 2 topics * 3 = 6
      { moduleNumber: 2, topics: Array(20).fill('t') }, // 60, clamped to 30
    ])

    const result = await service.generateQuizzesFromOutline('c1', 'u1', { kind: 'all' })

    expect(aiSummary.generateQuizQuestions).toHaveBeenNthCalledWith(1, expect.any(String), 6)
    expect(aiSummary.generateQuizQuestions).toHaveBeenNthCalledWith(2, expect.any(String), 30)
    expect(repo.createQuiz).toHaveBeenCalledTimes(2)
    expect(result.created).toHaveLength(2)
    expect(result.failed).toHaveLength(0)
  })

  it('never drops below the minimum question count for a thin outline entry', async () => {
    coursesService.getOutline.mockResolvedValue([{ moduleNumber: 1, topics: ['only one'] }])

    await service.generateQuizzesFromOutline('c1', 'u1', { kind: 'all' })

    expect(aiSummary.generateQuizQuestions).toHaveBeenCalledWith(expect.any(String), 5)
  })

  it('records a per-module failure without aborting the rest of the batch', async () => {
    coursesService.getOutline.mockResolvedValue([
      { moduleNumber: 1, topics: ['a'] },
      { moduleNumber: 2, topics: ['b'] },
    ])
    aiSummary.generateQuizQuestions
      .mockRejectedValueOnce(new Error('model timed out'))
      .mockResolvedValueOnce([question])

    const result = await service.generateQuizzesFromOutline('c1', 'u1', { kind: 'all' })

    expect(result.failed).toEqual([{ moduleNumber: 1, error: 'model timed out' }])
    expect(result.created).toHaveLength(1)
    expect(result.created[0].moduleNumber).toBe(2)
  })
})

describe('QuizzesService — university scope', () => {
  const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
  let service: QuizzesService
  let repo: {
    listQuizzes: jest.Mock
    findQuizById: jest.Mock
    findPostForQuiz: jest.Mock
    findSessionById: jest.Mock
    findStudentSessions: jest.Mock
    findQuestionById: jest.Mock
    deleteQuizCascade: jest.Mock
    publishQuiz: jest.Mock
    updateQuestion: jest.Mock
    createSession: jest.Mock
  }

  beforeEach(async () => {
    // Every lookup misses, as it does for another university's item once the scope is applied.
    repo = {
      listQuizzes: jest.fn().mockResolvedValue([[], 0]),
      findQuizById: jest.fn().mockResolvedValue(null),
      findPostForQuiz: jest.fn().mockResolvedValue(null),
      findSessionById: jest.fn().mockResolvedValue(null),
      findStudentSessions: jest.fn().mockResolvedValue([]),
      findQuestionById: jest.fn().mockResolvedValue(null),
      deleteQuizCascade: jest.fn(),
      publishQuiz: jest.fn(),
      updateQuestion: jest.fn(),
      createSession: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: QuizzesRepository, useValue: repo },
        { provide: AiSummaryService, useValue: {} },
        { provide: CoursesService, useValue: {} },
      ],
    }).compile()

    service = module.get(QuizzesService)
  })

  it('lists quizzes with the scope', async () => {
    await service.listQuizzes({ courseId: 'c1' }, U1)
    expect(repo.listQuizzes).toHaveBeenCalledWith(expect.objectContaining({ scope: U1 }))
  })

  it.each([
    ['getQuiz', (s: QuizzesService) => s.getQuiz('q1', U1, true)],
    ['submitQuizAttempt', (s: QuizzesService) => s.submitQuizAttempt('q1', 'student-1', [], U1)],
    ['deleteQuiz', (s: QuizzesService) => s.deleteQuiz('q1', U1)],
    ['publishQuiz', (s: QuizzesService) => s.publishQuiz('q1', UserRole.MODERATOR, U1)],
  ])('%s gives 404 for a quiz outside the scope', async (_name, call) => {
    await expect(call(service)).rejects.toBeInstanceOf(NotFoundException)
    expect(repo.findQuizById).toHaveBeenCalledWith('q1', U1)
    expect(repo.createSession).not.toHaveBeenCalled()
    expect(repo.deleteQuizCascade).not.toHaveBeenCalled()
    expect(repo.publishQuiz).not.toHaveBeenCalled()
  })

  it.each([
    ['deleteQuiz', (s: QuizzesService) => s.deleteQuiz('q1', { kind: 'all' })],
    ['publishQuiz', (s: QuizzesService) => s.publishQuiz('q1', UserRole.ADMIN, { kind: 'all' })],
  ])('%s lets an admin act on any university', async (name, call) => {
    repo.findQuizById.mockResolvedValue({ id: 'q1' })
    await call(service)
    expect(repo.findQuizById).toHaveBeenCalledWith('q1', { kind: 'all' })
    expect(name === 'deleteQuiz' ? repo.deleteQuizCascade : repo.publishQuiz).toHaveBeenCalledWith(
      'q1',
    )
  })

  it('gives 404, not 403, for a session outside the scope', async () => {
    await expect(service.getSession('s1', 'student-1', U1)).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(repo.findSessionById).toHaveBeenCalledWith('s1', U1)
  })

  it('reads student progress with the scope', async () => {
    await service.getStudentProgress('student-1', U1)
    expect(repo.findStudentSessions).toHaveBeenCalledWith('student-1', U1, undefined)
  })

  it('gives 404 when updating a question outside the scope', async () => {
    await expect(service.updateQuestion('qq1', { content: 'x' }, U1)).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(repo.findQuestionById).toHaveBeenCalledWith('qq1', U1)
    expect(repo.updateQuestion).not.toHaveBeenCalled()
  })

  it('gives 404 when generating a quiz from a post outside the scope', async () => {
    await expect(service.generateQuizFromPost('p1', 'mod-1', U1)).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(repo.findPostForQuiz).toHaveBeenCalledWith('p1', U1)
  })
})

describe('QuizzesService — course scope on generation', () => {
  const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
  const ADMIN: UniversityScope = { kind: 'all' }
  const file = {
    buffer: Buffer.from('x'),
    mimetype: 'application/pdf',
    originalname: 'notes.pdf',
  } as Express.Multer.File
  const question = {
    content: 'Q?',
    options: ['a', 'b', 'c', 'd'],
    correctAnswer: 0,
    explanation: 'because',
    difficulty: 'medium' as const,
  }
  let service: QuizzesService
  let repo: { createStudyMaterial: jest.Mock; createQuiz: jest.Mock; createQuestions: jest.Mock }
  let aiSummary: { extractTextFromBuffer: jest.Mock; generateQuizQuestions: jest.Mock }
  let coursesService: { findOne: jest.Mock; getOutline: jest.Mock }

  beforeEach(async () => {
    repo = {
      createStudyMaterial: jest.fn().mockResolvedValue({ id: 'm1', title: 'notes' }),
      createQuiz: jest.fn().mockResolvedValue({ id: 'quiz-1' }),
      createQuestions: jest.fn(),
    }
    aiSummary = {
      extractTextFromBuffer: jest.fn().mockResolvedValue('some text'),
      generateQuizQuestions: jest.fn().mockResolvedValue([question]),
    }
    // A course outside the scope misses, as CoursesService.findOne does with the scope applied.
    coursesService = {
      findOne: jest.fn().mockRejectedValue(new NotFoundException('Course not found')),
      getOutline: jest.fn().mockRejectedValue(new NotFoundException('Course not found')),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: QuizzesRepository, useValue: repo },
        { provide: AiSummaryService, useValue: aiSummary },
        { provide: CoursesService, useValue: coursesService },
      ],
    }).compile()

    service = module.get(QuizzesService)
  })

  it("gives 404 for material on another university's course, before any AI call", async () => {
    await expect(service.generateQuizFromMaterial('c2', file, 'mod-1', U1)).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(coursesService.findOne).toHaveBeenCalledWith('c2', U1)
    expect(aiSummary.extractTextFromBuffer).not.toHaveBeenCalled()
    expect(aiSummary.generateQuizQuestions).not.toHaveBeenCalled()
    expect(repo.createStudyMaterial).not.toHaveBeenCalled()
    expect(repo.createQuiz).not.toHaveBeenCalled()
  })

  it("gives 404 for bulk generation on another university's course", async () => {
    await expect(service.generateQuizzesFromOutline('c2', 'mod-1', U1)).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(coursesService.findOne).toHaveBeenCalledWith('c2', U1)
    expect(aiSummary.generateQuizQuestions).not.toHaveBeenCalled()
    expect(repo.createQuiz).not.toHaveBeenCalled()
  })

  it('lets an admin generate on any course', async () => {
    coursesService.findOne.mockResolvedValue({ id: 'c2', code: 'CS2', name: 'Other' })
    coursesService.getOutline.mockResolvedValue([{ moduleNumber: 1, topics: ['a'] }])

    await service.generateQuizFromMaterial('c2', file, 'admin-1', ADMIN)
    const bulk = await service.generateQuizzesFromOutline('c2', 'admin-1', ADMIN)

    expect(coursesService.findOne).toHaveBeenCalledWith('c2', ADMIN)
    expect(coursesService.getOutline).toHaveBeenCalledWith('c2', ADMIN)
    expect(repo.createQuiz).toHaveBeenCalledTimes(2)
    expect(bulk.created).toHaveLength(1)
  })
})
