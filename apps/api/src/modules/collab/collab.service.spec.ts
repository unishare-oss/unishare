import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { CollabService } from './collab.service'
import { CollabRepository } from './collab.repository'

describe('CollabService', () => {
  let service: CollabService
  let repository: { create: jest.Mock; findBySlug: jest.Mock }

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findBySlug: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [CollabService, { provide: CollabRepository, useValue: repository }],
    }).compile()

    service = module.get<CollabService>(CollabService)
  })

  describe('createRoom', () => {
    it('should call repository.create with ownerId and a 10-char slug', async () => {
      const mockRoom = {
        id: 'room-1',
        slug: 'abc1234567',
        ownerId: 'user-1',
        title: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        snapshot: null,
      }
      repository.create.mockResolvedValue(mockRoom)

      await service.createRoom({ title: undefined }, 'user-1')

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: 'user-1',
          slug: expect.stringMatching(/^.{10}$/),
        }),
      )
    })

    it('should pass title to repository when provided', async () => {
      const mockRoom = {
        id: 'room-1',
        slug: 'abc1234567',
        ownerId: 'user-1',
        title: 'Study Session',
        createdAt: new Date(),
        updatedAt: new Date(),
        snapshot: null,
      }
      repository.create.mockResolvedValue(mockRoom)

      await service.createRoom({ title: 'Study Session' }, 'user-1')

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Study Session',
        }),
      )
    })

    it('should generate different slugs on consecutive calls', async () => {
      repository.create.mockResolvedValue({})

      await service.createRoom({}, 'user-1')
      await service.createRoom({}, 'user-1')

      const firstSlug = repository.create.mock.calls[0][0].slug
      const secondSlug = repository.create.mock.calls[1][0].slug
      expect(firstSlug).not.toBe(secondSlug)
    })

    it('should return the created room', async () => {
      const mockRoom = {
        id: 'room-1',
        slug: 'abc1234567',
        ownerId: 'user-1',
        title: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        snapshot: null,
      }
      repository.create.mockResolvedValue(mockRoom)

      const result = await service.createRoom({}, 'user-1')

      expect(result).toBe(mockRoom)
    })
  })

  describe('getRoomBySlug', () => {
    it('should return room when found', async () => {
      const mockRoom = {
        id: 'room-1',
        slug: 'abc1234567',
        ownerId: 'user-1',
        title: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        snapshot: null,
      }
      repository.findBySlug.mockResolvedValue(mockRoom)

      const result = await service.getRoomBySlug('abc1234567')

      expect(result).toBe(mockRoom)
      expect(repository.findBySlug).toHaveBeenCalledWith('abc1234567')
    })

    it('should throw NotFoundException when room not found', async () => {
      repository.findBySlug.mockResolvedValue(null)

      await expect(service.getRoomBySlug('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })
})
