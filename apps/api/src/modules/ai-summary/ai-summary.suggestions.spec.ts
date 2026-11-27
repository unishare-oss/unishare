import { ServiceUnavailableException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { AiSummaryService } from './ai-summary.service'
import { TagsService } from '../tags/tags.service'
import { LlmService } from '../ai/llm/llm.service'
import { EmbeddingService } from '../ai/embedding/embedding.service'
import { RetrievalService } from '../ai/retrieval/retrieval.service'
import { DocumentExtractorService } from '../ai/extraction/document-extractor.service'

describe('AiSummaryService.generateSuggestedQuestions', () => {
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

    await expect(service.generateSuggestedQuestions('summary')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
    expect(llmMock.chat).not.toHaveBeenCalled()
  })

  it('asks the model about the summary and returns the questions it wrote', async () => {
    llmMock.chat.mockResolvedValue('What is an eigenvalue?\nHow is a matrix diagonalised?')

    const result = await service.generateSuggestedQuestions('Notes on linear algebra.')

    expect(result).toEqual(['What is an eigenvalue?', 'How is a matrix diagonalised?'])
    expect(llmMock.chat.mock.calls[0][0][1].content).toContain('Notes on linear algebra.')
  })

  it('returns an empty list when the model says nothing usable', async () => {
    llmMock.chat.mockResolvedValue(null)

    await expect(service.generateSuggestedQuestions('summary')).resolves.toEqual([])
  })
})
