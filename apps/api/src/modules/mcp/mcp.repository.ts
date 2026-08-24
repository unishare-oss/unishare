import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CollabService } from '@/modules/collab/collab.service'
import { PostsService } from '@/modules/posts/posts.service'
import { CoursesService } from '@/modules/courses/courses.service'
import { PrismaService } from '@/prisma/prisma.service'
import { FilesService } from '@/modules/files/files.service'
import { StorageService } from '@/modules/storage/storage.service'
import { getFolderForPurpose } from '@/modules/storage/dto/presigned-upload.dto'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { PostType } from '@/generated/prisma/client'
import {
  calculateOccupiedBounds,
  createExcalidrawElements,
  getSuggestedPlacements,
  summarizeElements,
} from './mcp-drawing'
import { RequireScope } from '@/common/decorators/require-scope.decorator'
import type { McpAuthSession } from './dto/mcp-auth-session.dto'
import type { RequestUploadUrlDto } from './dto/request-upload-url.dto'
import type { CreateBoardDto, BoardSlugDto } from './dto/board.dto'
import { drawingElementsSchema } from './dto/draw-board.dto'
import type { DrawBoardDto } from './dto/draw-board.dto'
import type { CreatePostDto, PostFileDto } from './dto/create-post.dto'
import type { DeletePostDto } from './dto/delete-post.dto'

@Injectable()
export class McpRepository {
  constructor(
    private readonly collabService: CollabService,
    private readonly postsService: PostsService,
    private readonly coursesService: CoursesService,
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {}

  private frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
  }

  @RequireScope('posts:write')
  async createUploadUrl(session: McpAuthSession, input: RequestUploadUrlDto) {
    const folder = getFolderForPurpose('post-attachment', { userId: session.userId })
    const { url, key, publicUrl } = await this.storageService.generatePresignedUploadUrl(
      folder,
      input.mimeType,
      input.uploadType,
    )
    return { url, key, publicUrl }
  }

