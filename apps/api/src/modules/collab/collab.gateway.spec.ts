import { Test, TestingModule } from '@nestjs/testing'
import * as Y from 'yjs'
import { CollabGateway } from './collab.gateway'
import { CollabRoomService } from './collab.room.service'
import { CollabRepository } from './collab.repository'

// Mock auth so gateway tests don't hit the DB
jest.mock('@/auth/auth.config', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}))

describe('CollabGateway', () => {
  let gateway: CollabGateway
  let roomService: {
    getOrCreate: jest.Mock
    registerSocket: jest.Mock
    removeSocket: jest.Mock
    getRoomForSocket: jest.Mock
    hasRoom: jest.Mock
    getSocketCount: jest.Mock
  }
  let collabRepository: {
    findBySlug: jest.Mock
  }

  const makeSocket = (id = 'socket-1') => ({
    id,
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    data: { user: { id: 'user-1' } },
  })

  beforeEach(async () => {
    jest.clearAllMocks()

    roomService = {
      getOrCreate: jest.fn().mockReturnValue(new Y.Doc()),
      registerSocket: jest.fn(),
      removeSocket: jest.fn(),
      getRoomForSocket: jest.fn(),
      hasRoom: jest.fn(),
      getSocketCount: jest.fn(),
    }

    collabRepository = {
      findBySlug: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollabGateway,
        { provide: CollabRoomService, useValue: roomService },
        { provide: CollabRepository, useValue: collabRepository },
      ],
    }).compile()

    gateway = module.get<CollabGateway>(CollabGateway)
  })

  describe('handleJoinRoom', () => {
    it('should call client.join(slug) and emit room-joined with state buffer for valid slug', async () => {
      const mockRoom = { id: 'room-1', slug: 'test-slug' }
      collabRepository.findBySlug.mockResolvedValue(mockRoom)

      const client = makeSocket()

      await gateway.handleJoinRoom(client as never, 'test-slug')

      expect(client.join).toHaveBeenCalledWith('test-slug')
      expect(roomService.registerSocket).toHaveBeenCalledWith('socket-1', 'test-slug')
      expect(client.emit).toHaveBeenCalledWith(
        'room-joined',
        expect.objectContaining({
          slug: 'test-slug',
          state: expect.any(Buffer),
        }),
      )
    })

    it('should emit error event and NOT call client.join when room not found', async () => {
      collabRepository.findBySlug.mockResolvedValue(null)

      const client = makeSocket()

      await gateway.handleJoinRoom(client as never, 'nonexistent')

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Room not found' })
      expect(client.join).not.toHaveBeenCalled()
    })
  })

  describe('handleYjsUpdate', () => {
    it('should apply update to server doc and relay to room via client.to(slug).emit', () => {
      const slug = 'test-slug'
      roomService.getRoomForSocket.mockReturnValue(slug)

      // Use a real Y.Doc and produce a valid Yjs update
      const sourceDoc = new Y.Doc()
      sourceDoc.getText('content').insert(0, 'hello')
      const validUpdate = Buffer.from(Y.encodeStateAsUpdate(sourceDoc))

      const serverDoc = new Y.Doc()
      roomService.getOrCreate.mockReturnValue(serverDoc)

      const client = makeSocket()
      const toEmit = jest.fn()
      client.to.mockReturnValue({ emit: toEmit })

      gateway.handleYjsUpdate(client as never, validUpdate)

      expect(roomService.getRoomForSocket).toHaveBeenCalledWith('socket-1')
      expect(roomService.getOrCreate).toHaveBeenCalledWith(slug)
      expect(client.to).toHaveBeenCalledWith(slug)
      expect(toEmit).toHaveBeenCalledWith('yjs-update', validUpdate)
    })

    it('should return early when no room is found for socket (no emit)', () => {
      roomService.getRoomForSocket.mockReturnValue(undefined)

      const client = makeSocket()
      const data = Buffer.from([1, 2, 3])

      gateway.handleYjsUpdate(client as never, data)

      expect(client.to).not.toHaveBeenCalled()
      expect(roomService.getOrCreate).not.toHaveBeenCalled()
    })
  })

  describe('handleDisconnect', () => {
    it('should call roomService.removeSocket with the client id', () => {
      const client = makeSocket('socket-99')

      gateway.handleDisconnect(client as never)

      expect(roomService.removeSocket).toHaveBeenCalledWith('socket-99')
    })
  })
})
