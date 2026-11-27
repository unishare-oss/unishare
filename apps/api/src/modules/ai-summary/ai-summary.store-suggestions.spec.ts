import { Test, TestingModule } from '@nestjs/testing'
import { PrismaService } from '@/prisma/prisma.service'
import { AiSummaryService } from './ai-summary.service'
import { TagsService } from '../tags/tags.service'
import { LlmService } from '../ai/llm/llm.service'
import { EmbeddingService } from '../ai/embedding/embedding.service'
import { RetrievalService } from '../ai/retrieval/retrieval.service'
import { DocumentExtractorService } from '../ai/extraction/document-extractor.service'

describe('AiSummaryService.generateAndStoreSuggestions', () => {
  let service: AiSummaryService
  let llmMock: { enabled: boolean; chat: jest.Mock }
  let prismaMock: { post: { update: jest.Mock } }

  beforeEach(async () => {
    llmMock = { enabled: true, chat: jest.fn() }
    prismaMock = { post: { update: jest.fn().mockResolvedValue({}) } }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiSummaryService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: TagsService, useValue: {} },
        { provide: LlmService, useValue: llmMock },
        { provide: EmbeddingService, useValue: {} },
        { provide: RetrievalService, useValue: {} },
        { provide: DocumentExtractorService, useValue: {} },
      ],
    }).compile()

    service = module.get(AiSummaryService)
  })

  it('saves the questions on the post and returns them', async () => {
    llmMock.chat.mockResolvedValue('What is a norm?\nWhy does symmetry matter?')

    const result = await service.generateAndStoreSuggestions('p1', 'A summary.')

    expect(result).toEqual(['What is a norm?', 'Why does symmetry matter?'])
    expect(prismaMock.post.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { suggestedQuestions: ['What is a norm?', 'Why does symmetry matter?'] },
    })
  })

  it('saves nothing when the model has no usable questions', async () => {
    llmMock.chat.mockResolvedValue('no questions here')

    await expect(service.generateAndStoreSuggestions('p1', 'A summary.')).resolves.toEqual([])
    expect(prismaMock.post.update).not.toHaveBeenCalled()
  })

  it('swallows a failure so the summary it follows is not lost', async () => {
    llmMock.chat.mockRejectedValue(new Error('provider down'))

    await expect(service.generateAndStoreSuggestions('p1', 'A summary.')).resolves.toEqual([])
    expect(prismaMock.post.update).not.toHaveBeenCalled()
  })

  it('swallows an unconfigured provider too', async () => {
    llmMock.enabled = false

    await expect(service.generateAndStoreSuggestions('p1', 'A summary.')).resolves.toEqual([])
  })
})
