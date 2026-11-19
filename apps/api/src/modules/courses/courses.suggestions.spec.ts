import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { AiSummaryService } from '@/modules/ai-summary/ai-summary.service'
import { UniversityScope } from '@/common/university-scope'
import { DocumentExtractorService } from '@/modules/ai/extraction/document-extractor.service'
import { EmbeddingService } from '@/modules/ai/embedding/embedding.service'
import { PendingUploadsService } from '@/modules/storage/pending-uploads.service'
import { StorageService } from '@/modules/storage/storage.service'
import { LlmService } from '@/modules/ai/llm/llm.service'
import { CoursesRepository } from './courses.repository'
import { CoursesService } from './courses.service'

const scope: UniversityScope = { kind: 'university', universityId: 'u1' }
const candidates = [
  { id: 'c1', code: 'CS101', name: 'Computer Science' },
  { id: 'c2', code: 'MA101', name: 'Calculus' },
]
const files = [{ key: 'owned.pdf', mimeType: 'application/pdf' }]

describe('CoursesService suggestions', () => {
  let service: CoursesService
  let repository: {
    findDepartmentInScope: jest.Mock
    findSuggestionCandidates: jest.Mock
    findNearestCourses: jest.Mock
  }
  let uploads: { assertAvailable: jest.Mock }
  let extractor: { extractSampleFromKey: jest.Mock }
  let embedding: { enabled: boolean; embedQuery: jest.Mock }
  let testingModule: TestingModule

  beforeEach(async () => {
    repository = {
      findDepartmentInScope: jest.fn().mockResolvedValue({ id: 'd1' }),
      findSuggestionCandidates: jest.fn().mockResolvedValue(candidates),
      findNearestCourses: jest.fn().mockResolvedValue(['c2', 'c1']),
    }
    uploads = { assertAvailable: jest.fn().mockResolvedValue(undefined) }
    extractor = { extractSampleFromKey: jest.fn().mockResolvedValue('sample text') }
    embedding = { enabled: true, embedQuery: jest.fn().mockResolvedValue([0.2, 0.3]) }

    testingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: CoursesRepository, useValue: repository },
        { provide: AiSummaryService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: PendingUploadsService, useValue: uploads },
        { provide: DocumentExtractorService, useValue: extractor },
        { provide: EmbeddingService, useValue: embedding },
      ],
    }).compile()
    service = testingModule.get(CoursesService)
  })

  it('returns repository ranking mapped to eligible course details', async () => {
    await expect(service.suggest({ departmentId: 'd1', files }, 'user-1', scope)).resolves.toEqual({
      suggestions: [candidates[1], candidates[0]],
      available: true,
    })
    expect(embedding.embedQuery).toHaveBeenCalledWith('sample text')
    expect(repository.findNearestCourses).toHaveBeenCalledWith([0.2, 0.3], ['c1', 'c2'], 0.6)
  })

  it('returns no suggestions when the repository finds no qualifying courses', async () => {
    repository.findNearestCourses.mockResolvedValue([])
    await expect(service.suggest({ departmentId: 'd1', files }, 'user-1', scope)).resolves.toEqual({
      suggestions: [],
      available: true,
    })
  })

  it('returns no suggestions without embedding when there are no candidate courses', async () => {
    repository.findSuggestionCandidates.mockResolvedValue([])
    uploads.assertAvailable.mockResolvedValue(undefined)
    await expect(service.suggest({ departmentId: 'd1', files }, 'user-1', scope)).resolves.toEqual({
      suggestions: [],
      available: true,
    })
    expect(uploads.assertAvailable).toHaveBeenCalledTimes(1)
    expect(uploads.assertAvailable.mock.invocationCallOrder[0]).toBeLessThan(
      repository.findSuggestionCandidates.mock.invocationCallOrder[0],
    )
    expect(embedding.embedQuery).not.toHaveBeenCalled()
    expect(repository.findNearestCourses).not.toHaveBeenCalled()
  })

  it('propagates access errors raised while extracting an owned upload sample', async () => {
    extractor.extractSampleFromKey.mockRejectedValue(new ForbiddenException())
    await expect(service.suggest({ departmentId: 'd1', files }, 'user-1', scope)).rejects.toThrow(
      ForbiddenException,
    )
    expect(embedding.embedQuery).not.toHaveBeenCalled()
  })

  it('keeps manual selection available when no file text can be sampled', async () => {
    extractor.extractSampleFromKey.mockResolvedValue('  ')
    await expect(service.suggest({ departmentId: 'd1', files }, 'user-1', scope)).resolves.toEqual({
      suggestions: [],
      available: true,
    })
    expect(embedding.embedQuery).not.toHaveBeenCalled()
  })

  it('keeps the combined sample within 12,000 characters', async () => {
    extractor.extractSampleFromKey.mockResolvedValue('x'.repeat(4_500))
    const sampleFiles = Array.from({ length: 7 }, (_, index) => ({
      key: `file-${index}`,
      mimeType: 'application/pdf',
    }))

    await service.suggest({ departmentId: 'd1', files: sampleFiles }, 'user-1', scope)

    expect(extractor.extractSampleFromKey).toHaveBeenCalledTimes(3)
    expect(embedding.embedQuery.mock.calls[0][0].match(/x/g)).toHaveLength(12_000)
  })

  it('samples no more than the first five files', async () => {
    const sampleFiles = Array.from({ length: 7 }, (_, index) => ({
      key: `file-${index}`,
      mimeType: 'application/pdf',
    }))

    await service.suggest({ departmentId: 'd1', files: sampleFiles }, 'user-1', scope)

    expect(extractor.extractSampleFromKey).toHaveBeenCalledTimes(5)
    expect(extractor.extractSampleFromKey).toHaveBeenLastCalledWith('file-4', 'application/pdf')
  })

  it('returns unavailable without embedding when embeddings are disabled', async () => {
    embedding.enabled = false
    await expect(service.suggest({ departmentId: 'd1', files }, 'user-1', scope)).resolves.toEqual({
      suggestions: [],
      available: false,
    })
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(embedding.embedQuery).not.toHaveBeenCalled()
  })

  it('returns unavailable when embedding fails and logs no file content', async () => {
    embedding.embedQuery.mockRejectedValue(new Error('provider failed'))
    const warn = jest.spyOn((service as any).logger, 'warn')
    await expect(service.suggest({ departmentId: 'd1', files }, 'user-1', scope)).resolves.toEqual({
      suggestions: [],
      available: false,
    })
    expect(warn).toHaveBeenCalledWith('Course matching failed; suggestions are unavailable')
    expect(warn.mock.calls.flat().join(' ')).not.toContain('sample text')
  })

  it('checks scope and upload ownership before embedding', async () => {
    repository.findDepartmentInScope.mockResolvedValue(null)
    await expect(
      service.suggest({ departmentId: 'outside', files }, 'user-1', scope),
    ).rejects.toThrow(NotFoundException)
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(embedding.embedQuery).not.toHaveBeenCalled()

    repository.findDepartmentInScope.mockResolvedValue({ id: 'd1' })
    uploads.assertAvailable.mockRejectedValue(new ForbiddenException())
    await expect(service.suggest({ departmentId: 'd1', files }, 'user-1', scope)).rejects.toThrow(
      ForbiddenException,
    )
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(embedding.embedQuery).not.toHaveBeenCalled()
  })

  it('constructs the matching service without an LLM provider', () => {
    expect(() => testingModule.get(LlmService)).toThrow()
  })

  it('does not extract or embed unsupported-only files', async () => {
    await expect(
      service.suggest(
        { departmentId: 'd1', files: [{ key: 'archive.zip', mimeType: 'application/zip' }] },
        'user-1',
        scope,
      ),
    ).resolves.toEqual({ suggestions: [], available: true })
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(embedding.embedQuery).not.toHaveBeenCalled()
  })

  it('refuses out-of-scope departments and unowned uploads before extraction or embedding', async () => {
    repository.findDepartmentInScope.mockResolvedValue(null)
    await expect(
      service.suggest({ departmentId: 'outside', files }, 'user-1', scope),
    ).rejects.toThrow(NotFoundException)
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(embedding.embedQuery).not.toHaveBeenCalled()
    expect(repository.findSuggestionCandidates).not.toHaveBeenCalled()

    repository.findDepartmentInScope.mockResolvedValue({ id: 'd1' })
    uploads.assertAvailable.mockRejectedValue(new NotFoundException())
    await expect(service.suggest({ departmentId: 'd1', files }, 'user-1', scope)).rejects.toThrow(
      NotFoundException,
    )
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(embedding.embedQuery).not.toHaveBeenCalled()
    expect(repository.findSuggestionCandidates).not.toHaveBeenCalled()
  })
})
