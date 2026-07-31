import { Test, TestingModule } from '@nestjs/testing'
import { FilesService } from './files.service'
import { FilesRepository } from './files.repository'
import { StorageService } from '@/modules/storage/storage.service'
import { PostsService } from '@/modules/posts/posts.service'
import { AiSummaryService } from '@/modules/ai-summary/ai-summary.service'
import { IngestionService } from '@/modules/ai/ingestion/ingestion.service'

describe('FilesService', () => {
  let service: FilesService
  let filesRepositoryMock: any
  let storageServiceMock: any
  let postsServiceMock: any
  let aiSummaryServiceMock: any
  let ingestionServiceMock: any

  const dto = { key: 'posts/u1/a.pdf', name: 'a.pdf', size: 10, mimeType: 'application/pdf' }
  const createdFile = { id: 'f1', postId: 'p1', ...dto, downloads: 0, ingestStatus: 'PENDING' }

  beforeEach(async () => {
    filesRepositoryMock = {
      create: jest.fn().mockResolvedValue(createdFile),
      findById: jest.fn(),
      incrementDownloads: jest.fn(),
      delete: jest.fn(),
    }
    storageServiceMock = {
      fileExists: jest.fn().mockResolvedValue(true),
      generatePresignedDownloadUrl: jest.fn(),
      deleteFile: jest.fn(),
    }
    postsServiceMock = {
      findOne: jest.fn().mockResolvedValue({ id: 'p1', isOwner: true, status: 'PENDING' }),
    }
    aiSummaryServiceMock = {
      summarizePost: jest.fn(),
      screenContent: jest.fn(),
    }
    ingestionServiceMock = {
      ingestFile: jest.fn().mockResolvedValue(undefined),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: FilesRepository, useValue: filesRepositoryMock },
        { provide: StorageService, useValue: storageServiceMock },
        { provide: PostsService, useValue: postsServiceMock },
        { provide: AiSummaryService, useValue: aiSummaryServiceMock },
        { provide: IngestionService, useValue: ingestionServiceMock },
      ],
    }).compile()

    service = module.get(FilesService)
  })

  describe('confirmUpload', () => {
    it('returns the created file record', async () => {
      const result = await service.confirmUpload('p1', dto as any, 'u1')

      expect(result).toEqual({ id: 'f1', ...dto, downloads: 0, ingestStatus: 'PENDING' })
      expect(filesRepositoryMock.create).toHaveBeenCalledWith('p1', dto)
    })

    it('resolves normally, and still returns the file record, when ingestFile rejects', async () => {
      // ingestFile is dispatched fire-and-forget (`void ...ingestFile(...).catch(...)`).
      // A rejection there -- e.g. a connection blip during the S3 download or the Ollama
      // round-trip -- must never fail the upload response itself: the user already has a
      // confirmed file, ingestion recoverability is Task 8's problem, not the upload
      // request's.
      ingestionServiceMock.ingestFile.mockRejectedValue(new Error('ollama unreachable'))

      const result = await expect(service.confirmUpload('p1', dto as any, 'u1')).resolves.toEqual({
        id: 'f1',
        ...dto,
        downloads: 0,
        ingestStatus: 'PENDING',
      })

      expect(ingestionServiceMock.ingestFile).toHaveBeenCalledWith('f1')
      return result
    })
  })
})