  @RequireScope('courses:read')
  async listCourses(session: McpAuthSession) {
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { departmentId: true },
    })

    if (!user?.departmentId) {
      throw new BadRequestException('Please set your department in UniShare before listing courses')
    }

    const pagination = new PaginationDto()
    pagination.page = 1
    pagination.limit = 100

    const result = await this.coursesService.findAll(pagination, user.departmentId)
    const courses = result.items.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      year: c.year,
      semester: c.semester,
    }))

    return { courses }
  }

  @RequireScope('boards:read')
  async listBoards(session: McpAuthSession) {
    const rooms = await this.collabService.getRoomsByOwner(session.userId)
    const boards = rooms.map((room) => ({
      slug: room.slug,
      title: room.title,
      visibility: room.visibility,
      hasPassword: room.hasPassword,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    }))

    return { boards }
  }

  @RequireScope('boards:write')
  async createBoard(session: McpAuthSession, input: CreateBoardDto) {
    const room = await this.collabService.createRoom(input, session.userId, false)
    const board = {
      slug: room.slug,
      title: room.title,
      visibility: room.visibility,
      hasPassword: room.hasPassword,
      url: `${this.frontendUrl()}/canvas/${room.slug}`,
    }

    return { board }
  }

  @RequireScope('boards:read')
  async getBoard(session: McpAuthSession, input: BoardSlugDto) {
    const { room, elements } = await this.collabService.getRoomElements(input.slug, session.userId)
    const bounds = calculateOccupiedBounds(elements)
    const suggestedPlacements = getSuggestedPlacements(bounds)
    const activeElements = summarizeElements(elements)

    const board = {
      slug: room.slug,
      title: room.title,
      visibility: room.visibility,
      hasPassword: room.hasPassword,
      totalElements: activeElements.length,
      occupiedBounds: bounds,
      suggestedPlacements,
      elements: activeElements,
    }

    return { board }
  }

  @RequireScope('boards:write')
  async deleteBoard(session: McpAuthSession, input: BoardSlugDto) {
    await this.collabService.deleteRoom(input.slug, session.userId)
    return { slug: input.slug, deleted: true }
  }

  @RequireScope('boards:write')
  async drawBoard(session: McpAuthSession, input: DrawBoardDto) {
    let parsedElements: unknown
    try {
      parsedElements = JSON.parse(input.elements)
    } catch {
      throw new BadRequestException('Invalid elements: expected a JSON array')
    }

    const validatedElements = drawingElementsSchema.safeParse(parsedElements)
    if (!validatedElements.success) {
      const issues = validatedElements.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ')
      throw new BadRequestException(`Invalid elements: ${issues}`)
    }

    const elements = createExcalidrawElements(validatedElements.data)
    await this.collabService.drawRoom(input.slug, elements, session.userId)
    return { slug: input.slug, updatedElements: elements.length }
  }

  @RequireScope('posts:write')
  async createPost(session: McpAuthSession, input: CreatePostDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { departmentId: true },
    })

    if (!user?.departmentId) {
      throw new BadRequestException('Please set your department in UniShare before creating posts')
    }

    const created = await this.postsService.create(
      {
        title: input.title,
        description: input.description,
        type: input.type as PostType,
        courseId: input.courseId,
        moduleNumber: input.moduleNumber ?? 1,
        year: input.year ?? 1,
        semester: input.semester ?? 1,
        tags: input.tags,
        examYear: input.examYear,
        externalUrl: input.externalUrl,
        isAnonymous: input.isAnonymous ?? false,
      },
      session.userId,
      user.departmentId,
    )

    const attachedFiles: Array<{
      id: string
      fileName: string
      fileSize: number
      mimeType: string
      url: string
    }> = []
    const failedFiles: Array<{ fileName: string; error: string }> = []

    if (input.files && input.files.length > 0) {
      const folder = getFolderForPurpose('post-attachment', { userId: session.userId })
      for (const file of input.files) {
        try {
          const { key, size, publicUrl } = await this.resolveFile(file, folder)

          const confirmed = await this.filesService.confirmUpload(
            created.id,
            { key, name: file.fileName, size, mimeType: file.mimeType },
            session.userId,
          )

          attachedFiles.push({
            id: confirmed.id,
            fileName: confirmed.name,
            fileSize: confirmed.size,
            mimeType: confirmed.mimeType,
            url: publicUrl,
          })
        } catch (err) {
          failedFiles.push({
            fileName: file.fileName,
            error: err instanceof Error ? err.message : 'Upload failed',
          })
        }
      }
    }

    const post = {
      id: created.id,
      shortCode: created.shortCode,
      title: created.title,
      type: created.type,
      status: created.status,
      url: `${this.frontendUrl()}/posts/${created.id}`,
      createdAt:
        created.createdAt instanceof Date
          ? created.createdAt.toISOString()
          : new Date().toISOString(),
      ...(attachedFiles.length > 0 && { files: attachedFiles }),
      ...(failedFiles.length > 0 && { failedFiles }),
    }

    return { post }
  }

  /** Turns one attachment into a stored object — either an already-uploaded key or inline content. */
  private async resolveFile(
    file: PostFileDto,
    folder: string,
  ): Promise<{ key: string; size: number; publicUrl: string }> {
    if (file.key) {
      if (file.size === undefined) {
        throw new BadRequestException(
          `File "${file.fileName}" has a key but no size — pass the size returned by the upload`,
        )
      }
      return {
        key: file.key,
        size: file.size,
        publicUrl: this.storageService.getPublicUrl(file.key),
      }
    }

    let buffer: Buffer
    if (file.base64Data) {
      buffer = Buffer.from(file.base64Data, 'base64')
    } else if (file.textData) {
      buffer = Buffer.from(file.textData, 'utf-8')
    } else {
      throw new BadRequestException(
        `File "${file.fileName}" must provide key, base64Data, or textData`,
      )
    }
    const uploaded = await this.storageService.uploadBuffer(
      folder,
      buffer,
      file.mimeType,
      'document',
    )
    return { key: uploaded.key, size: buffer.length, publicUrl: uploaded.publicUrl }
  }

  @RequireScope('posts:write')
  async deletePost(session: McpAuthSession, input: DeletePostDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    await this.postsService.remove(input.id, session.userId, user.role)
    return { id: input.id, deleted: true }
  }
}
