import { Injectable } from '@nestjs/common'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { CollabService } from '@/modules/collab/collab.service'
import { createExcalidrawElements, type McpDrawingInput } from './mcp-drawing'
import { drawingGuide } from './mcp-drawing-guide'

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
export class McpService {
  constructor(private readonly collabService: CollabService) {}

  async handleRequest(req: Request, res: Response, session: McpAuthSession, parsedBody?: unknown) {
    const server = new McpServer({ name: 'unishare-board', version: '1.0.0' })
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined }) //stateless

    server.registerTool(
      'list_boards',
      {
        description: 'List boards owned by the authenticated UniShare user',
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true },
      },
      async () => this.listBoards(session),
    )

    server.registerTool(
      'create_board',
      {
        description: 'Create a board owned by the authenticated UniShare user',
        inputSchema: z.object({
          title: z.string().min(1).max(120).optional(),
          visibility: z.enum(['OPEN', 'VIEW_ONLY', 'PRIVATE']).optional(),
        }),
      },
      async (input) => this.createBoard(session, input),
    )

    server.registerTool(
      'delete_board',
      {
        description: 'Permanently delete a board owned by the authenticated UniShare user',
        inputSchema: z.object({ slug: z.string().min(1) }),
        annotations: { destructiveHint: true },
      },
      async (input) => this.deleteBoard(session, input),
    )

    server.registerTool(
      'draw_board',
      {
        description:
          'Draw a clear, labeled diagram. Before the first draw_board call in a task, you MUST call read_me and apply its rules. Pass elements as a JSON-stringified array. Arrows accept points as relative [x, y] waypoints for orthogonal or bent routes; use endX/endY only for a straight arrow.',
        inputSchema: z.object({
          slug: z.string().min(1),
          elements: z.string().min(2),
        }),
      },
      async (input) => this.drawBoard(session, input),
    )

    server.registerTool(
      'read_me',
      {
        description:
          'Read the UniShare Excalidraw drawing rules. Call this before the first draw_board call in a task and follow the rules for every draw.',
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true },
      },
      async () => ({
        content: [{ type: 'text' as const, text: drawingGuide.trim() }],
      }),
    )

    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, parsedBody)
    } finally {
      await transport.close()
      await server.close()
    }
  }

  async listBoards(session: McpAuthSession) {
    if (!this.hasScope(session, 'boards:read')) {
      return {
        content: [{ type: 'text' as const, text: 'Missing required scope: boards:read' }],
        isError: true,
      }
    }

    const rooms = await this.collabService.getRoomsByOwner(session.userId)
    const boards = rooms.map((room) => ({
      slug: room.slug,
      title: room.title,
      visibility: room.visibility,
      hasPassword: room.hasPassword,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    }))
    const result = { boards }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      structuredContent: result,
    }
  }

  async createBoard(
    session: McpAuthSession,
    input: { title?: string; visibility?: 'OPEN' | 'VIEW_ONLY' | 'PRIVATE' },
  ) {
    if (!this.hasScope(session, 'boards:write')) {
      return {
        content: [{ type: 'text' as const, text: 'Missing required scope: boards:write' }],
        isError: true,
      }
    }

    const room = await this.collabService.createRoom(input, session.userId)
    const board = {
      slug: room.slug,
      title: room.title,
      visibility: room.visibility,
      hasPassword: room.hasPassword,
      url: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/canvas/${room.slug}`,
    }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ board }) }],
      structuredContent: { board },
    }
  }

  async deleteBoard(session: McpAuthSession, input: { slug: string }) {
    if (!this.hasScope(session, 'boards:write')) {
      return {
        content: [{ type: 'text' as const, text: 'Missing required scope: boards:write' }],
        isError: true,
      }
    }

    await this.collabService.deleteRoom(input.slug, session.userId)
    const result = { slug: input.slug, deleted: true }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      structuredContent: result,
    }
  }

  async drawBoard(session: McpAuthSession, input: { slug: string; elements: string }) {
    if (!this.hasScope(session, 'boards:write')) {
      return {
        content: [{ type: 'text' as const, text: 'Missing required scope: boards:write' }],
        isError: true,
      }
    }

    let parsedElements: unknown
    try {
      parsedElements = JSON.parse(input.elements)
    } catch {
      return {
        content: [{ type: 'text' as const, text: 'Invalid elements: expected a JSON array' }],
        isError: true,
      }
    }

    const validatedElements = drawingElementsSchema.safeParse(parsedElements)
    if (!validatedElements.success) {
      return {
        content: [{ type: 'text' as const, text: 'Invalid elements: drawing rules not satisfied' }],
        isError: true,
      }
    }

    const elements = createExcalidrawElements(validatedElements.data as McpDrawingInput[])
    await this.collabService.drawRoom(input.slug, elements, session.userId)
    const result = { slug: input.slug, updatedElements: elements.length }

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result) }],
      structuredContent: result,
    }
  }

  private hasScope(session: McpAuthSession, requiredScope: string) {
    return session.scopes.split(/\s+/).includes(requiredScope)
  }
}
