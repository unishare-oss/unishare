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
  let mockServerEmit: jest.Mock
  let mockFetchSockets: jest.Mock

  const makeSocket = (id = 'socket-1', userId = 'user-1', userName = 'Test User') => ({
    id,
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    data: {
      user: { id: userId, name: userName },
      colorIndex: undefined as number | undefined,
      name: undefined as string | undefined,
    },
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

    mockServerEmit = jest.fn()
    mockFetchSockets = jest.fn().mockResolvedValue([])
    ;(gateway as any).server = {
      in: jest.fn().mockReturnValue({ fetchSockets: mockFetchSockets }),
      to: jest.fn().mockReturnValue({ emit: mockServerEmit }),
    }
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

  describe('handleCursorMove', () => {
    it('should relay cursor-move to room with socketId, not echo to sender', () => {
      roomService.getRoomForSocket.mockReturnValue('test-slug')
      const client = makeSocket()
      const toEmit = jest.fn()
      client.to.mockReturnValue({ emit: toEmit })

      gateway.handleCursorMove(client as never, { x: 100, y: 200 })

      expect(client.to).toHaveBeenCalledWith('test-slug')
      expect(toEmit).toHaveBeenCalledWith('cursor-move', {
        socketId: 'socket-1',
        x: 100,
        y: 200,
      })
      expect(client.emit).not.toHaveBeenCalled()
    })

    it('should return early when socket has no room', () => {
      roomService.getRoomForSocket.mockReturnValue(undefined)
      const client = makeSocket()

      gateway.handleCursorMove(client as never, { x: 10, y: 20 })

      expect(client.to).not.toHaveBeenCalled()
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

    it('should emit participant-left to room when socket had a room', () => {
      roomService.getRoomForSocket.mockReturnValue('test-slug')
      const client = makeSocket('socket-99')

      gateway.handleDisconnect(client as never)

      expect(roomService.removeSocket).toHaveBeenCalledWith('socket-99')
      expect((gateway as any).server.to).toHaveBeenCalledWith('test-slug')
      expect(mockServerEmit).toHaveBeenCalledWith('participant-left', { socketId: 'socket-99' })
    })

    it('should NOT emit participant-left when socket had no room', () => {
      roomService.getRoomForSocket.mockReturnValue(undefined)
      const client = makeSocket('socket-99')

      gateway.handleDisconnect(client as never)

      expect(roomService.removeSocket).toHaveBeenCalledWith('socket-99')
      expect((gateway as any).server.to).not.toHaveBeenCalled()
    })
  })
})
