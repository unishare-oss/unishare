import { Test, TestingModule } from '@nestjs/testing'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'
import { PresenceService } from './presence.service'
import { ChatRepository } from './chat.repository'

// Mock auth so gateway tests don't hit the DB or better-auth ESM issues
jest.mock('@/auth/auth.config', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}))

describe('ChatGateway', () => {
  let gateway: ChatGateway
  let presenceService: jest.Mocked<PresenceService>
  let chatRepository: jest.Mocked<ChatRepository>
  let mockServerTo: jest.Mock
  let mockServerIn: jest.Mock
  let mockEmit: jest.Mock
  let mockSocketsLeave: jest.Mock

  const makeSocket = (id = 'socket-1', userId = 'user-1') => ({
    id,
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    data: {
      user: { id: userId, name: 'Test User' },
    },
  })

  beforeEach(async () => {
    const presenceServiceMock = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      heartbeat: jest.fn().mockResolvedValue(undefined),
      setServer: jest.fn(),
    }
    const chatRepositoryMock = {
      findRoomIdsByUserId: jest.fn().mockResolvedValue([]),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        // ChatService is needed by ChatRoomGuard (applied via @UseGuards on join-room)
        { provide: ChatService, useValue: { getRoom: jest.fn() } },
        { provide: PresenceService, useValue: presenceServiceMock },
        { provide: ChatRepository, useValue: chatRepositoryMock },
      ],
    }).compile()

    gateway = module.get<ChatGateway>(ChatGateway)
    presenceService = module.get(PresenceService)
    chatRepository = module.get(ChatRepository)

    mockEmit = jest.fn()
    mockServerTo = jest.fn().mockReturnValue({ emit: mockEmit })
    mockSocketsLeave = jest.fn().mockResolvedValue(undefined)
    mockServerIn = jest.fn().mockReturnValue({ socketsLeave: mockSocketsLeave })
    ;(gateway as any).server = {
      to: mockServerTo,
      in: mockServerIn,
    }
  })

  it('should be defined', () => {
    expect(gateway).toBeDefined()
  })

  describe('handleConnection', () => {
    it('joins the personal room, registers presence, and auto-joins memberships', async () => {
      const client = makeSocket('socket-1', '123')
      chatRepository.findRoomIdsByUserId.mockResolvedValue(['room-a', 'room-b'])

      await gateway.handleConnection(client as any)

      expect(client.join).toHaveBeenCalledWith('user-123')
      expect(presenceService.connect).toHaveBeenCalledWith('123')
      expect(chatRepository.findRoomIdsByUserId).toHaveBeenCalledWith('123')
      expect(client.join).toHaveBeenCalledWith(['room-a', 'room-b'])
    })

    it('skips the membership join when the user has no rooms', async () => {
      const client = makeSocket('socket-1', '123')
      chatRepository.findRoomIdsByUserId.mockResolvedValue([])

      await gateway.handleConnection(client as any)

      expect(client.join).toHaveBeenCalledTimes(1)
      expect(client.join).toHaveBeenCalledWith('user-123')
    })
  })

  describe('handleDisconnect', () => {
    it('reports the disconnect to presence', () => {
      const client = makeSocket('socket-1', '123')
      gateway.handleDisconnect(client as any)
      expect(presenceService.disconnect).toHaveBeenCalledWith('123')
    })
  })

  describe('handleJoinRoom', () => {
    it('should join the specified room and notify success', async () => {
      const client = makeSocket('socket-1', 'user-1')
      const roomId = 'room-abc'

      await gateway.handleJoinRoom(client as any, roomId)

      expect(client.join).toHaveBeenCalledWith(roomId)
      expect(client.emit).toHaveBeenCalledWith('room-joined', { roomId })
    })
  })

  describe('handleTyping', () => {
    it('emits room-scoped typing events excluding the sender', async () => {
      const client = makeSocket('socket-1', 'user-1')

      await gateway.handleTyping(client as any, { roomId: 'room-1', isTyping: true })

      expect(client.to).toHaveBeenCalledWith('room-1')
      expect(client.to('room-1').emit).toHaveBeenCalledWith('user-typing', {
        roomId: 'room-1',
        userId: 'user-1',
        isTyping: true,
      })
    })
  })

  describe('handleHeartbeat', () => {
    it('refreshes presence for the connected user', async () => {
      const client = makeSocket('socket-1', 'user-9')
      await gateway.handleHeartbeat(client as any)
      expect(presenceService.heartbeat).toHaveBeenCalledWith('user-9')
    })
  })

  describe('handleMessageSentEvent', () => {
    it('emits receive-message to all participants personal rooms', async () => {
      const payload = {
        roomId: 'room1',
        message: { id: 'msg1', content: 'hello' } as any,
        participants: [{ userId: 'user1' }, { userId: 'user2' }] as any,
      }

      await gateway.handleMessageSentEvent(payload)

      expect(mockServerTo).toHaveBeenCalledWith(['user-user1', 'user-user2'])
      expect(mockEmit).toHaveBeenCalledWith('receive-message', payload.message)
    })
  })

  describe('handleMemberRemovedEvent', () => {
    it('notifies members and evicts the removed user from the socket room', async () => {
      const payload = {
        roomId: 'room1',
        userId: 'user2',
        participants: [{ userId: 'user1' }] as any,
      }

      await gateway.handleMemberRemovedEvent(payload)

      expect(mockServerTo).toHaveBeenCalledWith(['user-user1'])
      expect(mockServerTo).toHaveBeenCalledWith('user-user2')
      expect(mockEmit).toHaveBeenCalledWith('member-removed', { roomId: 'room1', userId: 'user2' })
      expect(mockServerIn).toHaveBeenCalledWith('user-user2')
      expect(mockSocketsLeave).toHaveBeenCalledWith('room1')
    })
  })
})
