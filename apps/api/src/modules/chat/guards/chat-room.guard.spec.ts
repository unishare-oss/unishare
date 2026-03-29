import { Test, TestingModule } from '@nestjs/testing'
import { ChatRoomGuard } from './chat-room.guard'
import { ChatService } from '../chat.service'
import { WsException } from '@nestjs/websockets'

describe('ChatRoomGuard', () => {
  let guard: ChatRoomGuard
  let chatService: jest.Mocked<ChatService>

  beforeEach(async () => {
    const chatServiceMock = {
      getRoom: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatRoomGuard, { provide: ChatService, useValue: chatServiceMock }],
    }).compile()

    guard = module.get<ChatRoomGuard>(ChatRoomGuard)
    chatService = module.get(ChatService)
  })

  it('should be defined', () => {
    expect(guard).toBeDefined()
  })

  it('should allow access if user is participant of the room', async () => {
    const mockRoom = { id: 'room-1' }
    chatService.getRoom.mockResolvedValue(mockRoom as any)

    const context = {
      switchToWs: () => ({
        getClient: () => ({ data: { user: { id: 'user-1' } } }),
        getData: () => ({ roomId: 'room-1' }),
      }),
    } as any

    const result = await guard.canActivate(context)

    expect(result).toBe(true)
    expect(chatService.getRoom).toHaveBeenCalledWith('room-1', 'user-1')
  })

  it('should throw WsException if user is not a participant', async () => {
    chatService.getRoom.mockResolvedValue(null as any)

    const context = {
      switchToWs: () => ({
        getClient: () => ({ data: { user: { id: 'user-1' } } }),
        getData: () => ({ roomId: 'room-1' }),
      }),
    } as any

    await expect(guard.canActivate(context)).rejects.toThrow(WsException)
  })

  it('should return false if roomId is missing', async () => {
    const context = {
      switchToWs: () => ({
        getClient: () => ({ data: { user: { id: 'user-1' } } }),
        getData: () => ({}), // Missing roomId
      }),
    } as any

    const result = await guard.canActivate(context)
    expect(result).toBe(false)
  })
})
