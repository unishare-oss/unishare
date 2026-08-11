import { McpService, type McpAuthSession } from './mcp.service'
import type { CollabService } from '@/modules/collab/collab.service'

jest.mock('@/modules/collab/collab.service', () => ({
  CollabService: class CollabService {},
}))

describe('McpService', () => {
  const collabService = {
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
})
