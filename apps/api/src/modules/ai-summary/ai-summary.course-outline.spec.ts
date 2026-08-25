import { ServiceUnavailableException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { AiSummaryService } from './ai-summary.service'
import { TagsService } from '../tags/tags.service'
import { LlmService } from '../ai/llm/llm.service'
import { EmbeddingService } from '../ai/embedding/embedding.service'
import { RetrievalService } from '../ai/retrieval/retrieval.service'
import { DocumentExtractorService } from '../ai/extraction/document-extractor.service'

describe('AiSummaryService.extractCourseOutline', () => {
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
    await expect(service.extractCourseOutline('some syllabus text')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
    expect(llmMock.chat).not.toHaveBeenCalled()
  })

  it('parses a well-formed JSON array response', async () => {
    llmMock.chat.mockResolvedValue(
      JSON.stringify([
        { moduleNumber: 1, topics: ['Eigenvalues', 'Eigenvectors'] },
        { moduleNumber: 2, topics: ['Determinants'] },
      ]),
    )

    const result = await service.extractCourseOutline('Module 1: ...\nModule 2: ...')

    expect(result).toEqual([
      { moduleNumber: 1, topics: ['Eigenvalues', 'Eigenvectors'] },
      { moduleNumber: 2, topics: ['Determinants'] },
    ])
  })

  it('rejects a module missing a valid moduleNumber', async () => {
    llmMock.chat.mockResolvedValue(JSON.stringify([{ moduleNumber: 0, topics: ['x'] }]))
    await expect(service.extractCourseOutline('text')).rejects.toThrow('invalid moduleNumber')
  })

  it('rejects a module with non-array topics', async () => {
    llmMock.chat.mockResolvedValue(JSON.stringify([{ moduleNumber: 1, topics: 'not an array' }]))
    await expect(service.extractCourseOutline('text')).rejects.toThrow('invalid topics')
  })

  it('sends a much larger text budget than generateQuizQuestions, so a full syllabus reaches the prompt', async () => {
    llmMock.chat.mockResolvedValue('[]')
    const longText = 'x'.repeat(20000)

    await service.extractCourseOutline(longText)

    const sentContent = llmMock.chat.mock.calls[0][0][0].content as string
    expect(sentContent).toContain('x'.repeat(12000))
    expect(sentContent).not.toContain('x'.repeat(12001))
  })
})
