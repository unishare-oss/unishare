import { Injectable } from '@nestjs/common'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { McpRepository, type McpAuthSession } from './mcp.repository'
import { drawingGuide } from './mcp-drawing-guide'
import { postGuide } from './mcp-post-guide'

export type { McpAuthSession }

@Injectable()
export class McpService {
  constructor(private readonly mcpRepository: McpRepository) {}

  async handleRequest(req: Request, res: Response, session: McpAuthSession, parsedBody?: unknown) {
    const server = new McpServer({ name: 'unishare-mcp', version: '1.0.0' })
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined }) //stateless

    server.registerTool(
      'list_boards',
      {
        description: 'List boards owned by the authenticated UniShare user',
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true },
      },
      async () => this.toToolResult(await this.mcpRepository.listBoards(session)),
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
      async (input) => this.toToolResult(await this.mcpRepository.createBoard(session, input)),
    )

    server.registerTool(
      'delete_board',
      {
        description: 'Permanently delete a board owned by the authenticated UniShare user',
        inputSchema: z.object({ slug: z.string().min(1) }),
        annotations: { destructiveHint: true },
      },
      async (input) => this.toToolResult(await this.mcpRepository.deleteBoard(session, input)),
    )

    server.registerTool(
      'get_board',
      {
        description:
          'Get existing elements, occupied canvas bounds, and suggested placement anchors for a board. Call this before adding elements to an existing board to avoid overlapping.',
        inputSchema: z.object({ slug: z.string().min(1) }),
        annotations: { readOnlyHint: true },
      },
      async (input) => this.toToolResult(await this.mcpRepository.getBoard(session, input)),
    )

    server.registerTool(
      'draw_board',
      {
        description:
          'Draw a clear, labeled diagram. Before the first draw_board call in a task, you MUST call read_me and apply its rules. For existing boards, call get_board to check occupied space before adding more elements. Pass elements as a JSON-stringified array. Arrows accept points as relative [x, y] waypoints for orthogonal or bent routes; use endX/endY only for a straight arrow.',
        inputSchema: z.object({
          slug: z.string().min(1),
          elements: z.string().min(2),
        }),
      },
      async (input) => this.toToolResult(await this.mcpRepository.drawBoard(session, input)),
    )

    server.registerTool(
      'read_me',
      {
        description:
          'Read the UniShare MCP rules and best practices for creating posts and drawing diagrams. Call this before the first draw_board or create_post call in a task and follow the rules.',
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true },
      },
      async () => ({
        content: [
          {
            type: 'text' as const,
            text: `${postGuide.trim()}\n\n---\n\n${drawingGuide.trim()}`,
          },
        ],
      }),
    )

    server.registerTool(
      'list_courses',
      {
        description:
          'List available courses in the authenticated user’s department (returns IDs, codes, names)',
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true },
      },
      async () => this.toToolResult(await this.mcpRepository.listCourses(session)),
    )

    server.registerTool(
      'create_post',
      {
        description:
          'Create a post (note, old question, or exercise) authored by the authenticated UniShare user. Call read_me before the first create_post call in a task and follow its rules: ask ONE field at a time in order (title -> type -> description -> courseId from list_courses -> optional fields with skip option), show a summary, and confirm with the user before calling this tool.',
        inputSchema: z.object({
          title: z.string().min(3).max(200),
          description: z.string().min(1).max(2000),
          type: z.enum(['NOTE', 'OLD_QUESTION', 'EXERCISE']),
          courseId: z.string().min(1),
          moduleNumber: z.number().int().min(1).max(20).optional(),
          year: z.number().int().min(1).max(6).optional(),
          semester: z.number().int().min(1).max(3).optional(),
          tags: z.array(z.string().min(2).max(50)).max(5).optional(),
          examYear: z.number().int().min(1900).max(2100).optional(),
          externalUrl: z.string().url().max(500).optional(),
          isAnonymous: z.boolean().optional(),
          files: z
            .array(
              z.object({
                fileName: z.string().min(1).max(255),
                mimeType: z.string().min(1),
                base64Data: z.string().optional(),
                textData: z.string().optional(),
              }),
            )
            .max(5)
            .optional(),
        }),
      },
      async (input) => this.toToolResult(await this.mcpRepository.createPost(session, input)),
    )

    server.registerTool(
      'delete_post',
      {
        description: 'Delete a post authored by the authenticated UniShare user',
        inputSchema: z.object({ id: z.string().min(1) }),
        annotations: { destructiveHint: true },
      },
      async (input) => this.toToolResult(await this.mcpRepository.deletePost(session, input)),
    )

    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, parsedBody)
    } finally {
      await transport.close()
      await server.close()
    }
  }

  private toToolResult(data: unknown) {
    return {
      content: [
        {
          type: 'text' as const,
          text: typeof data === 'string' ? data : JSON.stringify(data, null, 2),
        },
      ],
    }
  }
}
