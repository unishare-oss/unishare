import { Injectable } from '@nestjs/common'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { CollabService } from '@/modules/collab/collab.service'
import { createExcalidrawElements, type McpDrawingInput } from './mcp-drawing'

export interface McpAuthSession {
  userId: string
  scopes: string
}

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/)
const drawingStyleSchema = {
  strokeColor: hexColorSchema.optional(),
  backgroundColor: z.union([z.literal('transparent'), hexColorSchema]).optional(),
}

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
  z.object({
    type: z.literal('arrow'),
    x: z.number(),
    y: z.number(),
    endX: z.number(),
    endY: z.number(),
    ...drawingStyleSchema,
  }),
])

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
          'Draw clear, labeled diagrams. Use rectangles for systems or processes, diamonds for decisions, ellipses for entry or exit points, text for labels, and arrows for flow. The API automatically colors rectangles blue, diamonds amber, and ellipses green. Use optional strokeColor and backgroundColor (#RRGGBB) only when a different semantic color is needed, such as red for errors.',
        inputSchema: z.object({
          slug: z.string().min(1),
          elements: z.array(drawingElementSchema).min(1).max(100),
        }),
      },
      async (input) => this.drawBoard(session, input),
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

  async drawBoard(session: McpAuthSession, input: { slug: string; elements: McpDrawingInput[] }) {
    if (!this.hasScope(session, 'boards:write')) {
      return {
        content: [{ type: 'text' as const, text: 'Missing required scope: boards:write' }],
        isError: true,
      }
    }

    const elements = createExcalidrawElements(input.elements)
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
