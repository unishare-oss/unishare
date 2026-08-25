import { ServiceUnavailableException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { AiSummaryService } from './ai-summary.service'
import { TagsService } from '../tags/tags.service'
import { LlmService } from '../ai/llm/llm.service'
import { EmbeddingService } from '../ai/embedding/embedding.service'
import { RetrievalService } from '../ai/retrieval/retrieval.service'
import { DocumentExtractorService } from '../ai/extraction/document-extractor.service'

const VALID_QUESTION = {
  content: 'What is 2 + 2?',
  options: ['1', '2', '3', '4'],
  correctAnswer: 3,
  explanation: 'Basic arithmetic',
  difficulty: 'easy',
}

describe('AiSummaryService.generateQuizQuestions', () => {
  let service: AiSummaryService
  let llmMock: { enabled: boolean; chat: jest.Mock }

  beforeEach(async () => {
    llmMock = { enabled: true, chat: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSummaryService,
        { provide: PrismaService, useValue: {} },
        { provide: TagsService, useValue: {} },
        { provide: LlmService, useValue: llmMock },
        { provide: EmbeddingService, useValue: {} },
        { provide: RetrievalService, useValue: {} },
        { provide: DocumentExtractorService, useValue: {} },
      ],
    }).compile()

    service = module.get(AiSummaryService)
  })

  it('throws ServiceUnavailableException when no AI provider is configured', async () => {
    llmMock.enabled = false
    await expect(service.generateQuizQuestions('text', 5)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
    expect(llmMock.chat).not.toHaveBeenCalled()
  })

  it('parses a well-formed JSON array response', async () => {
    llmMock.chat.mockResolvedValue(JSON.stringify([VALID_QUESTION]))

    const result = await service.generateQuizQuestions('material', 1)

    expect(result).toEqual([VALID_QUESTION])
    expect(llmMock.chat).toHaveBeenCalledTimes(1)
  })

  // Regression: a logic question quoting "P ∧ ¬P" came back from the model with unbalanced
  // escaping — `Unexpected token '\'` — and failed the whole module's generation even though
  // the same prompt at temperature 0 is not guaranteed to repeat the mistake on Groq.
  it('retries once on malformed JSON and returns the result if the retry succeeds', async () => {
    const malformed = '[{"content": "unterminated string, "options": ["a","b","c","d"]}]'
    llmMock.chat
      .mockResolvedValueOnce(malformed)
      .mockResolvedValueOnce(JSON.stringify([VALID_QUESTION]))

    const result = await service.generateQuizQuestions('material', 1)

    expect(result).toEqual([VALID_QUESTION])
    expect(llmMock.chat).toHaveBeenCalledTimes(2)
  })

  it('gives up after exhausting all attempts against consistently malformed output', async () => {
    llmMock.chat.mockResolvedValue('not json at all')

    await expect(service.generateQuizQuestions('material', 1)).rejects.toThrow(
      'Invalid response format from AI',
    )
    expect(llmMock.chat).toHaveBeenCalledTimes(2)
  })

  it('rejects a question missing four options without retrying successfully', async () => {
    llmMock.chat.mockResolvedValue(JSON.stringify([{ ...VALID_QUESTION, options: ['only one'] }]))

    await expect(service.generateQuizQuestions('material', 1)).rejects.toThrow('invalid format')
    expect(llmMock.chat).toHaveBeenCalledTimes(2)
  })
})
