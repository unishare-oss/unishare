import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { CoursesService } from './courses.service'
import { CoursesRepository } from './courses.repository'
import { AiSummaryService } from '@/modules/ai-summary/ai-summary.service'
import { StorageService } from '@/modules/storage/storage.service'
import { UniversityScope } from '@/common/university-scope'
import { PendingUploadsService } from '@/modules/storage/pending-uploads.service'
import { DocumentExtractorService } from '@/modules/ai/extraction/document-extractor.service'
import { LlmService } from '@/modules/ai/llm/llm.service'

const U1: UniversityScope = { kind: 'university', universityId: 'u1' }

describe('CoursesService — outline', () => {
  let service: CoursesService
  let repo: {
    findById: jest.Mock
    findOutline: jest.Mock
    replaceOutline: jest.Mock
    findSuggestionCandidates: jest.Mock
    findDepartmentInScope: jest.Mock
  }
  let aiSummary: { extractTextFromBuffer: jest.Mock; extractCourseOutline: jest.Mock }
  let storageService: { getObjectBuffer: jest.Mock }

  beforeEach(async () => {
    repo = {
      findById: jest.fn().mockResolvedValue({ id: 'c1', code: 'CS101', name: 'Intro to CS' }),
      findOutline: jest.fn(),
      replaceOutline: jest.fn(),
      findSuggestionCandidates: jest.fn(),
      findDepartmentInScope: jest.fn().mockResolvedValue({ id: 'd1' }),
    }
    aiSummary = { extractTextFromBuffer: jest.fn(), extractCourseOutline: jest.fn() }
    storageService = { getObjectBuffer: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: CoursesRepository, useValue: repo },
        { provide: AiSummaryService, useValue: aiSummary },
        { provide: StorageService, useValue: storageService },
        { provide: PendingUploadsService, useValue: { assertAvailable: jest.fn() } },
        { provide: DocumentExtractorService, useValue: { extractSampleFromKey: jest.fn() } },
        { provide: LlmService, useValue: { providerName: null, chatOnce: jest.fn() } },
      ],
    }).compile()

    service = module.get(CoursesService)
  })

  describe('getOutline / replaceOutline', () => {
    it('404s when the course does not exist', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.getOutline('missing', U1)).rejects.toThrow('Course not found')
    })

    it('gives 404 for the outline of a course outside the scope', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.getOutline('c1', U1)).rejects.toThrow(NotFoundException)
      await expect(service.replaceOutline('c1', [], U1)).rejects.toThrow(NotFoundException)
      expect(repo.findById).toHaveBeenCalledWith('c1', U1)
      expect(repo.findOutline).not.toHaveBeenCalled()
      expect(repo.replaceOutline).not.toHaveBeenCalled()
    })

    it('replaces the outline and returns the new set', async () => {
      const modules = [{ moduleNumber: 1, topics: ['a', 'b'] }]
      repo.findOutline.mockResolvedValue(modules)

      const result = await service.replaceOutline('c1', modules, U1)

      expect(repo.replaceOutline).toHaveBeenCalledWith('c1', modules)
      expect(result).toEqual(modules)
    })
  })

  describe('extractOutlineFromFile', () => {
    it('rejects unsupported mime types before touching storage', async () => {
      await expect(
        service.extractOutlineFromFile('c1', 'key', 'application/zip', U1),
      ).rejects.toThrow(BadRequestException)
      expect(storageService.getObjectBuffer).not.toHaveBeenCalled()
    })

    it('rejects when the file has no extractable text', async () => {
      storageService.getObjectBuffer.mockResolvedValue(Buffer.from('irrelevant'))
      aiSummary.extractTextFromBuffer.mockResolvedValue('   ')

      await expect(
        service.extractOutlineFromFile('c1', 'key', 'application/pdf', U1),
      ).rejects.toThrow('Could not extract text from the uploaded file')
      expect(aiSummary.extractCourseOutline).not.toHaveBeenCalled()
    })

    it('returns the AI-extracted modules without persisting them', async () => {
      storageService.getObjectBuffer.mockResolvedValue(Buffer.from('syllabus bytes'))
      aiSummary.extractTextFromBuffer.mockResolvedValue('Module 1: Intro...')
      const extracted = [{ moduleNumber: 1, topics: ['Intro'] }]
      aiSummary.extractCourseOutline.mockResolvedValue(extracted)

      const result = await service.extractOutlineFromFile('c1', 'key', 'application/pdf', U1)

      expect(result).toEqual(extracted)
      expect(repo.replaceOutline).not.toHaveBeenCalled()
    })
  })
})

