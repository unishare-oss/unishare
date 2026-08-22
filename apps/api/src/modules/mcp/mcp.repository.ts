import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { z } from 'zod'
import { CollabService } from '@/modules/collab/collab.service'
import { PostsService } from '@/modules/posts/posts.service'
import { CoursesService } from '@/modules/courses/courses.service'
import { PrismaService } from '@/prisma/prisma.service'
import { FilesService } from '@/modules/files/files.service'
import { StorageService } from '@/modules/storage/storage.service'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { PostType } from '@/generated/prisma/client'
import {
  calculateOccupiedBounds,
  createExcalidrawElements,
  getSuggestedPlacements,
  summarizeElements,
  type McpDrawingInput,
} from './mcp-drawing'
import { RequireScope } from '@/common/decorators/require-scope.decorator'

export interface McpAuthSession {
  userId: string
  scopes: string
}

export interface McpPostFileInput {
  fileName: string
  mimeType: string
  base64Data?: string
  textData?: string
}

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/)
const drawingStyleSchema = {
  strokeColor: hexColorSchema.optional(),
  backgroundColor: z.union([z.literal('transparent'), hexColorSchema]).optional(),
}

const drawingPointSchema = z.tuple([z.number(), z.number()])

const drawingElementSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.enum(['rectangle', 'ellipse', 'diamond']),
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    ...drawingStyleSchema,
  }),
  z.object({
    type: z.literal('text'),
    x: z.number(),
    y: z.number(),
    text: z.string().min(1),
    ...drawingStyleSchema,
  }),
  z
    .object({
      type: z.literal('arrow'),
      x: z.number(),
      y: z.number(),
      endX: z.number().optional(),
      endY: z.number().optional(),
      points: z.array(drawingPointSchema).min(2).optional(),
      ...drawingStyleSchema,
    })
    .refine((input) => input.points || (input.endX !== undefined && input.endY !== undefined), {
      message: 'Arrows need points or both endX and endY',
    }),
])

const drawingElementsSchema = z.array(drawingElementSchema).min(1).max(100)

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
  async createBoard(
    session: McpAuthSession,
    input: { title?: string; visibility?: 'OPEN' | 'VIEW_ONLY' | 'PRIVATE' },
  ) {
    const room = await this.collabService.createRoom(input, session.userId)
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
  async getBoard(session: McpAuthSession, input: { slug: string }) {
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
  async deleteBoard(session: McpAuthSession, input: { slug: string }) {
    await this.collabService.deleteRoom(input.slug, session.userId)
    return { slug: input.slug, deleted: true }
  }

  @RequireScope('boards:write')
  async drawBoard(session: McpAuthSession, input: { slug: string; elements: string }) {
    let parsedElements: unknown
    try {
      parsedElements = JSON.parse(input.elements)
    } catch {
      throw new BadRequestException('Invalid elements: expected a JSON array')
    }

    const validatedElements = drawingElementsSchema.safeParse(parsedElements)
    if (!validatedElements.success) {
      throw new BadRequestException('Invalid elements: drawing rules not satisfied')
    }

    const elements = createExcalidrawElements(validatedElements.data as McpDrawingInput[])
    await this.collabService.drawRoom(input.slug, elements, session.userId)
    return { slug: input.slug, updatedElements: elements.length }
  }

  @RequireScope('posts:write')
  async createPost(
    session: McpAuthSession,
    input: {
      title: string
      description: string
      type: 'NOTE' | 'OLD_QUESTION' | 'EXERCISE'
      courseId: string
      moduleNumber?: number
      year?: number
      semester?: number
      tags?: string[]
      examYear?: number
      externalUrl?: string
      isAnonymous?: boolean
      files?: McpPostFileInput[]
    },
  ) {
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

    if (input.files && input.files.length > 0) {
      const folder = `posts/${session.userId}`
      for (const file of input.files) {
        let buffer: Buffer
        if (file.base64Data) {
          buffer = Buffer.from(file.base64Data, 'base64')
        } else if (file.textData) {
          buffer = Buffer.from(file.textData, 'utf-8')
        } else {
          throw new BadRequestException(
            `File "${file.fileName}" must provide base64Data or textData`,
          )
        }

        const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
        if (buffer.length > MAX_FILE_SIZE) {
          throw new BadRequestException(
            `File "${file.fileName}" exceeds maximum allowed size of 10MB`,
          )
        }

        const { key, publicUrl } = await this.storageService.uploadBuffer(
          folder,
          buffer,
          file.mimeType,
        )

        const confirmed = await this.filesService.confirmUpload(
          created.id,
          {
            key,
            name: file.fileName,
            size: buffer.length,
            mimeType: file.mimeType,
          },
          session.userId,
        )

        attachedFiles.push({
          id: confirmed.id,
          fileName: confirmed.name,
          fileSize: confirmed.size,
          mimeType: confirmed.mimeType,
          url: publicUrl,
        })
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
    }

    return { post }
  }

  @RequireScope('posts:write')
  async deletePost(session: McpAuthSession, input: { id: string }) {
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
