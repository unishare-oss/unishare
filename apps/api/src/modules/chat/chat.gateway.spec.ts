import { Test, TestingModule } from '@nestjs/testing'
import { ChatGateway } from './chat.gateway'
import { ChatService } from './chat.service'

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
  let _chatService: jest.Mocked<ChatService>
  let mockServerTo: jest.Mock
  let mockEmit: jest.Mock

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
    const chatServiceMock = {
      getRoom: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatGateway, { provide: ChatService, useValue: chatServiceMock }],
    }).compile()

    gateway = module.get<ChatGateway>(ChatGateway)
    _chatService = module.get(ChatService)

    mockEmit = jest.fn()
    mockServerTo = jest.fn().mockReturnValue({ emit: mockEmit })
    ;(gateway as any).server = {
      to: mockServerTo,
    }
  })

  it('should be defined', () => {
    expect(gateway).toBeDefined()
  })

  describe('handleConnection', () => {
    it('should join personal room on connection', () => {
      const client = makeSocket('socket-1', '123')
      gateway.handleConnection(client as any)
      expect(client.join).toHaveBeenCalledWith('user-123')
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

  describe('handleMessageSentEvent', () => {
    it('should emit receive-message to the room and notifications to participants', async () => {
      const payload = {
        roomId: 'room1',
        message: { id: 'msg1', content: 'hello' } as any,
        participants: [{ userId: 'user1' }, { userId: 'user2' }] as any,
      }

      await gateway.handleMessageSentEvent(payload)

      // Verify broadcast to room
      expect(mockServerTo).toHaveBeenCalledWith('room1')
      expect(mockEmit).toHaveBeenCalledWith('receive-message', payload.message)

      // Verify notifications to each user
      expect(mockServerTo).toHaveBeenCalledWith('user-user1')
      expect(mockServerTo).toHaveBeenCalledWith('user-user2')
      expect(mockEmit).toHaveBeenCalledWith('new-message-notification', {
        roomId: 'room1',
        message: payload.message,
      })
    })
  })
})
