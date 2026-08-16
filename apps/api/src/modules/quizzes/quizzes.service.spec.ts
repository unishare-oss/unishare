import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common'
import { QuizzesService } from './quizzes.service'
import { QuizzesRepository } from './quizzes.repository'
import { AiSummaryService } from '../ai-summary/ai-summary.service'

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
