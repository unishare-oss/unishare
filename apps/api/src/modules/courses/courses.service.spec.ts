import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { CoursesService } from './courses.service'
import { CoursesRepository } from './courses.repository'
import { AiSummaryService } from '@/modules/ai-summary/ai-summary.service'
import { StorageService } from '@/modules/storage/storage.service'
import { UniversityScope } from '@/common/university-scope'
import { PendingUploadsService } from '@/modules/storage/pending-uploads.service'
import { DocumentExtractorService } from '@/modules/ai/extraction/document-extractor.service'
import { EmbeddingService } from '@/modules/ai/embedding/embedding.service'

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
        { provide: EmbeddingService, useValue: { enabled: false, embedQuery: jest.fn() } },
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

describe('CoursesService — embedding suggestions', () => {
  let service: CoursesService
  let repository: {
    findDepartmentInScope: jest.Mock
    findSuggestionCandidates: jest.Mock
    findNearestCourses: jest.Mock
  }
  let pendingUploads: { assertAvailable: jest.Mock }
  let extractor: { extractSampleFromKey: jest.Mock }
  let embedding: { enabled: boolean; embedQuery: jest.Mock }

  beforeEach(async () => {
    repository = {
      findDepartmentInScope: jest.fn().mockResolvedValue({ id: 'd1' }),
      findSuggestionCandidates: jest
        .fn()
        .mockResolvedValue([{ id: 'c1', code: 'CS101', name: 'Computer Science' }]),
      findNearestCourses: jest.fn().mockResolvedValue(['c1']),
    }
    pendingUploads = { assertAvailable: jest.fn().mockResolvedValue(undefined) }
    extractor = { extractSampleFromKey: jest.fn().mockResolvedValue('sample') }
    embedding = { enabled: true, embedQuery: jest.fn().mockResolvedValue([0.1, 0.2]) }

    const module = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: CoursesRepository, useValue: repository },
        { provide: AiSummaryService, useValue: {} },
        { provide: StorageService, useValue: {} },
        { provide: PendingUploadsService, useValue: pendingUploads },
        { provide: DocumentExtractorService, useValue: extractor },
        { provide: EmbeddingService, useValue: embedding },
      ],
    }).compile()
    service = module.get(CoursesService)
  })

  it('returns no suggestions without extracting or embedding unsupported-only files', async () => {
    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [{ key: 'archive.zip', mimeType: 'application/zip' }],
        },
        'user-1',
        U1,
      ),
    ).resolves.toEqual({ suggestions: [], available: true })
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(embedding.embedQuery).not.toHaveBeenCalled()
  })

  it('refuses an out-of-scope department before extracting or embedding', async () => {
    repository.findDepartmentInScope.mockResolvedValue(null)
    await expect(
      service.suggest(
        {
          departmentId: 'outside',
          files: [{ key: 'owned.pdf', mimeType: 'application/pdf' }],
        },
        'user-1',
        U1,
      ),
    ).rejects.toThrow(NotFoundException)
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(embedding.embedQuery).not.toHaveBeenCalled()
  })

  it('refuses an unowned upload before extracting or embedding', async () => {
    pendingUploads.assertAvailable.mockRejectedValue(new ForbiddenException())
    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [{ key: 'another-users.pdf', mimeType: 'application/pdf' }],
        },
        'user-1',
        U1,
      ),
    ).rejects.toThrow(ForbiddenException)
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(embedding.embedQuery).not.toHaveBeenCalled()
  })

  it('returns unavailable without extracting when embeddings are disabled', async () => {
    embedding.enabled = false
    await expect(
      service.suggest(
        {
          departmentId: 'd1',
          files: [{ key: 'owned.pdf', mimeType: 'application/pdf' }],
        },
        'user-1',
        U1,
      ),
    ).resolves.toEqual({ suggestions: [], available: false })
    expect(extractor.extractSampleFromKey).not.toHaveBeenCalled()
    expect(embedding.embedQuery).not.toHaveBeenCalled()
  })
})
