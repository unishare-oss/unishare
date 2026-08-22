import { RequireScope } from '@/common/decorators/require-scope.decorator'
import { McpService } from './mcp.service'
import type { McpAuthSession, McpRepository } from './mcp.repository'
import { drawingGuide } from './mcp-drawing-guide'
import { postGuide } from './mcp-post-guide'

jest.mock('./mcp.repository', () => ({
  McpRepository: class McpRepository {},
}))

describe('McpService', () => {
  const mcpRepository = {
    listBoards: jest.fn(),
    createBoard: jest.fn(),
    getBoard: jest.fn(),
    deleteBoard: jest.fn(),
    drawBoard: jest.fn(),
    listCourses: jest.fn(),
    createUploadUrl: jest.fn(),
    createPost: jest.fn(),
    deletePost: jest.fn(),
  }
  const service = new McpService(mcpRepository as unknown as McpRepository)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('can be instantiated and registers drawing rules in guide', () => {
    expect(service).toBeDefined()
    expect(drawingGuide).toContain('Call read_me before the first draw_board call in a task')
    expect(drawingGuide).toContain('do not let arrows overlap')
    expect(drawingGuide).toContain('Keep shape backgrounds transparent by default')
  })

  it('registers interactive post creation rules in postGuide', () => {
    expect(postGuide).toContain('UniShare Post Creation Rules')
    expect(postGuide).toContain('DO NOT dump all fields or tables in a single message')
    expect(postGuide).toContain('Walk the user through interactively by asking ONE field at a time')
    expect(postGuide).toContain('courseId: Call list_courses first')
  })

  describe('isAllowed', () => {
    class ScopedFixture {
      @RequireScope('posts:write')
      async scoped(_session: McpAuthSession) {
        return null
      }

      async unscoped(_session: McpAuthSession) {
        return null
      }
    }
    const fixture = new ScopedFixture()
    type PrivateAccess = {
      isAllowed(s: McpAuthSession, m?: (...args: unknown[]) => unknown): boolean
    }
    // isAllowed is private — accessed directly here since it has no other observable seam
    // short of standing up the full MCP SDK transport in handleRequest.
    const isAllowed = (session: McpAuthSession, method?: (...args: unknown[]) => unknown) =>
      (service as unknown as PrivateAccess).isAllowed(session, method)

    it('allows a tool with no backing method (e.g. read_me)', () => {
      expect(isAllowed({ userId: 'u1', scopes: 'openid' })).toBe(true)
    })

    it('allows an undecorated method regardless of granted scopes', () => {
      expect(isAllowed({ userId: 'u1', scopes: 'openid' }, fixture.unscoped)).toBe(true)
    })

    it('allows a scoped method when the session has the required scope', () => {
      expect(isAllowed({ userId: 'u1', scopes: 'openid posts:write' }, fixture.scoped)).toBe(true)
    })

    it('rejects a scoped method when the session lacks the required scope', () => {
      expect(isAllowed({ userId: 'u1', scopes: 'openid posts:read' }, fixture.scoped)).toBe(false)
    })
  })
})
