import { McpService, type McpAuthSession } from './mcp.service'
import type { CollabService } from '@/modules/collab/collab.service'

jest.mock('@/modules/collab/collab.service', () => ({
  CollabService: class CollabService {},
}))

describe('McpService', () => {
  const collabService = {
    createRoom: jest.fn(),
    deleteRoom: jest.fn(),
    drawRoom: jest.fn(),
    getRoomsByOwner: jest.fn(),
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

  describe('drawBoard', () => {
    const elements = [{ id: 'rectangle-1', type: 'rectangle', version: 1 }]

    it('writes elements using the authenticated user for ownership verification', async () => {
      const result = await service.drawBoard(
        { userId: 'user-1', scopes: 'openid boards:write' },
        { slug: 'board-slug', elements },
      )

      expect(collabService.drawRoom).toHaveBeenCalledWith('board-slug', elements, 'user-1')
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
          { slug: 'board-slug', elements },
        ),
      ).resolves.toEqual({
        content: [{ type: 'text', text: 'Missing required scope: boards:write' }],
        isError: true,
      })
      expect(collabService.drawRoom).not.toHaveBeenCalled()
    })
  })
})
