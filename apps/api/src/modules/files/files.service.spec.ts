import { Test, TestingModule } from '@nestjs/testing'
import { FilesService } from './files.service'
import { FilesRepository } from './files.repository'
import { StorageService } from '@/modules/storage/storage.service'
import { PostsService } from '@/modules/posts/posts.service'
import { AiSummaryService } from '@/modules/ai-summary/ai-summary.service'
import { IngestionService } from '@/modules/ai/ingestion/ingestion.service'
import { NotFoundException } from '@nestjs/common'

const ALL = { kind: 'all' } as const

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
      assertPostInScope: jest.fn().mockResolvedValue(undefined),
    }
    aiSummaryServiceMock = {
      summarizePost: jest.fn(),
      summarizePostWhenIngested: jest.fn().mockResolvedValue(undefined),
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
    it('answers 404 for a post outside the scope, before the ownership check', async () => {
      const scope = { kind: 'university', universityId: 'uni-1' } as const
      postsServiceMock.findOne.mockRejectedValue(new NotFoundException('Post not found'))

      await expect(service.confirmUpload('p2', dto as any, 'u1', scope)).rejects.toThrow(
        NotFoundException,
      )
      expect(postsServiceMock.findOne).toHaveBeenCalledWith('p2', scope, { id: 'u1' })
      expect(filesRepositoryMock.create).not.toHaveBeenCalled()
    })

    it('returns the created file record', async () => {
      const result = await service.confirmUpload('p1', dto as any, 'u1', ALL)

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

      const result = await expect(
        service.confirmUpload('p1', dto as any, 'u1', ALL),
      ).resolves.toEqual({
        id: 'f1',
        ...dto,
        downloads: 0,
        ingestStatus: 'PENDING',
      })

      expect(ingestionServiceMock.ingestFile).toHaveBeenCalledWith('f1')
      return result
    })

    describe('summarisation waits for ingestion instead of racing it', () => {
      /** The chain is fire-and-forget, so let its microtasks drain before asserting. */
      const settle = () => new Promise((resolve) => setImmediate(resolve))

      beforeEach(() => {
        postsServiceMock.findOne.mockResolvedValue({ id: 'p1', isOwner: true, status: 'APPROVED' })
      })

      it('summarises only after ingestion has settled', async () => {
        let ingestDone: () => void
        ingestionServiceMock.ingestFile.mockReturnValue(
          new Promise<void>((resolve) => {
            ingestDone = resolve
          }),
        )

        await service.confirmUpload('p1', dto as any, 'u1', ALL)
        await settle()

        // The ordering IS the fix: dispatched together, summarisation always won the race
        // against its own chunks and re-extracted every file from S3.
        expect(aiSummaryServiceMock.summarizePostWhenIngested).not.toHaveBeenCalled()

        ingestDone!()
        await settle()

        expect(aiSummaryServiceMock.summarizePostWhenIngested).toHaveBeenCalledWith('p1')
      })

      it('still summarises when ingestion fails, so a bad ingest is not a missing summary', async () => {
        ingestionServiceMock.ingestFile.mockRejectedValue(new Error('ollama unreachable'))

        await service.confirmUpload('p1', dto as any, 'u1', ALL)
        await settle()

        // The catch sits before the chain deliberately. summarySourceTexts reads READY chunks
        // only and falls back to extraction, so the post is still summarised.
        expect(aiSummaryServiceMock.summarizePostWhenIngested).toHaveBeenCalledWith('p1')
      })

      it('does not summarise a post that is not approved', async () => {
        postsServiceMock.findOne.mockResolvedValue({ id: 'p1', isOwner: true, status: 'PENDING' })

        await service.confirmUpload('p1', dto as any, 'u1', ALL)
        await settle()

        expect(aiSummaryServiceMock.summarizePostWhenIngested).not.toHaveBeenCalled()
      })

      it('screens immediately rather than waiting for the embedding pipeline', async () => {
        ingestionServiceMock.ingestFile.mockReturnValue(new Promise<void>(() => {}))

        await service.confirmUpload('p1', dto as any, 'u1', ALL)
        await settle()

        // Moderation must not sit behind a ~90s ingest for a long document.
        expect(aiSummaryServiceMock.screenContent).toHaveBeenCalledWith('p1')
      })
    })
  })

  describe('getDownloadUrl', () => {
    const scope = { kind: 'university', universityId: 'uni-1' } as const

    it('answers 404 for a file of a post outside the scope, before looking the file up', async () => {
      postsServiceMock.assertPostInScope.mockRejectedValue(new NotFoundException('Post not found'))

      await expect(service.getDownloadUrl('p2', 'f1', scope)).rejects.toThrow(NotFoundException)
      expect(postsServiceMock.assertPostInScope).toHaveBeenCalledWith('p2', scope)
      expect(filesRepositoryMock.findById).not.toHaveBeenCalled()
    })

    it('recordDownload answers 404 for a post outside the scope and counts nothing', async () => {
      postsServiceMock.assertPostInScope.mockRejectedValue(new NotFoundException('Post not found'))

      await expect(service.recordDownload('p2', 'f1', scope)).rejects.toThrow(NotFoundException)
      expect(postsServiceMock.assertPostInScope).toHaveBeenCalledWith('p2', scope)
      expect(filesRepositoryMock.incrementDownloads).not.toHaveBeenCalled()
    })

    it('returns a presigned url for a file of a post in scope', async () => {
      filesRepositoryMock.findById.mockResolvedValue({ id: 'f1', postId: 'p1', key: 'k' })
      storageServiceMock.generatePresignedDownloadUrl.mockResolvedValue('https://signed')

      await expect(service.getDownloadUrl('p1', 'f1', scope)).resolves.toEqual({
        url: 'https://signed',
      })
    })
  })
})
