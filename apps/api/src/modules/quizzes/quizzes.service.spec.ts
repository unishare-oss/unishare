import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common'
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
      await expect(service.generateQuizFromPost('p1', 'u1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      )
      await expect(service.generateQuizFromPost('p1', 'u1')).rejects.not.toBeInstanceOf(
        BadRequestException,
      )
    })

    it('still reports a genuine generation failure as a bad request', async () => {
      // The passthrough must be narrow. A malformed AI response IS a failure of this request and
      // should keep its 400 — widening the re-throw to every error would hide real faults behind
      // "service unavailable".
      aiSummary.generateQuizQuestions.mockRejectedValue(new Error('Invalid response format'))

      await expect(service.generateQuizFromPost('p1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      )
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
    await expect(service.generateQuizzesFromOutline('c1', 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    )
  })

  it('creates one quiz per outlined module, scaling question count with topic count', async () => {
    coursesService.getOutline.mockResolvedValue([
      { moduleNumber: 1, topics: ['a', 'b'] }, // 2 topics * 3 = 6
      { moduleNumber: 2, topics: Array(20).fill('t') }, // 60, clamped to 30
    ])

    const result = await service.generateQuizzesFromOutline('c1', 'u1')

    expect(aiSummary.generateQuizQuestions).toHaveBeenNthCalledWith(1, expect.any(String), 6)
    expect(aiSummary.generateQuizQuestions).toHaveBeenNthCalledWith(2, expect.any(String), 30)
    expect(repo.createQuiz).toHaveBeenCalledTimes(2)
    expect(result.created).toHaveLength(2)
    expect(result.failed).toHaveLength(0)
  })

  it('never drops below the minimum question count for a thin outline entry', async () => {
    coursesService.getOutline.mockResolvedValue([{ moduleNumber: 1, topics: ['only one'] }])

    await service.generateQuizzesFromOutline('c1', 'u1')

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

    const result = await service.generateQuizzesFromOutline('c1', 'u1')

    expect(result.failed).toEqual([{ moduleNumber: 1, error: 'model timed out' }])
    expect(result.created).toHaveLength(1)
    expect(result.created[0].moduleNumber).toBe(2)
  })
})
