import { McpService } from './mcp.service'
import type { McpRepository } from './mcp.repository'
import { drawingGuide } from './mcp-drawing-guide'

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
})
