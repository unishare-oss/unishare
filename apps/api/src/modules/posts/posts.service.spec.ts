import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import {
  IngestStatus,
  PostPublicationStatus,
  PostStatus,
  PostType,
  Prisma,
  UserRole,
} from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { PostsService } from './posts.service'
import { PostsRepository } from './posts.repository'
import { NotificationsService } from '../notifications/notifications.service'
import { FollowsService } from '../follows/follows.service'
import { TagsService } from '../tags/tags.service'
import { AiSummaryService } from '../ai-summary/ai-summary.service'
import { EmbeddingService } from '../ai/embedding/embedding.service'
import { AuditService } from '../audit/audit.service'
import { UniversityScope } from '@/common/university-scope'

const PDF = 'application/pdf'
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const IMAGE = 'image/png'

const ALL: UniversityScope = { kind: 'all' }
const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const NONE: UniversityScope = { kind: 'none' }
const IN_U1 = { course: { department: { faculty: { universityId: 'u1' } } } }

const chatDto = { messages: [{ role: 'user' as const, content: 'What is this about?' }] }

const UNSUPPORTED_RESULT = {
  state: 'unsupported',
  indexedChunks: 0,
  supportedFiles: 0,
  readyFiles: 0,
}

describe('PostsService', () => {
  let service: PostsService
  let prismaMock: any
  let embeddingMock: { enabled: boolean }
  let repoMock: any
  let notificationsMock: { notifyPostStatus: jest.Mock; notifyFollowersNewPost: jest.Mock }
  let followsMock: { getFollowers: jest.Mock }
  let aiSummaryMock: {
    chatWithPost: jest.Mock
    chatWithPostStream: jest.Mock
    summarizePost: jest.Mock
  }

  beforeEach(async () => {
    prismaMock = {
      post: { findFirst: jest.fn() },
      $queryRaw: jest.fn(),
      postChunk: { count: jest.fn().mockResolvedValue(0) },
    }
    embeddingMock = { enabled: true }
    aiSummaryMock = {
      chatWithPost: jest.fn().mockResolvedValue({ reply: 'ok' }),
      chatWithPostStream: jest.fn().mockResolvedValue([]),
      summarizePost: jest.fn(),
    }
    repoMock = {
      findAll: jest.fn().mockResolvedValue({ items: [] }),
      findById: jest.fn(),
      findInScope: jest.fn(),
      findByShortCode: jest.fn(),
      findIdInScope: jest.fn(),
      findSaved: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
      savePost: jest.fn(),
      toggleReaction: jest.fn(),
      recordView: jest.fn().mockResolvedValue(undefined),
      update: jest.fn(),
      updateStatus: jest.fn().mockResolvedValue({ id: 'p2' }),
    }
    notificationsMock = { notifyPostStatus: jest.fn(), notifyFollowersNewPost: jest.fn() }
    followsMock = { getFollowers: jest.fn().mockResolvedValue([]) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PostsRepository, useValue: repoMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: FollowsService, useValue: followsMock },
        { provide: TagsService, useValue: {} },
        { provide: PrismaService, useValue: prismaMock },
        { provide: AiSummaryService, useValue: aiSummaryMock },
        { provide: EmbeddingService, useValue: embeddingMock },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile()

    service = module.get<PostsService>(PostsService)
  })

  describe('getAiIndexStatus', () => {
    function givenFiles(files: { mimeType: string; ingestStatus: IngestStatus }[]) {
      prismaMock.post.findFirst.mockResolvedValue({
        publicationStatus: PostPublicationStatus.PUBLISHED,
        status: PostStatus.APPROVED,
        files,
      })
    }

    it('throws when the post does not exist', async () => {
      prismaMock.post.findFirst.mockResolvedValue(null)

      await expect(service.getAiIndexStatus('nope', ALL)).rejects.toThrow(NotFoundException)
    })

    it('reports ready when every supported file is READY', async () => {
      givenFiles([
        { mimeType: PDF, ingestStatus: IngestStatus.READY },
        { mimeType: DOCX, ingestStatus: IngestStatus.READY },
      ])
      prismaMock.postChunk.count.mockResolvedValue(120)

      const result = await service.getAiIndexStatus('post-1', ALL)

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

      const result = await service.getAiIndexStatus('post-1', ALL)

      expect(result.state).toBe('preparing')
      expect(result.supportedFiles).toBe(3)
      expect(result.readyFiles).toBe(1)
    })

    it('reports the live chunk count while preparing', async () => {
      givenFiles([{ mimeType: PDF, ingestStatus: IngestStatus.PROCESSING }])
      prismaMock.postChunk.count.mockResolvedValue(32)

      const result = await service.getAiIndexStatus('post-1', ALL)

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

      const result = await service.getAiIndexStatus('post-1', ALL)

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

      const result = await service.getAiIndexStatus('post-1', ALL)

      expect(result.state).toBe('unsupported')
    })

    it('reports failed only when every supported file FAILED', async () => {
      givenFiles([
        { mimeType: PDF, ingestStatus: IngestStatus.FAILED },
        { mimeType: DOCX, ingestStatus: IngestStatus.FAILED },
      ])

      const result = await service.getAiIndexStatus('post-1', ALL)

      expect(result.state).toBe('failed')
      expect(result.readyFiles).toBe(0)
    })

    it('reports preparing when some failed but others are still in flight', async () => {
      givenFiles([
        { mimeType: PDF, ingestStatus: IngestStatus.FAILED },
        { mimeType: DOCX, ingestStatus: IngestStatus.PENDING },
      ])

      const result = await service.getAiIndexStatus('post-1', ALL)

      // One failed file among several must not present as a total failure.
      expect(result.state).toBe('preparing')
    })

    it('reports ready — not failed — when indexing settled with a mix of READY and FAILED', async () => {
      givenFiles([
        { mimeType: PDF, ingestStatus: IngestStatus.READY },
        { mimeType: DOCX, ingestStatus: IngestStatus.FAILED },
      ])
      prismaMock.postChunk.count.mockResolvedValue(44)

      const result = await service.getAiIndexStatus('post-1', ALL)

      // Nothing is left in flight, so this must settle rather than poll forever, and
      // retrieval genuinely works for the file that succeeded.
      expect(result.state).toBe('ready')
      expect(result.readyFiles).toBe(1)
      expect(result.supportedFiles).toBe(2)
    })

    it('does not sit on preparing when the only supported file is UNSUPPORTED', async () => {
      givenFiles([{ mimeType: PDF, ingestStatus: IngestStatus.UNSUPPORTED }])

      const result = await service.getAiIndexStatus('post-1', ALL)

      expect(result.state).toBe('failed')
    })

    it('ignores files whose mime type cannot be indexed when deciding state', async () => {
      // A PNG sits at PENDING forever: ingestFile early-returns for unsupported mime types and
      // the migration backfilled every row to PENDING. Aggregating over post.files instead of
      // `supported` would read that as 'preparing' and poll forever.
      givenFiles([
        { mimeType: PDF, ingestStatus: IngestStatus.READY },
        { mimeType: IMAGE, ingestStatus: IngestStatus.PENDING },
      ])

      const result = await service.getAiIndexStatus('post-1', ALL)

      expect(result.state).toBe('ready')
      expect(result.supportedFiles).toBe(1)
      expect(result.readyFiles).toBe(1)
    })

    it('reports unsupported when embedding is disabled, so it never polls forever', async () => {
      // Embedding off is a supported mode. ingestFile returns before writing a status and the
      // recovery sweep skips too, so every row stays PENDING permanently -- 'preparing' would
      // be a lie that never resolves.
      embeddingMock.enabled = false
      givenFiles([{ mimeType: PDF, ingestStatus: IngestStatus.PENDING }])

      const result = await service.getAiIndexStatus('post-1', ALL)

      expect(result).toEqual(UNSUPPORTED_RESULT)
      // Short-circuits before touching the database at all.
      expect(prismaMock.post.findFirst).not.toHaveBeenCalled()
      expect(prismaMock.postChunk.count).not.toHaveBeenCalled()
    })

    it.each([
      ['a draft', PostPublicationStatus.DRAFT, PostStatus.APPROVED],
      ['an unapproved post', PostPublicationStatus.PUBLISHED, PostStatus.PENDING],
    ])(
      'reports unsupported for %s, because chatWithPost would 403',
      async (_label, publicationStatus, status) => {
        prismaMock.post.findFirst.mockResolvedValue({
          publicationStatus,
          status,
          files: [{ mimeType: PDF, ingestStatus: IngestStatus.PENDING }],
        })

        const result = await service.getAiIndexStatus('post-1', ALL)

        // The notice must not say "you can ask questions now" when every send returns 403.
        expect(result).toEqual(UNSUPPORTED_RESULT)
        expect(prismaMock.postChunk.count).not.toHaveBeenCalled()
      },
    )
  })

  describe('update', () => {
    it('stamps editedAt when the owner edits the post', async () => {
      const post = { id: 'post-1', type: PostType.NOTE, isOwner: true }
      repoMock.findInScope.mockResolvedValue(post)
      repoMock.findById.mockResolvedValue(post)
      repoMock.update.mockResolvedValue(post)

      await service.update('post-1', { title: 'New title' }, 'user-1', ALL)

      expect(repoMock.update).toHaveBeenCalledWith(
        'post-1',
        expect.objectContaining({ title: 'New title', editedAt: expect.any(Date) }),
        { id: 'user-1' },
      )
    })
  })

  describe('university scope', () => {
    it('findAll combines the scope with the existing filters in AND', async () => {
      await service.findAll({ departmentId: 'd1' } as any, U1, { id: 'user-1' })

      const [where] = repoMock.findAll.mock.calls[0]
      expect(where.AND).toHaveLength(2)
      expect(where.AND[0]).toMatchObject({ course: { departmentId: 'd1' } })
      expect(where.AND[1]).toEqual(IN_U1)
    })

    it('findAll for a member with no university matches no post', async () => {
      await service.findAll({} as any, NONE, { id: 'user-1' })

      const [where] = repoMock.findAll.mock.calls[0]
      expect(where.AND[1]).toEqual({ course: { id: { in: [] } } })
    })

    it('getSavedPosts passes the scope to the repository', async () => {
      await service.getSavedPosts('user-1', U1, {} as any)

      expect(repoMock.findSaved).toHaveBeenCalledWith({ id: 'user-1' }, U1, {})
    })

    it('findOne answers 404 for a post outside the scope', async () => {
      repoMock.findInScope.mockResolvedValue(null)

      await expect(service.findOne('p2', U1, { id: 'user-1' })).rejects.toThrow(NotFoundException)
      expect(repoMock.findInScope).toHaveBeenCalledWith('p2', U1, { id: 'user-1' })
      expect(repoMock.recordView).not.toHaveBeenCalled()
    })

    it('findOne answers 404 to a member with no university', async () => {
      repoMock.findInScope.mockResolvedValue(null)

      await expect(service.findOne('p1', NONE, { id: 'user-1' })).rejects.toThrow(NotFoundException)
      expect(repoMock.findInScope).toHaveBeenCalledWith('p1', NONE, { id: 'user-1' })
    })

    it('findByShortCode answers 404 for a post outside the scope', async () => {
      repoMock.findByShortCode.mockResolvedValue(null)

      await expect(service.findByShortCode('abc', U1)).rejects.toThrow(NotFoundException)
      expect(repoMock.findByShortCode).toHaveBeenCalledWith('abc', U1, undefined)
    })

    it('assertPostInScope answers 404 for a post outside the scope', async () => {
      repoMock.findIdInScope.mockResolvedValue(null)

      await expect(service.assertPostInScope('p2', U1)).rejects.toThrow(NotFoundException)
      expect(repoMock.findIdInScope).toHaveBeenCalledWith('p2', U1)
    })

    it('savePost answers 404 for a post outside the scope and saves nothing', async () => {
      repoMock.findIdInScope.mockResolvedValue(null)

      await expect(service.savePost('p2', 'user-1', U1)).rejects.toThrow(NotFoundException)
      expect(repoMock.findIdInScope).toHaveBeenCalledWith('p2', U1)
      expect(repoMock.savePost).not.toHaveBeenCalled()
    })

    it('toggleReaction answers 404 for a post outside the scope and returns no post', async () => {
      repoMock.findIdInScope.mockResolvedValue(null)

      await expect(
        service.toggleReaction('p2', { type: 'LIKE' } as any, 'user-1', U1),
      ).rejects.toThrow(NotFoundException)
      expect(repoMock.findIdInScope).toHaveBeenCalledWith('p2', U1)
      expect(repoMock.toggleReaction).not.toHaveBeenCalled()
    })

    it.each([
      ['update', (s: PostsService) => s.update('p2', { title: 'x' }, 'user-1', U1)],
      ['remove', (s: PostsService) => s.remove('p2', 'user-1', UserRole.STUDENT, U1)],
      [
        'regenerateSummary',
        (s: PostsService) => s.regenerateSummary('p2', 'user-1', UserRole.STUDENT, U1),
      ],
    ])('%s answers 404, not 403, for a post outside the scope', async (_name, call) => {
      repoMock.findInScope.mockResolvedValue(null)

      await expect(call(service)).rejects.toThrow(NotFoundException)
      expect(repoMock.findInScope).toHaveBeenCalledWith('p2', U1, expect.any(Object))
      expect(repoMock.update).not.toHaveBeenCalled()
      expect(aiSummaryMock.summarizePost).not.toHaveBeenCalled()
    })

    describe.each([
      [
        'chatWithPost',
        (s: PostsService, scope: UniversityScope) => s.chatWithPost('p2', chatDto, scope),
      ],
      [
        'chatWithPostStream',
        (s: PostsService, scope: UniversityScope) => s.chatWithPostStream('p2', chatDto, scope),
      ],
    ])('%s', (name, call) => {
      const aiCall = () => aiSummaryMock[name as keyof typeof aiSummaryMock]

      it('answers 404 for a post outside the university and makes no AI call', async () => {
        prismaMock.post.findFirst.mockResolvedValue(null)

        await expect(call(service, U1)).rejects.toThrow(NotFoundException)
        expect(prismaMock.post.findFirst.mock.calls[0][0].where).toEqual({
          id: 'p2',
          deletedAt: null,
          AND: [IN_U1],
        })
        expect(aiCall()).not.toHaveBeenCalled()
      })

      it('answers 404 to a member with no university and makes no AI call', async () => {
        prismaMock.post.findFirst.mockResolvedValue(null)

        await expect(call(service, NONE)).rejects.toThrow(NotFoundException)
        expect(prismaMock.post.findFirst.mock.calls[0][0].where.AND).toEqual([
          { course: { id: { in: [] } } },
        ])
        expect(aiCall()).not.toHaveBeenCalled()
      })

      it("lets an admin chat with any university's post", async () => {
        prismaMock.post.findFirst.mockResolvedValue({
          id: 'p2',
          publicationStatus: PostPublicationStatus.PUBLISHED,
          status: PostStatus.APPROVED,
        })

        await call(service, ALL)

        expect(prismaMock.post.findFirst.mock.calls[0][0].where.AND).toEqual([{}])
        expect(aiCall()).toHaveBeenCalledWith('p2', chatDto.messages)
      })
    })

    it('getAiIndexStatus looks the post up inside the scope', async () => {
      prismaMock.post.findFirst.mockResolvedValue(null)

      await expect(service.getAiIndexStatus('p2', U1)).rejects.toThrow(NotFoundException)
      expect(prismaMock.post.findFirst.mock.calls[0][0].where).toEqual({
        id: 'p2',
        deletedAt: null,
        AND: [IN_U1],
      })
    })

    describe('searchPosts', () => {
      const sqlOf = (call: unknown[]) => {
        const [strings, ...values] = call as [TemplateStringsArray, ...unknown[]]
        return Prisma.sql(strings, ...values)
      }

      beforeEach(() => {
        prismaMock.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ count: 0n }])
      })

      it('joins department and faculty and filters by the university in both queries', async () => {
        await service.searchPosts('calc', U1)

        expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(2)
        for (const call of prismaMock.$queryRaw.mock.calls) {
          const query = sqlOf(call)
          expect(query.sql).toContain('JOIN "department" d ON d.id = c."departmentId"')
          expect(query.sql).toContain('JOIN "faculty" f ON f.id = d."facultyId"')
          expect(query.sql).toContain('AND f."universityId" = ?')
          expect(query.values).toContain('u1')
        }
      })

      it('skips the join for an admin', async () => {
        await service.searchPosts('calc', ALL)

        for (const call of prismaMock.$queryRaw.mock.calls) {
          const query = sqlOf(call)
          expect(query.sql).not.toContain('"faculty"')
          expect(query.sql).not.toContain('universityId')
        }
      })

      it('returns an empty page without querying for a member with no university', async () => {
        const result = await service.searchPosts('calc', NONE, 20, 1)

        expect(result).toEqual({ results: [], total: 0, page: 1, limit: 20 })
        expect(prismaMock.$queryRaw).not.toHaveBeenCalled()
      })
    })
  })

  describe('moderation in scope', () => {
    const moderator = { id: 'mod-1', role: UserRole.MODERATOR }
    const approve = { status: PostStatus.APPROVED } as const

    it.each([
      ['another university', U1],
      ['no university', NONE],
    ])(
      'updateStatus answers 404 to a moderator with %s and changes nothing',
      async (_name, scope) => {
        repoMock.findInScope.mockResolvedValue(null)

        await expect(service.updateStatus('p2', approve, scope, moderator)).rejects.toThrow(
          NotFoundException,
        )
        expect(repoMock.findInScope).toHaveBeenCalledWith('p2', scope, moderator)
        expect(repoMock.updateStatus).not.toHaveBeenCalled()
        expect(notificationsMock.notifyPostStatus).not.toHaveBeenCalled()
        expect(aiSummaryMock.summarizePost).not.toHaveBeenCalled()
      },
    )

    it("lets an admin approve any university's post", async () => {
      const admin = { id: 'admin-1', role: UserRole.ADMIN }
      repoMock.findInScope.mockResolvedValue({
        id: 'p2',
        authorId: 'author-1',
        title: 'T',
        status: PostStatus.PENDING,
        author: { name: 'A' },
      })

      await service.updateStatus('p2', approve, ALL, admin)

      expect(repoMock.findInScope).toHaveBeenCalledWith('p2', ALL, admin)
      expect(repoMock.updateStatus).toHaveBeenCalledWith('p2', PostStatus.APPROVED, admin)
      expect(aiSummaryMock.summarizePost).toHaveBeenCalledWith('p2')
    })

    it.each([
      ['tagPost', (s: PostsService) => s.tagPost('p2', ['x'], 'mod-1', UserRole.MODERATOR, U1)],
      ['untagPost', (s: PostsService) => s.untagPost('p2', 't1', 'mod-1', UserRole.MODERATOR, U1)],
    ])("%s answers 404 to a moderator for another university's post", async (_name, call) => {
      repoMock.findInScope.mockResolvedValue(null)

      await expect(call(service)).rejects.toThrow(NotFoundException)
      expect(repoMock.findInScope).toHaveBeenCalledWith('p2', U1)
    })
  })

  describe('create in scope', () => {
    it("gives 404 for another university's course, before the department check", async () => {
      repoMock.findCourseDepartmentInScope = jest.fn().mockResolvedValue(null)
      repoMock.create = jest.fn()
      await expect(
        service.create({ courseId: 'c-other', title: 't' } as never, 'u1', 'd1', U1),
      ).rejects.toThrow(NotFoundException)
      expect(repoMock.findCourseDepartmentInScope).toHaveBeenCalledWith('c-other', U1)
      expect(repoMock.create).not.toHaveBeenCalled()
    })

    it("still refuses a course in the user's university but another department", async () => {
      repoMock.findCourseDepartmentInScope = jest
        .fn()
        .mockResolvedValue({ id: 'c2', departmentId: 'd2' })
      repoMock.create = jest.fn()
      await expect(
        service.create({ courseId: 'c2', title: 't' } as never, 'u1', 'd1', U1),
      ).rejects.toThrow(ForbiddenException)
      expect(repoMock.create).not.toHaveBeenCalled()
    })
  })
})
