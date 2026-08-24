import { Injectable } from '@nestjs/common'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { getRequiredScopes } from '@/common/decorators/require-scope.decorator'
import type { McpAuthSession } from './dto/mcp-auth-session.dto'
import { createBoardSchema, boardSlugSchema } from './dto/board.dto'
import { drawBoardSchema } from './dto/draw-board.dto'
import { requestUploadUrlSchema } from './dto/request-upload-url.dto'
import { createPostSchema } from './dto/create-post.dto'
import { deletePostSchema } from './dto/delete-post.dto'
import { McpRepository } from './mcp.repository'
import { drawingGuide } from './mcp-drawing-guide'
import { postGuide } from './mcp-post-guide'

@Injectable()
export class McpService {
  constructor(private readonly mcpRepository: McpRepository) {}

  /** A tool with no backing repository method (e.g. read_me) has no scope requirement. */
  private isAllowed(session: McpAuthSession, method?: (...args: never[]) => unknown): boolean {
    if (!method) return true
    const required = getRequiredScopes(method)
    if (required.length === 0) return true
    const granted = session.scopes.split(/\s+/)
    return required.every((scope) => granted.includes(scope))
  }

  async handleRequest(req: Request, res: Response, session: McpAuthSession, parsedBody?: unknown) {
    const server = new McpServer({ name: 'unishare-mcp', version: '1.0.0' })
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined }) //stateless
    const allowed = (method?: (...args: never[]) => unknown) => this.isAllowed(session, method)

    if (allowed(this.mcpRepository.listBoards)) {
      server.registerTool(
        'list_boards',
        {
          description: 'List boards owned by the authenticated UniShare user',
          inputSchema: z.object({}),
          annotations: { readOnlyHint: true },
        },
        async () => this.toToolResult(await this.mcpRepository.listBoards(session)),
      )
    }

    if (allowed(this.mcpRepository.createBoard)) {
      server.registerTool(
        'create_board',
        {
          description: 'Create a board owned by the authenticated UniShare user',
          inputSchema: createBoardSchema,
        },
        async (input) => this.toToolResult(await this.mcpRepository.createBoard(session, input)),
      )
    }

    if (allowed(this.mcpRepository.deleteBoard)) {
      server.registerTool(
        'delete_board',
        {
          description: 'Permanently delete a board owned by the authenticated UniShare user',
          inputSchema: boardSlugSchema,
          annotations: { destructiveHint: true },
        },
        async (input) => this.toToolResult(await this.mcpRepository.deleteBoard(session, input)),
      )
    }

    if (allowed(this.mcpRepository.getBoard)) {
      server.registerTool(
        'get_board',
        {
          description:
            'Get existing elements, occupied canvas bounds, and suggested placement anchors for a board. Call this before adding elements to an existing board to avoid overlapping.',
          inputSchema: boardSlugSchema,
          annotations: { readOnlyHint: true },
        },
        async (input) => this.toToolResult(await this.mcpRepository.getBoard(session, input)),
      )
    }

    if (allowed(this.mcpRepository.drawBoard)) {
      server.registerTool(
        'draw_board',
        {
          description:
            'Draw a clear, labeled diagram. Before the first draw_board call in a task, you MUST call read_me and apply its rules. For existing boards, call get_board to check occupied space before adding more elements. Pass elements as a JSON-stringified array. Arrows accept points as relative [x, y] waypoints for orthogonal or bent routes; use endX/endY only for a straight arrow.',
          inputSchema: drawBoardSchema,
        },
        async (input) => this.toToolResult(await this.mcpRepository.drawBoard(session, input)),
      )
    }

    // No backing repository method / scope requirement — always available.
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

    if (allowed(this.mcpRepository.listCourses)) {
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
    }

    if (allowed(this.mcpRepository.createUploadUrl)) {
      server.registerTool(
        'request_upload_url',
        {
          description:
            "Get a presigned S3 upload URL for a post attachment. Use this for real files (PDFs, images, documents) instead of inlining them: PUT the file's raw bytes to the returned url yourself (e.g. via curl or an HTTP tool) with the same Content-Type, then pass the returned key plus the file's byte size into create_post's files array. Only use inline base64Data/textData in create_post for small (<500KB) text content when you have no way to make outbound HTTP requests.",
          inputSchema: requestUploadUrlSchema,
        },
        async (input) =>
          this.toToolResult(await this.mcpRepository.createUploadUrl(session, input)),
      )
    }

    if (allowed(this.mcpRepository.createPost)) {
      server.registerTool(
        'create_post',
        {
          description:
            'Create a post (note, old question, or exercise) authored by the authenticated UniShare user. Call read_me before the first create_post call in a task and follow its rules: ask ONE field at a time in order (title -> type -> description -> courseId from list_courses -> optional fields with skip option), show a summary, and confirm with the user before calling this tool.',
          inputSchema: createPostSchema,
        },
        async (input) => this.toToolResult(await this.mcpRepository.createPost(session, input)),
      )
    }

    if (allowed(this.mcpRepository.deletePost)) {
      server.registerTool(
        'delete_post',
        {
          description: 'Delete a post authored by the authenticated UniShare user',
          inputSchema: deletePostSchema,
          annotations: { destructiveHint: true },
        },
        async (input) => this.toToolResult(await this.mcpRepository.deletePost(session, input)),
      )
    }

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
