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
    getDoc: jest.Mock
    registerSocket: jest.Mock
    removeSocket: jest.Mock
    getRoomForSocket: jest.Mock
    resetIdleTimer: jest.Mock
    hasRoom: jest.Mock
    getSocketCount: jest.Mock
  }
  let collabRepository: {
    findBySlug: jest.Mock
  }
  let mockServerEmit: jest.Mock
  let mockFetchSockets: jest.Mock

  const makeSocket = (
    id = 'socket-1',
    userId = 'user-1',
    userName = 'Test User',
    isAnonymous = false,
  ) => ({
    id,
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    data: {
      user: { id: userId, name: userName, isAnonymous },
      colorIndex: undefined as number | undefined,
      name: undefined as string | undefined,
      isViewOnly: undefined as boolean | undefined,
    },
  })

  beforeEach(async () => {
    jest.clearAllMocks()

    roomService = {
      getOrCreate: jest.fn().mockResolvedValue(new Y.Doc()),
      getDoc: jest.fn().mockReturnValue(new Y.Doc()),
      registerSocket: jest.fn(),
      removeSocket: jest.fn(),
      getRoomForSocket: jest.fn(),
      resetIdleTimer: jest.fn(),
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
      const mockRoom = { id: 'room-1', slug: 'test-slug', visibility: 'OPEN' }
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

    it('should emit participant-list to joiner and participant-joined to room', async () => {
      collabRepository.findBySlug.mockResolvedValue({
        id: 'room-1',
        slug: 'test-slug',
        visibility: 'OPEN',
      })

      const client = makeSocket('socket-new', 'user-new', 'New User')
      const toEmit = jest.fn()
      client.to.mockReturnValue({ emit: toEmit })

      // Mock fetchSockets to return the new socket + an existing socket
      const existingSocket = {
        id: 'socket-existing',
        data: { name: 'Existing User', colorIndex: 3 },
      }
      const newSocketRemote = {
        id: 'socket-new',
        data: { name: 'New User', colorIndex: expect.any(Number) },
      }
      ;(gateway as any).server.in.mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([newSocketRemote, existingSocket]),
      })

      await gateway.handleJoinRoom(client as never, 'test-slug')

      // participant-list sent to joiner (includes self + existing)
      expect(client.emit).toHaveBeenCalledWith(
        'participant-list',
        expect.arrayContaining([
          expect.objectContaining({ socketId: 'socket-existing', name: 'Existing User' }),
        ]),
      )

      // participant-joined sent to others
      expect(toEmit).toHaveBeenCalledWith(
        'participant-joined',
        expect.objectContaining({
          socketId: 'socket-new',
          name: 'New User',
          colorIndex: expect.any(Number),
        }),
      )
    })

    it('should set colorIndex and name on socket.data before join', async () => {
      collabRepository.findBySlug.mockResolvedValue({
        id: 'room-1',
        slug: 'test-slug',
        visibility: 'OPEN',
      })

      const client = makeSocket('socket-1', 'user-abc', 'Alice')
      ;(gateway as any).server.in.mockReturnValue({
        fetchSockets: jest
          .fn()
          .mockResolvedValue([
            { id: 'socket-1', data: { name: 'Alice', colorIndex: expect.any(Number) } },
          ]),
      })

      await gateway.handleJoinRoom(client as never, 'test-slug')

      expect(client.data.colorIndex).toEqual(expect.any(Number))
      expect(client.data.colorIndex).toBeGreaterThanOrEqual(0)
      expect(client.data.colorIndex).toBeLessThan(10)
      expect(client.data.name).toBe('Alice')
    })

    it('should set socket.data.isViewOnly = true for anonymous user on VIEW_ONLY room', async () => {
      collabRepository.findBySlug.mockResolvedValue({
        id: 'room-1',
        slug: 'test-slug',
        visibility: 'VIEW_ONLY',
      })
      const client = makeSocket('socket-1', 'user-anon', 'GuestPanda', true)
      ;(gateway as any).server.in.mockReturnValue({
        fetchSockets: jest
          .fn()
          .mockResolvedValue([{ id: 'socket-1', data: { name: 'GuestPanda', colorIndex: 0 } }]),
      })

      await gateway.handleJoinRoom(client as never, 'test-slug')

      expect(client.data.isViewOnly).toBe(true)
    })

    it('should set socket.data.isViewOnly = false for authenticated user on VIEW_ONLY room', async () => {
      collabRepository.findBySlug.mockResolvedValue({
        id: 'room-1',
        slug: 'test-slug',
        visibility: 'VIEW_ONLY',
      })
      const client = makeSocket('socket-1', 'user-auth', 'AuthUser', false)
      ;(gateway as any).server.in.mockReturnValue({
        fetchSockets: jest
          .fn()
          .mockResolvedValue([{ id: 'socket-1', data: { name: 'AuthUser', colorIndex: 0 } }]),
      })

      await gateway.handleJoinRoom(client as never, 'test-slug')

      expect(client.data.isViewOnly).toBe(false)
    })

    it('should emit error and NOT join when anonymous user connects to PRIVATE room', async () => {
      collabRepository.findBySlug.mockResolvedValue({
        id: 'room-1',
        slug: 'test-slug',
        visibility: 'PRIVATE',
      })
      const client = makeSocket('socket-1', 'user-anon', 'GuestFox', true)

      await gateway.handleJoinRoom(client as never, 'test-slug')

      expect(client.emit).toHaveBeenCalledWith('error', { message: 'Room is private' })
      expect(client.join).not.toHaveBeenCalled()
    })

    it('should allow authenticated user to join PRIVATE room with isViewOnly = false', async () => {
      collabRepository.findBySlug.mockResolvedValue({
        id: 'room-1',
        slug: 'test-slug',
        visibility: 'PRIVATE',
      })
      const client = makeSocket('socket-1', 'user-auth', 'AuthUser', false)
      ;(gateway as any).server.in.mockReturnValue({
        fetchSockets: jest
          .fn()
          .mockResolvedValue([{ id: 'socket-1', data: { name: 'AuthUser', colorIndex: 0 } }]),
      })

      await gateway.handleJoinRoom(client as never, 'test-slug')

      expect(client.join).toHaveBeenCalledWith('test-slug')
      expect(client.data.isViewOnly).toBe(false)
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
      roomService.getDoc.mockReturnValue(serverDoc)

      const client = makeSocket()
      const toEmit = jest.fn()
      client.to.mockReturnValue({ emit: toEmit })

      gateway.handleYjsUpdate(client as never, validUpdate)

      expect(roomService.getRoomForSocket).toHaveBeenCalledWith('socket-1')
      expect(roomService.getDoc).toHaveBeenCalledWith(slug)
      expect(roomService.resetIdleTimer).toHaveBeenCalledWith(slug)
      expect(client.to).toHaveBeenCalledWith(slug)
      expect(toEmit).toHaveBeenCalledWith('yjs-update', validUpdate)
    })

    it('should return early when no room is found for socket (no emit)', () => {
      roomService.getRoomForSocket.mockReturnValue(undefined)

      const client = makeSocket()
      const data = Buffer.from([1, 2, 3])

      gateway.handleYjsUpdate(client as never, data)

      expect(client.to).not.toHaveBeenCalled()
      expect(roomService.getDoc).not.toHaveBeenCalled()
    })

    it('should return early and NOT relay when socket.data.isViewOnly is true', () => {
      const client = makeSocket()
      client.data.isViewOnly = true
      roomService.getRoomForSocket.mockReturnValue('test-slug')

      const sourceDoc = new Y.Doc()
      sourceDoc.getText('content').insert(0, 'blocked')
      const update = Buffer.from(Y.encodeStateAsUpdate(sourceDoc))

      gateway.handleYjsUpdate(client as never, update)

      expect(client.to).not.toHaveBeenCalled()
      expect(roomService.getDoc).not.toHaveBeenCalled()
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
