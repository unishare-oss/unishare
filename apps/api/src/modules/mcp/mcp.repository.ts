import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { z } from 'zod'
import { CollabService } from '@/modules/collab/collab.service'
import { PostsService } from '@/modules/posts/posts.service'
import { CoursesService } from '@/modules/courses/courses.service'
import { PrismaService } from '@/prisma/prisma.service'
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
  ) {}

  @RequireScope('posts:read')
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
      url: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/canvas/${room.slug}`,
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
      courseId?: string
      courseCode?: string
      moduleNumber?: number
      year?: number
      semester?: number
      tags?: string[]
      examYear?: number
      externalUrl?: string
      isAnonymous?: boolean
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: { departmentId: true, role: true },
    })

    if (!user?.departmentId) {
      throw new BadRequestException('Please set your department in UniShare before creating posts')
    }

    let courseId = input.courseId
    if (!courseId && input.courseCode) {
      const course = await this.prisma.course.findFirst({
        where: {
          code: { equals: input.courseCode.trim(), mode: 'insensitive' },
          departmentId: user.departmentId,
        },
        select: { id: true },
      })
      if (!course) {
        throw new NotFoundException(
          `Course with code "${input.courseCode}" not found in your department`,
        )
      }
      courseId = course.id
    }

    if (!courseId) {
      throw new BadRequestException('Either courseId or courseCode must be provided')
    }

    const created = await this.postsService.create(
      {
        title: input.title,
        description: input.description,
        type: input.type as PostType,
        courseId,
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

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
    const post = {
      id: created.id,
      shortCode: created.shortCode,
      title: created.title,
      type: created.type,
      status: created.status,
      url: `${frontendUrl}/posts/${created.id}`,
      createdAt:
        created.createdAt instanceof Date
          ? created.createdAt.toISOString()
          : new Date().toISOString(),
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
