import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { IngestStatus } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { PostsService } from './posts.service'
import { PostsRepository } from './posts.repository'
import { NotificationsService } from '../notifications/notifications.service'
import { FollowsService } from '../follows/follows.service'
import { TagsService } from '../tags/tags.service'
import { AiSummaryService } from '../ai-summary/ai-summary.service'

const PDF = 'application/pdf'
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const IMAGE = 'image/png'

describe('PostsService', () => {
  let service: PostsService
  let prismaMock: any

  beforeEach(async () => {
    prismaMock = {
      post: { findFirst: jest.fn() },
      postChunk: { count: jest.fn().mockResolvedValue(0) },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PostsRepository, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: FollowsService, useValue: {} },
        { provide: TagsService, useValue: {} },
        { provide: PrismaService, useValue: prismaMock },
        { provide: AiSummaryService, useValue: {} },
      ],
    }).compile()

    service = module.get<PostsService>(PostsService)
  })

  describe('getAiIndexStatus', () => {
    function givenFiles(files: { mimeType: string; ingestStatus: IngestStatus }[]) {
      prismaMock.post.findFirst.mockResolvedValue({ files })
    }

    it('throws when the post does not exist', async () => {
      prismaMock.post.findFirst.mockResolvedValue(null)

      await expect(service.getAiIndexStatus('nope')).rejects.toThrow(NotFoundException)
    })

    it('reports ready when every supported file is READY', async () => {
      givenFiles([
        { mimeType: PDF, ingestStatus: IngestStatus.READY },
        { mimeType: DOCX, ingestStatus: IngestStatus.READY },
      ])
      prismaMock.postChunk.count.mockResolvedValue(120)

      const result = await service.getAiIndexStatus('post-1')

      expect(result).toEqual({
        state: 'ready',
        indexedChunks: 120,
        supportedFiles: 2,
        readyFiles: 2,
      })
    })

    it('reports preparing while any supported file is PENDING or PROCESSING', async () => {
      givenFiles([
        { mimeType: PDF, ingestStatus: IngestStatus.READY },
        { mimeType: PDF, ingestStatus: IngestStatus.PROCESSING },
        { mimeType: DOCX, ingestStatus: IngestStatus.PENDING },
      ])

      const result = await service.getAiIndexStatus('post-1')

      expect(result.state).toBe('preparing')
      expect(result.supportedFiles).toBe(3)
      expect(result.readyFiles).toBe(1)
    })

    it('reports the live chunk count while preparing', async () => {
      givenFiles([{ mimeType: PDF, ingestStatus: IngestStatus.PROCESSING }])
      prismaMock.postChunk.count.mockResolvedValue(32)

      const result = await service.getAiIndexStatus('post-1')

      expect(result).toEqual({
        state: 'preparing',
        indexedChunks: 32,
        supportedFiles: 1,
        readyFiles: 0,
      })
      expect(prismaMock.postChunk.count).toHaveBeenCalledWith({ where: { postId: 'post-1' } })
    })

    it('reports unsupported when the post has no supported files at all', async () => {
      givenFiles([
        { mimeType: IMAGE, ingestStatus: IngestStatus.UNSUPPORTED },
        { mimeType: 'text/plain', ingestStatus: IngestStatus.PENDING },
      ])

      const result = await service.getAiIndexStatus('post-1')

      expect(result).toEqual({
        state: 'unsupported',
        indexedChunks: 0,
        supportedFiles: 0,
        readyFiles: 0,
      })
      // No point running a count query for a post that can never have chunks.
      expect(prismaMock.postChunk.count).not.toHaveBeenCalled()
    })

    it('reports unsupported when the post has no files at all', async () => {
      givenFiles([])

      const result = await service.getAiIndexStatus('post-1')

      expect(result.state).toBe('unsupported')
    })

    it('reports failed only when every supported file FAILED', async () => {
      givenFiles([
        { mimeType: PDF, ingestStatus: IngestStatus.FAILED },
        { mimeType: DOCX, ingestStatus: IngestStatus.FAILED },
      ])

      const result = await service.getAiIndexStatus('post-1')

      expect(result.state).toBe('failed')
      expect(result.readyFiles).toBe(0)
    })

    it('reports preparing when some failed but others are still in flight', async () => {
      givenFiles([
        { mimeType: PDF, ingestStatus: IngestStatus.FAILED },
        { mimeType: DOCX, ingestStatus: IngestStatus.PENDING },
      ])

      const result = await service.getAiIndexStatus('post-1')

      // One failed file among several must not present as a total failure.
      expect(result.state).toBe('preparing')
    })

    it('reports ready — not failed — when indexing settled with a mix of READY and FAILED', async () => {
      givenFiles([
        { mimeType: PDF, ingestStatus: IngestStatus.READY },
        { mimeType: DOCX, ingestStatus: IngestStatus.FAILED },
      ])
      prismaMock.postChunk.count.mockResolvedValue(44)

      const result = await service.getAiIndexStatus('post-1')

      // Nothing is left in flight, so this must settle rather than poll forever, and
      // retrieval genuinely works for the file that succeeded.
      expect(result.state).toBe('ready')
      expect(result.readyFiles).toBe(1)
      expect(result.supportedFiles).toBe(2)
    })

    it('does not sit on preparing when the only supported file is UNSUPPORTED', async () => {
      givenFiles([{ mimeType: PDF, ingestStatus: IngestStatus.UNSUPPORTED }])

      const result = await service.getAiIndexStatus('post-1')

      expect(result.state).toBe('failed')
    })
  })
})
