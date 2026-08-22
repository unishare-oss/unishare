import { ForbiddenException, BadRequestException } from '@nestjs/common'
import type { ConfigService } from '@nestjs/config'
import { McpRepository, type McpAuthSession } from './mcp.repository'
import type { CollabService } from '@/modules/collab/collab.service'
import type { PostsService } from '@/modules/posts/posts.service'
import type { CoursesService } from '@/modules/courses/courses.service'
import type { PrismaService } from '@/prisma/prisma.service'
import type { FilesService } from '@/modules/files/files.service'
import type { StorageService } from '@/modules/storage/storage.service'
import { PostType, PostStatus } from '@/generated/prisma/client'
import { drawingGuide } from './mcp-drawing-guide'

jest.mock('@/modules/collab/collab.service', () => ({
  CollabService: class CollabService {},
}))
jest.mock('@/modules/posts/posts.service', () => ({
  PostsService: class PostsService {},
}))
jest.mock('@/modules/courses/courses.service', () => ({
  CoursesService: class CoursesService {},
}))
jest.mock('@/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}))
jest.mock('@/modules/files/files.service', () => ({
  FilesService: class FilesService {},
}))
jest.mock('@/modules/storage/storage.service', () => ({
  StorageService: class StorageService {},
}))

describe('McpRepository', () => {
  const collabService = {
    createRoom: jest.fn(),
    deleteRoom: jest.fn(),
    drawRoom: jest.fn(),
    getRoomsByOwner: jest.fn(),
    getRoomElements: jest.fn(),
  }
  const postsService = {
    create: jest.fn(),
    remove: jest.fn(),
  }
  const coursesService = {
    findAll: jest.fn(),
  }
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    course: {
      findFirst: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
    },
  }
  const filesService = {
    confirmUpload: jest.fn(),
  }
  const storageService = {
    uploadBuffer: jest.fn(),
    generatePresignedUploadUrl: jest.fn(),
    getPublicUrl: jest.fn(),
  }
  const config = {
    get: jest.fn(),
  }
  const repository = new McpRepository(
    collabService as unknown as CollabService,
    postsService as unknown as PostsService,
    coursesService as unknown as CoursesService,
    prisma as unknown as PrismaService,
    filesService as unknown as FilesService,
    storageService as unknown as StorageService,
    config as unknown as ConfigService,
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('listCourses', () => {
    it('lists courses for the authenticated user department', async () => {
      prisma.user.findUnique.mockResolvedValue({ departmentId: 'dept-1' })
      coursesService.findAll.mockResolvedValue({
        items: [
          {
            id: 'c-1',
            code: 'CS101',
            name: 'Intro to CS',
            year: 1,
            semester: 1,
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
        totalPages: 1,
      })

      const result = await repository.listCourses({
        userId: 'user-1',
        scopes: 'openid courses:read',
      })

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { departmentId: true },
      })
      expect(coursesService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 100 }),
        'dept-1',
      )
      expect(result).toEqual({
        courses: [
          {
            id: 'c-1',
            code: 'CS101',
            name: 'Intro to CS',
            year: 1,
            semester: 1,
          },
        ],
      })
    })

    it('rejects access without courses:read', async () => {
      await expect(
        repository.listCourses({
          userId: 'user-1',
          scopes: 'openid boards:read',
        }),
      ).rejects.toThrow(new ForbiddenException('Missing required scope: courses:read'))
      expect(coursesService.findAll).not.toHaveBeenCalled()
    })

    it('rejects if user has no department set', async () => {
      prisma.user.findUnique.mockResolvedValue({ departmentId: null })

      await expect(
        repository.listCourses({
          userId: 'user-1',
          scopes: 'openid courses:read',
        }),
      ).rejects.toThrow(
        new BadRequestException('Please set your department in UniShare before listing courses'),
      )
      expect(coursesService.findAll).not.toHaveBeenCalled()
    })
  })

  describe('listBoards', () => {
    it('lists only boards queried for the authenticated user', async () => {
      const createdAt = new Date('2026-08-10T10:00:00.000Z')
      const updatedAt = new Date('2026-08-11T10:00:00.000Z')
      collabService.getRoomsByOwner.mockResolvedValue([
        {
          id: 'room-1',
          slug: 'board-slug',
          title: 'Architecture',
          ownerId: 'user-1',
          visibility: 'PRIVATE',
          hasPassword: true,
          createdAt,
          updatedAt,
          snapshot: new Uint8Array([1, 2, 3]),
        },
      ])

      const result = await repository.listBoards({
        userId: 'user-1',
        scopes: 'openid boards:read',
      })

      expect(collabService.getRoomsByOwner).toHaveBeenCalledWith('user-1')
      expect(result).toEqual({
        boards: [
          {
            slug: 'board-slug',
            title: 'Architecture',
            visibility: 'PRIVATE',
            hasPassword: true,
            createdAt: createdAt.toISOString(),
            updatedAt: updatedAt.toISOString(),
          },
        ],
      })
    })

    it('rejects access without boards:read', async () => {
      const session: McpAuthSession = {
        userId: 'user-1',
        scopes: 'openid boards:write',
      }

      await expect(repository.listBoards(session)).rejects.toThrow(
        new ForbiddenException('Missing required scope: boards:read'),
      )
      expect(collabService.getRoomsByOwner).not.toHaveBeenCalled()
    })
  })

  describe('createBoard', () => {
    it('creates a board for the authenticated user', async () => {
      collabService.createRoom.mockResolvedValue({
        id: 'room-1',
        slug: 'board-slug',
        title: 'Architecture',
        visibility: 'PRIVATE',
        hasPassword: false,
      })

      const result = await repository.createBoard(
        { userId: 'user-1', scopes: 'openid boards:write' },
        { title: 'Architecture', visibility: 'PRIVATE' },
      )

      expect(collabService.createRoom).toHaveBeenCalledWith(
        { title: 'Architecture', visibility: 'PRIVATE' },
        'user-1',
        false,
      )
      expect(result).toEqual({
        board: {
          slug: 'board-slug',
          title: 'Architecture',
          visibility: 'PRIVATE',
          hasPassword: false,
          url: 'http://localhost:3000/canvas/board-slug',
        },
      })
    })

    it('rejects access without boards:write', async () => {
      await expect(
        repository.createBoard(
          { userId: 'user-1', scopes: 'openid boards:read' },
          { title: 'Architecture' },
        ),
      ).rejects.toThrow(new ForbiddenException('Missing required scope: boards:write'))
      expect(collabService.createRoom).not.toHaveBeenCalled()
    })
  })

  describe('getBoard', () => {
    it('returns board metadata, occupied bounds, suggested placements, and elements', async () => {
      collabService.getRoomElements.mockResolvedValue({
        room: {
          slug: 'board-slug',
          title: 'Architecture',
          visibility: 'PRIVATE',
          hasPassword: false,
        },
        elements: [
          {
            id: 'rect-1',
            type: 'rectangle',
            x: 100,
            y: 50,
            width: 200,
            height: 100,
            isDeleted: false,
          },
          {
            id: 'text-1',
            type: 'text',
            x: 120,
            y: 70,
            width: 80,
            height: 20,
            text: 'Service A',
            isDeleted: false,
          },
        ],
      })

      const result = await repository.getBoard(
        { userId: 'user-1', scopes: 'openid boards:read' },
        { slug: 'board-slug' },
      )

      expect(collabService.getRoomElements).toHaveBeenCalledWith('board-slug', 'user-1')
      const expectedBoard = {
        slug: 'board-slug',
        title: 'Architecture',
        visibility: 'PRIVATE',
        hasPassword: false,
        totalElements: 2,
        occupiedBounds: {
          minX: 100,
          minY: 50,
          maxX: 300,
          maxY: 150,
          width: 200,
          height: 100,
        },
        suggestedPlacements: {
          right: { x: 400, y: 50 },
          bottom: { x: 100, y: 250 },
        },
        elements: [
          { id: 'rect-1', type: 'rectangle', x: 100, y: 50, width: 200, height: 100 },
          { id: 'text-1', type: 'text', x: 120, y: 70, width: 80, height: 20, text: 'Service A' },
        ],
      }

      expect(result).toEqual({ board: expectedBoard })
    })

    it('rejects access without boards:read', async () => {
      await expect(
        repository.getBoard(
          { userId: 'user-1', scopes: 'openid boards:write' },
          { slug: 'board-slug' },
        ),
      ).rejects.toThrow(new ForbiddenException('Missing required scope: boards:read'))
      expect(collabService.getRoomElements).not.toHaveBeenCalled()
    })
  })

  describe('deleteBoard', () => {
    it('deletes a board using the authenticated user for ownership verification', async () => {
      const result = await repository.deleteBoard(
        { userId: 'user-1', scopes: 'openid boards:write' },
        { slug: 'board-slug' },
      )

      expect(collabService.deleteRoom).toHaveBeenCalledWith('board-slug', 'user-1')
      expect(result).toEqual({ slug: 'board-slug', deleted: true })
    })

    it('rejects access without boards:write', async () => {
      await expect(
        repository.deleteBoard(
          { userId: 'user-1', scopes: 'openid boards:read' },
          { slug: 'board-slug' },
        ),
      ).rejects.toThrow(new ForbiddenException('Missing required scope: boards:write'))
      expect(collabService.deleteRoom).not.toHaveBeenCalled()
    })
  })

  describe('drawing guide', () => {
    it('requires agents to read the rules before drawing', () => {
      expect(drawingGuide).toContain('Call read_me before the first draw_board call in a task')
      expect(drawingGuide).toContain('do not let arrows overlap')
      expect(drawingGuide).toContain('Keep shape backgrounds transparent by default')
    })
  })

  describe('drawBoard', () => {
    const elements = [{ type: 'rectangle' as const, x: 100, y: 100, width: 200, height: 100 }]

    it('writes elements using the authenticated user for ownership verification', async () => {
      const result = await repository.drawBoard(
        { userId: 'user-1', scopes: 'openid boards:write' },
        { slug: 'board-slug', elements: JSON.stringify(elements) },
      )

      expect(collabService.drawRoom).toHaveBeenCalledWith(
        'board-slug',
        [expect.objectContaining({ type: 'rectangle', x: 100, y: 100, width: 200, height: 100 })],
        'user-1',
      )
      expect(result).toEqual({ slug: 'board-slug', updatedElements: 1 })
    })

    it('rejects access without boards:write', async () => {
      await expect(
        repository.drawBoard(
          { userId: 'user-1', scopes: 'openid boards:read' },
          { slug: 'board-slug', elements: JSON.stringify(elements) },
        ),
      ).rejects.toThrow(new ForbiddenException('Missing required scope: boards:write'))
      expect(collabService.drawRoom).not.toHaveBeenCalled()
    })

    it('rejects malformed element JSON without writing the board', async () => {
      await expect(
        repository.drawBoard(
          { userId: 'user-1', scopes: 'openid boards:write' },
          { slug: 'board-slug', elements: 'not-json' },
        ),
      ).rejects.toThrow(new BadRequestException('Invalid elements: expected a JSON array'))
      expect(collabService.drawRoom).not.toHaveBeenCalled()
    })
  })

  describe('createPost', () => {
    it('creates a post for the authenticated user using provided courseId', async () => {
      prisma.user.findUnique.mockResolvedValue({ departmentId: 'dept-1' })
      const createdAt = new Date('2026-08-18T10:00:00.000Z')
      postsService.create.mockResolvedValue({
        id: 'post-1',
        shortCode: 'p1234567',
        title: 'Data Structures Lecture 1',
        type: PostType.NOTE,
        status: PostStatus.APPROVED,
        createdAt,
      })

      const result = await repository.createPost(
        { userId: 'user-1', scopes: 'openid posts:write' },
        {
          title: 'Data Structures Lecture 1',
          description: 'Introduction to Big O and Arrays',
          type: 'NOTE',
          courseId: 'course-1',
          tags: ['Algorithms'],
        },
      )

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { departmentId: true },
      })
      expect(postsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Data Structures Lecture 1',
          description: 'Introduction to Big O and Arrays',
          type: PostType.NOTE,
          courseId: 'course-1',
          tags: ['Algorithms'],
        }),
        'user-1',
        'dept-1',
      )
      expect(result).toEqual({
        post: {
          id: 'post-1',
          shortCode: 'p1234567',
          title: 'Data Structures Lecture 1',
          type: 'NOTE',
          status: 'APPROVED',
          url: 'http://localhost:3000/posts/post-1',
          createdAt: createdAt.toISOString(),
        },
      })
    })

    it('creates a post with attached files (base64 and text)', async () => {
      prisma.user.findUnique.mockResolvedValue({ departmentId: 'dept-1' })
      const createdAt = new Date('2026-08-18T10:00:00.000Z')
      postsService.create.mockResolvedValue({
        id: 'post-1',
        shortCode: 'p1234567',
        title: 'Data Structures Lecture 1',
        type: PostType.NOTE,
        status: PostStatus.APPROVED,
        createdAt,
      })
      storageService.uploadBuffer.mockResolvedValue({
        key: 'posts/user-1/file-1.png',
        publicUrl: 'http://localhost:3000/storage/posts/user-1/file-1.png',
      })
      filesService.confirmUpload.mockResolvedValue({
        id: 'file-1',
        name: 'diagram.png',
        size: 100,
        mimeType: 'image/png',
      })

      const result = await repository.createPost(
        { userId: 'user-1', scopes: 'openid posts:write' },
        {
          title: 'Data Structures Lecture 1',
          description: 'Introduction to Big O',
          type: 'NOTE',
          courseId: 'course-1',
          files: [
            {
              fileName: 'diagram.png',
              mimeType: 'image/png',
              base64Data: Buffer.from('fake-image-bytes').toString('base64'),
            },
          ],
        },
      )

      expect(storageService.uploadBuffer).toHaveBeenCalledWith(
        'posts/user-1',
        expect.any(Buffer),
        'image/png',
      )
      expect(filesService.confirmUpload).toHaveBeenCalledWith(
        'post-1',
        expect.objectContaining({
          key: 'posts/user-1/file-1.png',
          name: 'diagram.png',
          mimeType: 'image/png',
        }),
        'user-1',
      )
      expect(result.post.files).toEqual([
        {
          id: 'file-1',
          fileName: 'diagram.png',
          fileSize: expect.any(Number),
          mimeType: 'image/png',
          url: 'http://localhost:3000/storage/posts/user-1/file-1.png',
        },
      ])
    })

    it('rejects access without posts:write', async () => {
      await expect(
        repository.createPost(
          { userId: 'user-1', scopes: 'openid boards:write' },
          {
            title: 'Data Structures Lecture 1',
            description: 'Introduction',
            type: 'NOTE',
            courseId: 'course-1',
          },
        ),
      ).rejects.toThrow(new ForbiddenException('Missing required scope: posts:write'))
      expect(postsService.create).not.toHaveBeenCalled()
    })

    it('rejects post creation if user has no department set', async () => {
      prisma.user.findUnique.mockResolvedValue({ departmentId: null, role: 'STUDENT' })

      await expect(
        repository.createPost(
          { userId: 'user-1', scopes: 'openid posts:write' },
          {
            title: 'Data Structures Lecture 1',
            description: 'Introduction',
            type: 'NOTE',
            courseId: 'course-1',
          },
        ),
      ).rejects.toThrow(
        new BadRequestException('Please set your department in UniShare before creating posts'),
      )
      expect(postsService.create).not.toHaveBeenCalled()
    })

    it('attaches a presigned-uploaded file by key without touching uploadBuffer', async () => {
      prisma.user.findUnique.mockResolvedValue({ departmentId: 'dept-1' })
      postsService.create.mockResolvedValue({
        id: 'post-1',
        shortCode: 'p1234567',
        title: 'Data Structures Lecture 1',
        type: PostType.NOTE,
        status: PostStatus.APPROVED,
        createdAt: new Date('2026-08-18T10:00:00.000Z'),
      })
      storageService.getPublicUrl.mockReturnValue(
        'http://localhost:3000/storage/posts/user-1/file-1.pdf',
      )
      filesService.confirmUpload.mockResolvedValue({
        id: 'file-1',
        name: 'notes.pdf',
        size: 2048,
        mimeType: 'application/pdf',
      })

      const result = await repository.createPost(
        { userId: 'user-1', scopes: 'openid posts:write' },
        {
          title: 'Data Structures Lecture 1',
          description: 'Introduction to Big O',
          type: 'NOTE',
          courseId: 'course-1',
          files: [
            {
              fileName: 'notes.pdf',
              mimeType: 'application/pdf',
              key: 'posts/user-1/file-1.pdf',
              size: 2048,
            },
          ],
        },
      )

      expect(storageService.uploadBuffer).not.toHaveBeenCalled()
      expect(filesService.confirmUpload).toHaveBeenCalledWith(
        'post-1',
        {
          key: 'posts/user-1/file-1.pdf',
          name: 'notes.pdf',
          size: 2048,
          mimeType: 'application/pdf',
        },
        'user-1',
      )
      expect(result.post.files).toEqual([
        {
          id: 'file-1',
          fileName: 'notes.pdf',
          fileSize: 2048,
          mimeType: 'application/pdf',
          url: 'http://localhost:3000/storage/posts/user-1/file-1.pdf',
        },
      ])
    })

    it('collects a failed file instead of aborting the whole post', async () => {
      prisma.user.findUnique.mockResolvedValue({ departmentId: 'dept-1' })
      postsService.create.mockResolvedValue({
        id: 'post-1',
        shortCode: 'p1234567',
        title: 'Data Structures Lecture 1',
        type: PostType.NOTE,
        status: PostStatus.APPROVED,
        createdAt: new Date('2026-08-18T10:00:00.000Z'),
      })
      filesService.confirmUpload
        .mockResolvedValueOnce({
          id: 'file-1',
          name: 'ok.pdf',
          size: 10,
          mimeType: 'application/pdf',
        })
        .mockRejectedValueOnce(new BadRequestException('File has not been uploaded yet'))
      storageService.getPublicUrl.mockReturnValue(
        'http://localhost:3000/storage/posts/user-1/ok.pdf',
      )

      const result = await repository.createPost(
        { userId: 'user-1', scopes: 'openid posts:write' },
        {
          title: 'Data Structures Lecture 1',
          description: 'Introduction to Big O',
          type: 'NOTE',
          courseId: 'course-1',
          files: [
            {
              fileName: 'ok.pdf',
              mimeType: 'application/pdf',
              key: 'posts/user-1/ok.pdf',
              size: 10,
            },
            {
              fileName: 'not-uploaded.pdf',
              mimeType: 'application/pdf',
              key: 'posts/user-1/missing.pdf',
              size: 10,
            },
          ],
        },
      )

      expect(result.post.files).toHaveLength(1)
      expect(result.post.files?.[0].fileName).toBe('ok.pdf')
      expect(result.post.failedFiles).toEqual([
        { fileName: 'not-uploaded.pdf', error: 'File has not been uploaded yet' },
      ])
    })
  })

  describe('createUploadUrl', () => {
    it('mints a presigned url scoped to the post-attachment folder', async () => {
      storageService.generatePresignedUploadUrl.mockResolvedValue({
        url: 'https://s3.example.com/presigned',
        key: 'posts/user-1/generated.pdf',
        publicUrl: 'http://localhost:3000/storage/posts/user-1/generated.pdf',
      })

      const result = await repository.createUploadUrl(
        { userId: 'user-1', scopes: 'openid posts:write' },
        { mimeType: 'application/pdf', uploadType: 'document' },
      )

      expect(storageService.generatePresignedUploadUrl).toHaveBeenCalledWith(
        'posts/user-1',
        'application/pdf',
        'document',
      )
      expect(result).toEqual({
        url: 'https://s3.example.com/presigned',
        key: 'posts/user-1/generated.pdf',
        publicUrl: 'http://localhost:3000/storage/posts/user-1/generated.pdf',
      })
    })

    it('rejects access without posts:write', async () => {
      await expect(
        repository.createUploadUrl(
          { userId: 'user-1', scopes: 'openid posts:read' },
          { mimeType: 'application/pdf', uploadType: 'document' },
        ),
      ).rejects.toThrow(new ForbiddenException('Missing required scope: posts:write'))
      expect(storageService.generatePresignedUploadUrl).not.toHaveBeenCalled()
    })
  })

  describe('deletePost', () => {
    it('deletePost deletes post authored by the authenticated user', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'STUDENT' })
      postsService.remove.mockResolvedValue({ id: 'post-1' })

      const result = await repository.deletePost(
        { userId: 'user-1', scopes: 'openid posts:write' },
        { id: 'post-1' },
      )

      expect(postsService.remove).toHaveBeenCalledWith('post-1', 'user-1', 'STUDENT')
      expect(result).toEqual({ id: 'post-1', deleted: true })
    })

    it('rejects access without posts:write', async () => {
      await expect(
        repository.deletePost(
          { userId: 'user-1', scopes: 'openid boards:write' },
          { id: 'post-1' },
        ),
      ).rejects.toThrow(new ForbiddenException('Missing required scope: posts:write'))
      expect(postsService.remove).not.toHaveBeenCalled()
    })

    it('propagates error from PostsService when deletion fails', async () => {
      prisma.user.findUnique.mockResolvedValue({ role: 'STUDENT' })
      postsService.remove.mockRejectedValue(new Error('You do not own this post'))

      await expect(
        repository.deletePost({ userId: 'user-1', scopes: 'openid posts:write' }, { id: 'post-1' }),
      ).rejects.toThrow('You do not own this post')
      expect(postsService.remove).toHaveBeenCalledWith('post-1', 'user-1', 'STUDENT')
    })
  })
})
