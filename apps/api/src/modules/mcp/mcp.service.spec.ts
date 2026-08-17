import { McpService, type McpAuthSession } from './mcp.service'
import type { CollabService } from '@/modules/collab/collab.service'
import { drawingGuide } from './mcp-drawing-guide'

jest.mock('@/modules/collab/collab.service', () => ({
  CollabService: class CollabService {},
}))

describe('McpService', () => {
  const collabService = {
    createRoom: jest.fn(),
    deleteRoom: jest.fn(),
    drawRoom: jest.fn(),
    getRoomsByOwner: jest.fn(),
    getRoomElements: jest.fn(),
  }
  const service = new McpService(collabService as unknown as CollabService)

  beforeEach(() => {
    jest.clearAllMocks()
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

      const result = await service.listBoards({
        userId: 'user-1',
        scopes: 'openid boards:read',
      })

      expect(collabService.getRoomsByOwner).toHaveBeenCalledWith('user-1')
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
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
            }),
          },
        ],
        structuredContent: {
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
        },
      })
    })

    it('rejects access without boards:read', async () => {
      const session: McpAuthSession = {
        userId: 'user-1',
        scopes: 'openid boards:write',
      }

      await expect(service.listBoards(session)).resolves.toEqual({
        content: [{ type: 'text', text: 'Missing required scope: boards:read' }],
        isError: true,
      })
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

      const result = await service.createBoard(
        { userId: 'user-1', scopes: 'openid boards:write' },
        { title: 'Architecture', visibility: 'PRIVATE' },
      )

      expect(collabService.createRoom).toHaveBeenCalledWith(
        { title: 'Architecture', visibility: 'PRIVATE' },
        'user-1',
      )
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              board: {
                slug: 'board-slug',
                title: 'Architecture',
                visibility: 'PRIVATE',
                hasPassword: false,
                url: 'http://localhost:3000/canvas/board-slug',
              },
            }),
          },
        ],
        structuredContent: {
          board: {
            slug: 'board-slug',
            title: 'Architecture',
            visibility: 'PRIVATE',
            hasPassword: false,
            url: 'http://localhost:3000/canvas/board-slug',
          },
        },
      })
    })

    it('rejects access without boards:write', async () => {
      await expect(
        service.createBoard(
          { userId: 'user-1', scopes: 'openid boards:read' },
          { title: 'Architecture' },
        ),
      ).resolves.toEqual({
        content: [{ type: 'text', text: 'Missing required scope: boards:write' }],
        isError: true,
      })
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

      const result = await service.getBoard(
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

      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify({ board: expectedBoard }) }],
        structuredContent: { board: expectedBoard },
      })
    })

    it('rejects access without boards:read', async () => {
      await expect(
        service.getBoard(
          { userId: 'user-1', scopes: 'openid boards:write' },
          { slug: 'board-slug' },
        ),
      ).resolves.toEqual({
        content: [{ type: 'text', text: 'Missing required scope: boards:read' }],
        isError: true,
      })
      expect(collabService.getRoomElements).not.toHaveBeenCalled()
    })
  })

  describe('deleteBoard', () => {
    it('deletes a board using the authenticated user for ownership verification', async () => {
      const result = await service.deleteBoard(
        { userId: 'user-1', scopes: 'openid boards:write' },
        { slug: 'board-slug' },
      )

      expect(collabService.deleteRoom).toHaveBeenCalledWith('board-slug', 'user-1')
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify({ slug: 'board-slug', deleted: true }) }],
        structuredContent: { slug: 'board-slug', deleted: true },
      })
    })

    it('rejects access without boards:write', async () => {
      await expect(
        service.deleteBoard(
          { userId: 'user-1', scopes: 'openid boards:read' },
          { slug: 'board-slug' },
        ),
      ).resolves.toEqual({
        content: [{ type: 'text', text: 'Missing required scope: boards:write' }],
        isError: true,
      })
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
      const result = await service.drawBoard(
        { userId: 'user-1', scopes: 'openid boards:write' },
        { slug: 'board-slug', elements: JSON.stringify(elements) },
      )

      expect(collabService.drawRoom).toHaveBeenCalledWith(
        'board-slug',
        [expect.objectContaining({ type: 'rectangle', x: 100, y: 100, width: 200, height: 100 })],
        'user-1',
      )
      expect(result).toEqual({
        content: [
          { type: 'text', text: JSON.stringify({ slug: 'board-slug', updatedElements: 1 }) },
        ],
        structuredContent: { slug: 'board-slug', updatedElements: 1 },
      })
    })

    it('rejects access without boards:write', async () => {
      await expect(
        service.drawBoard(
          { userId: 'user-1', scopes: 'openid boards:read' },
          { slug: 'board-slug', elements: JSON.stringify(elements) },
        ),
      ).resolves.toEqual({
        content: [{ type: 'text', text: 'Missing required scope: boards:write' }],
        isError: true,
      })
      expect(collabService.drawRoom).not.toHaveBeenCalled()
    })

    it('rejects malformed element JSON without writing the board', async () => {
      await expect(
        service.drawBoard(
          { userId: 'user-1', scopes: 'openid boards:write' },
          { slug: 'board-slug', elements: 'not-json' },
        ),
      ).resolves.toEqual({
        content: [{ type: 'text', text: 'Invalid elements: expected a JSON array' }],
        isError: true,
      })
      expect(collabService.drawRoom).not.toHaveBeenCalled()
    })
  })
})
