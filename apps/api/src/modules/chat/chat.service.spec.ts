import { Test, TestingModule } from '@nestjs/testing'
import { ChatService } from './chat.service'
import { ChatRepository } from './chat.repository'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { ChatRoomType } from '@/generated/prisma/client'

describe('ChatService', () => {
  let service: ChatService
  let repository: jest.Mocked<ChatRepository>
  let eventEmitter: jest.Mocked<EventEmitter2>

  beforeEach(async () => {
    const repositoryMock = {
      findRoomsByUserId: jest.fn(),
      findRoomById: jest.fn(),
      findMessages: jest.fn(),
      createRoom: jest.fn(),
      findDirectMessageRoom: jest.fn(),
      createMessage: jest.fn(),
      findMessageById: jest.fn(),
      updateMessage: jest.fn(),
      deleteMessage: jest.fn(),
      markAsRead: jest.fn(),
    }

    const eventEmitterMock = {
      emit: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: ChatRepository,
          useValue: repositoryMock,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitterMock,
        },
      ],
    }).compile()

    service = module.get<ChatService>(ChatService)
    repository = module.get(ChatRepository)
    eventEmitter = module.get(EventEmitter2)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getRoom', () => {
    it('should throw NotFoundException if room does not exist', async () => {
      repository.findRoomById.mockResolvedValue(null)
      await expect(service.getRoom('1', 'user1')).rejects.toThrow(NotFoundException)
    })

    it('should return room if it exists and user is participant', async () => {
      const mockRoom = { id: '1', participants: [] } as any
      repository.findRoomById.mockResolvedValue(mockRoom)
      const result = await service.getRoom('1', 'user1')
      expect(result).toEqual(mockRoom)
    })
  })

  describe('createRoom', () => {
    it('should return existing DM room if it exists', async () => {
      const creatorId = 'user1'
      const participantIds = ['user2']
      const existingRoom = { id: 'room1' }

      repository.findDirectMessageRoom.mockResolvedValue(existingRoom as any)
      repository.findRoomById.mockResolvedValue(existingRoom as any)

      const result = await service.createRoom(creatorId, participantIds, ChatRoomType.DM)

      expect(repository.findDirectMessageRoom).toHaveBeenCalledWith(creatorId, 'user2')
      expect(repository.createRoom).not.toHaveBeenCalled()
      expect(result).toEqual(existingRoom)
    })

    it('should create new DM room if none exists', async () => {
      const creatorId = 'user1'
      const participantIds = ['user2']

      repository.findDirectMessageRoom.mockResolvedValue(null)
      repository.createRoom.mockResolvedValue({ id: 'new-room' } as any)

      await service.createRoom(creatorId, participantIds, ChatRoomType.DM)

      expect(repository.createRoom).toHaveBeenCalledWith(
        ChatRoomType.DM,
        expect.arrayContaining(['user1', 'user2']),
        undefined,
      )
    })

    it('should throw error if DM does not have exactly 2 participants', async () => {
      await expect(
        service.createRoom('user1', ['user2', 'user3'], ChatRoomType.DM),
      ).rejects.toThrow('DM must have exactly 2 participants')
    })
  })

  describe('sendMessage', () => {
    it('should save message and emit event', async () => {
      const roomId = 'room1'
      const userId = 'user1'
      const dto = { content: 'hello' }
      const mockRoom = { id: roomId, participants: [{ userId: 'user1' }, { userId: 'user2' }] }
      const mockMessage = { id: 'msg1', ...dto }

      repository.findRoomById.mockResolvedValue(mockRoom as any)
      repository.createMessage.mockResolvedValue(mockMessage as any)

      const result = await service.sendMessage(roomId, userId, dto)

      expect(repository.createMessage).toHaveBeenCalledWith({
        roomId,
        userId,
        ...dto,
      })

      expect(eventEmitter.emit).toHaveBeenCalledWith('chat.message_sent', {
        roomId,
        message: mockMessage,
        participants: mockRoom.participants,
      })
      expect(result).toEqual(mockMessage)
    })
  })

  describe('editMessage', () => {
    it('should throw NotFoundException if message does not exist', async () => {
      repository.findMessageById.mockResolvedValue(null)
      await expect(service.editMessage('1', 'user1', { content: 'new' })).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should throw ForbiddenException if user is not author', async () => {
      repository.findMessageById.mockResolvedValue({ id: '1', userId: 'user2' } as any)
      await expect(service.editMessage('1', 'user1', { content: 'new' })).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('should update message and emit event', async () => {
      const messageId = '1'
      const userId = 'user1'
      const roomId = 'room1'
      const mockMessage = { id: messageId, userId, roomId, content: 'old' }
      const updatedMessage = { ...mockMessage, content: 'new' }
      const mockRoom = { id: roomId, participants: [{ userId }] }

      repository.findMessageById.mockResolvedValue(mockMessage as any)
      repository.updateMessage.mockResolvedValue(updatedMessage as any)
      repository.findRoomById.mockResolvedValue(mockRoom as any)

      const result = await service.editMessage(messageId, userId, { content: 'new' })

      expect(repository.updateMessage).toHaveBeenCalledWith(messageId, 'new')
      expect(eventEmitter.emit).toHaveBeenCalledWith('chat.message_updated', {
        roomId,
        message: updatedMessage,
        participants: mockRoom.participants,
      })
      expect(result).toEqual(updatedMessage)
    })
  })

  describe('deleteMessage', () => {
    it('should throw NotFoundException if message does not exist', async () => {
      repository.findMessageById.mockResolvedValue(null)
      await expect(service.deleteMessage('1', 'user1')).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if user is not author', async () => {
      repository.findMessageById.mockResolvedValue({ id: '1', userId: 'user2' } as any)
      await expect(service.deleteMessage('1', 'user1')).rejects.toThrow(ForbiddenException)
    })

    it('should delete message and emit event', async () => {
      const messageId = '1'
      const userId = 'user1'
      const roomId = 'room1'
      const mockMessage = { id: messageId, userId, roomId }
      const mockRoom = { id: roomId, participants: [{ userId }] }

      repository.findMessageById.mockResolvedValue(mockMessage as any)
      repository.findRoomById.mockResolvedValue(mockRoom as any)

      const result = await service.deleteMessage(messageId, userId)

      expect(repository.deleteMessage).toHaveBeenCalledWith(messageId)
      expect(eventEmitter.emit).toHaveBeenCalledWith('chat.message_deleted', {
        roomId,
        messageId,
        participants: mockRoom.participants,
      })
      expect(result).toEqual({ success: true })
    })
  })
})