describe('CoursesService — suggestions', () => {
  let service: CoursesService
  let repo: { findSuggestionCandidates: jest.Mock; findDepartmentInScope: jest.Mock }
  let files: { assertAvailable: jest.Mock }
  let extractor: { extractSampleFromKey: jest.Mock }
  let llm: { chatOnce: jest.Mock; supportsLocalOnlyMatching: boolean }

  beforeEach(async () => {
    repo = {
      findSuggestionCandidates: jest.fn().mockResolvedValue([
        { id: 'c1', code: 'CS101', name: 'Computer Science' },
        { id: 'c2', code: 'MA101', name: 'Calculus' },
      ]),
      findDepartmentInScope: jest.fn().mockResolvedValue({ id: 'd1' }),
    }
    files = {
      assertAvailable: jest.fn(
        async (_userId: string, references: Array<{ key: string; mimeType: string }>) =>
          references.map(({ key, mimeType }) => ({ key, mimeType })),
      ),
    }
    extractor = { extractSampleFromKey: jest.fn().mockResolvedValue('intro to algorithms') }
    llm = {
      supportsLocalOnlyMatching: true,
      chatOnce: jest
        .fn()
        .mockResolvedValue('{"suggestions":[{"courseId":"c1","confidence":"high"}]}'),
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: CoursesRepository, useValue: repo },
        { provide: AiSummaryService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: PendingUploadsService, useValue: files },
        { provide: DocumentExtractorService, useValue: extractor },
        { provide: LlmService, useValue: llm },
      ],
    }).compile()
    service = module.get(CoursesService)
  })

  it('caps the combined sample at 12,000 characters', async () => {
    const files = Array.from({ length: 7 }, (_, i) => ({
      key: `k${i}`,
      name: `${i}.pdf`,
      mimeType: 'application/pdf',
      size: 1,
    }))
    extractor.extractSampleFromKey.mockResolvedValue('x'.repeat(4_500))

    const result = await service.suggest({ departmentId: 'd1', files }, 'u1', U1)

    expect(extractor.extractSampleFromKey).toHaveBeenCalledTimes(3)
    expect(extractor.extractSampleFromKey).toHaveBeenNthCalledWith(1, 'k0', 'application/pdf')
    expect(llm.chatOnce).toHaveBeenCalledTimes(1)
    const prompt = llm.chatOnce.mock.calls[0][0][0].content as string
    expect(prompt.match(/x/g)).toHaveLength(12_000)
    expect(result.suggestions).toEqual([{ id: 'c1', code: 'CS101', name: 'Computer Science' }])
  })

  it('reads no more than the first five supported files', async () => {
    extractor.extractSampleFromKey.mockResolvedValue('short sample')
    const files = Array.from({ length: 7 }, (_, i) => ({
      key: `k${i}`,
      name: `${i}.pdf`,
      mimeType: 'application/pdf',
      size: 1,
    }))

    await service.suggest({ departmentId: 'd1', files }, 'u1', U1)

    expect(extractor.extractSampleFromKey).toHaveBeenCalledTimes(5)
    expect(extractor.extractSampleFromKey).toHaveBeenLastCalledWith('k4', 'application/pdf')
  })

  it('rejects an out-of-scope department before extraction or model access', async () => {
    repo.findDepartmentInScope.mockResolvedValue(null)
    await expect(
      service.suggest(
        {
          departmentId: 'outside',
          files: [{ key: 'k1', name: 'notes.pdf', mimeType: 'application/pdf', size: 1 }],
        },
        'u1',
        U1,
      ),
    ).rejects.toThrow(NotFoundException)
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(llm.chatOnce).not.toHaveBeenCalled()
  })

  it('returns no suggestions without calling the model when no eligible courses exist', async () => {
    repo.findSuggestionCandidates.mockResolvedValue([])
    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [{ key: 'k1', name: 'notes.pdf', mimeType: 'application/pdf', size: 1 }],
        },
        'u1',
        U1,
      ),
    ).resolves.toMatchObject({ suggestions: [], available: true })
    expect(llm.chatOnce).not.toHaveBeenCalled()
  })

  it('returns no suggestions without calling the model for unsupported-only files', async () => {
    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [{ key: 'k1', name: 'archive.zip', mimeType: 'application/zip', size: 1 }],
        },
        'u1',
        U1,
      ),
    ).resolves.toMatchObject({ suggestions: [], available: true })
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(llm.chatOnce).not.toHaveBeenCalled()
  })

  it('returns no suggestions and makes no AI call when the configured provider is not Ollama', async () => {
    llm.supportsLocalOnlyMatching = false

    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [
            {
              key: 'k1',
              name: 'notes.pdf',
              mimeType: 'application/pdf',
              size: 1,
            },
          ],
        },
        'u1',
        U1,
      ),
    ).resolves.toMatchObject({ suggestions: [], available: false })
    expect(llm.chatOnce).not.toHaveBeenCalled()
  })

  it('returns unavailable after the 30-second LLM timeout so the manual course list stays usable', async () => {
    llm.chatOnce.mockRejectedValue(new Error('timeout'))

    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [
            {
              key: 'k1',
              name: 'notes.pdf',
              mimeType: 'application/pdf',
              size: 1,
            },
          ],
        },
        'u1',
        U1,
      ),
    ).resolves.toMatchObject({ suggestions: [], available: false })
    expect(llm.chatOnce).toHaveBeenCalledWith(expect.any(Array), {
      maxTokens: 250,
      temperature: 0,
      timeoutMs: 30_000,
    })
  })

  it('parses JSON surrounded by explanatory text and a fenced code block', async () => {
    llm.chatOnce.mockResolvedValue(
      'Here are the matches:\n```json\n{"suggestions":[{"courseId":"c1","confidence":"high"}]}\n```',
    )

    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [{ key: 'k1', name: 'notes.pdf', mimeType: 'application/pdf', size: 1 }],
        },
        'u1',
        U1,
      ),
    ).resolves.toMatchObject({ suggestions: [{ id: 'c1', code: 'CS101' }], available: true })
  })

  it('drops low-confidence and out-of-department course IDs from the provider result', async () => {
    llm.chatOnce.mockResolvedValue(
      JSON.stringify({
        suggestions: [
          { courseId: 'not-eligible', confidence: 'high' },
          { courseId: 'c2', confidence: 'low' },
        ],
      }),
    )

    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [
            {
              key: 'k1',
              name: 'notes.pdf',
              mimeType: 'application/pdf',
              size: 1,
            },
          ],
        },
        'u1',
        U1,
      ),
    ).resolves.toMatchObject({ suggestions: [], available: true })
  })

  it('preserves provider ranking and returns at most three eligible courses', async () => {
    repo.findSuggestionCandidates.mockResolvedValue(
      ['c1', 'c2', 'c3', 'c4'].map((id) => ({ id, code: id.toUpperCase(), name: id })),
    )
    llm.chatOnce.mockResolvedValue(
      JSON.stringify({
        suggestions: [
          { courseId: 'c3', confidence: 'high' },
          { courseId: 'c1', confidence: 'medium' },
          { courseId: 'c4', confidence: 'high' },
          { courseId: 'c2', confidence: 'high' },
        ],
      }),
    )

    const result = await service.suggest(
      {
        departmentId: 'd1',
        files: [
          {
            key: 'k1',
            name: 'notes.pdf',
            mimeType: 'application/pdf',
            size: 1,
          },
        ],
      },
      'u1',
      U1,
    )

    expect(result.suggestions.map(({ id }) => id)).toEqual(['c3', 'c1', 'c4'])
  })

  it('marks a malformed model response unavailable', async () => {
    llm.chatOnce.mockResolvedValue('not json')

    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [
            {
              key: 'k1',
              name: 'notes.pdf',
              mimeType: 'application/pdf',
              size: 1,
            },
          ],
        },
        'u1',
        U1,
      ),
    ).resolves.toMatchObject({ suggestions: [], available: false })
  })

  it('refuses an upload the requester does not own before extracting or calling the model', async () => {
    files.assertAvailable.mockRejectedValue(new NotFoundException('Uploaded file not found'))

    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [
            {
              key: 'posts/other/a.pdf',
              name: 'notes.pdf',
              mimeType: 'application/pdf',
              size: 1,
            },
          ],
        },
        'u1',
        U1,
      ),
    ).rejects.toThrow(NotFoundException)
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(llm.chatOnce).not.toHaveBeenCalled()
  })

  it('preserves access errors raised during extraction', async () => {
    extractor.extractSampleFromKey.mockRejectedValue(new ForbiddenException())
    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [{ key: 'k1', name: 'notes.pdf', mimeType: 'application/pdf', size: 1 }],
        },
        'u1',
        U1,
      ),
    ).rejects.toThrow(ForbiddenException)
  })

  it('logs a content-free warning and returns unavailable on matching failure', async () => {
    const warn = jest.spyOn((service as any).logger, 'warn')
    extractor.extractSampleFromKey.mockRejectedValue(new Error('extract failed'))
    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [{ key: 'k1', name: 'notes.pdf', mimeType: 'application/pdf', size: 1 }],
        },
        'u1',
        U1,
      ),
    ).resolves.toMatchObject({ suggestions: [], available: false })
    expect(warn).toHaveBeenCalledWith('Course matching failed; suggestions are unavailable')
    expect(warn.mock.calls.flat().join(' ')).not.toContain('extract failed')
  })
})
